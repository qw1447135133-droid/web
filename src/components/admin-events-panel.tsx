import Link from "next/link";
import { formatDateTime } from "@/lib/format";
import type { DisplayLocale, Locale } from "@/lib/i18n";
import type {
  AdminEventAuditRecord,
  AdminEventsDashboard,
  AdminLeagueRecord,
  AdminMatchRecord,
} from "@/lib/admin-events";

type EventsSportFilter = "all" | "football" | "basketball" | "cricket" | "esports";
type EventsLeagueStatusFilter = "all" | "active" | "inactive";
type EventsMatchStatusFilter = "all" | "live" | "upcoming" | "finished";
type EventsMatchVisibilityFilter = "all" | "visible" | "hidden";

type AdminEventsPanelProps = {
  locale: Locale | DisplayLocale;
  displayLocale: Locale | DisplayLocale;
  dashboard: AdminEventsDashboard;
  sportFilter: EventsSportFilter;
  leagueStatusFilter: EventsLeagueStatusFilter;
  matchStatusFilter: EventsMatchStatusFilter;
  matchVisibilityFilter: EventsMatchVisibilityFilter;
  auditStatusFilter: "all" | "success" | "failed";
  auditActionFilter: string;
  auditTargetTypeFilter: "all" | "league" | "match";
  auditQueryFilter: string;
  query: string;
  currentLeague?: AdminLeagueRecord;
  currentMatch?: AdminMatchRecord;
};

function setParam(params: URLSearchParams, key: string, value?: string) {
  if (!value) {
    return;
  }

  params.set(key, value);
}

function buildEventsHref(input: {
  sportFilter: EventsSportFilter;
  leagueStatusFilter: EventsLeagueStatusFilter;
  matchStatusFilter: EventsMatchStatusFilter;
  matchVisibilityFilter: EventsMatchVisibilityFilter;
  auditStatusFilter: "all" | "success" | "failed";
  auditActionFilter: string;
  auditTargetTypeFilter: "all" | "league" | "match";
  auditQueryFilter: string;
  query: string;
  editLeagueId?: string;
  editMatchId?: string;
}) {
  const params = new URLSearchParams();
  params.set("tab", "events");

  if (input.sportFilter !== "all") {
    params.set("eventsSport", input.sportFilter);
  }

  if (input.leagueStatusFilter !== "all") {
    params.set("eventsLeagueStatus", input.leagueStatusFilter);
  }

  if (input.matchStatusFilter !== "all") {
    params.set("eventsMatchStatus", input.matchStatusFilter);
  }

  if (input.matchVisibilityFilter !== "all") {
    params.set("eventsMatchVisibility", input.matchVisibilityFilter);
  }

  if (input.auditStatusFilter !== "all") {
    params.set("eventsAuditStatus", input.auditStatusFilter);
  }

  if (input.auditActionFilter && input.auditActionFilter !== "all") {
    params.set("eventsAuditAction", input.auditActionFilter);
  }

  if (input.auditTargetTypeFilter !== "all") {
    params.set("eventsAuditTargetType", input.auditTargetTypeFilter);
  }

  setParam(params, "eventsAuditQuery", input.auditQueryFilter.trim() || undefined);
  setParam(params, "eventsQuery", input.query.trim() || undefined);
  setParam(params, "editLeague", input.editLeagueId);
  setParam(params, "editMatch", input.editMatchId);

  return `/admin?${params.toString()}`;
}

