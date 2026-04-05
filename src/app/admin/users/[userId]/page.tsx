import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { membershipPlans } from "@/lib/mock-data";
import { getAdminUserWorkspace } from "@/lib/admin-users";
import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getIntlLocale } from "@/lib/i18n-config";
import { getSessionContext } from "@/lib/session";

function formatDateTime(value: string | undefined, locale: string) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function actionLabel(action: string) {
  switch (action) {
    case "activated":
    case "manual-activated":
      return "启用会员";
    case "extended":
    case "manual-extended":
      return "延长会员";
    case "refunded":
      return "会员退款";
    case "manual-disabled":
      return "关闭会员";
    default:
      return action;
  }
}

function statusTone(status: string) {
  if (status === "paid") {
    return "border-lime-300/25 bg-lime-300/10 text-lime-100";
  }

  if (status === "pending") {
    return "border-sky-300/25 bg-sky-400/10 text-sky-100";
  }

  if (status === "refunded") {
    return "border-amber-300/25 bg-amber-300/10 text-amber-100";
  }

  if (status === "failed" || status === "closed") {
    return "border-rose-300/25 bg-rose-400/10 text-rose-100";
  }

  return "border-white/10 bg-white/[0.05] text-slate-200";
}

export default async function AdminUserWorkspacePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { entitlements } = await getSessionContext();

  if (!entitlements.isAuthenticated) {
    redirect("/login?next=%2Fadmin%3Ftab%3Dusers");
  }

  if (!entitlements.canAccessAdminConsole) {
    redirect("/member");
  }

  const [{ userId }, resolvedSearchParamsRaw, displayLocale] = await Promise.all([
    params,
    searchParams ?? Promise.resolve({}),
    getCurrentDisplayLocale(),
  ]);
  const resolvedSearchParams = resolvedSearchParamsRaw as Record<string, string | string[] | undefined>;

  const workspace = await getAdminUserWorkspace(userId);

  if (!workspace) {
    notFound();
  }

  const intlLocale = getIntlLocale(displayLocale);
  const savedParam = resolvedSearchParams["saved"];
  const errorParam = resolvedSearchParams["error"];
  const saved = typeof savedParam === "string" ? savedParam : "";
  const error = typeof errorParam === "string" ? errorParam : "";
  const returnTo = `/admin/users/${workspace.summary.id}`;
  const notice =
    saved === "user-membership"
      ? "会员状态已更新。"
      : saved === "user-coins"
        ? "球币余额已更新。"
        : saved === "order-status"
          ? "订单状态已更新。"
          : saved === "refund"
            ? "退款已完成。"
            : error
              ? "刚刚的后台动作执行失败，请稍后重试。"
              : "";

  return (
    <section className="mx-auto max-w-[1500px] px-4 py-8 md:px-6">
      <div className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="section-label">User Workspace</p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{workspace.summary.displayName}</h1>
            <p className="mt-2 text-sm text-slate-400">{workspace.summary.email}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin?tab=users"
              className="inline-flex items-center justify-center rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
            >
              返回用户列表
            </Link>
            <span className={`rounded-full px-3 py-2 text-xs ${workspace.summary.membershipStatus === "active" ? "bg-lime-300/12 text-lime-100" : "bg-white/8 text-slate-300"}`}>
              {workspace.summary.membershipStatus === "active" ? "会员有效" : "普通用户"}
            </span>
          </div>
        </div>

        {notice ? (
          <div className={`mt-6 rounded-[1.2rem] border px-4 py-3 text-sm ${error ? "border-rose-300/25 bg-rose-400/10 text-rose-100" : "border-lime-300/20 bg-lime-300/10 text-lime-100"}`}>
            {notice}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 lg:grid-cols-4">
          {[
            ["球币余额", formatNumber(workspace.summary.coinBalance, intlLocale)],
            ["有效会话", formatNumber(workspace.summary.activeSessionCount, intlLocale)],
            ["已购文章", formatNumber(workspace.contentOrders.filter((item) => item.status === "paid").length, intlLocale)],
            ["充值订单", formatNumber(workspace.rechargeOrders.length, intlLocale)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr,0.95fr]">
          <div className="grid gap-6">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="section-label">基础资料</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <p>角色: {workspace.summary.role}</p>
                <p>注册时间: {formatDateTime(workspace.summary.createdAt, intlLocale)}</p>
                <p>会员方案: {workspace.summary.membershipPlanName ?? "--"}</p>
                <p>会员到期: {formatDateTime(workspace.summary.membershipExpiresAt, intlLocale)}</p>
                <p>代理归因: {workspace.summary.referredByAgentName ?? "--"}</p>
                <p>邀请码: {workspace.summary.referredByAgentCode ?? "--"}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {workspace.permissions.map((item) => (
                  <span key={item} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <form action="/api/admin/users" method="post" className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="section-label">会员操作</p>
                  <input type="hidden" name="intent" value="extend-membership" />
                  <input type="hidden" name="userId" value={workspace.summary.id} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <div className="mt-4 grid gap-3">
                    <select name="planId" defaultValue={workspace.summary.membershipPlanId ?? membershipPlans[0]?.id ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none">
                      {membershipPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
                    <input name="durationDays" type="number" min="1" defaultValue="30" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder="延长天数" />
                    <textarea name="note" rows={3} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder="操作备注" />
                    <button type="submit" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300">
                      延长 / 开通会员
                    </button>
                  </div>
                </form>

                <div className="rounded-[1.2rem] border border-white/8 bg-slate-950/35 p-4">
                  <p className="section-label">快捷动作</p>
                  <div className="mt-4 grid gap-3">
                    <form action="/api/admin/users" method="post" className="grid gap-3">
                      <input type="hidden" name="intent" value="disable-membership" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <textarea name="note" rows={2} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder="关闭会员备注" />
                      <button type="submit" className="rounded-full border border-rose-300/25 bg-rose-400/10 px-4 py-2 text-sm text-rose-100 transition hover:border-rose-300/45 hover:bg-rose-400/20">
                        关闭会员
                      </button>
                    </form>
                    <form action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="intent" value="credit-coins" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input name="amount" type="number" min="1" defaultValue="100" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      <input name="note" type="text" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder="加币备注" />
                      <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/45 hover:bg-lime-300/20">
                        加球币
                      </button>
                    </form>
                    <form action="/api/admin/users" method="post" className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <input type="hidden" name="intent" value="debit-coins" />
                      <input type="hidden" name="userId" value={workspace.summary.id} />
                      <input type="hidden" name="returnTo" value={returnTo} />
                      <input name="amount" type="number" min="1" defaultValue="100" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" />
                      <input name="note" type="text" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none" placeholder="扣币备注" />
                      <button type="submit" className="rounded-full border border-amber-300/25 bg-amber-300/10 px-4 py-2 text-sm text-amber-100 transition hover:border-amber-300/45 hover:bg-amber-300/20">
                        扣球币
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">会员变更记录</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Membership timeline</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.membershipEvents.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.membershipEvents.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{actionLabel(item.action)}</p>
                      <span className="text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>方案: {item.planName ?? "--"}</span>
                      <span>前到期: {formatDateTime(item.previousExpiresAt, intlLocale)}</span>
                      <span>后到期: {formatDateTime(item.nextExpiresAt, intlLocale)}</span>
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
                  </div>
                ))}
                {workspace.membershipEvents.length === 0 ? <p className="text-sm text-slate-500">暂无会员变更记录。</p> : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">球币流水</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Coin ledger</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.ledgers.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.ledgers.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.reason}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${item.direction === "credit" ? "bg-lime-300/12 text-lime-100" : "bg-amber-300/12 text-amber-100"}`}>
                        {item.direction === "credit" ? "+" : "-"}
                        {formatNumber(item.amount, intlLocale)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{item.balanceBefore} → {item.balanceAfter}</span>
                      <span>{formatDateTime(item.createdAt, intlLocale)}</span>
                      {item.referenceType ? <span>{item.referenceType}</span> : null}
                    </div>
                    {item.note ? <p className="mt-2 text-sm text-slate-400">{item.note}</p> : null}
                  </div>
                ))}
                {workspace.ledgers.length === 0 ? <p className="text-sm text-slate-500">暂无球币流水。</p> : null}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <p className="section-label">代理关系</p>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <p>上级代理: {workspace.agentSummary.referredByAgentName ?? "--"}</p>
                <p>归因邀请码: {workspace.agentSummary.referredByAgentCode ?? "--"}</p>
                <p>自身代理身份: {workspace.agentSummary.ownAgentName ?? "--"}</p>
                <p>自身邀请码: {workspace.agentSummary.ownAgentCode ?? "--"}</p>
                <p>直推用户数: {workspace.agentSummary.referredUsersCount}</p>
                <p>下级代理数: {workspace.agentSummary.childAgentsCount}</p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">登录日志</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recent login activities</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.loginActivities.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.loginActivities.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4 text-sm text-slate-300">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.source}</p>
                      <span className="text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    <p className="mt-2">IP: {item.ipAddress ?? "--"}</p>
                    <p className="mt-1 break-all text-xs text-slate-500">{item.userAgent ?? "--"}</p>
                  </div>
                ))}
                {workspace.loginActivities.length === 0 ? <p className="text-sm text-slate-500">暂无登录记录。</p> : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">会话</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Active sessions</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.sessions.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.sessions.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4 text-sm text-slate-300">
                    <p>创建: {formatDateTime(item.createdAt, intlLocale)}</p>
                    <p className="mt-1">到期: {formatDateTime(item.expiresAt, intlLocale)}</p>
                  </div>
                ))}
                {workspace.sessions.length === 0 ? <p className="text-sm text-slate-500">暂无有效会话。</p> : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">充值订单</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Recharge orders</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.rechargeOrders.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.rechargeOrders.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.packageTitle}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${statusTone(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>{item.orderNo}</span>
                      <span>金额 CNY {formatNumber(item.amount, intlLocale)}</span>
                      <span>球币 {formatNumber(item.totalCoins, intlLocale)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt, intlLocale)}</p>
                  </div>
                ))}
                {workspace.rechargeOrders.length === 0 ? <p className="text-sm text-slate-500">暂无充值订单。</p> : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">会员订单</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Membership orders</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.membershipOrders.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.membershipOrders.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.planName}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${statusTone(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>CNY {formatNumber(item.amount, intlLocale)}</span>
                      <span>{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <>
                          <form action="/api/admin/orders/update-status" method="post">
                            <input type="hidden" name="intent" value="mark-paid" />
                            <input type="hidden" name="type" value="membership" />
                            <input type="hidden" name="orderId" value={item.id} />
                            <input type="hidden" name="paymentReference" value={item.paymentReference ?? item.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100">补单</button>
                          </form>
                          <form action="/api/admin/orders/update-status" method="post">
                            <input type="hidden" name="intent" value="close" />
                            <input type="hidden" name="type" value="membership" />
                            <input type="hidden" name="orderId" value={item.id} />
                            <input type="hidden" name="returnTo" value={returnTo} />
                            <button type="submit" className="rounded-full border border-white/12 px-3 py-1.5 text-sm text-slate-100">关闭</button>
                          </form>
                        </>
                      ) : null}
                      {item.status === "paid" ? (
                        <form action="/api/admin/orders/refund" method="post">
                          <input type="hidden" name="type" value="membership" />
                          <input type="hidden" name="orderId" value={item.id} />
                          <input type="hidden" name="reason" value="用户工作台退款操作" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100">退款</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
                {workspace.membershipOrders.length === 0 ? <p className="text-sm text-slate-500">暂无会员订单。</p> : null}
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="section-label">内容订单</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Content orders</h3>
                </div>
                <span className="text-sm text-slate-500">{workspace.contentOrders.length}</span>
              </div>
              <div className="mt-5 grid gap-3">
                {workspace.contentOrders.map((item) => (
                  <div key={item.id} className="rounded-[1.1rem] border border-white/8 bg-slate-950/35 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{item.contentTitle}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${statusTone(item.status)}`}>{item.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-300">
                      <span>CNY {formatNumber(item.amount, intlLocale)}</span>
                      <span>{formatDateTime(item.createdAt, intlLocale)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.status === "pending" ? (
                        <form action="/api/admin/orders/update-status" method="post">
                          <input type="hidden" name="intent" value="mark-paid" />
                          <input type="hidden" name="type" value="content" />
                          <input type="hidden" name="orderId" value={item.id} />
                          <input type="hidden" name="paymentReference" value={item.paymentReference ?? item.id} />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button type="submit" className="rounded-full border border-lime-300/25 bg-lime-300/10 px-3 py-1.5 text-sm text-lime-100">补单</button>
                        </form>
                      ) : null}
                      {item.status === "paid" ? (
                        <form action="/api/admin/orders/refund" method="post">
                          <input type="hidden" name="type" value="content" />
                          <input type="hidden" name="orderId" value={item.id} />
                          <input type="hidden" name="reason" value="用户工作台退款操作" />
                          <input type="hidden" name="returnTo" value={returnTo} />
                          <button type="submit" className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1.5 text-sm text-sky-100">退款</button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                ))}
                {workspace.contentOrders.length === 0 ? <p className="text-sm text-slate-500">暂无内容订单。</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
