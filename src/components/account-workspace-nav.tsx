import Link from "next/link";
import { getAccountNavigationCopy } from "@/lib/account-copy";
import type { DisplayLocale } from "@/lib/i18n-config";
import { OpenSiteAssistantButton } from "@/components/open-site-assistant-button";

type AccountWorkspaceSection = "orders" | "content" | "coins" | "notifications" | "profile" | "email";

function itemClass(active: boolean) {
  return active
    ? "group flex w-full items-center justify-between gap-3 rounded-[1.45rem] border border-sky-300/28 bg-sky-300/12 py-4 pl-10 pr-5 text-left text-base font-semibold text-sky-50 shadow-[0_14px_36px_rgba(56,189,248,0.12)] transition"
    : "group flex w-full items-center justify-between gap-3 rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(18,27,40,0.92),rgba(14,22,34,0.95))] py-4 pl-10 pr-5 text-left text-base font-medium text-slate-100 transition hover:border-white/16 hover:bg-[linear-gradient(180deg,rgba(23,33,48,0.96),rgba(16,25,38,0.98))] hover:text-white";
}

export function AccountWorkspaceNav({
  locale,
  current,
  unreadCount = 0,
}: {
  locale: DisplayLocale;
  current?: AccountWorkspaceSection;
  unreadCount?: number;
}) {
  const copy = getAccountNavigationCopy(locale);
  const items: Array<{ key: AccountWorkspaceSection; href: string; label: string }> = [
    { key: "orders", href: "/member#member-orders", label: copy.sections.orders },
    { key: "content", href: "/member#member-entitlements", label: copy.sections.content },
    { key: "coins", href: "/member#member-coins", label: copy.sections.coins },
    { key: "notifications", href: "/account/notifications", label: copy.sections.notifications },
    { key: "profile", href: "/account/profile", label: copy.sections.profile },
    { key: "email", href: "/account/security/email", label: copy.sections.email },
  ];

  const content = (
    <div className="relative overflow-hidden rounded-[2.25rem] border border-sky-300/10 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.06),transparent_42%),linear-gradient(180deg,rgba(7,15,25,0.96),rgba(9,17,29,0.92))] px-5 py-6 shadow-[0_18px_52px_rgba(2,8,18,0.28)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 group-hover:border-sky-300/16 group-hover:shadow-[0_20px_56px_rgba(2,8,18,0.34)] sm:px-6">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-6 left-0 w-8 bg-gradient-to-r from-cyan-300/10 via-cyan-200/6 to-transparent opacity-70 blur-xl transition duration-300 group-hover:from-cyan-300/16 group-hover:via-cyan-200/10 group-hover:opacity-100"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-8 left-3 w-px rounded-full bg-cyan-200/24 shadow-[0_0_16px_rgba(103,232,249,0.26)] transition duration-300 group-hover:bg-cyan-100/42 group-hover:shadow-[0_0_22px_rgba(125,211,252,0.34)]"
      />
      <div className="flex flex-col gap-3.5">
        {items.map((item) => {
          const active = item.key === current;
          const showUnread = item.key === "notifications" && unreadCount > 0;

          return (
            <Link key={item.key} href={item.href} className={itemClass(active)}>
              <span className="min-w-0 truncate">{item.label}</span>
              <span className="flex items-center gap-2">
                {showUnread ? (
                  <span className="rounded-full bg-orange-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 shadow-[0_10px_22px_rgba(251,146,60,0.22)]">
                    {unreadCount} {copy.unreadSuffix}
                  </span>
                ) : null}
              </span>
            </Link>
          );
        })}
        <OpenSiteAssistantButton className={itemClass(false)}>
          <span className="min-w-0 truncate">{copy.sections.support}</span>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            AI
          </span>
        </OpenSiteAssistantButton>
      </div>
    </div>
  );

  return (
    <>
      <aside className="group hidden xl:block xl:fixed xl:left-[-2.75rem] xl:top-[12.75rem] xl:z-30 xl:w-[18rem] xl:transition-transform xl:duration-300 xl:ease-out xl:hover:translate-x-[10px] 2xl:left-[-2.25rem] 2xl:hover:translate-x-[12px]">
        <div className="max-h-[calc(100vh-15rem)] overflow-y-auto pr-1">
          {content}
        </div>
      </aside>
      <aside className="w-full xl:hidden">
        {content}
      </aside>
    </>
  );
}
