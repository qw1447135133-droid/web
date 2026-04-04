import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import {
  buildAdminReportExport,
  normalizeAdminReportExportScope,
  type AdminReportExportScope,
} from "@/lib/admin-reports";

const exportArtifactsDir = path.join(process.cwd(), ".tmp", "admin-exports");

export type AdminExportTaskStatus = "queued" | "running" | "completed" | "failed" | "expired";

export type AdminExportTaskRecord = {
  id: string;
  scope: AdminReportExportScope;
  status: AdminExportTaskStatus;
  requestedByDisplayName: string;
  filename?: string;
  mimeType: string;
  rowCount: number;
  sizeBytes?: number;
  errorText?: string;
  downloadCount: number;
  startedAt?: string;
  finishedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};

function normalizeTaskStatus(value?: string | null): AdminExportTaskStatus {
  if (value === "running" || value === "completed" || value === "failed" || value === "expired") {
    return value;
  }

  return "queued";
}

function toTaskRecord(task: {
  id: string;
  scope: string;
  status: string;
  requestedByDisplayName: string;
  filename: string | null;
  mimeType: string;
  rowCount: number;
  sizeBytes: number | null;
  errorText: string | null;
  downloadCount: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): AdminExportTaskRecord {
  return {
    id: task.id,
    scope: normalizeAdminReportExportScope(task.scope),
    status: normalizeTaskStatus(task.status),
    requestedByDisplayName: task.requestedByDisplayName,
    filename: task.filename ?? undefined,
    mimeType: task.mimeType,
    rowCount: task.rowCount,
    sizeBytes: task.sizeBytes ?? undefined,
    errorText: task.errorText ?? undefined,
    downloadCount: task.downloadCount,
    startedAt: task.startedAt?.toISOString(),
    finishedAt: task.finishedAt?.toISOString(),
    expiresAt: task.expiresAt?.toISOString(),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

function buildTaskStorageKey(taskId: string, filename: string) {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-");
  return `${new Date().toISOString().slice(0, 19).replaceAll(":", "-")}-${taskId}-${safeFilename}.csv`;
}

function countCsvRows(csv: string) {
  if (!csv) {
    return 0;
  }

  const normalized = csv.startsWith("\uFEFF") ? csv.slice(1) : csv;
  const lines = normalized.split(/\r?\n/).filter(Boolean);
  return Math.max(0, lines.length - 1);
}

export async function getRecentAdminExportTasks(limit = 12): Promise<AdminExportTaskRecord[]> {
  const tasks = await prisma.adminExportTask.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      scope: true,
      status: true,
      requestedByDisplayName: true,
      filename: true,
      mimeType: true,
      rowCount: true,
      sizeBytes: true,
      errorText: true,
      downloadCount: true,
      startedAt: true,
      finishedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return tasks.map(toTaskRecord);
}

export async function createAdminExportTask(input: {
  scope: AdminReportExportScope | string;
  requestedByDisplayName: string;
  requestedByUserId?: string | null;
  filtersJson?: string | null;
}) {
  const scope = normalizeAdminReportExportScope(input.scope);

  return prisma.adminExportTask.create({
    data: {
      scope,
      status: "queued",
      requestedByDisplayName: input.requestedByDisplayName.trim() || "Admin",
      requestedByUserId: input.requestedByUserId ?? null,
      filtersJson: input.filtersJson ?? null,
      mimeType: "text/csv",
      storageType: "local",
    },
    select: {
      id: true,
      scope: true,
      status: true,
      requestedByDisplayName: true,
      filename: true,
      mimeType: true,
      rowCount: true,
      sizeBytes: true,
      errorText: true,
      downloadCount: true,
      startedAt: true,
      finishedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function runAdminExportTask(taskId: string): Promise<AdminExportTaskRecord> {
  const existing = await prisma.adminExportTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      scope: true,
      status: true,
      requestedByDisplayName: true,
      filename: true,
      mimeType: true,
      rowCount: true,
      sizeBytes: true,
      errorText: true,
      downloadCount: true,
      startedAt: true,
      finishedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      storageKey: true,
    },
  });

  if (!existing) {
    throw new Error("ADMIN_EXPORT_TASK_NOT_FOUND");
  }

  await prisma.adminExportTask.update({
    where: { id: taskId },
    data: {
      status: "running",
      startedAt: new Date(),
      finishedAt: null,
      errorText: null,
    },
  });

  try {
    const { filename, csv } = await buildAdminReportExport(normalizeAdminReportExportScope(existing.scope));
    await mkdir(exportArtifactsDir, { recursive: true });
    const storageKey = buildTaskStorageKey(taskId, filename);
    const targetPath = path.join(exportArtifactsDir, storageKey);

    if (existing.storageKey) {
      await rm(path.join(exportArtifactsDir, existing.storageKey), { force: true });
    }

    await writeFile(targetPath, csv, "utf8");
    const fileStat = await stat(targetPath);
    const completed = await prisma.adminExportTask.update({
      where: { id: taskId },
      data: {
        status: "completed",
        filename: `${filename}.csv`,
        storageKey,
        rowCount: countCsvRows(csv),
        sizeBytes: Number(fileStat.size),
        finishedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        mimeType: "text/csv",
      },
      select: {
        id: true,
        scope: true,
        status: true,
        requestedByDisplayName: true,
        filename: true,
        mimeType: true,
        rowCount: true,
        sizeBytes: true,
        errorText: true,
        downloadCount: true,
        startedAt: true,
        finishedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return toTaskRecord(completed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "ADMIN_EXPORT_TASK_FAILED";
    const failed = await prisma.adminExportTask.update({
      where: { id: taskId },
      data: {
        status: "failed",
        errorText: message,
        finishedAt: new Date(),
      },
      select: {
        id: true,
        scope: true,
        status: true,
        requestedByDisplayName: true,
        filename: true,
        mimeType: true,
        rowCount: true,
        sizeBytes: true,
        errorText: true,
        downloadCount: true,
        startedAt: true,
        finishedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return toTaskRecord(failed);
  }
}

export async function createAndRunAdminExportTask(input: {
  scope: AdminReportExportScope | string;
  requestedByDisplayName: string;
  requestedByUserId?: string | null;
  filtersJson?: string | null;
}) {
  const created = await createAdminExportTask(input);
  return runAdminExportTask(created.id);
}

export async function getAdminExportTaskDownload(taskId: string) {
  const task = await prisma.adminExportTask.findUnique({
    where: { id: taskId },
    select: {
      id: true,
      scope: true,
      status: true,
      requestedByDisplayName: true,
      filename: true,
      mimeType: true,
      rowCount: true,
      sizeBytes: true,
      errorText: true,
      downloadCount: true,
      startedAt: true,
      finishedAt: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      storageKey: true,
    },
  });

  if (!task) {
    throw new Error("ADMIN_EXPORT_TASK_NOT_FOUND");
  }

  if (normalizeTaskStatus(task.status) !== "completed" || !task.storageKey || !task.filename) {
    throw new Error("ADMIN_EXPORT_TASK_NOT_READY");
  }

  const absolutePath = path.join(exportArtifactsDir, task.storageKey);
  const file = await readFile(absolutePath);

  await prisma.adminExportTask.update({
    where: { id: taskId },
    data: {
      downloadCount: {
        increment: 1,
      },
    },
  });

  return {
    task: toTaskRecord(task),
    file,
  };
}
