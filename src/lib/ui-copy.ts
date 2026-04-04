import { defaultLocale, displayLocales, type DisplayLocale, type Locale } from "@/lib/i18n-config";
import type { MatchStatus, OrderStatus, Sport, UserRole } from "@/lib/types";

type NavItem = {
  href: string;
  label: string;
};

type AdminTab = {
  value: string;
  label: string;
};

type LocaleButtonCopy = {
  label: string;
  shortLabel: string;
};

type SiteCopy = {
  brandCopy: {
    title: string;
    subtitle: string;
    footerTitle: string;
  };
  footerCopy: {
    description: string;
    coreModulesTitle: string;
    coreModules: string[];
    commercialTitle: string;
    commercialItems: string[];
  };
  localeSwitcherCopy: {
    label: string;
    options: Record<DisplayLocale, LocaleButtonCopy>;
  };
  siteNavItems: NavItem[];
  adminTabs: AdminTab[];
  matchStatusLabels: Record<MatchStatus, string>;
  roleLabels: Record<UserRole, string>;
  orderStatusLabels: Record<OrderStatus, string>;
  sessionUiCopy: {
    visitorMode: string;
    loginExperience: string;
    logout: string;
  };
  authPageCopy: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    adminEyebrow: string;
    adminTitle: string;
    adminDescription: string;
    adminAction: string;
    adminPresetName: string;
    memberEyebrow: string;
    memberTitle: string;
    memberDescription: string;
    memberAction: string;
    memberPresetName: string;
    customEyebrow: string;
    customTitle: string;
    displayName: string;
    email: string;
    role: string;
    submit: string;
    customDefaultName: string;
  };
  memberPageCopy: {
    heroEyebrow: string;
    heroTitle: string;
    heroTitleFor: (name: string) => string;
    heroDescription: string;
    currentRole: string;
    memberStatus: string;
    unlockedPlans: string;
    plansEyebrow: string;
    plansTitle: string;
    plansDescription: string;
    durationLabel: (days: number) => string;
    buyAfterLogin: string;
    payNow: string;
    ordersEyebrow: string;
    ordersTitle: string;
    emptyOrders: string;
    membershipOrder: string;
    contentOrder: string;
    createdAt: string;
    paymentProvider: string;
    providerOrderId: string;
    expiresAt: string;
    paymentReference: string;
    entitlementsEyebrow: string;
    entitlementsTitle: string;
    membershipUnlockedNotice: string;
    emptyUnlockedPlans: string;
  };
  plansPageCopy: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    winRate: string;
    payNow: string;
    membershipBundleActive: string;
    viewDetails: string;
  };
  planDetailCopy: {
    authorTeam: string;
    kickoff: string;
    singlePrice: string;
    analysisEyebrow: string;
    previewSummary: string;
    fullAnalysisUnlocked: string;
    payNowPrefix: string;
    unlockNotice: string;
  };
  matchDetailCopy: {
    kickoff: string;
    matchStatus: string;
    currentScore: string;
    venue: string;
    dataSliceEyebrow: string;
    dataSliceTitle: string;
    marketOdds: string;
    matchSlice: string;
    aiEyebrow: string;
    aiTitle: string;
    aiLink: string;
    emptyPrediction: string;
  };
  databasePageCopy: {
    heroEyebrow: string;
    heroTitle: (sportLabel: string) => string;
    heroDescription: string;
    currentSport: string;
    currentLeague: string;
    season: string;
    sportFilter: string;
    leagueFilter: string;
    viewFilter: string;
    football: string;
    basketball: string;
    cricket: string;
    esports: string;
    standingsOption: string;
    defaultViewTitle: string;
    footballStandingsDescription: string;
    basketballStandingsDescription: string;
    cricketStandingsDescription: string;
    esportsStandingsDescription: string;
    scheduleDescription: string;
    teamsDescription: string;
    h2hDescription: string;
    emptyStandingsTitle: string;
    emptyStandingsDescription: string;
    emptyScheduleTitle: string;
    emptyScheduleDescription: string;
    emptyTeamsTitle: string;
    emptyTeamsDescription: string;
    emptyH2HTitle: string;
    emptyH2HDescription: string;
    standingsColumns: {
      rank: string;
      team: string;
      played: string;
      win: string;
      draw: string;
      loss: string;
      points: string;
      winRate: string;
      recentForm: string;
      home: string;
      away: string;
      shortName: string;
    };
  };
  aiPredictionsPageCopy: {
    heroEyebrow: string;
    heroTitle: string;
    heroDescription: string;
    hitRate30d: string;
    avgEdge: string;
    explainableFactors: string;
    explainableFactorCount: string;
    confidence: string;
    expectedEdge: string;
    viewMatch: string;
  };
  uiCopy: {
    instantBoard: string;
    matchesLoaded: (count: number) => string;
    fixtureKickoff: string;
    matchup: string;
    status: string;
    oddsSummary: string;
    dataSlice: string;
    details: string;
    viewMatch: string;
    filterLeague: string;
    allLeagues: string;
    filterStatus: string;
    allStatuses: string;
    sortMode: string;
    sortByTime: string;
    sortByLeague: string;
    refresh: string;
    scheduleResults: string;
    teamProfile: string;
    historicalH2H: string;
    query: string;
    unlocked: string;
    fullAnalysis: string;
    teaserOnly: string;
    memberStatusActive: string;
    memberStatusInactive: string;
  };
  searchCopy: {
    headerPlaceholder: string;
    headerSubmit: string;
    inputLabel: string;
    inputHint: string;
    pageEyebrow: string;
    pageTitle: string;
    pageDescription: string;
    totalResults: (count: number, query: string) => string;
    noQueryTitle: string;
    noQueryDescription: string;
    noResultsTitle: string;
    noResultsDescription: (query: string) => string;
    sections: {
      matches: string;
      leagues: string;
      plans: string;
      authors: string;
    };
    labels: {
      status: string;
      kickoff: string;
      league: string;
      season: string;
      region: string;
      sport: string;
      price: string;
      focus: string;
      badge: string;
    };
    actions: {
      match: string;
      league: string;
      plan: string;
      author: string;
    };
  };
  homePageCopy: {
    heroEyebrow: string;
    heroTitlePrefix: string;
    heroTitleHighlightOne: string;
    heroTitleInfix: string;
    heroTitleHighlightTwo: string;
    heroDescription: string;
    openLiveScores: string;
    viewMembershipPlans: string;
    commandFeed: string;
    hotRecommendationsEyebrow: string;
    hotRecommendationsTitle: string;
    hotRecommendationsDescription: string;
    hotTag: string;
    openPlan: string;
    membershipEyebrow: string;
    membershipTitle: string;
    membershipDescription: string;
    modelPulseEyebrow: string;
    modelPulseTitle: string;
    authorEyebrow: string;
    authorTitle: string;
    authorDescription: string;
    authorStats: {
      streak: string;
      winRate: string;
      monthlyRoi: string;
      followers: string;
    };
    cricketSpotlight: {
      eyebrow: string;
      title: string;
      description: string;
      liveNow: string;
      leaguesCovered: string;
      openCricket: string;
      openMatch: string;
    };
  };
  cricketPageCopy: {
    trackerEyebrow: string;
    trackerTitle: string;
    trackerDescription: string;
    scheduleEyebrow: string;
    upcomingTitle: string;
    finishedTitle: string;
    coverageTitle: string;
    coverageDescription: string;
    coverageLeagues: string;
    coverageMatches: string;
    noMatches: string;
  };
  livePageCopy: Record<Sport, {
    eyebrow: string;
    title: string;
    description: string;
    sportLabel: string;
  }>;
  checkoutPageCopy: {
    eyebrow: string;
    missingTitle: string;
    missingDescription: string;
    missingNote: string;
    backToSource: string;
    backToEntry: string;
    title: string;
    description: string;
    orderType: string;
    orderStatus: string;
    orderTitle: string;
    amount: string;
    createdAt: string;
    paymentProvider: string;
    providerOrderId: string;
    expiresAt: string;
    paymentReference: string;
    orderId: string;
    confirmPayment: string;
    simulateFailure: string;
    closeOrder: string;
    orderTypeLabel: (type: "membership" | "content") => string;
    hint: {
      pendingMembership: string;
      pendingContent: string;
      paidMembership: string;
      paidContent: string;
      closed: string;
      failed: string;
      refunded: string;
    };
  };
  paymentUiCopy: {
    paymentResults: Record<"checkout" | "member" | "plans" | "plan", Record<"success" | "closed" | "failed" | "error", string>>;
    activityLabels: {
      paidAt: string;
      failedAt: string;
      closedAt: string;
      refundedAt: string;
      updatedAt: string;
    };
    failureLabel: string;
    refundLabel: string;
    defaultFailureReason: string;
    defaultRefundReason: string;
  };
};

