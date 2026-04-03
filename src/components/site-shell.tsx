import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import type { Locale } from "@/lib/i18n-config";
import type { SessionEntitlements, SessionUser, SiteAnnouncement } from "@/lib/types";

export function SiteShell({
  announcements,
  children,
  entitlements,
  locale,
  session,
}: {
  announcements: SiteAnnouncement[];
  children: React.ReactNode;
  entitlements: SessionEntitlements;
  locale: Locale;
  session: SessionUser;
}) {
  return (
    <div className="page-frame flex min-h-screen flex-col">
      <SiteHeader
        locale={locale}
        session={session}
        entitlements={entitlements}
        announcements={announcements}
      />
      <main className="flex-1">{children}</main>
      <SiteFooter locale={locale} />
    </div>
  );
}