function toDateTimeInputValue(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function getText(
  locale: Locale | DisplayLocale,
  value: {
    zhCN: string;
    zhTW: string;
    en: string;
  },
) {
  if (locale === "en") {
    return value.en;
  }

  if (locale === "zh-TW") {
    return value.zhTW;
  }

  return value.zhCN;
}

function getLeagueStatusLabel(locale: Locale | DisplayLocale, status: string) {
  if (status === "inactive") {
    return getText(locale, { zhCN: "停用", zhTW: "停用", en: "Inactive" });
  }

  return getText(locale, { zhCN: "启用", zhTW: "啟用", en: "Active" });
}

function getMatchVisibilityLabel(locale: Locale | DisplayLocale, visible: boolean) {
  return visible
    ? getText(locale, { zhCN: "前台可见", zhTW: "前台可見", en: "Visible" })
    : getText(locale, { zhCN: "前台隐藏", zhTW: "前台隱藏", en: "Hidden" });
}

function getSourceLabel(locale: Locale | DisplayLocale, source: string) {
  if (source === "manual") {
    return getText(locale, { zhCN: "人工", zhTW: "人工", en: "Manual" });
  }

  return getText(locale, { zhCN: "同步", zhTW: "同步", en: "Synced" });
}

function getAuditActionLabel(locale: Locale | DisplayLocale, action: string) {
  switch (action) {
    case "save-admin-league":
      return getText(locale, { zhCN: "保存联赛", zhTW: "保存聯賽", en: "Saved league" });
    case "toggle-admin-league-status":
      return getText(locale, { zhCN: "切换联赛状态", zhTW: "切換聯賽狀態", en: "Toggled league status" });
    case "toggle-admin-league-featured":
      return getText(locale, { zhCN: "切换热门联赛", zhTW: "切換熱門聯賽", en: "Toggled featured league" });
    case "move-admin-league-up":
      return getText(locale, { zhCN: "联赛上移", zhTW: "聯賽上移", en: "Moved league up" });
    case "move-admin-league-down":
      return getText(locale, { zhCN: "联赛下移", zhTW: "聯賽下移", en: "Moved league down" });
    case "clear-admin-league-override":
      return getText(locale, { zhCN: "清除联赛覆盖", zhTW: "清除聯賽覆寫", en: "Cleared league override" });
    case "save-admin-match":
      return getText(locale, { zhCN: "保存赛事", zhTW: "保存賽事", en: "Saved match" });
    case "toggle-admin-match-visibility":
      return getText(locale, { zhCN: "切换赛事可见性", zhTW: "切換賽事可見性", en: "Toggled match visibility" });
    case "clear-admin-match-override":
      return getText(locale, { zhCN: "清除赛事覆盖", zhTW: "清除賽事覆寫", en: "Cleared match override" });
    default:
      return action;
  }
}

function getAuditScopeLabel(locale: Locale | DisplayLocale, scope: string) {
  switch (scope) {
    case "events.leagues":
      return getText(locale, { zhCN: "联赛管理", zhTW: "聯賽管理", en: "League admin" });
    case "events.matches":
      return getText(locale, { zhCN: "赛事管理", zhTW: "賽事管理", en: "Match admin" });
    default:
      return scope;
  }
}

function getAuditStatusMeta(locale: Locale | DisplayLocale, status: string) {
  if (status === "failed") {
    return {
      label: getText(locale, { zhCN: "失败", zhTW: "失敗", en: "Failed" }),
      classes: "border-rose-300/20 bg-rose-400/10 text-rose-100",
    };
  }

  return {
    label: getText(locale, { zhCN: "成功", zhTW: "成功", en: "Success" }),
    classes: "border-lime-300/20 bg-lime-300/10 text-lime-100",
  };
}

function getAuditTargetTypeLabel(locale: Locale | DisplayLocale, targetType?: string) {
  if (targetType === "league") {
    return getText(locale, { zhCN: "联赛", zhTW: "聯賽", en: "League" });
  }

  if (targetType === "match") {
    return getText(locale, { zhCN: "赛事", zhTW: "賽事", en: "Match" });
  }

  return targetType ?? getText(locale, { zhCN: "未绑定对象", zhTW: "未綁定對象", en: "Unbound" });
}

function getAuditDetailKeyLabel(locale: Locale | DisplayLocale, key: string) {
  switch (key) {
    case "op":
      return getText(locale, { zhCN: "操作", zhTW: "操作", en: "Operation" });
    case "status":
      return getText(locale, { zhCN: "状态", zhTW: "狀態", en: "Status" });
    case "before":
      return getText(locale, { zhCN: "变更前", zhTW: "變更前", en: "Before" });
    case "after":
      return getText(locale, { zhCN: "变更后", zhTW: "變更後", en: "After" });
    case "name":
      return getText(locale, { zhCN: "名称", zhTW: "名稱", en: "Name" });
    case "displayName":
      return getText(locale, { zhCN: "显示名", zhTW: "顯示名", en: "Display name" });
    case "sport":
      return getText(locale, { zhCN: "运动", zhTW: "運動", en: "Sport" });
    case "slug":
      return "Slug";
    case "region":
      return getText(locale, { zhCN: "地区", zhTW: "地區", en: "Region" });
    case "season":
      return getText(locale, { zhCN: "赛季", zhTW: "賽季", en: "Season" });
    case "featured":
      return getText(locale, { zhCN: "热门", zhTW: "熱門", en: "Featured" });
    case "sortOrder":
      return getText(locale, { zhCN: "排序", zhTW: "排序", en: "Sort order" });
    case "direction":
      return getText(locale, { zhCN: "方向", zhTW: "方向", en: "Direction" });
    case "cleared":
      return getText(locale, { zhCN: "清除字段", zhTW: "清除欄位", en: "Cleared fields" });
    case "home":
      return getText(locale, { zhCN: "主队", zhTW: "主隊", en: "Home" });
    case "away":
      return getText(locale, { zhCN: "客队", zhTW: "客隊", en: "Away" });
    case "league":
      return getText(locale, { zhCN: "联赛", zhTW: "聯賽", en: "League" });
    case "leagueId":
      return "League ID";
    case "kickoff":
      return getText(locale, { zhCN: "开赛时间", zhTW: "開賽時間", en: "Kickoff" });
    case "visible":
      return getText(locale, { zhCN: "前台可见", zhTW: "前台可見", en: "Visible" });
    case "venue":
      return getText(locale, { zhCN: "场地", zhTW: "場地", en: "Venue" });
    case "clock":
      return getText(locale, { zhCN: "比赛时钟", zhTW: "比賽時鐘", en: "Clock" });
    case "error":
      return getText(locale, { zhCN: "错误", zhTW: "錯誤", en: "Error" });
    default:
      return key;
  }
}

function parseAuditDetail(detail?: string) {
  if (!detail) {
    return { structured: false, entries: [] as Array<{ key: string; value: string }> };
  }

  const parts = detail
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);

  let structured = false;
  const entries = parts.map((part) => {
    const equalIndex = part.indexOf("=");
    const colonIndex = part.indexOf(":");
    const separatorIndex =
      equalIndex >= 0 && colonIndex >= 0 ? Math.min(equalIndex, colonIndex) : Math.max(equalIndex, colonIndex);

    if (separatorIndex > 0) {
      structured = true;
      return {
        key: part.slice(0, separatorIndex).trim(),
        value: part.slice(separatorIndex + 1).trim(),
      };
    }

    return {
      key: "detail",
      value: part,
    };
  });

  return { structured, entries };
}