const zhCnCopy: SiteCopy = {
  brandCopy: {
    title: "Signal Nine",
    subtitle: "Sports Command Center",
    footerTitle: "Signal Nine Sports",
  },
  footerCopy: {
    description: "一个围绕足篮板比分、资料库、AI 推荐、会员付费和后台运营的一期体育数据平台。",
    coreModulesTitle: "核心模块",
    coreModules: ["即时比分、赔率与板球/电竞直播", "资料库与历史赛程", "AI 预测与计划单"],
    commercialTitle: "商业闭环",
    commercialItems: ["会员套餐与单条解锁", "订单记录与权益状态", "运营后台与推荐配置"],
  },
  localeSwitcherCopy: {
    label: "语言切换",
    options: {
      "zh-CN": { label: "简体中文", shortLabel: "简" },
      "zh-TW": { label: "繁體中文", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "泰语", shortLabel: "TH" },
      vi: { label: "越南语", shortLabel: "VI" },
      hi: { label: "印地语", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "首页" },
    { href: "/live/football", label: "足球比分" },
    { href: "/live/basketball", label: "篮球比分" },
    { href: "/live/cricket", label: "板球比分" },
    { href: "/live/esports", label: "电竞比分" },
    { href: "/database", label: "资料库" },
    { href: "/ai-predictions", label: "AI 预测" },
    { href: "/plans", label: "计划单" },
    { href: "/member", label: "会员中心" },
    { href: "/admin", label: "后台" },
  ],
  adminTabs: [
    { value: "overview", label: "总览" },
    { value: "events", label: "赛事" },
    { value: "content", label: "内容" },
    { value: "users", label: "用户订单" },
    { value: "ai", label: "AI 导入" },
  ],
  matchStatusLabels: {
    live: "进行中",
    upcoming: "未开赛",
    finished: "已结束",
  },
  roleLabels: {
    visitor: "游客",
    member: "会员",
    operator: "运营",
    finance: "财务",
    admin: "管理员",
  },
  orderStatusLabels: {
    pending: "待支付",
    paid: "已支付",
    failed: "支付失败",
    closed: "已关闭",
    refunded: "已退款",
  },
  sessionUiCopy: {
    visitorMode: "当前为游客模式",
    loginExperience: "登录体验完整流程",
    logout: "退出登录",
  },
  authPageCopy: {
    heroEyebrow: "Access Control",
    heroTitle: "登录会员与运营身份",
    heroDescription: "先用演示账号串起会员购买、内容解锁与后台运营链路，后续再接真实注册登录体系。",
    adminEyebrow: "Admin",
    adminTitle: "运营后台账号",
    adminDescription: "直接进入后台，查看赛事同步、内容管理、用户与订单面板。",
    adminAction: "进入后台",
    adminPresetName: "运营管理员",
    memberEyebrow: "Member",
    memberTitle: "会员体验账号",
    memberDescription: "进入会员中心，查看权益、订单记录与已解锁的计划单。",
    memberAction: "进入会员中心",
    memberPresetName: "高级会员",
    customEyebrow: "Custom Login",
    customTitle: "自定义演示身份",
    displayName: "显示名称",
    email: "邮箱",
    role: "角色",
    submit: "创建会话并登录",
    customDefaultName: "演示用户",
  },
  memberPageCopy: {
    heroEyebrow: "Membership Center",
    heroTitle: "会员权益总览",
    heroTitleFor: (name) => `${name} 的权益总览`,
    heroDescription: "这里集中展示会员状态、已购内容、订单记录和套餐续费入口。",
    currentRole: "当前角色",
    memberStatus: "会员状态",
    unlockedPlans: "已解锁计划单",
    plansEyebrow: "Membership Plans",
    plansTitle: "会员套餐",
    plansDescription: "支持月度、赛季与年度会员，先用模拟支付完成一期验证。",
    durationLabel: (days) => `${days} 天`,
    buyAfterLogin: "登录后购买",
    payNow: "立即购买",
    ordersEyebrow: "Orders",
    ordersTitle: "订单记录",
    emptyOrders: "当前还没有订单记录，完成一次会员购买或内容购买后会在这里沉淀。",
    membershipOrder: "会员订单",
    contentOrder: "内容订单",
    createdAt: "创建于",
    paymentProvider: "支付模式",
    providerOrderId: "通道单号",
    expiresAt: "订单有效期",
    paymentReference: "支付流水",
    entitlementsEyebrow: "Unlocked Content",
    entitlementsTitle: "已解锁内容",
    membershipUnlockedNotice: "当前会员权益已生效，站内计划单已按会员权限自动解锁。",
    emptyUnlockedPlans: "还没有已解锁的计划单，可以先开通会员或购买单条内容。",
  },
  plansPageCopy: {
    heroEyebrow: "Paid Recommendations",
    heroTitle: "计划单与作者榜单",
    heroDescription: "展示作者战绩、计划单摘要、价格与单条购买入口。",
    winRate: "胜率",
    payNow: "立即购买",
    membershipBundleActive: " 当前会员已覆盖此内容。",
    viewDetails: "查看详情",
  },
  planDetailCopy: {
    authorTeam: "作者 / 团队",
    kickoff: "开赛时间",
    singlePrice: "单条价格",
    analysisEyebrow: "Analysis",
    previewSummary: "试看摘要",
    fullAnalysisUnlocked: "已解锁全文",
    payNowPrefix: "支付并解锁",
    unlockNotice: "当前仅展示试看段落，购买单条内容或开通会员后可查看完整分析。",
  },
  matchDetailCopy: {
    kickoff: "开赛时间",
    matchStatus: "比赛状态",
    currentScore: "当前比分",
    venue: "比赛场地",
    dataSliceEyebrow: "Match Data",
    dataSliceTitle: "数据切片",
    marketOdds: "赔率摘要",
    matchSlice: "比赛信息",
    aiEyebrow: "AI Signals",
    aiTitle: "AI 推荐",
    aiLink: "查看全部 AI 预测",
    emptyPrediction: "当前比赛还没有绑定 AI 推荐记录。",
  },
  databasePageCopy: {
    heroEyebrow: "Stats Database",
    heroTitle: (sportLabel) => `${sportLabel}资料库`,
    heroDescription: "支持联赛、赛季、积分榜、赛程赛果、球队资料和历史交锋切换。",
    currentSport: "当前项目",
    currentLeague: "当前联赛",
    season: "赛季",
    sportFilter: "项目筛选",
    leagueFilter: "联赛筛选",
    viewFilter: "视图切换",
    football: "足球",
    basketball: "篮球",
    cricket: "板球",
    esports: "电竞",
    standingsOption: "积分榜",
    defaultViewTitle: "积分榜",
    footballStandingsDescription: "查看积分、胜平负与联赛竞争格局。",
    basketballStandingsDescription: "查看战绩、胜率、近期状态与主客场表现。",
    cricketStandingsDescription: "查看球队排名、胜负、近期状态与主客场表现。",
    esportsStandingsDescription: "查看战绩、地图/小局走势、近期状态与主客场分布。",
    scheduleDescription: "回看赛程赛果与重点备注。",
    teamsDescription: "查看球队简称、排名、近期状态和主客场记录。",
    h2hDescription: "回看历史交锋与关键标签。",
    emptyStandingsTitle: "暂无积分榜数据",
    emptyStandingsDescription: "请稍后重试，或切换到其他联赛查看。",
    emptyScheduleTitle: "暂无赛程数据",
    emptyScheduleDescription: "当前联赛还没有可展示的赛程赛果。",
    emptyTeamsTitle: "暂无球队资料",
    emptyTeamsDescription: "当前联赛还没有可展示的球队资料。",
    emptyH2HTitle: "暂无历史交锋",
    emptyH2HDescription: "当前联赛还没有可展示的历史交锋数据。",
    standingsColumns: {
      rank: "排名",
      team: "球队",
      played: "场次",
      win: "胜",
      draw: "平",
      loss: "负",
      points: "积分",
      winRate: "胜率",
      recentForm: "近期状态",
      home: "主场",
      away: "客场",
      shortName: "简称",
    },
  },
  aiPredictionsPageCopy: {
    heroEyebrow: "Model Blend",
    heroTitle: "AI 预测面板",
    heroDescription: "用规则与轻量模型混合输出推荐结论、可信度和解释因子。",
    hitRate30d: "近 30 天命中率",
    avgEdge: "平均边际",
    explainableFactors: "可解释因子",
    explainableFactorCount: "12 类",
    confidence: "信心",
    expectedEdge: "预期边际",
    viewMatch: "查看赛事详情",
  },
  uiCopy: {
    instantBoard: "即时看板",
    matchesLoaded: (count) => `已加载 ${count} 场比赛`,
    fixtureKickoff: "赛事 / 开赛",
    matchup: "对阵",
    status: "状态",
    oddsSummary: "赔率摘要",
    dataSlice: "数据切片",
    details: "详情",
    viewMatch: "查看比赛",
    filterLeague: "联赛筛选",
    allLeagues: "全部联赛",
    filterStatus: "状态筛选",
    allStatuses: "全部状态",
    sortMode: "排序方式",
    sortByTime: "按时间",
    sortByLeague: "按联赛",
    refresh: "刷新",
    scheduleResults: "赛程赛果",
    teamProfile: "球队资料",
    historicalH2H: "历史交锋",
    query: "查询",
    unlocked: "已解锁",
    fullAnalysis: "完整分析",
    teaserOnly: "当前仅显示试看摘要。",
    memberStatusActive: "会员有效",
    memberStatusInactive: "未开通会员",
  },
  searchCopy: {
    headerPlaceholder: "搜索球队、联赛、计划单、作者",
    headerSubmit: "搜索",
    inputLabel: "站内搜索",
    inputHint: "支持搜索球队、联赛、计划单、作者与赛事关键词。",
    pageEyebrow: "Site Search",
    pageTitle: "站内检索",
    pageDescription: "把比赛、联赛、付费计划单和作者入口聚合到一个检索页，方便快速定位历史数据与内容入口。",
    totalResults: (count, query) => `“${query}” 共找到 ${count} 条结果`,
    noQueryTitle: "先输入一个关键词",
    noQueryDescription: "可以直接搜索球队、联赛、赛事、计划单标题或作者名称。",
    noResultsTitle: "没有找到匹配结果",
    noResultsDescription: (query) => `当前没有检索到“${query}”相关内容，可以换一个关键词再试。`,
    sections: {
      matches: "比赛",
      leagues: "联赛",
      plans: "计划单",
      authors: "作者 / 团队",
    },
    labels: {
      status: "状态",
      kickoff: "开赛",
      league: "联赛",
      season: "赛季",
      region: "地区",
      sport: "项目",
      price: "价格",
      focus: "擅长",
      badge: "标签",
    },
    actions: {
      match: "查看比赛",
      league: "进入资料库",
      plan: "查看计划单",
      author: "查看内容",
    },
  },
  homePageCopy: {
    heroEyebrow: "Sports Data Platform MVP",
    heroTitlePrefix: "打造更有辨识度的",
    heroTitleHighlightOne: "比赛日指挥台",
    heroTitleInfix: "并接上",
    heroTitleHighlightTwo: "会员收入闭环",
    heroDescription: "一期聚焦足球、篮球、板球和电竞，把比分、资料库、AI 推荐、内容付费、会员购买和后台运营放进同一套 Next.js 应用。",
    openLiveScores: "打开即时比分",
    viewMembershipPlans: "查看会员套餐",
    commandFeed: "指挥台快讯",
    hotRecommendationsEyebrow: "Hot Recommendations",
    hotRecommendationsTitle: "热门推荐卡片",
    hotRecommendationsDescription: "同时支持会员解锁与单条购买，验证一期商业闭环。",
    hotTag: "热门",
    openPlan: "打开计划单",
    membershipEyebrow: "Membership",
    membershipTitle: "会员套餐",
    membershipDescription: "月卡、赛季卡和年卡都已纳入一期范围。",
    modelPulseEyebrow: "Model Pulse",
    modelPulseTitle: "AI 预测脉搏",
    authorEyebrow: "Author Teams",
    authorTitle: "作者与团队榜单",
    authorDescription: "适合运营陈列连红、胜率和受众规模。",
    authorStats: {
      streak: "连红",
      winRate: "胜率",
      monthlyRoi: "月 ROI",
      followers: "关注者",
    },
    cricketSpotlight: {
      eyebrow: "Cricket Expansion",
      title: "板球入口",
      description: "先把板球比分、赛程结果和联赛覆盖入口做实，再往更深的资料与内容模块扩展。",
      liveNow: "进行中",
      leaguesCovered: "已覆盖联赛",
      openCricket: "进入板球比分",
      openMatch: "查看比赛",
    },
  },
  cricketPageCopy: {
    trackerEyebrow: "Cricket Tracker",
    trackerTitle: "板球赛程与结果摘要",
    trackerDescription: "这一层先提供 live 比分之外的赛程/赛果补充，方便快速回看当天重点场次。",
    scheduleEyebrow: "Schedule & Results",
    upcomingTitle: "即将开赛",
    finishedTitle: "最新赛果",
    coverageTitle: "覆盖范围",
    coverageDescription: "当前板球模块使用稳定的本地化 fallback 数据，先验证入口、筛选和浏览链路，再补真实同步源。",
    coverageLeagues: "联赛数量",
    coverageMatches: "展示场次",
    noMatches: "当前没有可展示的板球比赛。",
  },
  livePageCopy: {
    football: {
      eyebrow: "Football Live",
      title: "足球即时比分",
      description: "支持联赛筛选、状态过滤和排序切换，优先展示热门赛事与赔率摘要。",
      sportLabel: "足球",
    },
    basketball: {
      eyebrow: "Basketball Live",
      title: "篮球赛程与即时盘",
      description: "围绕让分、总分和节奏变化组织篮球比赛页，兼容 CBA 与 NBA 的实时展示。",
      sportLabel: "篮球",
    },
    cricket: {
      eyebrow: "Cricket Live",
      title: "板球即时比分",
      description: "先覆盖热门联赛的即时比分、回合进度、赛果状态与赔率摘要，作为板球板块的一期入口。",
      sportLabel: "板球",
    },
    esports: {
      eyebrow: "Esports Live",
      title: "电竞赛事面板",
      description: "聚合 LoL、Dota 2、CS2 三条分线，先覆盖重点赛事比分、系列赛进度和盘口摘要。",
      sportLabel: "电竞",
    },
  },
  checkoutPageCopy: {
    eyebrow: "Mock Checkout",
    missingTitle: "订单不可用",
    missingDescription: "这个订单不存在、已失效，或不属于当前账号。你可以返回上一页重新发起购买。",
    missingNote: "当前仍使用模拟支付页，先把订单状态机、权益回写与异常回跳链路验证完整，再接入真实支付通道。",
    backToSource: "返回原页面",
    backToEntry: "返回购买入口",
    title: "模拟支付确认",
    description: "这里用于把订单从待支付切换为已支付、支付失败或已关闭，先验证状态机与权益生效，再接入真实支付通道。",
    orderType: "订单类型",
    orderStatus: "当前状态",
    orderTitle: "订单标题",
    amount: "金额",
    createdAt: "创建于",
    paymentProvider: "支付模式",
    providerOrderId: "通道单号",
    expiresAt: "订单有效期",
    paymentReference: "支付流水",
    orderId: "订单号",
    confirmPayment: "确认模拟支付",
    simulateFailure: "模拟支付失败",
    closeOrder: "关闭订单",
    orderTypeLabel: (type) => (type === "membership" ? "会员订单" : "内容订单"),
    hint: {
      pendingMembership: "确认后会激活会员权益，并按当前到期时间顺延套餐时长。",
      pendingContent: "确认后会解锁对应计划单全文，权益仅对当前账号生效。",
      paidMembership: "这笔会员订单已经生效，可以直接返回会员中心查看最新权益。",
      paidContent: "这笔内容订单已经生效，可以直接返回计划单页面查看最新解锁状态。",
      closed: "这笔订单已关闭，如需继续购买，请返回原页面重新发起订单。",
      failed: "这笔订单支付失败，系统已记录失败原因。请返回原页面重新发起购买，或稍后再试。",
      refunded: "这笔订单已退款，当前不会继续保留对应权益。",
    },
  },
  paymentUiCopy: {
    paymentResults: {
      checkout: {
        success: "支付已完成，订单状态已刷新。",
        closed: "订单已关闭，可以返回上一页重新发起购买。",
        failed: "支付失败，失败原因已记录，可以返回上一页重新发起购买。",
        error: "支付回调未完成，请稍后重试。",
      },
      member: {
        success: "模拟支付成功，会员权益已刷新。",
        closed: "订单已关闭，本次购买未生效。",
        failed: "支付失败，订单已记录失败原因，可以重新发起购买。",
        error: "支付回调未完成，请返回会员页重新发起订单。",
      },
      plans: {
        success: "模拟支付成功，计划单权益已刷新。",
        closed: "订单已关闭，当前未解锁该内容。",
        failed: "支付失败，本次计划单购买未生效，请重新发起。",
        error: "支付回调未完成，请重新发起这条计划单的购买。",
      },
      plan: {
        success: "模拟支付成功，这条计划单已为当前账号解锁。",
        closed: "订单已关闭，内容仍保持锁定。",
        failed: "支付失败，本次订单未解锁内容，请重新发起购买。",
        error: "支付回调未完成，请重新发起这条计划单的购买。",
      },
    },
    activityLabels: {
      paidAt: "支付于",
      failedAt: "失败于",
      closedAt: "关闭于",
      refundedAt: "退款于",
      updatedAt: "最近更新",
    },
    failureLabel: "失败原因",
    refundLabel: "退款原因",
    defaultFailureReason: "支付通道返回失败，请重新发起订单。",
    defaultRefundReason: "后台已发起退款，相关权益已回收。",
  },
};

const zhTwCopy: SiteCopy = {
  ...zhCnCopy,
  footerCopy: {
    description: "一個圍繞足籃板比分、資料庫、AI 推薦、會員付費與後台營運的一期體育數據平台。",
    coreModulesTitle: "核心模組",
    coreModules: ["即時比分、賠率與板球/電競直播", "資料庫與歷史賽程", "AI 預測與計畫單"],
    commercialTitle: "商業閉環",
    commercialItems: ["會員套餐與單條解鎖", "訂單記錄與權益狀態", "營運後台與推薦配置"],
  },
  localeSwitcherCopy: {
    label: "語言切換",
    options: {
      "zh-CN": { label: "簡體中文", shortLabel: "简" },
      "zh-TW": { label: "繁體中文", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "泰語", shortLabel: "TH" },
      vi: { label: "越南語", shortLabel: "VI" },
      hi: { label: "印地語", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "首頁" },
    { href: "/live/football", label: "足球比分" },
    { href: "/live/basketball", label: "籃球比分" },
    { href: "/live/cricket", label: "板球比分" },
    { href: "/live/esports", label: "電競比分" },
    { href: "/database", label: "資料庫" },
    { href: "/ai-predictions", label: "AI 預測" },
    { href: "/plans", label: "計畫單" },
    { href: "/member", label: "會員中心" },
    { href: "/admin", label: "後台" },
  ],
  adminTabs: [
    { value: "overview", label: "總覽" },
    { value: "events", label: "賽事" },
    { value: "content", label: "內容" },
    { value: "users", label: "用戶訂單" },
    { value: "ai", label: "AI 匯入" },
  ],
  matchStatusLabels: {
    live: "進行中",
    upcoming: "未開賽",
    finished: "已結束",
  },
  roleLabels: {
    visitor: "訪客",
    member: "會員",
    operator: "營運",
    finance: "財務",
    admin: "管理員",
  },
  orderStatusLabels: {
    pending: "待支付",
    paid: "已支付",
    failed: "支付失敗",
    closed: "已關閉",
    refunded: "已退款",
  },
  sessionUiCopy: {
    visitorMode: "目前為訪客模式",
    loginExperience: "登入完整流程",
    logout: "登出",
  },
  authPageCopy: {
    ...zhCnCopy.authPageCopy,
    heroTitle: "登入會員與營運身份",
    heroDescription: "先用展示帳號串起會員購買、內容解鎖與後台營運鏈路，後續再接真實註冊登入體系。",
    adminDescription: "直接進入後台，查看賽事同步、內容管理、用戶與訂單面板。",
    adminAction: "進入後台",
    adminPresetName: "營運管理員",
    memberDescription: "進入會員中心，查看權益、訂單記錄與已解鎖的計畫單。",
    memberAction: "進入會員中心",
    memberPresetName: "高級會員",
    customTitle: "自訂展示身份",
    displayName: "顯示名稱",
    role: "角色",
    submit: "建立會話並登入",
    customDefaultName: "展示用戶",
  },
  memberPageCopy: {
    ...zhCnCopy.memberPageCopy,
    heroTitle: "會員權益總覽",
    heroTitleFor: (name) => `${name} 的權益總覽`,
    heroDescription: "這裡集中展示會員狀態、已購內容、訂單記錄與套餐續費入口。",
    currentRole: "目前角色",
    memberStatus: "會員狀態",
    unlockedPlans: "已解鎖計畫單",
    plansTitle: "會員套餐",
    plansDescription: "支援月度、賽季與年度會員，先用模擬支付完成一期驗證。",
    durationLabel: (days) => `${days} 天`,
    buyAfterLogin: "登入後購買",
    payNow: "立即購買",
    ordersTitle: "訂單記錄",
    emptyOrders: "目前還沒有訂單記錄，完成一次會員購買或內容購買後會在這裡沉澱。",
    membershipOrder: "會員訂單",
    contentOrder: "內容訂單",
    createdAt: "建立於",
    paymentProvider: "支付模式",
    providerOrderId: "通道單號",
    expiresAt: "訂單有效期",
    paymentReference: "支付流水",
    entitlementsTitle: "已解鎖內容",
    membershipUnlockedNotice: "目前會員權益已生效，站內計畫單已按會員權限自動解鎖。",
    emptyUnlockedPlans: "還沒有已解鎖的計畫單，可以先開通會員或購買單條內容。",
  },
  plansPageCopy: {
    ...zhCnCopy.plansPageCopy,
    heroTitle: "計畫單與作者榜單",
    heroDescription: "展示作者戰績、計畫單摘要、價格與單條購買入口。",
    winRate: "勝率",
    payNow: "立即購買",
    membershipBundleActive: " 目前會員已覆蓋此內容。",
    viewDetails: "查看詳情",
  },
  planDetailCopy: {
    ...zhCnCopy.planDetailCopy,
    authorTeam: "作者 / 團隊",
    kickoff: "開賽時間",
    singlePrice: "單條價格",
    previewSummary: "試看摘要",
    fullAnalysisUnlocked: "已解鎖全文",
    payNowPrefix: "支付並解鎖",
    unlockNotice: "目前僅展示試看段落，購買單條內容或開通會員後可查看完整分析。",
  },
  matchDetailCopy: {
    ...zhCnCopy.matchDetailCopy,
    kickoff: "開賽時間",
    matchStatus: "比賽狀態",
    currentScore: "目前比分",
    venue: "比賽場地",
    dataSliceTitle: "數據切片",
    marketOdds: "賠率摘要",
    matchSlice: "比賽資訊",
    aiTitle: "AI 推薦",
    aiLink: "查看全部 AI 預測",
    emptyPrediction: "目前這場比賽還沒有綁定 AI 推薦記錄。",
  },
  databasePageCopy: {
    ...zhCnCopy.databasePageCopy,
    heroTitle: (sportLabel) => `${sportLabel}資料庫`,
    heroDescription: "支援聯賽、賽季、積分榜、賽程賽果、球隊資料與歷史交鋒切換。",
    currentSport: "目前項目",
    currentLeague: "目前聯賽",
    season: "賽季",
    sportFilter: "項目篩選",
    leagueFilter: "聯賽篩選",
    viewFilter: "視圖切換",
    football: "足球",
    basketball: "籃球",
    cricket: "板球",
    esports: "電競",
    standingsOption: "積分榜",
    defaultViewTitle: "積分榜",
    footballStandingsDescription: "查看積分、勝和負與聯賽競爭格局。",
    basketballStandingsDescription: "查看戰績、勝率、近期狀態與主客場表現。",
    cricketStandingsDescription: "查看球隊排名、勝負、近期狀態與主客場表現。",
    esportsStandingsDescription: "查看戰績、地圖/小局走勢、近期狀態與主客場分佈。",
    scheduleDescription: "回看賽程賽果與重點備註。",
    teamsDescription: "查看球隊簡稱、排名、近期狀態與主客場記錄。",
    h2hDescription: "回看歷史交鋒與關鍵標籤。",
    emptyStandingsTitle: "暫無積分榜資料",
    emptyStandingsDescription: "請稍後重試，或切換到其他聯賽查看。",
    emptyScheduleTitle: "暫無賽程資料",
    emptyScheduleDescription: "目前聯賽還沒有可展示的賽程賽果。",
    emptyTeamsTitle: "暫無球隊資料",
    emptyTeamsDescription: "目前聯賽還沒有可展示的球隊資料。",
    emptyH2HTitle: "暫無歷史交鋒",
    emptyH2HDescription: "目前聯賽還沒有可展示的歷史交鋒資料。",
    standingsColumns: {
      rank: "排名",
      team: "球隊",
      played: "場次",
      win: "勝",
      draw: "和",
      loss: "負",
      points: "積分",
      winRate: "勝率",
      recentForm: "近期狀態",
      home: "主場",
      away: "客場",
      shortName: "簡稱",
    },
  },
  aiPredictionsPageCopy: {
    ...zhCnCopy.aiPredictionsPageCopy,
    heroTitle: "AI 預測面板",
    heroDescription: "用規則與輕量模型混合輸出推薦結論、可信度與解釋因子。",
    hitRate30d: "近 30 天命中率",
    avgEdge: "平均邊際",
    explainableFactors: "可解釋因子",
    explainableFactorCount: "12 類",
    confidence: "信心",
    expectedEdge: "預期邊際",
    viewMatch: "查看賽事詳情",
  },
  uiCopy: {
    ...zhCnCopy.uiCopy,
    instantBoard: "即時看板",
    matchesLoaded: (count) => `已載入 ${count} 場比賽`,
    fixtureKickoff: "賽事 / 開賽",
    matchup: "對陣",
    status: "狀態",
    oddsSummary: "賠率摘要",
    dataSlice: "數據切片",
    details: "詳情",
    viewMatch: "查看比賽",
    filterLeague: "聯賽篩選",
    allLeagues: "全部聯賽",
    filterStatus: "狀態篩選",
    allStatuses: "全部狀態",
    sortMode: "排序方式",
    sortByTime: "按時間",
    sortByLeague: "按聯賽",
    refresh: "刷新",
    scheduleResults: "賽程賽果",
    teamProfile: "球隊資料",
    historicalH2H: "歷史交鋒",
    query: "查詢",
    unlocked: "已解鎖",
    fullAnalysis: "完整分析",
    teaserOnly: "目前僅顯示試看摘要。",
    memberStatusActive: "會員有效",
    memberStatusInactive: "未開通會員",
  },
  searchCopy: {
    ...zhCnCopy.searchCopy,
    headerPlaceholder: "搜尋球隊、聯賽、計畫單、作者",
    headerSubmit: "搜尋",
    inputLabel: "站內搜尋",
    inputHint: "支援搜尋球隊、聯賽、計畫單、作者與賽事關鍵字。",
    pageTitle: "站內檢索",
    pageDescription: "把比賽、聯賽、付費計畫單和作者入口集中到同一個搜尋頁，方便快速定位歷史資料與內容入口。",
    totalResults: (count, query) => `「${query}」共找到 ${count} 筆結果`,
    noQueryTitle: "先輸入一個關鍵字",
    noQueryDescription: "可以直接搜尋球隊、聯賽、賽事、計畫單標題或作者名稱。",
    noResultsTitle: "沒有找到相符結果",
    noResultsDescription: (query) => `目前沒有檢索到「${query}」相關內容，可以換一個關鍵字再試。`,
    sections: {
      matches: "比賽",
      leagues: "聯賽",
      plans: "計畫單",
      authors: "作者 / 團隊",
    },
    labels: {
      status: "狀態",
      kickoff: "開賽",
      league: "聯賽",
      season: "賽季",
      region: "地區",
      sport: "項目",
      price: "價格",
      focus: "擅長",
      badge: "標籤",
    },
    actions: {
      match: "查看比賽",
      league: "進入資料庫",
      plan: "查看計畫單",
      author: "查看內容",
    },
  },
  homePageCopy: {
    ...zhCnCopy.homePageCopy,
    heroTitlePrefix: "打造更有辨識度的",
    heroTitleHighlightOne: "比賽日指揮台",
    heroTitleInfix: "並接上",
    heroTitleHighlightTwo: "會員收入閉環",
    heroDescription: "一期聚焦足球、籃球、板球與電競，把比分、資料庫、AI 推薦、內容付費、會員購買與後台營運放進同一套 Next.js 應用。",
    openLiveScores: "打開即時比分",
    viewMembershipPlans: "查看會員套餐",
    commandFeed: "指揮台快訊",
    hotRecommendationsTitle: "熱門推薦卡片",
    hotRecommendationsDescription: "同時支援會員解鎖與單條購買，驗證一期商業閉環。",
    hotTag: "熱門",
    openPlan: "打開計畫單",
    membershipTitle: "會員套餐",
    membershipDescription: "月卡、賽季卡與年卡都已納入一期範圍。",
    modelPulseTitle: "AI 預測脈搏",
    authorTitle: "作者與團隊榜單",
    authorDescription: "適合營運陳列連紅、勝率與受眾規模。",
    authorStats: {
      streak: "連紅",
      winRate: "勝率",
      monthlyRoi: "月 ROI",
      followers: "關注者",
    },
    cricketSpotlight: {
      eyebrow: "Cricket Expansion",
      title: "板球入口",
      description: "先把板球比分、賽程結果與聯賽覆蓋入口做實，再往更深的資料與內容模組擴展。",
      liveNow: "進行中",
      leaguesCovered: "已覆蓋聯賽",
      openCricket: "進入板球比分",
      openMatch: "查看比賽",
    },
  },
  cricketPageCopy: {
    trackerEyebrow: "Cricket Tracker",
    trackerTitle: "板球賽程與賽果摘要",
    trackerDescription: "這一層先提供 live 比分之外的賽程/賽果補充，方便快速回看當天重點場次。",
    scheduleEyebrow: "Schedule & Results",
    upcomingTitle: "即將開賽",
    finishedTitle: "最新賽果",
    coverageTitle: "覆蓋範圍",
    coverageDescription: "目前板球模組使用穩定的本地化 fallback 數據，先驗證入口、篩選與瀏覽鏈路，再補真實同步源。",
    coverageLeagues: "聯賽數量",
    coverageMatches: "展示場次",
    noMatches: "目前沒有可展示的板球比賽。",
  },
  livePageCopy: {
    football: {
      ...zhCnCopy.livePageCopy.football,
      title: "足球即時比分",
      description: "支援聯賽篩選、狀態過濾與排序切換，優先展示熱門賽事與賠率摘要。",
      sportLabel: "足球",
    },
    basketball: {
      ...zhCnCopy.livePageCopy.basketball,
      title: "籃球賽程與即時盤",
      description: "圍繞讓分、總分與節奏變化組織籃球比賽頁，兼容 CBA 與 NBA 的即時展示。",
      sportLabel: "籃球",
    },
    cricket: {
      ...zhCnCopy.livePageCopy.cricket,
      title: "板球即時比分",
      description: "先覆蓋熱門聯賽的即時比分、回合進度、賽果狀態與賠率摘要，作為板球板塊的一期入口。",
      sportLabel: "板球",
    },
    esports: {
      ...zhCnCopy.livePageCopy.esports,
      title: "電競賽事面板",
      description: "聚合 LoL、Dota 2、CS2 三條分線，先覆蓋重點賽事比分、系列賽進度與盤口摘要。",
      sportLabel: "電競",
    },
  },
  checkoutPageCopy: {
    ...zhCnCopy.checkoutPageCopy,
    missingTitle: "訂單不可用",
    missingDescription: "這個訂單不存在、已失效，或不屬於目前帳號。你可以返回上一頁重新發起購買。",
    missingNote: "目前仍使用模擬支付頁，先把訂單狀態機、權益回寫與異常回跳鏈路驗證完整，再接入真實支付通道。",
    backToSource: "返回原頁面",
    backToEntry: "返回購買入口",
    title: "模擬支付確認",
    description: "這裡用於把訂單從待支付切換為已支付、支付失敗或已關閉，先驗證狀態機與權益生效，再接入真實支付通道。",
    orderType: "訂單類型",
    orderStatus: "目前狀態",
    orderTitle: "訂單標題",
    amount: "金額",
    createdAt: "建立於",
    paymentProvider: "支付模式",
    providerOrderId: "通道單號",
    expiresAt: "訂單有效期",
    paymentReference: "支付流水",
    orderId: "訂單號",
    confirmPayment: "確認模擬支付",
    simulateFailure: "模擬支付失敗",
    closeOrder: "關閉訂單",
    orderTypeLabel: (type) => (type === "membership" ? "會員訂單" : "內容訂單"),
    hint: {
      pendingMembership: "確認後會啟用會員權益，並按目前到期時間順延套餐時長。",
      pendingContent: "確認後會解鎖對應計畫單全文，權益僅對目前帳號生效。",
      paidMembership: "這筆會員訂單已經生效，可以直接返回會員中心查看最新權益。",
      paidContent: "這筆內容訂單已經生效，可以直接返回計畫單頁面查看最新解鎖狀態。",
      closed: "這筆訂單已關閉，如需繼續購買，請返回原頁面重新發起訂單。",
      failed: "這筆訂單支付失敗，系統已記錄失敗原因。請返回原頁面重新發起購買，或稍後再試。",
      refunded: "這筆訂單已退款，目前不會繼續保留對應權益。",
    },
  },
  paymentUiCopy: {
    ...zhCnCopy.paymentUiCopy,
    paymentResults: {
      checkout: {
        success: "支付已完成，訂單狀態已刷新。",
        closed: "訂單已關閉，可以返回上一頁重新發起購買。",
        failed: "支付失敗，失敗原因已記錄，可以返回上一頁重新發起購買。",
        error: "支付回調未完成，請稍後重試。",
      },
      member: {
        success: "模擬支付成功，會員權益已刷新。",
        closed: "訂單已關閉，本次購買未生效。",
        failed: "支付失敗，訂單已記錄失敗原因，可以重新發起購買。",
        error: "支付回調未完成，請返回會員頁重新發起訂單。",
      },
      plans: {
        success: "模擬支付成功，計畫單權益已刷新。",
        closed: "訂單已關閉，目前未解鎖該內容。",
        failed: "支付失敗，本次計畫單購買未生效，請重新發起。",
        error: "支付回調未完成，請重新發起這條計畫單的購買。",
      },
      plan: {
        success: "模擬支付成功，這條計畫單已為目前帳號解鎖。",
        closed: "訂單已關閉，內容仍保持鎖定。",
        failed: "支付失敗，本次訂單未解鎖內容，請重新發起購買。",
        error: "支付回調未完成，請重新發起這條計畫單的購買。",
      },
    },
    activityLabels: {
      paidAt: "支付於",
      failedAt: "失敗於",
      closedAt: "關閉於",
      refundedAt: "退款於",
      updatedAt: "最近更新",
    },
    failureLabel: "失敗原因",
    refundLabel: "退款原因",
    defaultFailureReason: "支付通道返回失敗，請重新發起訂單。",
    defaultRefundReason: "後台已發起退款，相關權益已回收。",
  },
};

const enCopy: SiteCopy = {
  ...zhCnCopy,
  footerCopy: {
    description: "A phase-one sports data platform built around football, basketball, cricket, and esports scores, stats, AI picks, memberships, and operator workflows.",
    coreModulesTitle: "Core Modules",
    coreModules: ["Live scores, odds, and cricket/esports coverage", "Database and historical fixtures", "AI predictions and paid plans"],
    commercialTitle: "Commercial Layer",
    commercialItems: ["Membership bundles and single unlocks", "Order history and entitlement state", "Admin operations and placements"],
  },
  localeSwitcherCopy: {
    label: "Language",
    options: {
      "zh-CN": { label: "Simplified Chinese", shortLabel: "简" },
      "zh-TW": { label: "Traditional Chinese", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "Thai", shortLabel: "TH" },
      vi: { label: "Vietnamese", shortLabel: "VI" },
      hi: { label: "Hindi", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "Home" },
    { href: "/live/football", label: "Football Live" },
    { href: "/live/basketball", label: "Basketball Live" },
    { href: "/live/cricket", label: "Cricket Live" },
    { href: "/live/esports", label: "Esports Live" },
    { href: "/database", label: "Database" },
    { href: "/ai-predictions", label: "AI Picks" },
    { href: "/plans", label: "Plans" },
    { href: "/member", label: "Member" },
    { href: "/admin", label: "Admin" },
  ],
  adminTabs: [
    { value: "overview", label: "Overview" },
    { value: "events", label: "Events" },
    { value: "content", label: "Content" },
    { value: "users", label: "Users & Orders" },
    { value: "ai", label: "AI Import" },
  ],
  matchStatusLabels: {
    live: "Live",
    upcoming: "Upcoming",
    finished: "Finished",
  },
  roleLabels: {
    visitor: "Visitor",
    member: "Member",
    operator: "Operator",
    finance: "Finance",
    admin: "Admin",
  },
  orderStatusLabels: {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    closed: "Closed",
    refunded: "Refunded",
  },
  sessionUiCopy: {
    visitorMode: "Visitor mode",
    loginExperience: "Sign in to test flows",
    logout: "Sign out",
  },
  authPageCopy: {
    ...zhCnCopy.authPageCopy,
    heroTitle: "Sign in as member or operator",
    heroDescription: "Use demo identities to validate membership purchases, content unlocks, and admin workflows before wiring up real auth.",
    adminDescription: "Jump into the admin console to review sync jobs, content operations, users, and orders.",
    adminAction: "Open admin",
    adminPresetName: "Operations Admin",
    memberDescription: "Open the member center to review entitlements, order history, and unlocked plans.",
    memberAction: "Open member center",
    memberPresetName: "Premium Member",
    customTitle: "Create a custom demo session",
    displayName: "Display name",
    role: "Role",
    submit: "Create session and sign in",
    customDefaultName: "Demo User",
  },
  memberPageCopy: {
    ...zhCnCopy.memberPageCopy,
    heroTitle: "Membership overview",
    heroTitleFor: (name) => `${name}'s entitlement overview`,
    heroDescription: "Review membership status, unlocked content, order history, and renewal entry points in one place.",
    currentRole: "Current role",
    memberStatus: "Membership",
    unlockedPlans: "Unlocked plans",
    plansTitle: "Membership bundles",
    plansDescription: "Monthly, seasonal, and annual bundles are available in the MVP flow.",
    durationLabel: (days) => `${days} days`,
    buyAfterLogin: "Sign in to buy",
    payNow: "Buy now",
    ordersTitle: "Order history",
    emptyOrders: "No orders yet. Membership and content purchases will appear here once you complete a flow.",
    membershipOrder: "Membership order",
    contentOrder: "Content order",
    createdAt: "Created",
    paymentProvider: "Payment mode",
    providerOrderId: "Gateway order ID",
    expiresAt: "Order expires at",
    paymentReference: "Payment reference",
    entitlementsTitle: "Unlocked content",
    membershipUnlockedNotice: "Your membership is active and plan access has been refreshed automatically.",
    emptyUnlockedPlans: "No plans are unlocked yet. Purchase a bundle or a single item to unlock content.",
  },
  plansPageCopy: {
    ...zhCnCopy.plansPageCopy,
    heroTitle: "Plans and author leaderboard",
    heroDescription: "Show author performance, plan teasers, pricing, and single-item purchase entry points.",
    winRate: "Win rate",
    payNow: "Buy now",
    membershipBundleActive: " Included in your active membership.",
    viewDetails: "View details",
  },
  planDetailCopy: {
    ...zhCnCopy.planDetailCopy,
    authorTeam: "Author / Team",
    kickoff: "Kickoff",
    singlePrice: "Single price",
    previewSummary: "Preview summary",
    fullAnalysisUnlocked: "Full analysis unlocked",
    payNowPrefix: "Unlock for",
    unlockNotice: "Only the preview section is visible right now. Buy this plan or activate membership to read the full analysis.",
  },
  matchDetailCopy: {
    ...zhCnCopy.matchDetailCopy,
    kickoff: "Kickoff",
    matchStatus: "Match status",
    currentScore: "Current score",
    venue: "Venue",
    dataSliceTitle: "Data slice",
    marketOdds: "Odds snapshot",
    matchSlice: "Match note",
    aiTitle: "AI angle",
    aiLink: "View all AI predictions",
    emptyPrediction: "No AI prediction is linked to this match yet.",
  },
  databasePageCopy: {
    ...zhCnCopy.databasePageCopy,
    heroTitle: (sportLabel) => `${sportLabel} database`,
    heroDescription: "Switch between leagues, seasons, standings, schedules, team cards, and head-to-head history.",
    currentSport: "Current sport",
    currentLeague: "Current league",
    season: "Season",
    sportFilter: "Sport",
    leagueFilter: "League",
    viewFilter: "View",
    football: "Football",
    basketball: "Basketball",
    cricket: "Cricket",
    esports: "Esports",
    standingsOption: "Standings",
    defaultViewTitle: "Standings",
    footballStandingsDescription: "Review points, wins, draws, losses, and title-race shape.",
    basketballStandingsDescription: "Review record, win rate, recent form, and home-away splits.",
    cricketStandingsDescription: "Review team rank, record, recent form, and home-away splits.",
    esportsStandingsDescription: "Review series record, map trend, recent form, and venue splits.",
    scheduleDescription: "Scan fixtures, results, and tagged notes.",
    teamsDescription: "Review aliases, ranks, recent form, and split records.",
    h2hDescription: "Review head-to-head history and key tags.",
    emptyStandingsTitle: "No standings available",
    emptyStandingsDescription: "Try again later or switch to another league.",
    emptyScheduleTitle: "No schedule data",
    emptyScheduleDescription: "There are no fixtures or results to show for this league yet.",
    emptyTeamsTitle: "No team data",
    emptyTeamsDescription: "There are no team cards available for this league yet.",
    emptyH2HTitle: "No head-to-head data",
    emptyH2HDescription: "There is no head-to-head history available for this league yet.",
    standingsColumns: {
      rank: "Rank",
      team: "Team",
      played: "Played",
      win: "Win",
      draw: "Draw",
      loss: "Loss",
      points: "Points",
      winRate: "Win rate",
      recentForm: "Recent form",
      home: "Home",
      away: "Away",
      shortName: "Short",
    },
  },
  aiPredictionsPageCopy: {
    ...zhCnCopy.aiPredictionsPageCopy,
    heroTitle: "AI prediction board",
    heroDescription: "Blend rules and lightweight models into readable picks, confidence, and explainable factors.",
    hitRate30d: "30-day hit rate",
    avgEdge: "Average edge",
    explainableFactors: "Explainable factors",
    explainableFactorCount: "12 types",
    confidence: "Confidence",
    expectedEdge: "Expected edge",
    viewMatch: "Open match",
  },
  uiCopy: {
    ...zhCnCopy.uiCopy,
    instantBoard: "Instant board",
    matchesLoaded: (count) => `${count} matches loaded`,
    fixtureKickoff: "Fixture / Kickoff",
    matchup: "Matchup",
    status: "Status",
    oddsSummary: "Odds",
    dataSlice: "Data",
    details: "Details",
    viewMatch: "View match",
    filterLeague: "League",
    allLeagues: "All leagues",
    filterStatus: "Status",
    allStatuses: "All statuses",
    sortMode: "Sort",
    sortByTime: "By time",
    sortByLeague: "By league",
    refresh: "Refresh",
    scheduleResults: "Fixtures & Results",
    teamProfile: "Teams",
    historicalH2H: "Head to Head",
    query: "Apply",
    unlocked: "Unlocked",
    fullAnalysis: "Full analysis",
    teaserOnly: "Preview only.",
    memberStatusActive: "Active membership",
    memberStatusInactive: "No membership",
  },
  searchCopy: {
    ...zhCnCopy.searchCopy,
    headerPlaceholder: "Search teams, leagues, plans, or authors",
    headerSubmit: "Search",
    inputLabel: "Site search",
    inputHint: "Search teams, leagues, matches, plans, or author names from one place.",
    pageTitle: "Site search",
    pageDescription: "Aggregate matches, leagues, paid plans, and author entry points into one retrieval page for faster navigation.",
    totalResults: (count, query) => `${count} results for “${query}”`,
    noQueryTitle: "Start with a keyword",
    noQueryDescription: "Try a team, league, fixture, plan title, or author name.",
    noResultsTitle: "No matching results",
    noResultsDescription: (query) => `No content matched “${query}” yet. Try another keyword.`,
    sections: {
      matches: "Matches",
      leagues: "Leagues",
      plans: "Plans",
      authors: "Authors",
    },
    labels: {
      status: "Status",
      kickoff: "Kickoff",
      league: "League",
      season: "Season",
      region: "Region",
      sport: "Sport",
      price: "Price",
      focus: "Focus",
      badge: "Badge",
    },
    actions: {
      match: "Open match",
      league: "Open database",
      plan: "Open plan",
      author: "Open content",
    },
  },
  homePageCopy: {
    ...zhCnCopy.homePageCopy,
    heroTitlePrefix: "Build a sharper",
    heroTitleHighlightOne: "match-day terminal",
    heroTitleInfix: "and connect it to a",
    heroTitleHighlightTwo: "membership revenue loop",
    heroDescription: "Phase one focuses on football, basketball, cricket, and esports, combining scores, stats, AI picks, paid content, memberships, and admin workflows inside one Next.js app.",
    openLiveScores: "Open live scores",
    viewMembershipPlans: "View memberships",
    commandFeed: "Command feed",
    hotRecommendationsTitle: "Hot recommendation cards",
    hotRecommendationsDescription: "Support both membership unlocks and single-plan checkout to validate the first commercial loop.",
    hotTag: "HOT",
    openPlan: "Open plan",
    membershipTitle: "Membership bundles",
    membershipDescription: "Monthly, seasonal, and annual bundles are all included in the MVP.",
    modelPulseTitle: "AI prediction pulse",
    authorTitle: "Author and team board",
    authorDescription: "An operator-friendly surface for streaks, hit rate, and audience scale.",
    authorStats: {
      streak: "Streak",
      winRate: "Win rate",
      monthlyRoi: "Monthly ROI",
      followers: "Followers",
    },
    cricketSpotlight: {
      eyebrow: "Cricket Expansion",
      title: "Cricket entry",
      description: "Make the cricket scores, schedule/results, and league coverage entry real first, then expand into deeper archive and content modules.",
      liveNow: "Live now",
      leaguesCovered: "Leagues covered",
      openCricket: "Open cricket live",
      openMatch: "Open match",
    },
  },
  cricketPageCopy: {
    trackerEyebrow: "Cricket Tracker",
    trackerTitle: "Cricket schedule and result summary",
    trackerDescription: "This layer adds schedule/result support around the live board so the current slate is easier to scan and revisit.",
    scheduleEyebrow: "Schedule & Results",
    upcomingTitle: "Upcoming fixtures",
    finishedTitle: "Latest results",
    coverageTitle: "Coverage",
    coverageDescription: "The cricket module currently uses a stable localized fallback dataset to validate the entry, filters, and browsing flow before a real sync source is added.",
    coverageLeagues: "Leagues",
    coverageMatches: "Fixtures shown",
    noMatches: "No cricket fixtures are available right now.",
  },
  livePageCopy: {
    football: {
      ...zhCnCopy.livePageCopy.football,
      title: "Football live scores",
      description: "Filter by league, state, and sort order while keeping hot fixtures and odds snapshots in view.",
      sportLabel: "Football",
    },
    basketball: {
      ...zhCnCopy.livePageCopy.basketball,
      title: "Basketball live board",
      description: "Organize basketball fixtures around spreads, totals, and pace changes for CBA and NBA coverage.",
      sportLabel: "Basketball",
    },
    cricket: {
      ...zhCnCopy.livePageCopy.cricket,
      title: "Cricket live board",
      description: "Start with hot-league live scores, over progress, result state, and odds snapshots as the phase-one cricket entry.",
      sportLabel: "Cricket",
    },
    esports: {
      ...zhCnCopy.livePageCopy.esports,
      title: "Esports live board",
      description: "Group LoL, Dota 2, and CS2 under one live surface with series state, scoreline, and odds context.",
      sportLabel: "Esports",
    },
  },
  checkoutPageCopy: {
    ...zhCnCopy.checkoutPageCopy,
    missingTitle: "Order unavailable",
    missingDescription: "This order does not exist, has expired, or does not belong to the current account. Return to the previous page and create a new one.",
    missingNote: "The mock checkout stays in place for now so we can validate the order state machine, entitlement write-back, and failure redirects before plugging in a real gateway.",
    backToSource: "Back to source page",
    backToEntry: "Back to purchase entry",
    title: "Mock payment confirmation",
    description: "Use this page to switch an order from pending to paid, failed, or closed so we can verify the full order lifecycle before real payment integration.",
    orderType: "Order type",
    orderStatus: "Current status",
    orderTitle: "Order title",
    amount: "Amount",
    createdAt: "Created",
    paymentProvider: "Payment mode",
    providerOrderId: "Gateway order ID",
    expiresAt: "Order expires at",
    paymentReference: "Payment reference",
    orderId: "Order ID",
    confirmPayment: "Confirm mock payment",
    simulateFailure: "Simulate failure",
    closeOrder: "Close order",
    orderTypeLabel: (type) => (type === "membership" ? "Membership order" : "Content order"),
    hint: {
      pendingMembership: "Confirming will activate membership entitlements and extend the current expiry window.",
      pendingContent: "Confirming will unlock the full plan for the current account only.",
      paidMembership: "This membership order is already active. You can return to the member center to review the refreshed entitlements.",
      paidContent: "This content order is already active. You can return to the plan page to review the unlocked state.",
      closed: "This order has already been closed. Return to the source page if you want to create a new order.",
      failed: "This payment failed and the reason has been logged. Return to the source page to try again later.",
      refunded: "This order has already been refunded and the related entitlement is no longer retained.",
    },
  },
  paymentUiCopy: {
    ...zhCnCopy.paymentUiCopy,
    paymentResults: {
      checkout: {
        success: "Payment completed and the order state has been refreshed.",
        closed: "The order was closed. You can return and create a new payment.",
        failed: "The payment failed and the reason has been logged.",
        error: "The payment callback has not completed yet. Please try again later.",
      },
      member: {
        success: "Mock payment succeeded and membership entitlements have been refreshed.",
        closed: "The order was closed and this purchase did not take effect.",
        failed: "The payment failed and the order now contains a failure reason.",
        error: "The callback has not completed yet. Please restart the member purchase flow.",
      },
      plans: {
        success: "Mock payment succeeded and the plan entitlement has been refreshed.",
        closed: "The order was closed and the content remains locked.",
        failed: "The payment failed and this plan purchase did not take effect.",
        error: "The callback has not completed yet. Please recreate the purchase.",
      },
      plan: {
        success: "Mock payment succeeded and this plan is now unlocked for the current account.",
        closed: "The order was closed and the content remains locked.",
        failed: "The payment failed and the content was not unlocked.",
        error: "The callback has not completed yet. Please recreate this purchase.",
      },
    },
    activityLabels: {
      paidAt: "Paid at",
      failedAt: "Failed at",
      closedAt: "Closed at",
      refundedAt: "Refunded at",
      updatedAt: "Updated at",
    },
    failureLabel: "Failure reason",
    refundLabel: "Refund reason",
    defaultFailureReason: "The payment channel returned a failure response. Please create a new order.",
    defaultRefundReason: "An operator refunded this order and the entitlement has been revoked.",
  },
};

const thCopy: SiteCopy = {
  ...enCopy,
  footerCopy: {
    description: "แพลตฟอร์มข้อมูลกีฬาเวอร์ชัน MVP ที่รวมสกอร์สด สถิติ AI พยากรณ์ สมาชิก และงานปฏิบัติการหลังบ้านไว้ในที่เดียว",
    coreModulesTitle: "โมดูลหลัก",
    coreModules: ["สกอร์สด ราคา และคริกเก็ต/อีสปอร์ต", "ฐานข้อมูลและโปรแกรมย้อนหลัง", "AI พยากรณ์และแผนเสียเงิน"],
    commercialTitle: "ชั้นธุรกิจ",
    commercialItems: ["แพ็กเกจสมาชิกและปลดล็อกรายการเดียว", "ประวัติคำสั่งซื้อและสิทธิ์ใช้งาน", "หลังบ้านและตำแหน่งแนะนำ"],
  },
  localeSwitcherCopy: {
    label: "ภาษา",
    options: {
      "zh-CN": { label: "ภาษาจีนตัวย่อ", shortLabel: "简" },
      "zh-TW": { label: "ภาษาจีนตัวเต็ม", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "ไทย", shortLabel: "TH" },
      vi: { label: "Tiếng Việt", shortLabel: "VI" },
      hi: { label: "हिन्दी", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "หน้าแรก" },
    { href: "/live/football", label: "ฟุตบอลสด" },
    { href: "/live/basketball", label: "บาสเกตบอลสด" },
    { href: "/live/cricket", label: "คริกเก็ตสด" },
    { href: "/live/esports", label: "อีสปอร์ตสด" },
    { href: "/database", label: "ฐานข้อมูล" },
    { href: "/ai-predictions", label: "AI พยากรณ์" },
    { href: "/plans", label: "แผน" },
    { href: "/member", label: "สมาชิก" },
    { href: "/admin", label: "แอดมิน" },
  ],
  matchStatusLabels: {
    live: "สด",
    upcoming: "ยังไม่เริ่ม",
    finished: "จบแล้ว",
  },
  roleLabels: {
    visitor: "ผู้เยี่ยมชม",
    member: "สมาชิก",
    operator: "ผู้ดูแลระบบ",
    finance: "การเงิน",
    admin: "แอดมิน",
  },
  orderStatusLabels: {
    pending: "รอชำระ",
    paid: "ชำระแล้ว",
    failed: "ชำระไม่สำเร็จ",
    closed: "ปิดแล้ว",
    refunded: "คืนเงินแล้ว",
  },
  sessionUiCopy: {
    visitorMode: "โหมดผู้เยี่ยมชม",
    loginExperience: "เข้าสู่ระบบเพื่อทดสอบ",
    logout: "ออกจากระบบ",
  },
  authPageCopy: {
    ...enCopy.authPageCopy,
    heroTitle: "เข้าสู่ระบบสมาชิกหรือทีมปฏิบัติการ",
    heroDescription: "ใช้บัญชีเดโมเพื่อตรวจสอบการซื้อสมาชิก การปลดล็อกคอนเทนต์ และขั้นตอนหลังบ้านก่อนเชื่อม auth จริง",
    adminTitle: "บัญชีหลังบ้าน",
    adminDescription: "เข้าสู่คอนโซลเพื่อดูงานซิงก์ เนื้อหา ผู้ใช้ และคำสั่งซื้อ",
    adminAction: "เข้าแอดมิน",
    memberTitle: "บัญชีสมาชิก",
    memberDescription: "เข้าสู่ศูนย์สมาชิกเพื่อตรวจสอบสิทธิ์ ประวัติคำสั่งซื้อ และแผนที่ปลดล็อกแล้ว",
    memberAction: "เข้าสู่ศูนย์สมาชิก",
    customTitle: "สร้างเซสชันเดโมเอง",
    displayName: "ชื่อที่แสดง",
    email: "อีเมล",
    role: "บทบาท",
    submit: "สร้างเซสชันและเข้าสู่ระบบ",
  },
  memberPageCopy: {
    ...enCopy.memberPageCopy,
    heroTitle: "ภาพรวมสมาชิก",
    heroTitleFor: (name) => `ภาพรวมสิทธิ์ของ ${name}`,
    heroDescription: "ดูสถานะสมาชิก เนื้อหาที่ปลดล็อก คำสั่งซื้อ และจุดต่ออายุในที่เดียว",
    currentRole: "บทบาทปัจจุบัน",
    memberStatus: "สถานะสมาชิก",
    unlockedPlans: "แผนที่ปลดล็อก",
    plansTitle: "แพ็กเกจสมาชิก",
    plansDescription: "รองรับแพ็กเกจรายเดือน ตามฤดูกาล และรายปี",
    buyAfterLogin: "เข้าสู่ระบบก่อนซื้อ",
    payNow: "ซื้อเลย",
    ordersTitle: "ประวัติคำสั่งซื้อ",
    entitlementsTitle: "เนื้อหาที่ปลดล็อก",
  },
  plansPageCopy: {
    ...enCopy.plansPageCopy,
    heroTitle: "แผนและอันดับผู้เขียน",
    heroDescription: "รวมผลงานผู้เขียน ตัวอย่างแผน ราคา และทางเข้าซื้อรายการเดียว",
    winRate: "อัตราชนะ",
    payNow: "ซื้อเลย",
    viewDetails: "ดูรายละเอียด",
  },
  planDetailCopy: {
    ...enCopy.planDetailCopy,
    authorTeam: "ผู้เขียน / ทีม",
    kickoff: "เวลาแข่ง",
    singlePrice: "ราคาเดี่ยว",
    previewSummary: "สรุปตัวอย่าง",
    fullAnalysisUnlocked: "ปลดล็อกบทวิเคราะห์เต็มแล้ว",
    payNowPrefix: "ปลดล็อกด้วย",
    unlockNotice: "ตอนนี้เห็นได้เฉพาะตัวอย่าง ซื้อแผนนี้หรือเปิดสมาชิกเพื่ออ่านทั้งหมด",
  },
  matchDetailCopy: {
    ...enCopy.matchDetailCopy,
    kickoff: "เวลาแข่ง",
    matchStatus: "สถานะการแข่งขัน",
    currentScore: "สกอร์ปัจจุบัน",
    venue: "สนาม",
    dataSliceTitle: "ข้อมูลย่อ",
    marketOdds: "สรุปราคา",
    matchSlice: "หมายเหตุการแข่งขัน",
    aiTitle: "มุมมอง AI",
    aiLink: "ดู AI ทั้งหมด",
  },
  databasePageCopy: {
    ...enCopy.databasePageCopy,
    heroTitle: (sportLabel) => `ฐานข้อมูล ${sportLabel}`,
    heroDescription: "สลับดูลีก ฤดูกาล ตารางคะแนน โปรแกรม ทีม และเฮดทูเฮดได้ในหน้าเดียว",
    currentSport: "ชนิดกีฬา",
    currentLeague: "ลีกปัจจุบัน",
    season: "ฤดูกาล",
    sportFilter: "กีฬา",
    leagueFilter: "ลีก",
    viewFilter: "มุมมอง",
    football: "ฟุตบอล",
    basketball: "บาสเกตบอล",
    cricket: "คริกเก็ต",
    esports: "อีสปอร์ต",
    standingsOption: "ตารางคะแนน",
    defaultViewTitle: "ตารางคะแนน",
    scheduleDescription: "ดูโปรแกรม ผลการแข่งขัน และหมายเหตุสำคัญ",
    teamsDescription: "ดูชื่อย่อ อันดับ ฟอร์มล่าสุด และสถิติเหย้าเยือน",
    h2hDescription: "ดูประวัติการพบกันและแท็กสำคัญ",
  },
  aiPredictionsPageCopy: {
    ...enCopy.aiPredictionsPageCopy,
    heroTitle: "บอร์ด AI พยากรณ์",
    heroDescription: "รวมผลพยากรณ์ ความมั่นใจ ค่าคาดหวัง และปัจจัยอธิบายแบบอ่านง่าย",
    hitRate30d: "อัตราเข้า 30 วัน",
    avgEdge: "ค่าได้เปรียบเฉลี่ย",
    explainableFactors: "ปัจจัยอธิบาย",
    confidence: "ความมั่นใจ",
    expectedEdge: "ค่าได้เปรียบคาดหวัง",
    viewMatch: "เปิดแมตช์",
  },
  uiCopy: {
    ...enCopy.uiCopy,
    instantBoard: "กระดานสด",
    fixtureKickoff: "คู่แข่ง / เวลาแข่ง",
    matchup: "คู่แข่งขัน",
    status: "สถานะ",
    oddsSummary: "ราคา",
    dataSlice: "ข้อมูล",
    details: "รายละเอียด",
    viewMatch: "ดูแมตช์",
    filterLeague: "ลีก",
    allLeagues: "ทุกลีก",
    filterStatus: "สถานะ",
    allStatuses: "ทุกสถานะ",
    sortMode: "เรียงลำดับ",
    sortByTime: "ตามเวลา",
    sortByLeague: "ตามลีก",
    refresh: "รีเฟรช",
    scheduleResults: "โปรแกรมและผล",
    teamProfile: "ทีม",
    historicalH2H: "เฮดทูเฮด",
    query: "ใช้ตัวกรอง",
    unlocked: "ปลดล็อกแล้ว",
    fullAnalysis: "บทวิเคราะห์เต็ม",
    teaserOnly: "แสดงตัวอย่างเท่านั้น",
    memberStatusActive: "สมาชิกใช้งานอยู่",
    memberStatusInactive: "ยังไม่มีสมาชิก",
  },
  searchCopy: {
    ...enCopy.searchCopy,
    headerPlaceholder: "ค้นหาทีม ลีก แผน หรือผู้เขียน",
    headerSubmit: "ค้นหา",
    inputLabel: "ค้นหาในเว็บ",
    inputHint: "ค้นหาทีม ลีก แมตช์ แผน หรือชื่อผู้เขียนได้จากที่เดียว",
    pageTitle: "ค้นหาในเว็บไซต์",
    pageDescription: "รวมแมตช์ ลีก แผนเสียเงิน และทางเข้าผู้เขียนไว้ในหน้าเดียวเพื่อค้นหาได้เร็วขึ้น",
    noQueryTitle: "เริ่มจากคีย์เวิร์ด",
    noQueryDescription: "ลองพิมพ์ชื่อทีม ลีก แมตช์ แผน หรือผู้เขียน",
    noResultsTitle: "ไม่พบผลลัพธ์",
    sections: {
      matches: "แมตช์",
      leagues: "ลีก",
      plans: "แผน",
      authors: "ผู้เขียน",
    },
    labels: {
      status: "สถานะ",
      kickoff: "เวลาแข่ง",
      league: "ลีก",
      season: "ฤดูกาล",
      region: "ภูมิภาค",
      sport: "กีฬา",
      price: "ราคา",
      focus: "จุดเด่น",
      badge: "ป้าย",
    },
    actions: {
      match: "เปิดแมตช์",
      league: "เปิดฐานข้อมูล",
      plan: "เปิดแผน",
      author: "เปิดเนื้อหา",
    },
  },
  homePageCopy: {
    ...enCopy.homePageCopy,
    heroTitlePrefix: "สร้าง",
    heroTitleHighlightOne: "ศูนย์บัญชาการวันแข่ง",
    heroTitleInfix: "และเชื่อมกับ",
    heroTitleHighlightTwo: "วงจรรายได้สมาชิก",
    heroDescription: "เฟสแรกเน้นฟุตบอล บาสเกตบอล คริกเก็ต และอีสปอร์ต รวมสกอร์ สถิติ AI คอนเทนต์เสียเงิน สมาชิก และงานหลังบ้านไว้ในแอปเดียว",
    openLiveScores: "เปิดสกอร์สด",
    viewMembershipPlans: "ดูแพ็กเกจสมาชิก",
    hotRecommendationsTitle: "การ์ดแนะนำยอดนิยม",
    membershipTitle: "แพ็กเกจสมาชิก",
    modelPulseTitle: "ชีพจร AI",
    authorTitle: "อันดับผู้เขียนและทีม",
    cricketSpotlight: {
      eyebrow: "Cricket",
      title: "ทางเข้าคริกเก็ต",
      description: "ทำให้ทางเข้าสกอร์สด โปรแกรม และลีกคริกเก็ตใช้งานจริงก่อน แล้วค่อยขยายสู่ฐานข้อมูลและคอนเทนต์ที่ลึกขึ้น",
      liveNow: "กำลังถ่ายทอดสด",
      leaguesCovered: "ลีกที่ครอบคลุม",
      openCricket: "เปิดคริกเก็ตสด",
      openMatch: "เปิดแมตช์",
    },
  },
  cricketPageCopy: {
    ...enCopy.cricketPageCopy,
    trackerTitle: "สรุปโปรแกรมและผลคริกเก็ต",
    trackerDescription: "ชั้นนี้เพิ่มโปรแกรม/ผลรอบกระดานสดเพื่อให้ดูและย้อนกลับง่ายขึ้น",
    upcomingTitle: "แมตช์ถัดไป",
    finishedTitle: "ผลล่าสุด",
    coverageTitle: "ความครอบคลุม",
    noMatches: "ยังไม่มีแมตช์คริกเก็ตในตอนนี้",
  },
  livePageCopy: {
    football: { ...enCopy.livePageCopy.football, title: "ฟุตบอลสด", description: "กรองตามลีก สถานะ และเวลา พร้อมดูแมตช์เด่นและสรุปราคา", sportLabel: "ฟุตบอล" },
    basketball: { ...enCopy.livePageCopy.basketball, title: "บอร์ดบาสเกตบอลสด", description: "จัดแมตช์บาสเกตบอลตามแฮนดิแคป แต้มรวม และจังหวะเกม", sportLabel: "บาสเกตบอล" },
    cricket: { ...enCopy.livePageCopy.cricket, title: "บอร์ดคริกเก็ตสด", description: "เริ่มจากสกอร์สด ลีกเด่น ความคืบหน้าโอเวอร์ และสรุปราคา", sportLabel: "คริกเก็ต" },
    esports: { ...enCopy.livePageCopy.esports, title: "บอร์ดอีสปอร์ตสด", description: "รวม LoL, Dota 2 และ CS2 ในหน้าเดียวพร้อมสถานะซีรีส์และบริบทราคา", sportLabel: "อีสปอร์ต" },
  },
};

const viCopy: SiteCopy = {
  ...enCopy,
  footerCopy: {
    description: "Nền tảng dữ liệu thể thao giai đoạn MVP kết hợp tỷ số trực tiếp, thống kê, AI dự đoán, hội viên và vận hành hậu đài trong một hệ thống.",
    coreModulesTitle: "Mô-đun chính",
    coreModules: ["Tỷ số trực tiếp, odds và cricket/esports", "CSDL và lịch sử thi đấu", "AI dự đoán và kèo trả phí"],
    commercialTitle: "Lớp thương mại",
    commercialItems: ["Gói hội viên và mở khóa từng nội dung", "Lịch sử đơn hàng và quyền truy cập", "Hậu đài vận hành và vị trí đề xuất"],
  },
  localeSwitcherCopy: {
    label: "Ngôn ngữ",
    options: {
      "zh-CN": { label: "Tiếng Trung giản thể", shortLabel: "简" },
      "zh-TW": { label: "Tiếng Trung phồn thể", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "ไทย", shortLabel: "TH" },
      vi: { label: "Tiếng Việt", shortLabel: "VI" },
      hi: { label: "हिन्दी", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "Trang chủ" },
    { href: "/live/football", label: "Bóng đá trực tiếp" },
    { href: "/live/basketball", label: "Bóng rổ trực tiếp" },
    { href: "/live/cricket", label: "Cricket trực tiếp" },
    { href: "/live/esports", label: "Esports trực tiếp" },
    { href: "/database", label: "Cơ sở dữ liệu" },
    { href: "/ai-predictions", label: "Dự đoán AI" },
    { href: "/plans", label: "Kế hoạch" },
    { href: "/member", label: "Hội viên" },
    { href: "/admin", label: "Quản trị" },
  ],
  matchStatusLabels: { live: "Đang diễn ra", upcoming: "Sắp diễn ra", finished: "Đã kết thúc" },
  roleLabels: { visitor: "Khách", member: "Hội viên", operator: "Vận hành", finance: "Tài chính", admin: "Quản trị" },
  orderStatusLabels: { pending: "Chờ thanh toán", paid: "Đã thanh toán", failed: "Thanh toán lỗi", closed: "Đã đóng", refunded: "Đã hoàn tiền" },
  sessionUiCopy: { visitorMode: "Chế độ khách", loginExperience: "Đăng nhập để trải nghiệm", logout: "Đăng xuất" },
  authPageCopy: {
    ...enCopy.authPageCopy,
    heroTitle: "Đăng nhập hội viên hoặc vận hành",
    heroDescription: "Dùng tài khoản demo để kiểm tra mua hội viên, mở khóa nội dung và luồng quản trị trước khi nối auth thật.",
    adminAction: "Mở quản trị",
    memberAction: "Mở trung tâm hội viên",
    customTitle: "Tạo phiên demo tùy chỉnh",
    displayName: "Tên hiển thị",
    submit: "Tạo phiên và đăng nhập",
  },
  memberPageCopy: {
    ...enCopy.memberPageCopy,
    heroTitle: "Tổng quan hội viên",
    heroTitleFor: (name) => `Tổng quan quyền truy cập của ${name}`,
    heroDescription: "Xem trạng thái hội viên, nội dung đã mở khóa, lịch sử đơn hàng và điểm gia hạn ở một nơi.",
    currentRole: "Vai trò hiện tại",
    memberStatus: "Trạng thái hội viên",
    unlockedPlans: "Kế hoạch đã mở khóa",
    plansTitle: "Gói hội viên",
    buyAfterLogin: "Đăng nhập để mua",
    payNow: "Mua ngay",
    ordersTitle: "Lịch sử đơn hàng",
    entitlementsTitle: "Nội dung đã mở khóa",
  },
  plansPageCopy: {
    ...enCopy.plansPageCopy,
    heroTitle: "Kế hoạch và bảng xếp hạng tác giả",
    heroDescription: "Hiển thị thành tích tác giả, phần xem trước, giá và lối vào mua lẻ.",
    winRate: "Tỷ lệ thắng",
    payNow: "Mua ngay",
    viewDetails: "Xem chi tiết",
  },
  databasePageCopy: {
    ...enCopy.databasePageCopy,
    heroTitle: (sportLabel) => `CSDL ${sportLabel}`,
    heroDescription: "Chuyển giữa giải đấu, mùa giải, BXH, lịch thi đấu, đội bóng và đối đầu trong cùng một nơi.",
    currentSport: "Môn thể thao",
    currentLeague: "Giải hiện tại",
    season: "Mùa giải",
    sportFilter: "Môn",
    leagueFilter: "Giải",
    viewFilter: "Chế độ xem",
    football: "Bóng đá",
    basketball: "Bóng rổ",
    cricket: "Cricket",
    esports: "Esports",
    standingsOption: "Bảng xếp hạng",
    defaultViewTitle: "Bảng xếp hạng",
  },
  aiPredictionsPageCopy: {
    ...enCopy.aiPredictionsPageCopy,
    heroTitle: "Bảng dự đoán AI",
    heroDescription: "Kết hợp đầu ra mô hình, độ tin cậy, expected edge và yếu tố giải thích trong một trang dễ đọc.",
    hitRate30d: "Tỷ lệ trúng 30 ngày",
    avgEdge: "Edge trung bình",
    explainableFactors: "Yếu tố giải thích",
    confidence: "Độ tin cậy",
    expectedEdge: "Edge kỳ vọng",
    viewMatch: "Mở trận đấu",
  },
  uiCopy: {
    ...enCopy.uiCopy,
    instantBoard: "bảng trực tiếp",
    fixtureKickoff: "Trận / Giờ bóng lăn",
    matchup: "Cặp đấu",
    status: "Trạng thái",
    oddsSummary: "Odds",
    dataSlice: "Dữ liệu",
    details: "Chi tiết",
    viewMatch: "Xem trận",
    filterLeague: "Giải đấu",
    allLeagues: "Tất cả giải",
    filterStatus: "Trạng thái",
    allStatuses: "Tất cả trạng thái",
    sortMode: "Sắp xếp",
    sortByTime: "Theo thời gian",
    sortByLeague: "Theo giải",
    refresh: "Làm mới",
  },
  searchCopy: {
    ...enCopy.searchCopy,
    headerPlaceholder: "Tìm đội, giải, kế hoạch hoặc tác giả",
    headerSubmit: "Tìm kiếm",
    inputLabel: "Tìm trong site",
    inputHint: "Có thể tìm đội, giải, trận đấu, kế hoạch hoặc tên tác giả.",
    pageTitle: "Tìm kiếm trong site",
    pageDescription: "Gộp trận đấu, giải đấu, kế hoạch trả phí và tác giả vào một trang tìm kiếm thống nhất.",
    noQueryTitle: "Bắt đầu với từ khóa",
    noResultsTitle: "Không có kết quả phù hợp",
    sections: { matches: "Trận đấu", leagues: "Giải đấu", plans: "Kế hoạch", authors: "Tác giả" },
    actions: { match: "Mở trận", league: "Mở CSDL", plan: "Mở kế hoạch", author: "Mở nội dung" },
  },
  homePageCopy: {
    ...enCopy.homePageCopy,
    heroTitlePrefix: "Xây dựng",
    heroTitleHighlightOne: "trung tâm ngày thi đấu",
    heroTitleInfix: "và nối với",
    heroTitleHighlightTwo: "vòng doanh thu hội viên",
    heroDescription: "Giai đoạn một tập trung vào bóng đá, bóng rổ, cricket và esports, kết hợp tỷ số, dữ liệu, AI, nội dung trả phí và vận hành trong một ứng dụng.",
    openLiveScores: "Mở tỷ số trực tiếp",
    viewMembershipPlans: "Xem gói hội viên",
    membershipTitle: "Gói hội viên",
    modelPulseTitle: "Nhịp AI",
    authorTitle: "Bảng tác giả và đội",
    cricketSpotlight: {
      eyebrow: "Cricket",
      title: "Lối vào cricket",
      description: "Ưu tiên làm chắc phần tỷ số trực tiếp, lịch thi đấu và giải cricket trước khi mở rộng chiều sâu dữ liệu.",
      liveNow: "Đang trực tiếp",
      leaguesCovered: "Giải đã phủ",
      openCricket: "Mở cricket trực tiếp",
      openMatch: "Mở trận",
    },
  },
  cricketPageCopy: {
    ...enCopy.cricketPageCopy,
    trackerTitle: "Tổng hợp lịch và kết quả cricket",
    trackerDescription: "Lớp này bổ sung lịch và kết quả quanh bảng trực tiếp để quét nhanh và xem lại dễ hơn.",
    upcomingTitle: "Trận sắp diễn ra",
    finishedTitle: "Kết quả mới nhất",
    coverageTitle: "Phạm vi phủ",
  },
  livePageCopy: {
    football: { ...enCopy.livePageCopy.football, title: "Bóng đá trực tiếp", description: "Lọc theo giải, trạng thái và thời gian trong khi vẫn giữ trận nổi bật và odds trong tầm nhìn.", sportLabel: "Bóng đá" },
    basketball: { ...enCopy.livePageCopy.basketball, title: "Bảng bóng rổ trực tiếp", description: "Sắp xếp trận bóng rổ theo spread, total và nhịp độ trận đấu.", sportLabel: "Bóng rổ" },
    cricket: { ...enCopy.livePageCopy.cricket, title: "Bảng cricket trực tiếp", description: "Bắt đầu từ giải nổi bật, tiến độ over, trạng thái kết quả và odds snapshot.", sportLabel: "Cricket" },
    esports: { ...enCopy.livePageCopy.esports, title: "Bảng esports trực tiếp", description: "Gộp LoL, Dota 2 và CS2 vào một bề mặt trực tiếp với trạng thái series và tỷ số.", sportLabel: "Esports" },
  },
};

const hiCopy: SiteCopy = {
  ...enCopy,
  footerCopy: {
    description: "यह एक MVP स्पोर्ट्स डेटा प्लेटफ़ॉर्म है जो लाइव स्कोर, आँकड़े, AI प्रिडिक्शन, सदस्यता और ऑपरेशंस बैकएंड को एक साथ जोड़ता है।",
    coreModulesTitle: "मुख्य मॉड्यूल",
    coreModules: ["लाइव स्कोर, ऑड्स और क्रिकेट/ईस्पोर्ट्स", "डेटाबेस और ऐतिहासिक फिक्स्चर", "AI प्रिडिक्शन और पेड प्लान"],
    commercialTitle: "व्यावसायिक परत",
    commercialItems: ["सदस्यता पैक और सिंगल अनलॉक", "ऑर्डर इतिहास और एंटाइटलमेंट", "ऑपरेशन बैकएंड और प्लेसमेंट"],
  },
  localeSwitcherCopy: {
    label: "भाषा",
    options: {
      "zh-CN": { label: "सरल चीनी", shortLabel: "简" },
      "zh-TW": { label: "पारंपरिक चीनी", shortLabel: "繁" },
      en: { label: "English", shortLabel: "EN" },
      th: { label: "ไทย", shortLabel: "TH" },
      vi: { label: "Tiếng Việt", shortLabel: "VI" },
      hi: { label: "हिन्दी", shortLabel: "HI" },
    },
  },
  siteNavItems: [
    { href: "/", label: "होम" },
    { href: "/live/football", label: "फुटबॉल लाइव" },
    { href: "/live/basketball", label: "बास्केटबॉल लाइव" },
    { href: "/live/cricket", label: "क्रिकेट लाइव" },
    { href: "/live/esports", label: "ईस्पोर्ट्स लाइव" },
    { href: "/database", label: "डेटाबेस" },
    { href: "/ai-predictions", label: "AI भविष्यवाणी" },
    { href: "/plans", label: "प्लान" },
    { href: "/member", label: "सदस्य" },
    { href: "/admin", label: "एडमिन" },
  ],
  matchStatusLabels: { live: "लाइव", upcoming: "आगामी", finished: "समाप्त" },
  roleLabels: { visitor: "विज़िटर", member: "सदस्य", operator: "ऑपरेटर", finance: "वित्त", admin: "एडमिन" },
  orderStatusLabels: { pending: "भुगतान लंबित", paid: "भुगतान हुआ", failed: "भुगतान विफल", closed: "बंद", refunded: "रिफंड" },
  sessionUiCopy: { visitorMode: "विज़िटर मोड", loginExperience: "फ्लो टेस्ट करने के लिए साइन इन करें", logout: "साइन आउट" },
  authPageCopy: {
    ...enCopy.authPageCopy,
    heroTitle: "सदस्य या ऑपरेशन के रूप में साइन इन करें",
    heroDescription: "डेमो पहचान का उपयोग करके सदस्यता खरीद, कंटेंट अनलॉक और एडमिन वर्कफ़्लो को जाँचें।",
    adminAction: "एडमिन खोलें",
    memberAction: "सदस्य केंद्र खोलें",
    customTitle: "कस्टम डेमो सत्र बनाएँ",
    displayName: "डिस्प्ले नाम",
    submit: "सत्र बनाएँ और साइन इन करें",
  },
  memberPageCopy: {
    ...enCopy.memberPageCopy,
    heroTitle: "सदस्यता अवलोकन",
    heroTitleFor: (name) => `${name} का एंटाइटलमेंट अवलोकन`,
    heroDescription: "सदस्य स्थिति, अनलॉक कंटेंट, ऑर्डर इतिहास और रिन्यूअल एक ही जगह देखें।",
    currentRole: "वर्तमान भूमिका",
    memberStatus: "सदस्यता",
    unlockedPlans: "अनलॉक प्लान",
    plansTitle: "सदस्यता पैक",
    buyAfterLogin: "खरीदने के लिए साइन इन करें",
    payNow: "अभी खरीदें",
    ordersTitle: "ऑर्डर इतिहास",
    entitlementsTitle: "अनलॉक कंटेंट",
  },
  plansPageCopy: {
    ...enCopy.plansPageCopy,
    heroTitle: "प्लान और लेखक लीडरबोर्ड",
    heroDescription: "लेखक प्रदर्शन, प्लान टीज़र, प्राइस और सिंगल आइटम खरीद एंट्री दिखाएँ।",
    winRate: "जीत दर",
    payNow: "अभी खरीदें",
    viewDetails: "विवरण देखें",
  },
  databasePageCopy: {
    ...enCopy.databasePageCopy,
    heroTitle: (sportLabel) => `${sportLabel} डेटाबेस`,
    heroDescription: "लीग, सीज़न, स्टैंडिंग, शेड्यूल, टीम और हेड-टू-हेड को एक जगह बदलकर देखें।",
    currentSport: "स्पोर्ट",
    currentLeague: "वर्तमान लीग",
    season: "सीज़न",
    sportFilter: "स्पोर्ट",
    leagueFilter: "लीग",
    viewFilter: "व्यू",
    football: "फुटबॉल",
    basketball: "बास्केटबॉल",
    cricket: "क्रिकेट",
    esports: "ईस्पोर्ट्स",
    standingsOption: "स्टैंडिंग",
  },
  aiPredictionsPageCopy: {
    ...enCopy.aiPredictionsPageCopy,
    heroTitle: "AI भविष्यवाणी बोर्ड",
    heroDescription: "मॉडल आउटपुट, कॉन्फिडेंस, एक्सपेक्टेड एज और एक्सप्लनेबल फैक्टर एक पढ़ने योग्य पेज में देखें।",
    hitRate30d: "30-दिन हिट रेट",
    avgEdge: "औसत एज",
    explainableFactors: "व्याख्यात्मक कारक",
    confidence: "कॉन्फिडेंस",
    expectedEdge: "अपेक्षित एज",
    viewMatch: "मैच खोलें",
  },
  uiCopy: {
    ...enCopy.uiCopy,
    instantBoard: "लाइव बोर्ड",
    fixtureKickoff: "फिक्स्चर / किकऑफ़",
    matchup: "मुकाबला",
    status: "स्थिति",
    oddsSummary: "ऑड्स",
    dataSlice: "डेटा",
    details: "विवरण",
    viewMatch: "मैच देखें",
    filterLeague: "लीग",
    allLeagues: "सभी लीग",
    filterStatus: "स्थिति",
    allStatuses: "सभी स्थिति",
    sortMode: "सॉर्ट",
    sortByTime: "समय के अनुसार",
    sortByLeague: "लीग के अनुसार",
    refresh: "रिफ्रेश",
  },
  searchCopy: {
    ...enCopy.searchCopy,
    headerPlaceholder: "टीम, लीग, प्लान या लेखक खोजें",
    headerSubmit: "खोजें",
    inputLabel: "साइट खोज",
    inputHint: "टीम, लीग, मैच, प्लान या लेखक का नाम खोजें।",
    pageTitle: "साइट खोज",
    pageDescription: "मैच, लीग, पेड प्लान और लेखक को एक ही खोज पेज में जोड़ें।",
    noQueryTitle: "किसी कीवर्ड से शुरू करें",
    noResultsTitle: "कोई परिणाम नहीं मिला",
    sections: { matches: "मैच", leagues: "लीग", plans: "प्लान", authors: "लेखक" },
    actions: { match: "मैच खोलें", league: "डेटाबेस खोलें", plan: "प्लान खोलें", author: "कंटेंट खोलें" },
  },
  homePageCopy: {
    ...enCopy.homePageCopy,
    heroTitlePrefix: "एक बेहतर",
    heroTitleHighlightOne: "मैच-डे कमांड सेंटर",
    heroTitleInfix: "बनाएँ और इसे",
    heroTitleHighlightTwo: "सदस्यता राजस्व लूप",
    heroDescription: "पहला चरण फुटबॉल, बास्केटबॉल, क्रिकेट और ईस्पोर्ट्स पर केंद्रित है, जिसमें स्कोर, आँकड़े, AI, पेड कंटेंट, सदस्यता और ऑपरेशन वर्कफ़्लो एक साथ हैं।",
    openLiveScores: "लाइव स्कोर खोलें",
    viewMembershipPlans: "सदस्यता देखें",
    membershipTitle: "सदस्यता पैक",
    modelPulseTitle: "AI पल्स",
    authorTitle: "लेखक और टीम बोर्ड",
    cricketSpotlight: {
      eyebrow: "Cricket",
      title: "क्रिकेट एंट्री",
      description: "पहले क्रिकेट लाइव स्कोर, शेड्यूल और लीग एंट्री को मजबूत करें, फिर गहरी डेटा लेयर जोड़ें।",
      liveNow: "अभी लाइव",
      leaguesCovered: "कवर की गई लीग",
      openCricket: "क्रिकेट लाइव खोलें",
      openMatch: "मैच खोलें",
    },
  },
  cricketPageCopy: {
    ...enCopy.cricketPageCopy,
    trackerTitle: "क्रिकेट शेड्यूल और परिणाम सारांश",
    trackerDescription: "यह परत लाइव बोर्ड के साथ शेड्यूल और परिणाम जोड़ती है ताकि स्लेट को जल्दी स्कैन किया जा सके।",
    upcomingTitle: "आगामी मैच",
    finishedTitle: "नवीनतम परिणाम",
    coverageTitle: "कवरेज",
  },
  livePageCopy: {
    football: { ...enCopy.livePageCopy.football, title: "फुटबॉल लाइव स्कोर", description: "लीग, स्थिति और समय के अनुसार फ़िल्टर करें और हॉट मैच व ऑड्स देखें।", sportLabel: "फुटबॉल" },
    basketball: { ...enCopy.livePageCopy.basketball, title: "बास्केटबॉल लाइव बोर्ड", description: "स्प्रेड, टोटल और गति परिवर्तन के अनुसार मैच व्यवस्थित करें।", sportLabel: "बास्केटबॉल" },
    cricket: { ...enCopy.livePageCopy.cricket, title: "क्रिकेट लाइव बोर्ड", description: "हॉट लीग, ओवर प्रोग्रेस और परिणाम स्थिति के साथ क्रिकेट एंट्री शुरू करें।", sportLabel: "क्रिकेट" },
    esports: { ...enCopy.livePageCopy.esports, title: "ईस्पोर्ट्स लाइव बोर्ड", description: "LoL, Dota 2 और CS2 को एक लाइव सतह में समूहित करें।", sportLabel: "ईस्पोर्ट्स" },
  },
};

const siteCopyByLocale: Record<DisplayLocale, SiteCopy> = {
  "zh-CN": zhCnCopy,
  "zh-TW": zhTwCopy,
  en: enCopy,
  th: thCopy,
  vi: viCopy,
  hi: hiCopy,
};

export function getSiteCopy(locale: Locale | DisplayLocale = defaultLocale) {
  return siteCopyByLocale[locale] ?? siteCopyByLocale[defaultLocale];
}

export function getLocaleOptions() {
  return displayLocales.map((locale) => ({
    value: locale,
    ...getSiteCopy(defaultLocale).localeSwitcherCopy.options[locale],
  }));
}

const defaultCopy = getSiteCopy(defaultLocale);

export const brandCopy = defaultCopy.brandCopy;
export const footerCopy = defaultCopy.footerCopy;
export const localeSwitcherCopy = defaultCopy.localeSwitcherCopy;
export const siteNavItems = defaultCopy.siteNavItems;
export const adminTabs = defaultCopy.adminTabs;
export const matchStatusLabels = defaultCopy.matchStatusLabels;
export const roleLabels = defaultCopy.roleLabels;
export const orderStatusLabels = defaultCopy.orderStatusLabels;
export const sessionUiCopy = defaultCopy.sessionUiCopy;
export const authPageCopy = defaultCopy.authPageCopy;
export const memberPageCopy = defaultCopy.memberPageCopy;
export const plansPageCopy = defaultCopy.plansPageCopy;
export const planDetailCopy = defaultCopy.planDetailCopy;
export const matchDetailCopy = defaultCopy.matchDetailCopy;
export const databasePageCopy = defaultCopy.databasePageCopy;
export const aiPredictionsPageCopy = defaultCopy.aiPredictionsPageCopy;
export const uiCopy = defaultCopy.uiCopy;
export const searchCopy = defaultCopy.searchCopy;
export const homePageCopy = defaultCopy.homePageCopy;
export const livePageCopy = defaultCopy.livePageCopy;
export const checkoutPageCopy = defaultCopy.checkoutPageCopy;
export const paymentUiCopy = defaultCopy.paymentUiCopy;
