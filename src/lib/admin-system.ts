import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { Locale } from "@/lib/i18n-config";
import type { UserRole } from "@/lib/types";

type PolicyRecord = {
  role: string;
  description?: string;
  canAccessAdminConsole: boolean;
  canManageContent: boolean;
  canManageFinance: boolean;
  canManageAgents: boolean;
  canManageSystem: boolean;
  canViewReports: boolean;
};

export type AdminSystemMetric = {
  label: string;
  value: string;
  description: string;
};

export type AdminSystemPolicyRecord = PolicyRecord & {
  id: string;
  updatedAt: string;
};

export type AdminSystemAuditRecord = {
  id: string;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  status: string;
  detail?: string;
  ipAddress?: string;
  createdAt: string;
};

export type AdminSystemAlertChannelRecord = {
  id: string;
  name: string;
  provider: string;
  target: string;
  severityFilter: string;
  status: string;
  note?: string;
  lastTriggeredAt?: string;
  updatedAt: string;
};

export type AdminSystemAlertEventRecord = {
  id: string;
  source: string;
  title: string;
  message: string;
  severity: string;
  status: string;
  detail?: string;
  channelId?: string;
  channelName?: string;
  createdAt: string;
  resolvedAt?: string;
};

export type AdminSystemParameterRecord = {
  id: string;
  key: string;
  value: string;
  category: string;
  description?: string;
  updatedAt: string;
};

export type AdminSystemDashboard = {
  metrics: AdminSystemMetric[];
  policies: AdminSystemPolicyRecord[];
  auditLogs: AdminSystemAuditRecord[];
  alertChannels: AdminSystemAlertChannelRecord[];
  alertEvents: AdminSystemAlertEventRecord[];
  parameters: AdminSystemParameterRecord[];
};

const adminPaths = ["/admin"];

const defaultRolePolicies: Array<PolicyRecord> = [
  {
    role: "admin",
    description: "Full access to all admin modules.",
    canAccessAdminConsole: true,
    canManageContent: true,
    canManageFinance: true,
    canManageAgents: true,
    canManageSystem: true,
    canViewReports: true,
  },
  {
    role: "operator",
    description: "Content, homepage operations, AI, and report viewing.",
    canAccessAdminConsole: true,
    canManageContent: true,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: true,
  },
  {
    role: "finance",
    description: "Finance and reports access.",
    canAccessAdminConsole: true,
    canManageContent: false,
    canManageFinance: true,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: true,
  },
  {
    role: "member",
    description: "Front-office member access only.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  },
  {
    role: "visitor",
    description: "Anonymous visitor access only.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  },
];

const defaultSystemParameters = [
  {
    key: "site.base_url",
    value: process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.SITE_URL?.trim() || "http://47.238.249.104",
    category: "site",
    description: "Public base URL before domain binding.",
  },
  {
    key: "payments.callback_path",
    value: "/api/payments/callback",
    category: "payments",
    description: "Hosted payment callback path.",
  },
  {
    key: "sync.strategy",
    value: "free-api-primary + scrape-fallback",
    category: "sync",
    description: "Current sync pipeline strategy.",
  },
  {
    key: "reports.export_limit",
    value: "100000",
    category: "reports",
    description: "Soft export row cap per CSV.",
  },
];

function safeRevalidate(paths: string[]) {
  for (const path of paths) {
    try {
      revalidatePath(path);
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes("static generation store missing")) {
        throw error;
      }
    }
  }
}

function localizeText(
  value: {
    zhCn: string;
    zhTw: string;
    en: string;
  },
  locale: Locale,
) {
  if (locale === "zh-TW") {
    return value.zhTw;
  }

  if (locale === "en") {
    return value.en;
  }

  return value.zhCn;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  return raw || undefined;
}

function parseBoolean(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === "on";
}

function normalizeAlertSeverity(value: string) {
  if (value === "info" || value === "warn" || value === "error" || value === "critical") {
    return value;
  }

  return "warn";
}

function getDefaultRolePolicy(role: string): PolicyRecord {
  return defaultRolePolicies.find((item) => item.role === role) ?? {
    role,
    description: "Custom role policy.",
    canAccessAdminConsole: false,
    canManageContent: false,
    canManageFinance: false,
    canManageAgents: false,
    canManageSystem: false,
    canViewReports: false,
  };
}

async function ensureAdminSystemSeeds() {
  await Promise.all([
    ...defaultRolePolicies.map((policy) =>
      prisma.adminRolePolicy.upsert({
        where: { role: policy.role },
        update: {},
        create: policy,
      }),
    ),
    ...defaultSystemParameters.map((parameter) =>
      prisma.systemParameter.upsert({
        where: { key: parameter.key },
        update: {},
        create: parameter,
      }),
    ),
  ]);
}

export async function getRolePolicyEntitlements(role: UserRole | string) {
  const stored = await prisma.adminRolePolicy.findUnique({
    where: { role },
  });

  return stored ?? getDefaultRolePolicy(role);
}

export async function recordAdminAuditLog(input: {
  actorUserId?: string | null;
  actorDisplayName: string;
  actorRole: string;
  action: string;
  scope: string;
  targetType?: string;
  targetId?: string;
  status?: string;
  detail?: string;
  ipAddress?: string;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      actorDisplayName: input.actorDisplayName,
      actorRole: input.actorRole,
      action: input.action,
      scope: input.scope,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      status: input.status ?? "success",
      detail: input.detail ?? null,
      ipAddress: input.ipAddress ?? null,
    },
  });
}

