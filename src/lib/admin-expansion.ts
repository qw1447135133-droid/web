import type { Locale } from "@/lib/i18n-config";

type Tone = "good" | "warn" | "neutral";

export type MetricCard = { label: string; value: string; description: string };
export type RowCard = { title: string; subtitle?: string; status?: string; tone?: Tone; meta?: string[] };
export type ParamRow = { label: string; value: string; hint?: string };

export type AdminExpansionData = {
  users: { title: string; description: string; detailCards: Array<{ title: string; items: string[] }> };
  events: {
    title: string;
    description: string;
    dataSources: { title: string; rows: RowCard[] };
    manualPatches: { title: string; rows: RowCard[] };
    leagues: { title: string; rows: RowCard[] };
  };
  finance: {
    eyebrow: string;
    title: string;
    description: string;
    metrics: MetricCard[];
    coinPackages: { title: string; rows: RowCard[] };
    rechargeOrders: { title: string; rows: RowCard[] };
    settlements: { title: string; rows: RowCard[] };
  };
  agents: {
    eyebrow: string;
    title: string;
    description: string;
    metrics: MetricCard[];
    applications: { title: string; rows: RowCard[] };
    roster: { title: string; rows: RowCard[] };
    campaigns: { title: string; rows: RowCard[] };
    withdrawals: { title: string; rows: RowCard[] };
  };
  system: {
    eyebrow: string;
    title: string;
    description: string;
    roleMatrix: { title: string; rows: RowCard[] };
    auditLogs: { title: string; rows: RowCard[] };
    alerts: { title: string; rows: RowCard[] };
    parameters: { title: string; rows: ParamRow[] };
  };
  reports: {
    eyebrow: string;
    title: string;
    description: string;
    metrics: MetricCard[];
    boards: { title: string; rows: RowCard[] };
    exports: { title: string; rows: RowCard[] };
  };
};

export function getExpansionToneClass(tone: Tone = "neutral") {
  if (tone === "good") return "bg-lime-300/12 text-lime-100";
  if (tone === "warn") return "bg-orange-300/12 text-orange-100";
  return "bg-white/8 text-slate-300";
}

