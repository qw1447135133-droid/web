import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { SiteAssistantBubble } from "@/components/site-assistant-bubble";
import { BrowserNotificationBridge } from "@/components/browser-notification-bridge";
import { AppShellStatus } from "@/components/app-shell-status";
import { AppServiceWorkerBridge } from "@/components/app-service-worker-bridge";
import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import type { SessionEntitlements, SessionUser, SiteAnnouncement } from "@/lib/types";

export function SiteShell({
  announcements,
  children,
  displayLocale,
  entitlements,
  locale,
  session,
}: {
  announcements: SiteAnnouncement[];
  children: React.ReactNode;
  displayLocale: DisplayLocale;
  entitlements: SessionEntitlements;
  locale: Locale;
  session: SessionUser;
}) {
  return (
    <div className="page-frame flex min-h-screen flex-col">
      <SiteHeader
        displayLocale={displayLocale}
        locale={locale}
        session={session}
        entitlements={entitlements}
        announcements={announcements}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={displayLocale} />
      <AppServiceWorkerBridge />
      <AppShellStatus locale={displayLocale} />
      <BrowserNotificationBridge enabled={Boolean(session.id)} locale={displayLocale} />
      <SiteAssistantBubble locale={displayLocale} />
    </div>
  );
}
