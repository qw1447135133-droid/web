import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { applyUserAgentAttribution } from "@/lib/agent-attribution";
import { normalizeDisplayLocale, type DisplayLocale } from "@/lib/i18n-config";
import { prisma } from "@/lib/prisma";
import { recordUserLoginActivity } from "@/lib/user-activity";
import { notifyEmailVerificationRequested, notifyEmailVerified } from "@/lib/user-notifications";

type AuthClient = Prisma.TransactionClient | typeof prisma;

const passwordHashVersion = "scrypt";
const emailVerificationTtlHours = 24;

export class AuthServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseOptionalText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function getRequestIp(headers?: Headers) {
  return headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? headers?.get("x-real-ip") ?? undefined;
}

function createTokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${passwordHashVersion}$${salt}$${derived}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) {
    return false;
  }

  const [version, salt, expectedHex] = storedHash.split("$");

  if (version !== passwordHashVersion || !salt || !expectedHex) {
    return false;
  }

  const actualBuffer = Buffer.from(scryptSync(password, salt, 64));
  const expectedBuffer = Buffer.from(expectedHex, "hex");

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function registerUser(input: {
  displayName: string;
  email: string;
  password: string;
  inviteCode?: string;
  preferredLocale?: string;
  countryCode?: string;
  headers?: Headers;
}) {
  const email = normalizeEmail(input.email);
  const displayName = input.displayName.trim();
  const password = input.password.trim();

  if (!displayName) {
    throw new AuthServiceError("DISPLAY_NAME_REQUIRED", "Display name is required.");
  }

  if (!isValidEmail(email)) {
    throw new AuthServiceError("INVALID_EMAIL", "Email format is invalid.");
  }

  if (password.length < 8) {
    throw new AuthServiceError("PASSWORD_TOO_SHORT", "Password must be at least 8 characters.");
  }

  const passwordHash = hashPassword(password);
  const preferredLocale = parseOptionalText(input.preferredLocale)
    ? normalizeDisplayLocale(input.preferredLocale)
    : undefined;
  const countryCode = parseOptionalText(input.countryCode)?.slice(0, 8).toUpperCase();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existing) {
      throw new AuthServiceError("EMAIL_ALREADY_EXISTS", "Email already registered.");
    }

    const user = await tx.user.create({
      data: {
        displayName,
        email,
        role: "member",
        passwordHash,
        preferredLocale,
        countryCode: countryCode || null,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
      },
    });

    await tx.coinAccount.create({
      data: {
        userId: user.id,
        balance: 0,
        lifetimeCredited: 0,
        lifetimeDebited: 0,
      },
    });

    if (parseOptionalText(input.inviteCode)) {
      await applyUserAgentAttribution(tx, {
        userId: user.id,
        inviteCode: String(input.inviteCode).trim(),
      });
    }

    await recordUserLoginActivity(tx, {
      userId: user.id,
      source: "password-register",
      ipAddress: getRequestIp(input.headers),
      userAgent: input.headers?.get("user-agent"),
    });

    return user;
  });
}

export async function authenticateUser(input: {
  email: string;
  password: string;
  headers?: Headers;
}) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (!isValidEmail(email) || !password) {
    throw new AuthServiceError("INVALID_CREDENTIALS", "Invalid credentials.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new AuthServiceError("INVALID_CREDENTIALS", "Invalid credentials.");
  }

  await recordUserLoginActivity(prisma, {
    userId: user.id,
    source: "password",
    ipAddress: getRequestIp(input.headers),
    userAgent: input.headers?.get("user-agent"),
  });

  return { id: user.id };
}

