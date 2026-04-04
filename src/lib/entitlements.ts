import type { SessionEntitlements, SessionUser } from "@/lib/types";

function isFutureDate(value?: string) {
  if (!value) {
    return false;
  }

  const expiresAt = new Date(value).getTime();
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

export function isAuthenticatedSession(session: SessionUser) {
  return session.role !== "visitor" && session.email.trim().length > 0;
}

export function hasActiveMembership(session: SessionUser) {
  return isFutureDate(session.membershipExpiresAt);
}

export function canAccessContent(session: SessionUser, contentId: string) {
  return hasActiveMembership(session) || session.purchasedContentIds.includes(contentId);
}

export function canAccessAdminConsole(session: SessionUser) {
  return session.role === "admin" || session.role === "operator" || session.role === "finance";
}

export function canManageContent(session: SessionUser) {
  return canAccessAdminConsole(session);
}

export function getSessionEntitlements(session: SessionUser): SessionEntitlements {
  const isAuthenticated = isAuthenticatedSession(session);
  const activeMembership = hasActiveMembership(session);
  const adminAccess = canAccessAdminConsole(session);
  const canManageContent = session.role === "admin" || session.role === "operator";
  const canManageFinance = session.role === "admin" || session.role === "finance";
  const canManageAgents = session.role === "admin";
  const canManageSystem = session.role === "admin";
  const canViewReports = adminAccess;

  return {
    isAuthenticated,
    activeMembership,
    canAccessMemberCenter: isAuthenticated,
    canAccessAdminConsole: adminAccess,
    canManageContent,
    canManageFinance,
    canManageAgents,
    canManageSystem,
    canViewReports,
  };
}