const data: Record<Locale, AdminExpansionData> = {
  "zh-CN": {
    users: {
      title: "会员生命周期补充",
      description: "补上规格文档里会员详情、球币调整、登录日志和代理归属这些关键后台视图。",
      detailCards: [
        { title: "会员详情", items: ["基础资料与认证状态", "球币余额与到期提醒", "已解锁文章与赛事关联", "代理归属路径"] },
        { title: "球币运营", items: ["人工补币 / 扣减", "赠送原因留痕", "过期流水核对", "异常消费回滚"] },
        { title: "行为追踪", items: ["登录日志：IP / 设备 / 时间", "高频登录异常识别", "订单与会话串联", "客服上下文复用"] },
      ],
    },
    events: {
      title: "赛事数据补充控制台",
      description: "补齐数据源配置、手动补录和联赛开关优先级。",
      dataSources: {
        title: "数据源配置",
        rows: [
          { title: "API-Sports Free", subtitle: "主数据源", status: "主用中", tone: "good", meta: ["阈值 45 秒", "覆盖足篮板"] },
          { title: "NowScore 抓取链路", subtitle: "备用回退", status: "待命", tone: "warn", meta: ["阈值 90 秒", "异常时人工切换"] },
          { title: "人工补录通道", subtitle: "运营兜底", status: "可用", meta: ["记录操作员和时间", "支持比分/半场/备注"] },
        ],
      },
      manualPatches: {
        title: "手动补录记录",
        rows: [
          { title: "巴甲：弗拉门戈 vs 帕尔梅拉斯", subtitle: "比分 2:1 / 半场 1:0", status: "已补录", tone: "good", meta: ["ops.sofia", "2026-04-04 14:20"] },
          { title: "LPL：TES vs JDG", subtitle: "系列赛 2:0 / 摘要修正", status: "待复核", tone: "warn", meta: ["ops.kevin", "2026-04-04 12:10"] },
        ],
      },
      leagues: {
        title: "联赛展示管理",
        rows: [
          { title: "巴甲", subtitle: "足球 / 南美", status: "展示中", tone: "good", meta: ["优先级 10", "首页推荐：开"] },
          { title: "WNBA", subtitle: "篮球 / 北美", status: "展示中", tone: "good", meta: ["优先级 24", "首页推荐：关"] },
          { title: "DreamLeague", subtitle: "电竞 / Dota 2", status: "人工维护", tone: "warn", meta: ["优先级 42", "Mock + 运营录入"] },
        ],
      },
    },
    finance: {
      eyebrow: "球币财务",
      title: "球币与支付管理",
      description: "补齐球币套餐、充值订单和作者分润结算视图。",
      metrics: [
        { label: "今日充值订单", value: "128", description: "含待支付、已支付与异常关闭" },
        { label: "在售球币套餐", value: "4", description: "支持定价、赠送比例、有效期" },
        { label: "待结算作者", value: "12", description: "本月解锁收入待财务复核" },
        { label: "待审核提现", value: "6", description: "含作者与代理提现" },
      ],
      coinPackages: {
        title: "球币价格配置",
        rows: [
          { title: "新手包 100 球币", subtitle: "售价 19 / 赠送 10 / 30 天", status: "启用", tone: "good" },
          { title: "进阶包 500 球币", subtitle: "售价 89 / 赠送 80 / 90 天", status: "启用", tone: "good" },
          { title: "活动包 1000 球币", subtitle: "售价 168 / 赠送 220 / 120 天", status: "活动中", tone: "warn" },
        ],
      },
      rechargeOrders: {
        title: "充值订单看板",
        rows: [
          { title: "RC20260404001 / user01@example.com", subtitle: "500 球币 / 89 元", status: "已支付", tone: "good", meta: ["pay_100213", "2026-04-04 15:02"] },
          { title: "RC20260404008 / vip08@example.com", subtitle: "1000 球币 / 168 元", status: "待补单", tone: "warn", meta: ["支付回调缺失", "已转人工核对"] },
        ],
      },
      settlements: {
        title: "作者分润结算",
        rows: [
          { title: "巴西情报站", subtitle: "收入 18,400 球币 / 费率 15%", status: "待财务审核", tone: "warn", meta: ["预计结算 15,640"] },
          { title: "欧赔研究社", subtitle: "收入 9,800 球币 / 费率 12%", status: "结算中", meta: ["预计结算 8,624"] },
        ],
      },
    },
    agents: {
      eyebrow: "代理招商",
      title: "代理与招商管理",
      description: "补上三级代理、招商计划、邀请码和佣金提现这些规格模块。",
      metrics: [
        { label: "有效代理", value: "37", description: "一二三级代理合计" },
        { label: "待审核申请", value: "5", description: "待审批或待补材料" },
        { label: "本月归因注册", value: "1,284", description: "按邀请码和推广链接归因" },
        { label: "未结算佣金", value: "¥ 42,860", description: "待进入财务打款批次" },
      ],
      applications: {
        title: "代理申请审核",
        rows: [
          { title: "陈浩 / 一级代理申请", subtitle: "TikTok + Telegram 社群", status: "待审核", tone: "warn", meta: ["预估月新增 180 用户"] },
          { title: "Linh Tran / 二级代理申请", subtitle: "越南足球社群合作", status: "待补资料", meta: ["上级代理：东南亚总代"] },
        ],
      },
      roster: {
        title: "代理层级与邀请码",
        rows: [
          { title: "南美总代 / 一级", subtitle: "邀请码 BR88X / 佣金 20%", status: "运行中", tone: "good", meta: ["下级代理 8", "转化率 14.8%"] },
          { title: "东南亚分销组 / 二级", subtitle: "邀请码 SEA271 / 佣金 13%", status: "运行中", tone: "good", meta: ["下级代理 5", "本月注册 212"] },
          { title: "赛事社群渠道 / 三级", subtitle: "邀请码 CS2NOW", status: "监控中", tone: "warn", meta: ["同 IP 注册波动上升"] },
        ],
      },
      campaigns: {
        title: "招商计划与线索池",
        rows: [
          { title: "Q2 拉美代理招商", subtitle: "目标 20 名有效渠道", status: "执行中", tone: "good", meta: ["线索 48", "已跟进 31"] },
          { title: "板球区域招募", subtitle: "目标印度 / 巴基斯坦", status: "筹备中", meta: ["素材包已上传", "落地页待翻译"] },
        ],
      },
      withdrawals: {
        title: "佣金提现审核",
        rows: [
          { title: "南美总代 / 提现 ¥ 12,800", subtitle: "企业支付宝", status: "打款中" },
          { title: "赛事社群渠道 / 提现 ¥ 3,460", subtitle: "银行卡尾号 2388", status: "待审核", tone: "warn" },
        ],
      },
    },
    system: {
      eyebrow: "系统安全",
      title: "系统配置与审计",
      description: "补上 RBAC、操作日志、告警与系统参数总控。",
      roleMatrix: {
        title: "角色与权限矩阵",
        rows: [
          { title: "super-admin", subtitle: "全局配置 / 账号合并 / 佣金 override", status: "最高权限", tone: "good" },
          { title: "operator", subtitle: "内容、首页运营位、赛事补录、公告", status: "运营权限" },
          { title: "finance", subtitle: "充值订单、退款、分润结算、提现审核", status: "财务权限" },
        ],
      },
      auditLogs: {
        title: "审计日志",
        rows: [
          { title: "ops.sofia 更新首页 Banner", subtitle: "content / homepage-banners", status: "成功", tone: "good", meta: ["IP 47.238.249.104"] },
          { title: "finance.lee 手动补单", subtitle: "users / recharge-orders", status: "成功", tone: "good", meta: ["订单 RC20260404008"] },
          { title: "system.bot 触发延迟告警", subtitle: "events / sync-monitor", status: "告警", tone: "warn", meta: ["足球主源延迟 92 秒"] },
        ],
      },
      alerts: {
        title: "监控与告警",
        rows: [
          { title: "比分数据延迟", subtitle: "足球主源 92 秒未刷新", status: "处理中", tone: "warn" },
          { title: "支付回调异常", subtitle: "5 分钟内 3 次签名失败", status: "已恢复" },
          { title: "代理刷量预警", subtitle: "同 IP 注册异常集中", status: "待核查", tone: "warn" },
        ],
      },
      parameters: {
        title: "系统参数",
        rows: [
          { label: "站点基础域名", value: "47.238.249.104", hint: "域名未正式绑定前使用公网访问" },
          { label: "支付回调地址", value: "/api/payments/callback", hint: "需要公网 URL + 签名鉴权" },
          { label: "数据同步策略", value: "Free API 主用 + 抓取回退", hint: "支持延迟阈值和轮换窗口" },
          { label: "报表导出上限", value: "100,000 行", hint: "与规格文档保持一致" },
        ],
      },
    },
    reports: {
      eyebrow: "报表中心",
      title: "数据报表与导出",
      description: "补上核心业务看板和 Excel 导出中心。",
      metrics: [
        { label: "今日付费转化率", value: "8.7%", description: "会员 + 单条内容合并口径" },
        { label: "本周留存用户", value: "4,812", description: "7 日内至少二次访问并登录" },
        { label: "代理归因收入", value: "¥ 96,400", description: "按邀请码归因的充值收入" },
        { label: "导出任务", value: "14", description: "最近 7 天已生成报表任务" },
      ],
      boards: {
        title: "核心业务看板",
        rows: [
          { title: "内容变现看板", subtitle: "按作者 / 联赛 / 玩法查看解锁收入与命中率", status: "已启用", tone: "good" },
          { title: "会员增长看板", subtitle: "注册、转化、续费、到期预警", status: "已启用", tone: "good" },
          { title: "代理业绩看板", subtitle: "层级、归因注册、佣金、提现", status: "试运行", tone: "warn" },
        ],
      },
      exports: {
        title: "报表导出中心",
        rows: [
          { title: "订单对账报表", subtitle: "会员 / 内容 / 充值 / 退款", status: "XLSX" },
          { title: "代理佣金报表", subtitle: "代理归因充值、佣金流水、提现状态", status: "XLSX" },
          { title: "作者绩效报表", subtitle: "发布、命中率、球币收入、分润", status: "CSV / XLSX" },
        ],
      },
    },
  },
  "zh-TW": {} as AdminExpansionData,
  en: {} as AdminExpansionData,
};