async function persistEmailVerificationToken(
  client: AuthClient,
  input: {
    userId: string;
    email: string;
    purpose?: string;
    verifyPath: string;
  },
) {
  const token = randomBytes(24).toString("hex");
  const tokenHash = createTokenHash(token);
  const expiresAt = new Date(Date.now() + emailVerificationTtlHours * 60 * 60 * 1000);

  await client.emailVerificationToken.deleteMany({
    where: {
      userId: input.userId,
      email: input.email,
      purpose: input.purpose ?? "verify_email",
      consumedAt: null,
    },
  });

  await client.emailVerificationToken.create({
    data: {
      userId: input.userId,
      email: input.email,
      purpose: input.purpose ?? "verify_email",
      tokenHash,
      expiresAt,
    },
  });

  await notifyEmailVerificationRequested(client, {
    userId: input.userId,
    email: input.email,
    verifyPath: `${input.verifyPath}${input.verifyPath.includes("?") ? "&" : "?"}token=${token}`,
  });

  return {
    token,
    expiresAt,
  };
}

export async function sendEmailVerification(input: {
  userId: string;
  nextEmail?: string;
  verifyPathBase?: string;
}) {
  const verifyPathBase = input.verifyPathBase?.trim() || "/api/account/email/verify";

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: input.userId },
      select: {
        id: true,
        email: true,
        pendingEmail: true,
      },
    });

    if (!user) {
      throw new AuthServiceError("USER_NOT_FOUND", "User not found.");
    }

    const requestedEmail = parseOptionalText(input.nextEmail);
    const normalizedNextEmail = requestedEmail ? normalizeEmail(requestedEmail) : undefined;
    const isSwitchingEmail = Boolean(normalizedNextEmail && normalizedNextEmail !== user.email);
    const targetEmail = normalizedNextEmail || user.pendingEmail || user.email;

    if (!isValidEmail(targetEmail)) {
      throw new AuthServiceError("INVALID_EMAIL", "Email format is invalid.");
    }

    if (isSwitchingEmail) {
      const existing = await tx.user.findUnique({
        where: { email: targetEmail },
        select: { id: true },
      });

      if (existing && existing.id !== user.id) {
        throw new AuthServiceError("EMAIL_ALREADY_EXISTS", "Email already registered.");
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          pendingEmail: targetEmail,
        },
      });
    }

    await persistEmailVerificationToken(tx, {
      userId: user.id,
      email: targetEmail,
      purpose: isSwitchingEmail ? "verify_pending_email" : "verify_email",
      verifyPath: verifyPathBase,
    });

    return {
      email: targetEmail,
      switchingEmail: isSwitchingEmail,
    };
  });
}

export async function verifyEmailToken(token: string) {
  const tokenHash = createTokenHash(token.trim());

  if (!tokenHash) {
    throw new AuthServiceError("INVALID_TOKEN", "Verification token is invalid.");
  }

  return prisma.$transaction(async (tx) => {
    const stored = await tx.emailVerificationToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        email: true,
        consumedAt: true,
        expiresAt: true,
        user: {
          select: {
            id: true,
            email: true,
            pendingEmail: true,
          },
        },
      },
    });

    if (!stored || stored.consumedAt || stored.expiresAt.getTime() <= Date.now()) {
      throw new AuthServiceError("TOKEN_EXPIRED", "Verification token is expired or invalid.");
    }

    const nextEmail = normalizeEmail(stored.email);

    if (nextEmail !== stored.user.email) {
      const existing = await tx.user.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });

      if (existing && existing.id !== stored.userId) {
        throw new AuthServiceError("EMAIL_ALREADY_EXISTS", "Email already registered.");
      }
    }

    await tx.user.update({
      where: { id: stored.userId },
      data: {
        email: nextEmail,
        pendingEmail: stored.user.pendingEmail && normalizeEmail(stored.user.pendingEmail) === nextEmail ? null : stored.user.pendingEmail,
        emailVerifiedAt: new Date(),
      },
    });

    await tx.emailVerificationToken.update({
      where: { id: stored.id },
      data: {
        consumedAt: new Date(),
      },
    });

    await notifyEmailVerified(tx, {
      userId: stored.userId,
      email: nextEmail,
    });

    return {
      userId: stored.userId,
      email: nextEmail,
    };
  });
}

export function resolvePreferredLocale(input?: string | null): DisplayLocale | undefined {
  const value = parseOptionalText(input);
  return value ? normalizeDisplayLocale(value) : undefined;
}
