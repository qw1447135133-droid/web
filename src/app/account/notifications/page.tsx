import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountWorkspaceNav } from "@/components/account-workspace-nav";
import { getNotificationPageCopy } from "@/lib/account-copy";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getSessionContext } from "@/lib/session";
import { getUserNotifications } from "@/lib/user-notifications";
import type { NotificationCategory } from "@/lib/types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

const categoryOptions: Array<NotificationCategory | "all"> = [
  "all",
  "system",
  "recharge",
  "order",
  "membership",
  "support",
];

export default async function AccountNotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const displayLocale = await getCurrentDisplayLocale();
  const { entitlements, session } = await getSessionContext();

  if (!entitlements.canAccessMemberCenter || !session.id) {
    redirect("/login?next=%2Faccount%2Fnotifications");
  }

  const copy = getNotificationPageCopy(displayLocale);
  const resolved = await searchParams;
  const selectedCategory = categoryOptions.includes(pickValue(resolved.category) as NotificationCategory | "all")
    ? (pickValue(resolved.category) as NotificationCategory | "all")
    : "all";
  const payload = await getUserNotifications(session.id, displayLocale, {
    category: selectedCategory,
    limit: 60,
  });

  return (
    <div id="account-support" className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:px-8">
      <AccountWorkspaceNav locale={displayLocale} current="notifications" unreadCount={payload.unreadCount} />
      <div className="space-y-6">
        <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-label">{copy.eyebrow}</p>
              <h1 className="display-title mt-3 text-4xl font-semibold text-white">{copy.title}</h1>
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{copy.description}</p>
            </div>
            <form action="/api/account/notifications/read" method="post">
              <input type="hidden" name="returnTo" value="/account/notifications" />
              <input type="hidden" name="markAll" value="1" />
              <button type="submit" className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                {copy.markAllRead}
              </button>
            </form>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {categoryOptions.map((category) => {
              const active = category === selectedCategory;
              const href = category === "all" ? "/account/notifications" : `/account/notifications?category=${category}`;
              const label = copy.categories[category];

              return (
                <Link
                  key={category}
                  href={href}
                  className={
                    active
                      ? "rounded-full border border-sky-300/25 bg-sky-400/15 px-4 py-2 text-sm font-semibold text-sky-50"
                      : "rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-300 transition hover:border-white/20 hover:bg-white/[0.05]"
                  }
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </section>

        {payload.items.length === 0 ? (
          <section className="glass-panel rounded-[2rem] p-6 text-sm text-slate-300">{copy.empty}</section>
        ) : (
          <section className="space-y-4">
            {payload.items.map((item) => (
              <article key={item.id} className="glass-panel rounded-[1.75rem] p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-semibold text-white">{item.title}</h2>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                        {item.readAt ? copy.read : copy.unread}
                      </span>
                    </div>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{item.message}</p>
                    <p className="mt-3 text-xs text-slate-500">{item.createdAt}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {item.actionHref ? (
                      <Link href={item.actionHref} className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]">
                        {item.actionLabel || copy.markRead}
                      </Link>
                    ) : null}
                    {!item.readAt ? (
                      <form action="/api/account/notifications/read" method="post">
                        <input type="hidden" name="returnTo" value="/account/notifications" />
                        <input type="hidden" name="notificationId" value={item.id} />
                        <button type="submit" className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-300">
                          {copy.markRead}
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