function getAuditTargetHref(
  auditLog: AdminEventAuditRecord,
  routeState: {
    sportFilter: EventsSportFilter;
    leagueStatusFilter: EventsLeagueStatusFilter;
    matchStatusFilter: EventsMatchStatusFilter;
    matchVisibilityFilter: EventsMatchVisibilityFilter;
    auditStatusFilter: "all" | "success" | "failed";
    auditActionFilter: string;
    auditTargetTypeFilter: "all" | "league" | "match";
    auditQueryFilter: string;
    query: string;
  },
) {
  if (!auditLog.targetId) {
    return undefined;
  }

  if (auditLog.targetType === "league") {
    return buildEventsHref({ ...routeState, editLeagueId: auditLog.targetId });
  }

  if (auditLog.targetType === "match") {
    return buildEventsHref({ ...routeState, editMatchId: auditLog.targetId });
  }

  return undefined;
}

function EventAuditQueue({
  locale,
  displayLocale,
  auditLogs,
  routeState,
  auditActionOptions,
}: {
  locale: Locale | DisplayLocale;
  displayLocale: Locale | DisplayLocale;
  auditLogs: AdminEventAuditRecord[];
  routeState: {
    sportFilter: EventsSportFilter;
    leagueStatusFilter: EventsLeagueStatusFilter;
    matchStatusFilter: EventsMatchStatusFilter;
    matchVisibilityFilter: EventsMatchVisibilityFilter;
    auditStatusFilter: "all" | "success" | "failed";
    auditActionFilter: string;
    auditTargetTypeFilter: "all" | "league" | "match";
    auditQueryFilter: string;
    query: string;
  };
  auditActionOptions: string[];
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="section-label">{getText(locale, { zhCN: "操作审计", zhTW: "操作審計", en: "Audit trail" })}</p>
          <h3 className="mt-2 text-xl font-semibold text-white">
            {getText(locale, { zhCN: "最近联赛/赛事操作", zhTW: "最近聯賽/賽事操作", en: "Recent league and match actions" })}
          </h3>
        </div>
        <span className="text-sm text-slate-500">{auditLogs.length}</span>
      </div>
      <form action="/admin" method="get" className="mt-5 grid gap-3 md:grid-cols-5">
        <input type="hidden" name="tab" value="events" />
        <input type="hidden" name="eventsSport" value={routeState.sportFilter} />
        <input type="hidden" name="eventsLeagueStatus" value={routeState.leagueStatusFilter} />
        <input type="hidden" name="eventsMatchStatus" value={routeState.matchStatusFilter} />
        <input type="hidden" name="eventsMatchVisibility" value={routeState.matchVisibilityFilter} />
        <input type="hidden" name="eventsQuery" value={routeState.query} />
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{getText(locale, { zhCN: "结果", zhTW: "結果", en: "Result" })}</span>
          <select name="eventsAuditStatus" defaultValue={routeState.auditStatusFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
            <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
            <option value="success">{getText(locale, { zhCN: "成功", zhTW: "成功", en: "Success" })}</option>
            <option value="failed">{getText(locale, { zhCN: "失败", zhTW: "失敗", en: "Failed" })}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{getText(locale, { zhCN: "动作", zhTW: "動作", en: "Action" })}</span>
          <select name="eventsAuditAction" defaultValue={routeState.auditActionFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
            <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
            {auditActionOptions.map((action) => (
              <option key={`audit-action-${action}`} value={action}>
                {getAuditActionLabel(locale, action)}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{getText(locale, { zhCN: "对象类型", zhTW: "對象類型", en: "Target type" })}</span>
          <select name="eventsAuditTargetType" defaultValue={routeState.auditTargetTypeFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
            <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
            <option value="league">{getText(locale, { zhCN: "联赛", zhTW: "聯賽", en: "League" })}</option>
            <option value="match">{getText(locale, { zhCN: "赛事", zhTW: "賽事", en: "Match" })}</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm text-slate-300">
          <span>{getText(locale, { zhCN: "审计关键词", zhTW: "審計關鍵詞", en: "Audit keyword" })}</span>
          <input
            name="eventsAuditQuery"
            defaultValue={routeState.auditQueryFilter}
            placeholder={getText(locale, {
              zhCN: "动作 / 操作人 / 详情 / IP",
              zhTW: "動作 / 操作人 / 詳情 / IP",
              en: "Action / actor / detail / IP",
            })}
            className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
          />
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/20">
            {getText(locale, { zhCN: "筛选审计", zhTW: "篩選審計", en: "Filter audit" })}
          </button>
          <Link
            href={buildEventsHref({
              ...routeState,
              auditStatusFilter: "all",
              auditActionFilter: "all",
              auditTargetTypeFilter: "all",
              auditQueryFilter: "",
            })}
            className="rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
          >
            {getText(locale, { zhCN: "重置", zhTW: "重設", en: "Reset" })}
          </Link>
        </div>
      </form>
      <div className="mt-5 grid gap-4">
        {auditLogs.map((item) => {
          const statusMeta = getAuditStatusMeta(locale, item.status);
          const targetHref = getAuditTargetHref(item, routeState);
          const detail = parseAuditDetail(item.detail);

          return (
            <div key={item.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-white">{getAuditActionLabel(locale, item.action)}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {getAuditScopeLabel(locale, item.scope)}
                    {item.targetType ? ` · ${getAuditTargetTypeLabel(locale, item.targetType)}` : ""}
                    {item.targetLabel ? ` · ${item.targetLabel}` : item.targetId ? ` · ${item.targetId.slice(0, 8)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {targetHref ? (
                    <Link
                      href={targetHref}
                      className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-200 transition hover:border-white/25 hover:text-white"
                    >
                      {getText(locale, { zhCN: "打开对象", zhTW: "打開對象", en: "Open target" })}
                    </Link>
                  ) : null}
                  <span className={`rounded-full border px-3 py-1 text-xs ${statusMeta.classes}`}>{statusMeta.label}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>
                  {getText(locale, { zhCN: "操作人", zhTW: "操作人", en: "Actor" })} {item.actorDisplayName} / {item.actorRole}
                </span>
                <span>
                  {getText(locale, { zhCN: "时间", zhTW: "時間", en: "Time" })} {formatDateTime(item.createdAt, displayLocale)}
                </span>
                {item.ipAddress ? <span>IP {item.ipAddress}</span> : null}
              </div>
              {detail.structured ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detail.entries.map((entry, index) => (
                    <span
                      key={`${item.id}-detail-${entry.key}-${index}`}
                      className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-xs text-slate-200"
                    >
                      <span className="text-slate-400">{getAuditDetailKeyLabel(locale, entry.key)}</span> {entry.value}
                    </span>
                  ))}
                </div>
              ) : item.detail ? (
                <p className="mt-3 text-sm text-slate-300">{item.detail}</p>
              ) : null}
            </div>
          );
        })}
        {auditLogs.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">
            {getText(locale, { zhCN: "最近暂无赛事后台操作记录。", zhTW: "最近暫無賽事後台操作記錄。", en: "No recent event admin actions." })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminEventsPanel({
  locale,
  displayLocale,
  dashboard,
  sportFilter,
  leagueStatusFilter,
  matchStatusFilter,
  matchVisibilityFilter,
  auditStatusFilter,
  auditActionFilter,
  auditTargetTypeFilter,
  auditQueryFilter,
  query,
  currentLeague,
  currentMatch,
}: AdminEventsPanelProps) {
  const routeState = {
    sportFilter,
    leagueStatusFilter,
    matchStatusFilter,
    matchVisibilityFilter,
    auditStatusFilter,
    auditActionFilter,
    auditTargetTypeFilter,
    auditQueryFilter,
    query,
  };
  const metrics = [
    {
      label: getText(locale, { zhCN: "联赛总数", zhTW: "聯賽總數", en: "Total leagues" }),
      value: dashboard.metrics.totalLeagues,
      description: getText(locale, {
        zhCN: "当前后台可管理的联赛条目总数。",
        zhTW: "當前後台可管理的聯賽條目總數。",
        en: "Total league records currently managed in admin.",
      }),
    },
    {
      label: getText(locale, { zhCN: "启用联赛", zhTW: "啟用聯賽", en: "Active leagues" }),
      value: dashboard.metrics.activeLeagues,
      description: getText(locale, {
        zhCN: "前台资料库与直播聚合优先读取的联赛数。",
        zhTW: "前台資料庫與直播聚合優先讀取的聯賽數。",
        en: "League records actively available to the site.",
      }),
    },
    {
      label: getText(locale, { zhCN: "人工联赛", zhTW: "人工聯賽", en: "Manual leagues" }),
      value: dashboard.metrics.manualLeagues,
      description: getText(locale, {
        zhCN: "由运营新增而非同步写入的联赛数。",
        zhTW: "由運營新增而非同步寫入的聯賽數。",
        en: "League records created manually by ops.",
      }),
    },
    {
      label: getText(locale, { zhCN: "赛事总数", zhTW: "賽事總數", en: "Total matches" }),
      value: dashboard.metrics.totalMatches,
      description: getText(locale, {
        zhCN: "当前赛事库内可维护的比赛总量。",
        zhTW: "當前賽事庫內可維護的比賽總量。",
        en: "Total match records available in the workspace.",
      }),
    },
    {
      label: getText(locale, { zhCN: "前台可见", zhTW: "前台可見", en: "Visible matches" }),
      value: dashboard.metrics.visibleMatches,
      description: getText(locale, {
        zhCN: "当前允许在前台展示的赛事数量。",
        zhTW: "當前允許在前台展示的賽事數量。",
        en: "Matches currently allowed to render on the site.",
      }),
    },
    {
      label: getText(locale, { zhCN: "人工赛事", zhTW: "人工賽事", en: "Manual matches" }),
      value: dashboard.metrics.manualMatches,
      description: getText(locale, {
        zhCN: "由运营补录建立的赛事数量。",
        zhTW: "由運營補錄建立的賽事數量。",
        en: "Match records created manually by ops.",
      }),
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="section-label">{getText(locale, { zhCN: "运营过滤", zhTW: "運營過濾", en: "Ops filters" })}</p>
            <h3 className="mt-2 text-xl font-semibold text-white">
              {getText(locale, {
                zhCN: "联赛与赛事正式管理",
                zhTW: "聯賽與賽事正式管理",
                en: "League and match control",
              })}
            </h3>
          </div>
          <Link
            href={buildEventsHref(routeState)}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
          >
            {getText(locale, { zhCN: "重置", zhTW: "重設", en: "Reset" })}
          </Link>
        </div>
        <form action="/admin" method="get" className="mt-5 grid gap-4 md:grid-cols-5">
          <input type="hidden" name="tab" value="events" />
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{getText(locale, { zhCN: "运动", zhTW: "運動", en: "Sport" })}</span>
            <select name="eventsSport" defaultValue={sportFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
              <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option value="cricket">Cricket</option>
              <option value="esports">Esports</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{getText(locale, { zhCN: "联赛状态", zhTW: "聯賽狀態", en: "League status" })}</span>
            <select name="eventsLeagueStatus" defaultValue={leagueStatusFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
              <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
              <option value="active">{getText(locale, { zhCN: "启用", zhTW: "啟用", en: "Active" })}</option>
              <option value="inactive">{getText(locale, { zhCN: "停用", zhTW: "停用", en: "Inactive" })}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{getText(locale, { zhCN: "赛事状态", zhTW: "賽事狀態", en: "Match status" })}</span>
            <select name="eventsMatchStatus" defaultValue={matchStatusFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
              <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
              <option value="live">{getText(locale, { zhCN: "进行中", zhTW: "進行中", en: "Live" })}</option>
              <option value="upcoming">{getText(locale, { zhCN: "未开赛", zhTW: "未開賽", en: "Upcoming" })}</option>
              <option value="finished">{getText(locale, { zhCN: "已完场", zhTW: "已完場", en: "Finished" })}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{getText(locale, { zhCN: "赛事可见性", zhTW: "賽事可見性", en: "Match visibility" })}</span>
            <select name="eventsMatchVisibility" defaultValue={matchVisibilityFilter} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
              <option value="all">{getText(locale, { zhCN: "全部", zhTW: "全部", en: "All" })}</option>
              <option value="visible">{getText(locale, { zhCN: "可见", zhTW: "可見", en: "Visible" })}</option>
              <option value="hidden">{getText(locale, { zhCN: "隐藏", zhTW: "隱藏", en: "Hidden" })}</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-300">
            <span>{getText(locale, { zhCN: "关键词", zhTW: "關鍵詞", en: "Keyword" })}</span>
            <div className="flex gap-2">
              <input name="eventsQuery" defaultValue={query} className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              <button type="submit" className="rounded-2xl border border-orange-300/25 bg-orange-400/10 px-4 py-3 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/20">
                OK
              </button>
            </div>
          </label>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="section-label">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
            <p className="mt-2 text-sm text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>

      <EventAuditQueue
        locale={locale}
        displayLocale={displayLocale}
        auditLogs={dashboard.auditLogs}
        routeState={routeState}
        auditActionOptions={dashboard.auditActionOptions}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <form action="/api/admin/events" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">{getText(locale, { zhCN: "联赛管理", zhTW: "聯賽管理", en: "League admin" })}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {currentLeague
                  ? getText(locale, { zhCN: "编辑联赛", zhTW: "編輯聯賽", en: "Edit league" })
                  : getText(locale, { zhCN: "新增联赛", zhTW: "新增聯賽", en: "Create league" })}
              </h3>
            </div>
            {currentLeague ? (
              <Link
                href={buildEventsHref(routeState)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
              >
                {getText(locale, { zhCN: "取消编辑", zhTW: "取消編輯", en: "Cancel" })}
              </Link>
            ) : null}
          </div>
          <input type="hidden" name="intent" value="save-league" />
          <input type="hidden" name="id" value={currentLeague?.id ?? ""} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Sport</span>
              <select name="sport" defaultValue={currentLeague?.sport ?? (sportFilter !== "all" ? sportFilter : "football")} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="football">Football</option>
                <option value="basketball">Basketball</option>
                <option value="cricket">Cricket</option>
                <option value="esports">Esports</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>Slug</span>
              <input name="slug" defaultValue={currentLeague?.slug ?? ""} placeholder="premier-league" className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "联赛名称", zhTW: "聯賽名稱", en: "League name" })}</span>
              <input name="name" required defaultValue={currentLeague?.name ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "展示名", zhTW: "展示名", en: "Display name" })}</span>
              <input name="displayName" defaultValue={currentLeague?.displayName ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "地区", zhTW: "地區", en: "Region" })}</span>
              <input name="region" required defaultValue={currentLeague?.region ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "赛季", zhTW: "賽季", en: "Season" })}</span>
              <input name="season" required defaultValue={currentLeague?.season ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "状态", zhTW: "狀態", en: "Status" })}</span>
              <select name="status" defaultValue={currentLeague?.status ?? "active"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="active">{getText(locale, { zhCN: "启用", zhTW: "啟用", en: "Active" })}</option>
                <option value="inactive">{getText(locale, { zhCN: "停用", zhTW: "停用", en: "Inactive" })}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "排序", zhTW: "排序", en: "Sort order" })}</span>
              <input name="sortOrder" type="number" defaultValue={currentLeague?.sortOrder ?? 10} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2">
              <input type="checkbox" name="featured" defaultChecked={currentLeague?.featured ?? false} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" />
              <span>{getText(locale, { zhCN: "设为热门联赛", zhTW: "設為熱門聯賽", en: "Mark as featured" })}</span>
            </label>
            <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
              <span>{getText(locale, { zhCN: "运营备注", zhTW: "運營備註", en: "Ops note" })}</span>
              <textarea name="adminNote" rows={3} defaultValue={currentLeague?.adminNote ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/45 hover:bg-orange-400/20">
            {getText(locale, { zhCN: "保存联赛", zhTW: "保存聯賽", en: "Save league" })}
          </button>
        </form>

        <form action="/api/admin/events" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">{getText(locale, { zhCN: "赛事补录", zhTW: "賽事補錄", en: "Match admin" })}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">
                {currentMatch
                  ? getText(locale, { zhCN: "编辑赛事", zhTW: "編輯賽事", en: "Edit match" })
                  : getText(locale, { zhCN: "新增赛事", zhTW: "新增賽事", en: "Create match" })}
              </h3>
            </div>
            {currentMatch ? (
              <Link
                href={buildEventsHref(routeState)}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/25 hover:text-white"
              >
                {getText(locale, { zhCN: "取消编辑", zhTW: "取消編輯", en: "Cancel" })}
              </Link>
            ) : null}
          </div>
          <input type="hidden" name="intent" value="save-match" />
          <input type="hidden" name="id" value={currentMatch?.id ?? ""} />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
              <span>{getText(locale, { zhCN: "所属联赛", zhTW: "所屬聯賽", en: "League" })}</span>
              <select name="leagueId" defaultValue={currentMatch?.leagueId ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="">{getText(locale, { zhCN: "请选择联赛", zhTW: "請選擇聯賽", en: "Select league" })}</option>
                {dashboard.leagueOptions.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "主队", zhTW: "主隊", en: "Home team" })}</span>
              <input name="homeTeamName" required defaultValue={currentMatch?.homeTeamName ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "客队", zhTW: "客隊", en: "Away team" })}</span>
              <input name="awayTeamName" required defaultValue={currentMatch?.awayTeamName ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "开赛时间", zhTW: "開賽時間", en: "Kickoff" })}</span>
              <input name="kickoff" type="datetime-local" defaultValue={toDateTimeInputValue(currentMatch?.kickoff)} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "状态", zhTW: "狀態", en: "Status" })}</span>
              <select name="status" defaultValue={currentMatch?.status ?? "upcoming"} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                <option value="upcoming">upcoming</option>
                <option value="live">live</option>
                <option value="finished">finished</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "比赛时钟", zhTW: "比賽時鐘", en: "Clock" })}</span>
              <input name="clock" defaultValue={currentMatch?.clock ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "场地", zhTW: "場地", en: "Venue" })}</span>
              <input name="venue" defaultValue={currentMatch?.venue ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "主队得分", zhTW: "主隊得分", en: "Home score" })}</span>
              <input name="homeScore" type="number" defaultValue={currentMatch?.homeScore ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "客队得分", zhTW: "客隊得分", en: "Away score" })}</span>
              <input name="awayScore" type="number" defaultValue={currentMatch?.awayScore ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "比分摘要", zhTW: "比分摘要", en: "Score text" })}</span>
              <input name="scoreText" defaultValue={currentMatch?.scoreText ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300">
              <span>{getText(locale, { zhCN: "数据摘要", zhTW: "數據摘要", en: "Stat line" })}</span>
              <input name="statLine" defaultValue={currentMatch?.statLine ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
              <span>{getText(locale, { zhCN: "运营解读", zhTW: "運營解讀", en: "Insight" })}</span>
              <textarea name="insight" rows={3} defaultValue={currentMatch?.insight ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
            <label className="flex items-center gap-3 text-sm text-slate-300 md:col-span-2">
              <input type="checkbox" name="adminVisible" defaultChecked={currentMatch?.adminVisible ?? true} className="h-4 w-4 rounded border border-white/15 bg-slate-950/60" />
              <span>{getText(locale, { zhCN: "前台可见", zhTW: "前台可見", en: "Visible on site" })}</span>
            </label>
            <div className="grid gap-4 md:col-span-2 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Odds home</span>
                <input name="oddsHome" type="number" step="0.01" defaultValue={currentMatch?.latestOdds?.home ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Odds draw</span>
                <input name="oddsDraw" type="number" step="0.01" defaultValue={currentMatch?.latestOdds?.draw ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Odds away</span>
                <input name="oddsAway" type="number" step="0.01" defaultValue={currentMatch?.latestOdds?.away ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Spread</span>
                <input name="oddsSpread" defaultValue={currentMatch?.latestOdds?.spread ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Total</span>
                <input name="oddsTotal" defaultValue={currentMatch?.latestOdds?.total ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                <span>Bookmaker</span>
                <input name="bookmaker" defaultValue={currentMatch?.latestOdds?.bookmaker ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-slate-300 md:col-span-2">
              <span>{getText(locale, { zhCN: "运营备注", zhTW: "運營備註", en: "Ops note" })}</span>
              <textarea name="adminNote" rows={2} defaultValue={currentMatch?.adminNote ?? ""} className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
            </label>
          </div>
          <button type="submit" className="mt-5 rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/45 hover:bg-orange-400/20">
            {getText(locale, { zhCN: "保存赛事", zhTW: "保存賽事", en: "Save match" })}
          </button>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">{getText(locale, { zhCN: "联赛列表", zhTW: "聯賽列表", en: "League queue" })}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{getText(locale, { zhCN: "正式 CRUD", zhTW: "正式 CRUD", en: "Formal CRUD" })}</h3>
            </div>
            <span className="text-sm text-slate-500">{dashboard.leagues.length}</span>
          </div>
          <div className="mt-5 grid gap-4">
            {dashboard.leagues.map((league) => (
              <div key={league.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{league.displayName ?? league.name}</p>
                    <p className="mt-2 text-sm text-slate-400">{league.slug} / {league.region} / {league.season}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{getSourceLabel(locale, league.source)}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{league.sport}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{getLeagueStatusLabel(locale, league.status)}</span>
                    {league.featured ? <span className="rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-lime-100">{getText(locale, { zhCN: "热门", zhTW: "熱門", en: "Featured" })}</span> : null}
                    {league.adminLockedFields.length > 0 ? <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">{getText(locale, { zhCN: "已锁定", zhTW: "已鎖定", en: "Locked" })}</span> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Teams {league.teamCount}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Matches {league.matchCount}</span>
                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">Sort {league.sortOrder}</span>
                </div>
                {league.adminNote ? <p className="mt-3 text-sm text-sky-100">{league.adminNote}</p> : null}
                <p className="mt-3 text-xs text-slate-500">
                  {getText(locale, { zhCN: "最近更新", zhTW: "最近更新", en: "Updated" })} {formatDateTime(league.updatedAt, displayLocale)}
                  {league.lastSyncedAt ? ` / Sync ${formatDateTime(league.lastSyncedAt, displayLocale)}` : ""}
                </p>
                {league.latestAudit ? (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                    <p className="text-slate-200">
                      {getText(locale, { zhCN: "最近操作", zhTW: "最近操作", en: "Latest action" })}: {getAuditActionLabel(locale, league.latestAudit.action)}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {league.latestAudit.actorDisplayName} · {formatDateTime(league.latestAudit.createdAt, displayLocale)}
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={buildEventsHref({ ...routeState, editLeagueId: league.id })} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">{getText(locale, { zhCN: "编辑", zhTW: "編輯", en: "Edit" })}</Link>
                  <form action="/api/admin/events" method="post">
                    <input type="hidden" name="intent" value="toggle-league-status" />
                    <input type="hidden" name="id" value={league.id} />
                    <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                      {league.status === "active" ? getText(locale, { zhCN: "停用", zhTW: "停用", en: "Disable" }) : getText(locale, { zhCN: "启用", zhTW: "啟用", en: "Enable" })}
                    </button>
                  </form>
                  <form action="/api/admin/events" method="post">
                    <input type="hidden" name="intent" value="toggle-league-featured" />
                    <input type="hidden" name="id" value={league.id} />
                    <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                      {league.featured ? getText(locale, { zhCN: "取消热门", zhTW: "取消熱門", en: "Unfeature" }) : getText(locale, { zhCN: "设为热门", zhTW: "設為熱門", en: "Feature" })}
                    </button>
                  </form>
                  <form action="/api/admin/events" method="post">
                    <input type="hidden" name="intent" value="move-league" />
                    <input type="hidden" name="direction" value="up" />
                    <input type="hidden" name="id" value={league.id} />
                    <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">{getText(locale, { zhCN: "上移", zhTW: "上移", en: "Up" })}</button>
                  </form>
                  <form action="/api/admin/events" method="post">
                    <input type="hidden" name="intent" value="move-league" />
                    <input type="hidden" name="direction" value="down" />
                    <input type="hidden" name="id" value={league.id} />
                    <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">{getText(locale, { zhCN: "下移", zhTW: "下移", en: "Down" })}</button>
                  </form>
                  {league.source !== "manual" && league.adminLockedFields.length > 0 ? (
                    <form action="/api/admin/events" method="post">
                      <input type="hidden" name="intent" value="clear-league-override" />
                      <input type="hidden" name="id" value={league.id} />
                      <button type="submit" className="rounded-full border border-orange-300/20 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:text-orange-50">{getText(locale, { zhCN: "解除锁定", zhTW: "解除鎖定", en: "Unlock" })}</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
            {dashboard.leagues.length === 0 ? <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">{getText(locale, { zhCN: "暂无联赛数据。", zhTW: "暫無聯賽資料。", en: "No league records." })}</div> : null}
          </div>
        </div>
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="section-label">{getText(locale, { zhCN: "赛事列表", zhTW: "賽事列表", en: "Match queue" })}</p>
              <h3 className="mt-2 text-xl font-semibold text-white">{getText(locale, { zhCN: "补录与覆盖", zhTW: "補錄與覆蓋", en: "Manual fill and override" })}</h3>
            </div>
            <span className="text-sm text-slate-500">{dashboard.matches.length}</span>
          </div>
          <div className="mt-5 grid gap-4">
            {dashboard.matches.map((match) => (
              <div key={match.id} className="rounded-[1.2rem] border border-white/8 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{match.homeTeamName} vs {match.awayTeamName}</p>
                    <p className="mt-2 text-sm text-slate-400">{match.leagueName} / {formatDateTime(match.kickoff, displayLocale)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{getSourceLabel(locale, match.source)}</span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-slate-200">{match.status}</span>
                    <span className={`rounded-full px-3 py-1 ${match.adminVisible ? "border border-lime-300/20 bg-lime-300/10 text-lime-100" : "border border-white/10 bg-white/[0.04] text-slate-200"}`}>{getMatchVisibilityLabel(locale, match.adminVisible)}</span>
                    {match.adminLockedFields.length > 0 ? <span className="rounded-full border border-orange-300/20 bg-orange-300/10 px-3 py-1 text-orange-100">{getText(locale, { zhCN: "已锁定", zhTW: "已鎖定", en: "Locked" })}</span> : null}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
                  {match.scoreText ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{match.scoreText}</span> : null}
                  {match.statLine ? <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{match.statLine}</span> : null}
                  {match.latestOdds ? <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-cyan-100">Odds {match.latestOdds.home ?? "-"} / {match.latestOdds.draw ?? "-"} / {match.latestOdds.away ?? "-"}</span> : null}
                </div>
                {match.insight ? <p className="mt-3 text-sm text-slate-300">{match.insight}</p> : null}
                {match.adminNote ? <p className="mt-2 text-sm text-sky-100">{match.adminNote}</p> : null}
                <p className="mt-3 text-xs text-slate-500">
                  {getText(locale, { zhCN: "最近更新", zhTW: "最近更新", en: "Updated" })} {formatDateTime(match.updatedAt, displayLocale)}
                  {match.lastSyncedAt ? ` / Sync ${formatDateTime(match.lastSyncedAt, displayLocale)}` : ""}
                </p>
                {match.latestAudit ? (
                  <div className="mt-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                    <p className="text-slate-200">
                      {getText(locale, { zhCN: "最近操作", zhTW: "最近操作", en: "Latest action" })}: {getAuditActionLabel(locale, match.latestAudit.action)}
                    </p>
                    <p className="mt-1 text-slate-400">
                      {match.latestAudit.actorDisplayName} · {formatDateTime(match.latestAudit.createdAt, displayLocale)}
                    </p>
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href={buildEventsHref({ ...routeState, editMatchId: match.id })} className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">{getText(locale, { zhCN: "编辑", zhTW: "編輯", en: "Edit" })}</Link>
                  <form action="/api/admin/events" method="post">
                    <input type="hidden" name="intent" value="toggle-match-visibility" />
                    <input type="hidden" name="id" value={match.id} />
                    <button type="submit" className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white">
                      {match.adminVisible ? getText(locale, { zhCN: "前台隐藏", zhTW: "前台隱藏", en: "Hide" }) : getText(locale, { zhCN: "前台显示", zhTW: "前台顯示", en: "Show" })}
                    </button>
                  </form>
                  {match.source !== "manual" && match.adminLockedFields.length > 0 ? (
                    <form action="/api/admin/events" method="post">
                      <input type="hidden" name="intent" value="clear-match-override" />
                      <input type="hidden" name="id" value={match.id} />
                      <button type="submit" className="rounded-full border border-orange-300/20 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:text-orange-50">{getText(locale, { zhCN: "解除锁定", zhTW: "解除鎖定", en: "Unlock" })}</button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
            {dashboard.matches.length === 0 ? <div className="rounded-[1.2rem] border border-dashed border-white/12 bg-white/[0.02] p-5 text-sm text-slate-400">{getText(locale, { zhCN: "暂无赛事数据。", zhTW: "暫無賽事資料。", en: "No match records." })}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