data["zh-TW"] = {
  ...data["zh-CN"],
  users: { ...data["zh-CN"].users, title: "會員生命週期補充", description: "補上規格文件裡會員詳情、球幣調整、登入日誌和代理歸屬這些關鍵後台視圖。" },
  events: { ...data["zh-CN"].events, title: "賽事數據補充控制台", description: "補齊數據源配置、手動補錄和聯賽開關優先級。" },
  finance: { ...data["zh-CN"].finance, eyebrow: "球幣財務", title: "球幣與支付管理", description: "補齊球幣套餐、充值訂單和作者分潤結算視圖。" },
  agents: { ...data["zh-CN"].agents, eyebrow: "代理招商", title: "代理與招商管理", description: "補上三級代理、招商計畫、邀請碼和佣金提現這些規格模組。" },
  system: { ...data["zh-CN"].system, eyebrow: "系統安全", title: "系統配置與審計", description: "補上 RBAC、操作日誌、告警與系統參數總控。" },
  reports: { ...data["zh-CN"].reports, eyebrow: "報表中心", title: "數據報表與導出", description: "補上核心業務看板和 Excel 導出中心。" },
};

data.en = {
  users: {
    title: "Member lifecycle supplement",
    description: "Adds the missing member-detail, coin-adjustment, login-log, and agent-attribution admin views from the requirements doc.",
    detailCards: [
      { title: "Member details", items: ["Profile and verification state", "Coin balance and expiry reminders", "Unlocked articles with fixture links", "Agent attribution path"] },
      { title: "Coin operations", items: ["Manual coin credit / debit", "Gift reason trace", "Expiry ledger review", "Abnormal spend rollback"] },
      { title: "Behavior tracking", items: ["Login logs: IP / device / time", "High-frequency login alerts", "Order and session correlation", "Support context reuse"] },
    ],
  },
  events: {
    title: "Event data control supplement",
    description: "Adds data source config, manual patching, and league visibility management.",
    dataSources: { title: "Data source configuration", rows: data["zh-CN"].events.dataSources.rows.map((item, index) => ({ ...item, title: ["API-Sports Free", "NowScore scraping chain", "Manual patch lane"][index], subtitle: ["Primary source", "Backup fallback", "Operator fallback"][index], status: ["Primary", "Standby", "Available"][index] })) },
    manualPatches: { title: "Manual patch records", rows: data["zh-CN"].events.manualPatches.rows.map((item, index) => ({ ...item, status: ["Patched", "Needs review"][index] })) },
    leagues: { title: "League display management", rows: data["zh-CN"].events.leagues.rows.map((item, index) => ({ ...item, title: ["Brazil Serie A", "WNBA", "DreamLeague"][index], subtitle: ["Football / South America", "Basketball / North America", "Esports / Dota 2"][index], status: ["Visible", "Visible", "Manual"][index] })) },
  },
  finance: {
    eyebrow: "Coins & Finance",
    title: "Coin and payment management",
    description: "Adds the missing coin package, recharge order, and author settlement control views.",
    metrics: [
      { label: "Recharge orders today", value: "128", description: "Pending, paid, and abnormal closed orders" },
      { label: "Coin packages live", value: "4", description: "Pricing, bonus ratio, and validity" },
      { label: "Authors pending", value: "12", description: "Monthly unlock income awaiting finance review" },
      { label: "Withdrawals pending", value: "6", description: "Author and agent payout requests" },
    ],
    coinPackages: { title: "Coin package pricing", rows: [{ title: "Starter 100 coins", subtitle: "Price 19 / bonus 10 / 30 days", status: "Active", tone: "good" }, { title: "Growth 500 coins", subtitle: "Price 89 / bonus 80 / 90 days", status: "Active", tone: "good" }, { title: "Campaign 1000 coins", subtitle: "Price 168 / bonus 220 / 120 days", status: "Campaign", tone: "warn" }] },
    rechargeOrders: { title: "Recharge order board", rows: [{ title: "RC20260404001 / user01@example.com", subtitle: "500 coins / CNY 89", status: "Paid", tone: "good", meta: ["pay_100213", "2026-04-04 15:02"] }, { title: "RC20260404008 / vip08@example.com", subtitle: "1000 coins / CNY 168", status: "Needs manual repair", tone: "warn", meta: ["Callback missing", "Escalated for manual review"] }] },
    settlements: { title: "Author settlements", rows: [{ title: "Brazil Intelligence Desk", subtitle: "Income 18,400 coins / fee 15%", status: "Finance review", tone: "warn", meta: ["Projected payout 15,640"] }, { title: "Odds Research Lab", subtitle: "Income 9,800 coins / fee 12%", status: "Paying", meta: ["Projected payout 8,624"] }] },
  },
  agents: {
    eyebrow: "Agents & Growth",
    title: "Agent and recruitment management",
    description: "Adds the missing 3-level agent, campaign, invite-code, and commission withdrawal surfaces.",
    metrics: [
      { label: "Active agents", value: "37", description: "All level 1 / 2 / 3 agents combined" },
      { label: "Applications pending", value: "5", description: "Waiting for approval or more material" },
      { label: "Attributed signups", value: "1,284", description: "Invite-code and promo-link attribution" },
      { label: "Unsettled commission", value: "CNY 42,860", description: "Pending finance payout cycle" },
    ],
    applications: { title: "Agent application review", rows: [{ title: "Chen Hao / level-1 application", subtitle: "TikTok + Telegram", status: "Pending", tone: "warn" }, { title: "Linh Tran / level-2 application", subtitle: "Vietnam football communities", status: "Need more info" }] },
    roster: { title: "Agent hierarchy and invite codes", rows: [{ title: "LATAM master / level 1", subtitle: "Invite code BR88X / 20% commission", status: "Running", tone: "good" }, { title: "SEA distribution / level 2", subtitle: "Invite code SEA271 / 13% commission", status: "Running", tone: "good" }, { title: "Community channel / level 3", subtitle: "Invite code CS2NOW", status: "Watchlist", tone: "warn" }] },
    campaigns: { title: "Recruitment plans and leads", rows: [{ title: "Q2 LATAM agent drive", subtitle: "Goal: 20 valid channels", status: "Running", tone: "good" }, { title: "Cricket territory expansion", subtitle: "Target India / Pakistan", status: "Planning" }] },
    withdrawals: { title: "Commission withdrawal review", rows: [{ title: "LATAM master / withdraw CNY 12,800", subtitle: "Alipay enterprise", status: "Paying" }, { title: "Community channel / withdraw CNY 3,460", subtitle: "Bank card ending 2388", status: "Pending", tone: "warn" }] },
  },
  system: {
    eyebrow: "System & Security",
    title: "System configuration and audit",
    description: "Adds RBAC, audit logs, alerts, and system parameter views.",
    roleMatrix: { title: "Role and permission matrix", rows: [{ title: "super-admin", subtitle: "Global config / account merge / commission override", status: "Highest", tone: "good" }, { title: "operator", subtitle: "Content, placements, event patching, notices", status: "Operations" }, { title: "finance", subtitle: "Recharge, refund, settlement, withdrawals", status: "Finance" }] },
    auditLogs: { title: "Audit logs", rows: [{ title: "ops.sofia updated homepage banner", subtitle: "content / homepage-banners", status: "Success", tone: "good" }, { title: "finance.lee repaired order", subtitle: "users / recharge-orders", status: "Success", tone: "good" }, { title: "system.bot raised delay alert", subtitle: "events / sync-monitor", status: "Alert", tone: "warn" }] },
    alerts: { title: "Monitoring and alerts", rows: [{ title: "Score data delay", subtitle: "Football primary source delayed 92s", status: "Investigating", tone: "warn" }, { title: "Payment callback anomaly", subtitle: "3 signature failures in 5 minutes", status: "Recovered" }, { title: "Agent fraud warning", subtitle: "Same-IP registrations concentrated", status: "Pending review", tone: "warn" }] },
    parameters: { title: "System parameters", rows: [{ label: "Base site address", value: "47.238.249.104", hint: "Used before domain binding" }, { label: "Payment callback path", value: "/api/payments/callback", hint: "Needs public URL + signed verification" }, { label: "Sync strategy", value: "Free API primary + scrape fallback", hint: "Supports delay threshold and rotation windows" }, { label: "Report export cap", value: "100,000 rows", hint: "Aligned with the doc" }] },
  },
  reports: {
    eyebrow: "Reports",
    title: "BI and export center",
    description: "Adds core business dashboards and Excel export center.",
    metrics: [
      { label: "Paid conversion today", value: "8.7%", description: "Membership + single-content combined" },
      { label: "Users retained this week", value: "4,812", description: "At least two visits and logged in" },
      { label: "Attributed agent revenue", value: "CNY 96,400", description: "Invite-code attributed recharge revenue" },
      { label: "Export jobs", value: "14", description: "Generated in the last 7 days" },
    ],
    boards: { title: "Core business dashboards", rows: [{ title: "Content monetization board", subtitle: "Unlock revenue and hit rate by author / league / market", status: "Enabled", tone: "good" }, { title: "Membership growth board", subtitle: "Signup, conversion, renewal, expiry warning", status: "Enabled", tone: "good" }, { title: "Agent performance board", subtitle: "Hierarchy, attributed signups, commission, payouts", status: "Pilot", tone: "warn" }] },
    exports: { title: "Report export center", rows: [{ title: "Order reconciliation report", subtitle: "Membership / content / recharge / refund", status: "XLSX" }, { title: "Agent commission report", subtitle: "Attributed recharge, commission ledger, withdrawal status", status: "XLSX" }, { title: "Author performance report", subtitle: "Publishing, hit rate, coin income, revenue share", status: "CSV / XLSX" }] },
  },
};

export function getAdminExpansionData(locale: Locale) {
  return data[locale];
}