export async function getAdminSystemDashboard(locale: Locale): Promise<AdminSystemDashboard> {
  await ensureAdminSystemSeeds();

  const [policiesRaw, auditLogsRaw, channelsRaw, alertsRaw, parametersRaw] = await Promise.all([
    prisma.adminRolePolicy.findMany({
      orderBy: [{ canAccessAdminConsole: "desc" }, { role: "asc" }],
    }),
    prisma.adminAuditLog.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
    }),
    prisma.systemAlertChannel.findMany({
      take: 12,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.systemAlertEvent.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        channel: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.systemParameter.findMany({
      orderBy: [{ category: "asc" }, { key: "asc" }],
    }),
  ]);

  const openAlerts = alertsRaw.filter((item) => item.status === "open").length;
  const activeChannels = channelsRaw.filter((item) => item.status === "active").length;
  const successfulAuditLogs = auditLogsRaw.filter((item) => item.status === "success").length;
  const adminRoles = policiesRaw.filter((item) => item.canAccessAdminConsole).length;

  return {
    metrics: [
      {
        label: localizeText({ zhCn: "后台角色策略", zhTw: "後台角色策略", en: "Role policies" }, locale),
        value: formatNumber(adminRoles),
        description: localizeText(
          {
            zhCn: "具备后台入口权限的角色数量。",
            zhTw: "具備後台入口權限的角色數量。",
            en: "Roles that can enter the admin console.",
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "最近审计日志", zhTw: "最近審計日誌", en: "Recent audit logs" }, locale),
        value: formatNumber(auditLogsRaw.length),
        description: localizeText(
          {
            zhCn: `成功 ${formatNumber(successfulAuditLogs)} 条，覆盖最近后台动作。`,
            zhTw: `成功 ${formatNumber(successfulAuditLogs)} 條，覆蓋最近後台動作。`,
            en: `${formatNumber(successfulAuditLogs)} successful items in the latest audit trail.`,
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "启用告警通道", zhTw: "啟用告警通道", en: "Active alert channels" }, locale),
        value: formatNumber(activeChannels),
        description: localizeText(
          {
            zhCn: `当前打开告警 ${formatNumber(openAlerts)} 条。`,
            zhTw: `當前打開告警 ${formatNumber(openAlerts)} 條。`,
            en: `${formatNumber(openAlerts)} open alert events right now.`,
          },
          locale,
        ),
      },
      {
        label: localizeText({ zhCn: "系统参数项", zhTw: "系統參數項", en: "System parameters" }, locale),
        value: formatNumber(parametersRaw.length),
        description: localizeText(
          {
            zhCn: "运行环境、同步、支付和报表开关集中管理。",
            zhTw: "運行環境、同步、支付和報表開關集中管理。",
            en: "Runtime, sync, payment, and report switches in one place.",
          },
          locale,
        ),
      },
    ],
    policies: policiesRaw.map((item) => ({
      id: item.id,
      role: item.role,
      description: item.description ?? undefined,
      canAccessAdminConsole: item.canAccessAdminConsole,
      canManageContent: item.canManageContent,
      canManageFinance: item.canManageFinance,
      canManageAgents: item.canManageAgents,
      canManageSystem: item.canManageSystem,
      canViewReports: item.canViewReports,
      updatedAt: item.updatedAt.toISOString(),
    })),
    auditLogs: auditLogsRaw.map((item) => ({
      id: item.id,
      actorDisplayName: item.actorDisplayName,
      actorRole: item.actorRole,
      action: item.action,
      scope: item.scope,
      targetType: item.targetType ?? undefined,
      targetId: item.targetId ?? undefined,
      status: item.status,
      detail: item.detail ?? undefined,
      ipAddress: item.ipAddress ?? undefined,
      createdAt: item.createdAt.toISOString(),
    })),
    alertChannels: channelsRaw.map((item) => ({
      id: item.id,
      name: item.name,
      provider: item.provider,
      target: item.target,
      severityFilter: item.severityFilter,
      status: item.status,
      note: item.note ?? undefined,
      lastTriggeredAt: item.lastTriggeredAt?.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    alertEvents: alertsRaw.map((item) => ({
      id: item.id,
      source: item.source,
      title: item.title,
      message: item.message,
      severity: item.severity,
      status: item.status,
      detail: item.detail ?? undefined,
      channelId: item.channelId ?? undefined,
      channelName: item.channel?.name ?? undefined,
      createdAt: item.createdAt.toISOString(),
      resolvedAt: item.resolvedAt?.toISOString(),
    })),
    parameters: parametersRaw.map((item) => ({
      id: item.id,
      key: item.key,
      value: item.value,
      category: item.category,
      description: item.description ?? undefined,
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export async function saveAdminRolePolicy(formData: FormData) {
  const role = String(formData.get("role") || "").trim();

  if (!role) {
    throw new Error("SYSTEM_ROLE_POLICY_INVALID");
  }

  await prisma.adminRolePolicy.upsert({
    where: { role },
    update: {
      description: parseOptionalText(formData.get("description")) ?? null,
      canAccessAdminConsole: parseBoolean(formData.get("canAccessAdminConsole")),
      canManageContent: parseBoolean(formData.get("canManageContent")),
      canManageFinance: parseBoolean(formData.get("canManageFinance")),
      canManageAgents: parseBoolean(formData.get("canManageAgents")),
      canManageSystem: parseBoolean(formData.get("canManageSystem")),
      canViewReports: parseBoolean(formData.get("canViewReports")),
    },
    create: {
      role,
      description: parseOptionalText(formData.get("description")) ?? null,
      canAccessAdminConsole: parseBoolean(formData.get("canAccessAdminConsole")),
      canManageContent: parseBoolean(formData.get("canManageContent")),
      canManageFinance: parseBoolean(formData.get("canManageFinance")),
      canManageAgents: parseBoolean(formData.get("canManageAgents")),
      canManageSystem: parseBoolean(formData.get("canManageSystem")),
      canViewReports: parseBoolean(formData.get("canViewReports")),
    },
  });

  safeRevalidate(adminPaths);
}

export async function saveSystemParameter(formData: FormData) {
  const key = String(formData.get("key") || "").trim();
  const value = String(formData.get("value") || "").trim();

  if (!key || !value) {
    throw new Error("SYSTEM_PARAMETER_INVALID");
  }

  await prisma.systemParameter.upsert({
    where: { key },
    update: {
      value,
      category: String(formData.get("category") || "general").trim() || "general",
      description: parseOptionalText(formData.get("description")) ?? null,
    },
    create: {
      key,
      value,
      category: String(formData.get("category") || "general").trim() || "general",
      description: parseOptionalText(formData.get("description")) ?? null,
    },
  });

  safeRevalidate(adminPaths);
}

export async function saveSystemAlertChannel(formData: FormData) {
  const id = parseOptionalText(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const provider = String(formData.get("provider") || "").trim();
  const target = String(formData.get("target") || "").trim();

  if (!name || !provider || !target) {
    throw new Error("SYSTEM_ALERT_CHANNEL_INVALID");
  }

  const payload = {
    name,
    provider,
    target,
    severityFilter: String(formData.get("severityFilter") || "warn,error").trim() || "warn,error",
    status: String(formData.get("status") || "active").trim() || "active",
    note: parseOptionalText(formData.get("note")) ?? null,
  };

  if (id) {
    await prisma.systemAlertChannel.update({
      where: { id },
      data: payload,
    });
  } else {
    await prisma.systemAlertChannel.create({
      data: payload,
    });
  }

  safeRevalidate(adminPaths);
}

export async function saveSystemAlertEvent(formData: FormData) {
  const source = String(formData.get("source") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const message = String(formData.get("message") || "").trim();

  if (!source || !title || !message) {
    throw new Error("SYSTEM_ALERT_EVENT_INVALID");
  }

  await prisma.systemAlertEvent.create({
    data: {
      source,
      title,
      message,
      severity: normalizeAlertSeverity(String(formData.get("severity") || "warn")),
      status: "open",
      detail: parseOptionalText(formData.get("detail")) ?? null,
      channelId: parseOptionalText(formData.get("channelId")) ?? null,
    },
  });

  safeRevalidate(adminPaths);
}

export async function resolveSystemAlertEvent(id: string) {
  if (!id) {
    throw new Error("SYSTEM_ALERT_EVENT_INVALID");
  }

  await prisma.systemAlertEvent.update({
    where: { id },
    data: {
      status: "resolved",
      resolvedAt: new Date(),
    },
  });

  safeRevalidate(adminPaths);
}
