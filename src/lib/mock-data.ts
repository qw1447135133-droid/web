import type {
  AnnouncementTone,
  ArticlePlan,
  AuthorTeam,
  HeadToHeadRow,
  HomepageBannerTheme,
  HomepageModule,
  League,
  Match,
  MembershipPlan,
  PredictionRecord,
  ScheduleRow,
  Sport,
  Team,
} from "@/lib/types";

export const homepageModules: HomepageModule[] = [
  {
    id: "scores",
    key: "scores",
    eyebrow: "Live Intelligence",
    title: "即时比分与赔率摘要",
    description: "覆盖足球、篮球、板球与电竞主赛道，支持热门联赛、开赛状态与赔率摘要联动浏览。",
    href: "/live/football",
    metric: "256 场赛事在线",
  },
  {
    id: "plans",
    key: "plans",
    eyebrow: "Paid Insight",
    title: "计划单与作者团队",
    description: "支持会员套餐和单条解锁，展示热门赛事、作者榜单与近期表现。",
    href: "/plans",
    metric: "34 位作者上线",
  },
  {
    id: "ai",
    key: "ai",
    eyebrow: "Model Blend",
    title: "AI 预测与因子解释",
    description: "将规则引擎与轻模型结果组合成可读预测卡片，展示信心区间、因子和历史命中记录。",
    href: "/ai-predictions",
    metric: "近 30 天 62.8% 命中",
  },
  {
    id: "cricket",
    key: "cricket",
    eyebrow: "Cricket Dispatch",
    title: "板球比分与赛程入口",
    description: "先覆盖 IPL、PSL 等热门赛事的即时比分、赛果和联赛入口，作为板球板块的一期主入口。",
    href: "/live/cricket",
    metric: "3 场板球赛事可看",
  },
  {
    id: "esports",
    key: "esports",
    eyebrow: "Esports Grid",
    title: "电竞赛事入口",
    description: "新增 LoL、Dota 2、CS2 三条电竞分线，先覆盖重点赛事比分、赛程和资料库入口。",
    href: "/live/esports",
    metric: "3 条电竞赛事主线",
  },
];

type SiteAnnouncementSeed = {
  id: string;
  key: string;
  tone: AnnouncementTone;
  href?: string;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
  translations: {
    "zh-CN": { title: string; message: string; ctaLabel?: string };
    "zh-TW": { title: string; message: string; ctaLabel?: string };
    en: { title: string; message: string; ctaLabel?: string };
  };
};

export const siteAnnouncementSeeds: SiteAnnouncementSeed[] = [
  {
    id: "service-window",
    key: "service-window",
    tone: "warning",
    href: "/member",
    sortOrder: 0,
    translations: {
      "zh-CN": {
        title: "运营通知",
        message: "支付链路正在切换到人工审核模式，会员开通后通常会在 5 分钟内完成权益同步。",
        ctaLabel: "查看会员",
      },
      "zh-TW": {
        title: "營運通知",
        message: "支付鏈路正在切換到人工審核模式，會員開通後通常會在 5 分鐘內完成權益同步。",
        ctaLabel: "查看會員",
      },
      en: {
        title: "Ops notice",
        message: "Payments are currently reviewed manually, and member entitlements are usually synced within five minutes.",
        ctaLabel: "Open member center",
      },
    },
  },
  {
    id: "sync-coverage",
    key: "sync-coverage",
    tone: "info",
    href: "/live/football",
    sortOrder: 1,
    translations: {
      "zh-CN": {
        title: "数据同步",
        message: "足球、篮球、板球、电竞数据正在按联赛批次刷新，若出现延迟可先查看最近同步状态。",
        ctaLabel: "查看比分",
      },
      "zh-TW": {
        title: "資料同步",
        message: "足球、籃球、板球、電競資料正在按聯賽批次刷新，若出現延遲可先查看最近同步狀態。",
        ctaLabel: "查看比分",
      },
      en: {
        title: "Data sync",
        message: "Football, basketball, cricket, and esports feeds are refreshed in league batches. Check the live boards if an update looks delayed.",
        ctaLabel: "Open live scores",
      },
    },
  },
];

type HomepageBannerSeed = {
  id: string;
  key: string;
  theme: HomepageBannerTheme;
  href: string;
  imageUrl: string;
  sortOrder: number;
  startsAt?: string;
  endsAt?: string;
  translations: {
    "zh-CN": { title: string; subtitle: string; description: string; ctaLabel: string };
    "zh-TW": { title: string; subtitle: string; description: string; ctaLabel: string };
    en: { title: string; subtitle: string; description: string; ctaLabel: string };
  };
};

export const homepageBannerSeeds: HomepageBannerSeed[] = [
  {
    id: "hero-live-hub",
    key: "hero-live-hub",
    theme: "sunrise",
    href: "/live/football",
    imageUrl:
      "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80",
    sortOrder: 0,
    translations: {
      "zh-CN": {
        title: "实时赛况总控台",
        subtitle: "Live Match Command",
        description: "把足球、篮球、板球、电竞的即时比分、赔率摘要与热门比赛入口集中到首页首屏，方便运营直接承接流量。",
        ctaLabel: "进入比分大厅",
      },
      "zh-TW": {
        title: "即時賽況總控台",
        subtitle: "Live Match Command",
        description: "把足球、籃球、板球、電競的即時比分、賠率摘要與熱門比賽入口集中到首頁首屏，方便營運直接承接流量。",
        ctaLabel: "進入比分大廳",
      },
      en: {
        title: "Live command deck",
        subtitle: "Live Match Command",
        description: "Bring football, basketball, cricket, and esports live scores, odds snapshots, and hot-match discovery into one front-page command surface.",
        ctaLabel: "Open live scores",
      },
    },
  },
  {
    id: "hero-premium-plans",
    key: "hero-premium-plans",
    theme: "midnight",
    href: "/plans",
    imageUrl:
      "https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1600&q=80",
    sortOrder: 1,
    translations: {
      "zh-CN": {
        title: "会员与计划单转化位",
        subtitle: "Paid Insight Funnel",
        description: "适合在重大比赛日承接会员开通与单条内容解锁，把首页流量直接导入作者计划单和付费入口。",
        ctaLabel: "查看计划单",
      },
      "zh-TW": {
        title: "會員與計畫單轉化位",
        subtitle: "Paid Insight Funnel",
        description: "適合在重大比賽日承接會員開通與單條內容解鎖，把首頁流量直接導入作者計畫單與付費入口。",
        ctaLabel: "查看計畫單",
      },
      en: {
        title: "Membership and plan funnel",
        subtitle: "Paid Insight Funnel",
        description: "A conversion-led banner for big matchdays, pushing homepage traffic straight into membership and single-plan unlock flows.",
        ctaLabel: "Browse plans",
      },
    },
  },
  {
    id: "hero-cricket-spotlight",
    key: "hero-cricket-spotlight",
    theme: "field",
    href: "/live/cricket",
    imageUrl:
      "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?auto=format&fit=crop&w=1600&q=80",
    sortOrder: 2,
    translations: {
      "zh-CN": {
        title: "板球专区前台主视觉",
        subtitle: "Cricket Launch Window",
        description: "给 IPL、PSL 等热门板球赛事预留首页曝光位，便于后续按赛季节奏做重点活动和新入口推广。",
        ctaLabel: "打开板球专区",
      },
      "zh-TW": {
        title: "板球專區前台主視覺",
        subtitle: "Cricket Launch Window",
        description: "給 IPL、PSL 等熱門板球賽事預留首頁曝光位，便於後續按賽季節奏做重點活動與新入口推廣。",
        ctaLabel: "打開板球專區",
      },
      en: {
        title: "Cricket launch placement",
        subtitle: "Cricket Launch Window",
        description: "Reserve a front-page spotlight for IPL, PSL, and other cricket campaigns so the module can scale with seasonal promotions.",
        ctaLabel: "Open cricket hub",
      },
    },
  },
];

export const leagues: League[] = [
  { id: "epl", slug: "premier-league", sport: "football", name: "英超", region: "欧洲", season: "2025-2026", featured: true },
  { id: "laliga", slug: "la-liga", sport: "football", name: "西甲", region: "欧洲", season: "2025-2026", featured: true },
  { id: "j1", slug: "j1-league", sport: "football", name: "J1 League", region: "亚洲", season: "2026", featured: true },
  { id: "cba", slug: "cba", sport: "basketball", name: "CBA", region: "亚洲", season: "2025-2026", featured: true },
  { id: "nba", slug: "nba", sport: "basketball", name: "NBA", region: "北美", season: "2025-2026", featured: true },
  { id: "euroleague", slug: "euroleague", sport: "basketball", name: "EuroLeague", region: "欧洲", season: "2025-2026", featured: false },
  { id: "ipl", slug: "ipl", sport: "cricket", name: "IPL", region: "亚洲", season: "2026", featured: true },
  { id: "psl", slug: "psl", sport: "cricket", name: "PSL", region: "亚洲", season: "2026", featured: true },
  { id: "the-hundred", slug: "the-hundred", sport: "cricket", name: "The Hundred", region: "欧洲", season: "2026", featured: false },
  { id: "lpl", slug: "lpl", sport: "esports", name: "LPL", region: "亚洲", season: "2026 Spring", featured: true },
  { id: "dreamleague", slug: "dreamleague", sport: "esports", name: "DreamLeague", region: "国际", season: "Season 27", featured: true },
  { id: "blast-premier", slug: "blast-premier", sport: "esports", name: "BLAST Premier", region: "欧洲", season: "2026 Spring", featured: true },
];

export const teams: Team[] = [
  {
    id: "arsenal",
    leagueSlug: "premier-league",
    sport: "football",
    name: "Arsenal",
    shortName: "ARS",
    ranking: 1,
    form: "W-W-D-W-W",
    homeRecord: "12-2-1",
    awayRecord: "10-3-2",
  },
  {
    id: "liverpool",
    leagueSlug: "premier-league",
    sport: "football",
    name: "Liverpool",
    shortName: "LIV",
    ranking: 2,
    form: "W-W-W-L-W",
    homeRecord: "11-3-1",
    awayRecord: "9-4-2",
  },
  {
    id: "kobe",
    leagueSlug: "j1-league",
    sport: "football",
    name: "神户胜利船",
    shortName: "KOB",
    ranking: 1,
    form: "W-D-W-W-W",
    homeRecord: "7-1-1",
    awayRecord: "6-2-1",
  },
  {
    id: "tokyo",
    leagueSlug: "j1-league",
    sport: "football",
    name: "FC 东京",
    shortName: "TOK",
    ranking: 5,
    form: "L-W-W-D-W",
    homeRecord: "4-3-2",
    awayRecord: "5-2-2",
  },
  {
    id: "liaoning",
    leagueSlug: "cba",
    sport: "basketball",
    name: "辽宁本钢",
    shortName: "LIA",
    ranking: 1,
    form: "W-W-W-W-L",
    homeRecord: "18-2",
    awayRecord: "15-5",
  },
  {
    id: "guangdong",
    leagueSlug: "cba",
    sport: "basketball",
    name: "广东华南虎",
    shortName: "GDT",
    ranking: 3,
    form: "W-L-W-W-W",
    homeRecord: "16-4",
    awayRecord: "14-6",
  },
  {
    id: "celtics",
    leagueSlug: "nba",
    sport: "basketball",
    name: "Boston Celtics",
    shortName: "BOS",
    ranking: 1,
    form: "W-W-W-L-W",
    homeRecord: "29-7",
    awayRecord: "24-11",
  },
  {
    id: "bucks",
    leagueSlug: "nba",
    sport: "basketball",
    name: "Milwaukee Bucks",
    shortName: "MIL",
    ranking: 3,
    form: "W-L-W-W-L",
    homeRecord: "25-10",
    awayRecord: "20-15",
  },
  {
    id: "mumbai-indians",
    leagueSlug: "ipl",
    sport: "cricket",
    name: "Mumbai Indians",
    shortName: "MI",
    ranking: 2,
    form: "W-W-L-W-W",
    homeRecord: "4-1",
    awayRecord: "3-2",
  },
  {
    id: "chennai-super-kings",
    leagueSlug: "ipl",
    sport: "cricket",
    name: "Chennai Super Kings",
    shortName: "CSK",
    ranking: 4,
    form: "W-L-W-L-W",
    homeRecord: "3-2",
    awayRecord: "2-3",
  },
  {
    id: "royal-challengers-bengaluru",
    leagueSlug: "ipl",
    sport: "cricket",
    name: "Royal Challengers Bengaluru",
    shortName: "RCB",
    ranking: 5,
    form: "L-W-L-W-W",
    homeRecord: "2-3",
    awayRecord: "3-2",
  },
  {
    id: "kolkata-knight-riders",
    leagueSlug: "ipl",
    sport: "cricket",
    name: "Kolkata Knight Riders",
    shortName: "KKR",
    ranking: 1,
    form: "W-W-W-L-W",
    homeRecord: "4-1",
    awayRecord: "4-1",
  },
  {
    id: "lahore-qalandars",
    leagueSlug: "psl",
    sport: "cricket",
    name: "Lahore Qalandars",
    shortName: "LAH",
    ranking: 1,
    form: "W-W-W-W-L",
    homeRecord: "5-1",
    awayRecord: "3-2",
  },
  {
    id: "karachi-kings",
    leagueSlug: "psl",
    sport: "cricket",
    name: "Karachi Kings",
    shortName: "KAR",
    ranking: 3,
    form: "W-L-W-W-L",
    homeRecord: "4-2",
    awayRecord: "2-3",
  },
  {
    id: "t1",
    leagueSlug: "lpl",
    sport: "esports",
    name: "T1",
    shortName: "T1",
    ranking: 2,
    form: "W-W-L-W-W",
    homeRecord: "6-2",
    awayRecord: "5-3",
  },
  {
    id: "bilibili-gaming",
    leagueSlug: "lpl",
    sport: "esports",
    name: "Bilibili Gaming",
    shortName: "BLG",
    ranking: 1,
    form: "W-W-W-L-W",
    homeRecord: "7-1",
    awayRecord: "6-2",
  },
  {
    id: "gaimin-gladiators",
    leagueSlug: "dreamleague",
    sport: "esports",
    name: "Gaimin Gladiators",
    shortName: "GG",
    ranking: 1,
    form: "W-W-W-W-L",
    homeRecord: "8-1",
    awayRecord: "5-2",
  },
  {
    id: "team-liquid",
    leagueSlug: "dreamleague",
    sport: "esports",
    name: "Team Liquid",
    shortName: "TL",
    ranking: 3,
    form: "L-W-W-W-L",
    homeRecord: "6-3",
    awayRecord: "4-3",
  },
  {
    id: "natus-vincere",
    leagueSlug: "blast-premier",
    sport: "esports",
    name: "Natus Vincere",
    shortName: "NAVI",
    ranking: 2,
    form: "W-L-W-W-W",
    homeRecord: "7-2",
    awayRecord: "5-3",
  },
  {
    id: "team-vitality",
    leagueSlug: "blast-premier",
    sport: "esports",
    name: "Team Vitality",
    shortName: "VIT",
    ranking: 1,
    form: "W-W-W-W-W",
    homeRecord: "8-1",
    awayRecord: "6-2",
  },
];

export const matches: Match[] = [
  {
    id: "m1",
    sport: "football",
    leagueSlug: "j1-league",
    kickoff: "2026-04-01T18:00:00+08:00",
    status: "upcoming",
    venue: "Noevir Stadium",
    homeTeam: "神户胜利船",
    awayTeam: "清水鼓动",
    score: "-",
    statLine: "主队近 6 场 xG 1.82，客队近 5 场客场 3 连平",
    insight: "主队压迫强度与定位球效率都占优。",
    odds: { home: 1.84, draw: 3.52, away: 3.94, spread: "-0.75", total: "2.75", movement: "up" },
  },
  {
    id: "m2",
    sport: "football",
    leagueSlug: "j1-league",
    kickoff: "2026-04-01T18:00:00+08:00",
    status: "live",
    clock: "62'",
    venue: "Machida Stadium",
    homeTeam: "町田泽维亚",
    awayTeam: "FC 东京",
    score: "1 - 0",
    statLine: "射门 11:7，危险进攻 39:22",
    insight: "町田转换速度更快，东京后腰覆盖不足。",
    odds: { home: 2.37, draw: 3.12, away: 2.94, spread: "-0.25", total: "2.25", movement: "flat" },
  },
  {
    id: "m3",
    sport: "football",
    leagueSlug: "premier-league",
    kickoff: "2026-04-01T22:00:00+08:00",
    status: "upcoming",
    venue: "Emirates Stadium",
    homeTeam: "Arsenal",
    awayTeam: "Liverpool",
    score: "-",
    statLine: "榜首大战，主队近 10 场主场不败",
    insight: "比赛节奏会很高，盘口倾向主队不败。",
    odds: { home: 2.11, draw: 3.22, away: 3.18, spread: "-0.25", total: "2.5", movement: "down" },
  },
  {
    id: "m4",
    sport: "football",
    leagueSlug: "la-liga",
    kickoff: "2026-04-01T20:30:00+08:00",
    status: "finished",
    venue: "San Mames",
    homeTeam: "毕尔巴鄂竞技",
    awayTeam: "皇家社会",
    score: "2 - 1",
    statLine: "控球 52%，xG 1.74 : 0.96",
    insight: "边路压制最终兑现成终结效率。",
    odds: { home: 2.28, draw: 3.08, away: 3.11, spread: "-0.25", total: "2.25", movement: "up" },
  },
  {
    id: "m5",
    sport: "basketball",
    leagueSlug: "cba",
    kickoff: "2026-04-01T19:35:00+08:00",
    status: "live",
    clock: "Q3 07:18",
    venue: "Shenyang Arena",
    homeTeam: "辽宁本钢",
    awayTeam: "广东华南虎",
    score: "78 - 71",
    statLine: "篮板 31:24，三分 9:6",
    insight: "辽宁替补轮换稳定，广东失误偏多。",
    odds: { home: 1.68, away: 2.12, spread: "-4.5", total: "198.5", movement: "flat" },
  },
  {
    id: "m6",
    sport: "basketball",
    leagueSlug: "nba",
    kickoff: "2026-04-02T08:30:00+08:00",
    status: "upcoming",
    venue: "TD Garden",
    homeTeam: "Boston Celtics",
    awayTeam: "Milwaukee Bucks",
    score: "-",
    statLine: "主队节奏 99.4，客队近 5 场防守效率下滑",
    insight: "市场更看好主队半场建立分差。",
    odds: { home: 1.74, away: 2.05, spread: "-5.5", total: "229.5", movement: "up" },
  },
  {
    id: "m7",
    sport: "cricket",
    leagueSlug: "ipl",
    kickoff: "2026-04-02T20:00:00+08:00",
    status: "live",
    clock: "15.2 ov",
    venue: "Wankhede Stadium",
    homeTeam: "Mumbai Indians",
    awayTeam: "Chennai Super Kings",
    score: "154/4 - 149/6",
    statLine: "界外球 18:16，当前所需跑分 6.4，死亡回合得分效率主队占优",
    insight: "主队最后五个回合的长打储备更足，客队终结投球压力偏大。",
    odds: { home: 1.72, away: 2.08, spread: "-4.5", total: "341.5", movement: "up" },
  },
  {
    id: "m8",
    sport: "cricket",
    leagueSlug: "ipl",
    kickoff: "2026-04-02T22:30:00+08:00",
    status: "upcoming",
    venue: "M. Chinnaswamy Stadium",
    homeTeam: "Royal Challengers Bengaluru",
    awayTeam: "Kolkata Knight Riders",
    score: "-",
    statLine: "主队近 3 场前 6 回合失分偏高，客队追分效率联赛前列",
    insight: "比赛节奏可能从强攻开局，盘口更偏向高总分对抗。",
    odds: { home: 1.96, away: 1.86, spread: "+2.5", total: "356.5", movement: "flat" },
  },
  {
    id: "m9",
    sport: "cricket",
    leagueSlug: "psl",
    kickoff: "2026-04-01T21:00:00+08:00",
    status: "finished",
    venue: "Gaddafi Stadium",
    homeTeam: "Lahore Qalandars",
    awayTeam: "Karachi Kings",
    score: "182/7 - 176/9",
    statLine: "主队最后四回合打出 46 分，客队追分阶段连续掉门票",
    insight: "拉合尔在终盘提速成功兑现优势，客队中段掉门成为转折点。",
    odds: { home: 1.81, away: 2.01, spread: "-6.5", total: "349.5", movement: "down" },
  },
  {
    id: "m10",
    sport: "esports",
    leagueSlug: "lpl",
    kickoff: "2026-04-02T19:00:00+08:00",
    status: "live",
    clock: "Map 2",
    venue: "Shanghai Esports Center",
    homeTeam: "T1",
    awayTeam: "Bilibili Gaming",
    score: "1 - 0",
    statLine: "小龙 2:1，先锋 1:0，经济差 2.4k",
    insight: "BLG 前中期控图更稳，但 T1 团战切后排的成功率更高。",
    odds: { home: 1.88, away: 1.92, spread: "-1.5", total: "26.5", movement: "up" },
  },
  {
    id: "m11",
    sport: "esports",
    leagueSlug: "dreamleague",
    kickoff: "2026-04-02T21:30:00+08:00",
    status: "upcoming",
    venue: "DreamHack Studio",
    homeTeam: "Gaimin Gladiators",
    awayTeam: "Team Liquid",
    score: "-",
    statLine: "近 10 场一塔控制率 62% 对 55%，中期 Roshan 控制是关键差异。",
    insight: "GG 的中期节奏更成熟，Liquid 需要在对线期建立资源领先。",
    odds: { home: 1.74, away: 2.08, spread: "-1.5", total: "2.5", movement: "flat" },
  },
  {
    id: "m12",
    sport: "esports",
    leagueSlug: "blast-premier",
    kickoff: "2026-04-01T23:30:00+08:00",
    status: "finished",
    venue: "BLAST Arena Copenhagen",
    homeTeam: "Natus Vincere",
    awayTeam: "Team Vitality",
    score: "1 - 2",
    statLine: "首杀 17:14，平均回合时长 1:41，Vitality CT 端胜率 71%",
    insight: "Vitality 在关键长枪局的残局处理更稳，NAVI 后两图进攻停滞明显。",
    odds: { home: 2.04, away: 1.76, spread: "+1.5", total: "2.5", movement: "down" },
  },
];

export const authorTeams: AuthorTeam[] = [
  { id: "a1", name: "全域足球观察站", focus: "日系与英超", streak: "37 连红", winRate: "63%", monthlyRoi: "141%", followers: "18.4k", badge: "高阶趋势" },
  { id: "a2", name: "篮板雷达实验室", focus: "CBA / NBA", streak: "16 连红", winRate: "66%", monthlyRoi: "88%", followers: "9.2k", badge: "分差模型" },
  { id: "a3", name: "指数工作室", focus: "欧洲主流联赛", streak: "23 连红", winRate: "67%", monthlyRoi: "105%", followers: "12.1k", badge: "盘口追踪" },
  { id: "a4", name: "数据罗盘狙击手", focus: "冷门与单关", streak: "4 连红", winRate: "58%", monthlyRoi: "46%", followers: "6.7k", badge: "冷门解码" },
  { id: "a5", name: "板球长局研究室", focus: "IPL / PSL", streak: "11 连红", winRate: "61%", monthlyRoi: "73%", followers: "7.8k", badge: "回合节奏" },
  { id: "a6", name: "峡谷资源布控台", focus: "LoL / LPL / 国际赛", streak: "14 连红", winRate: "64%", monthlyRoi: "92%", followers: "8.6k", badge: "资源置换" },
  { id: "a7", name: "Roshan 节奏研究室", focus: "Dota 2 / DreamLeague", streak: "9 连红", winRate: "62%", monthlyRoi: "71%", followers: "6.1k", badge: "团战转折" },
  { id: "a8", name: "爆头回合实验室", focus: "CS2 / BLAST / IEM", streak: "12 连红", winRate: "65%", monthlyRoi: "84%", followers: "7.4k", badge: "回合拆解" },
];

export const predictions: PredictionRecord[] = [
  {
    id: "p1",
    sport: "football",
    matchId: "m1",
    market: "亚洲让球",
    pick: "神户胜利船 -0.75",
    confidence: "71%",
    expectedEdge: "+6.8%",
    explanation: "主队高位回收效率更稳，客队防线连续转移时暴露明显。",
    factors: ["主场压制", "定位球优势", "客队客场疲劳"],
    result: "pending",
  },
  {
    id: "p2",
    sport: "football",
    matchId: "m2",
    market: "全场胜平负",
    pick: "町田泽维亚 胜",
    confidence: "64%",
    expectedEdge: "+4.3%",
    explanation: "中路推进持续压制，东京反击质量不足。",
    factors: ["危险进攻领先", "对抗成功率更高", "盘口稳定"],
    result: "pending",
  },
  {
    id: "p3",
    sport: "basketball",
    matchId: "m5",
    market: "让分胜负",
    pick: "辽宁本钢 -4.5",
    confidence: "69%",
    expectedEdge: "+5.9%",
    explanation: "替补单位正负值占优，广东失误导致转换得分被拉开。",
    factors: ["篮板优势", "替补深度", "主场攻防效率"],
    result: "won",
  },
  {
    id: "p4",
    sport: "basketball",
    matchId: "m6",
    market: "总分",
    pick: "229.5 小分",
    confidence: "58%",
    expectedEdge: "+2.1%",
    explanation: "高压对位下回合数可能被拖慢，防守轮转会更保守。",
    factors: ["强强对话", "节奏下修", "市场追高"],
    result: "pending",
  },
  {
    id: "p5",
    sport: "cricket",
    matchId: "m7",
    market: "总分",
    pick: "341.5 小分",
    confidence: "67%",
    expectedEdge: "+5.2%",
    explanation: "两队虽然都有终盘长打能力，但当前所需跑分仍在可控区间，盘口对后段爆发给出的溢价偏高。",
    factors: ["所需跑分可控", "死亡回合投球质量", "市场预期过热"],
    result: "pending",
  },
  {
    id: "p6",
    sport: "cricket",
    matchId: "m8",
    market: "独赢",
    pick: "加尔各答骑士",
    confidence: "63%",
    expectedEdge: "+4.6%",
    explanation: "客队近阶段追分效率和后段火力都更稳定，主队前六回合防守泄压问题仍未解决。",
    factors: ["追分效率", "前六回合失分", "终盘长打储备"],
    result: "pending",
  },
  {
    id: "p7",
    sport: "esports",
    matchId: "m10",
    market: "系列赛让图",
    pick: "T1 -1.5",
    confidence: "68%",
    expectedEdge: "+5.4%",
    explanation: "T1 的前期线权和二先锋转换更稳，BLG 如果无法在第二条小龙前打开边路，系列赛容易被直接带走。",
    factors: ["先锋节奏", "边线压制", "系列赛经验"],
    result: "pending",
  },
  {
    id: "p8",
    sport: "esports",
    matchId: "m11",
    market: "总地图数",
    pick: "2.5 大图",
    confidence: "61%",
    expectedEdge: "+3.7%",
    explanation: "两队近期都更依赖后期团战和买活节奏，系列赛拉满三图的概率高于盘口定价。",
    factors: ["Roshan 控制拉锯", "后期决策", "英雄池对冲"],
    result: "pending",
  },
  {
    id: "p9",
    sport: "esports",
    matchId: "m12",
    market: "让分局",
    pick: "Team Vitality -3.5",
    confidence: "66%",
    expectedEdge: "+4.9%",
    explanation: "Vitality 在手枪局和中段道具转换的稳定性更高，NAVI 近期在 T 侧默认阶段经常掉第一波资源。",
    factors: ["手枪局优势", "CT 端稳态", "残局终结"],
    result: "won",
  },
];

export const articlePlans: ArticlePlan[] = [
  {
    id: "plan-1",
    slug: "kobe-vs-shimizu-primary-angle",
    sport: "football",
    matchId: "m1",
    title: "神户胜利船 vs 清水鼓动：主场推进链与角球压制",
    league: "J1 League",
    kickoff: "2026-04-01T18:00:00+08:00",
    authorId: "a1",
    teaser: "主队在边中结合阶段的压制极稳，本场最大差异点是清水的二点球保护。",
    marketSummary: "让球与主胜方向联动更顺。",
    analysis: [
      "神户最近六场的压迫回收速度明显提升，尤其在对手推进到中场后的逼抢成功率很高。",
      "清水的防线遇到连续转移时经常在弱侧慢半拍，本场边路对位不占优。",
      "如果临场盘口继续维持在 -0.75 附近，市场对主胜的容忍度会更高。",
    ],
    price: 38,
    isHot: true,
    performance: "近 21 中 17",
    tags: ["主场压制", "盘口稳定", "角球强势"],
  },
  {
    id: "plan-2",
    slug: "machida-tokyo-live-angle",
    sport: "football",
    matchId: "m2",
    title: "町田泽维亚 vs FC 东京：直播中盘面与体能断点",
    league: "J1 League",
    kickoff: "2026-04-01T18:00:00+08:00",
    authorId: "a3",
    teaser: "比赛进入 60 分钟后，东京肋部保护能力明显下降，盘口变化与场面一致。",
    marketSummary: "倾向主队不败与小比分。",
    analysis: [
      "町田在 55-70 分钟的回合推进效率明显提升，这与东京边后卫体能下滑相互叠加。",
      "盘口没有快速修到深盘，说明市场对东京绝对反扑的预期有限。",
      "如果临场出现客队连续换人，反而会增加下半场节奏割裂的概率。",
    ],
    price: 28,
    isHot: false,
    performance: "近 19 中 13",
    tags: ["临场解读", "滚球方向", "体能断点"],
  },
  {
    id: "plan-3",
    slug: "liaoning-guangdong-spread-model",
    sport: "basketball",
    matchId: "m5",
    title: "辽宁本钢 vs 广东华南虎：第三节分差模型",
    league: "CBA",
    kickoff: "2026-04-01T19:35:00+08:00",
    authorId: "a2",
    teaser: "辽宁的轮换稳定性与二次进攻转化，仍是本场分差拉开的核心来源。",
    marketSummary: "让分与主队节奏控制并行。",
    analysis: [
      "广东失误率偏高，且第三节以来对篮板的冲抢并未改善。",
      "辽宁替补端的对位更完整，保持了轮换段净胜分。",
      "若总分盘继续维持高位，分差盘的主队价值更凸显。",
    ],
    price: 48,
    isHot: true,
    performance: "近 16 中 12",
    tags: ["分差模型", "轮换优势", "篮板控制"],
  },
  {
    id: "plan-4",
    slug: "mumbai-chennai-death-overs-angle",
    sport: "cricket",
    matchId: "m7",
    title: "孟买印度人 vs 钦奈超级国王：死亡回合节奏与总分回摆",
    league: "IPL",
    kickoff: "2026-04-02T20:00:00+08:00",
    authorId: "a5",
    teaser: "盘口把两队后段长打能力放得很足，但当前回合推进和投球轮转仍有压总分空间。",
    marketSummary: "总分与主队终盘压制方向更顺。",
    analysis: [
      "孟买在最后五个回合的长打储备确实更强，但钦奈目前仍能把所需跑分压在安全区内，市场对大分的追价偏快。",
      "两队本场的终盘投球分配并不激进，意味着真正的失控回合数量可能低于盘口假设。",
      "如果即时总分继续上抬到 345.5 以上，小分和主队方向会同步变得更有交易价值。",
    ],
    price: 32,
    isHot: true,
    performance: "近 14 中 9",
    tags: ["死亡回合", "总分模型", "临场交易"],
  },
  {
    id: "plan-5",
    slug: "rcb-kkr-chase-pressure",
    sport: "cricket",
    matchId: "m8",
    title: "班加罗尔皇家挑战者 vs 加尔各答骑士：追分效率与前六回合断层",
    league: "IPL",
    kickoff: "2026-04-02T22:30:00+08:00",
    authorId: "a5",
    teaser: "主队前六回合掉分偏高，客队追分效率和后段稳定性更完整，独赢与总分都有可做空间。",
    marketSummary: "倾向加尔各答骑士独赢，辅看高总分。",
    analysis: [
      "班加罗尔最近三场的 powerplay 掉分都偏高，导致他们常常在前段就让出局面主动权。",
      "加尔各答的追分样本里，后七回合的边界球转换率一直处于联赛上游，适合处理中高压追分场景。",
      "如果临场独赢赔率维持在 1.85 到 1.90 之间，客队方向依然具备正边际。",
    ],
    price: 26,
    isHot: false,
    performance: "近 10 中 6",
    tags: ["追分效率", "Powerplay", "独赢方向"],
  },
  {
    id: "plan-6",
    slug: "t1-blg-series-resource-pressure",
    sport: "esports",
    matchId: "m10",
    title: "T1 vs Bilibili Gaming：资源置换与系列赛压制",
    league: "LPL",
    kickoff: "2026-04-02T18:30:00+08:00",
    authorId: "a6",
    teaser: "这组对局的核心不是单点操作，而是谁能先把先锋、小龙和边路线权串成连续收益。",
    marketSummary: "倾向 T1 系列赛让图，次看小龙节奏压制。",
    analysis: [
      "T1 最近的中野联动把第一条先锋后的推进收益兑现得更完整，尤其擅长用视野提前锁死第二波资源交换。",
      "BLG 的团战爆发力仍在，但如果前十五分钟没打出足够的线优，边路会被 T1 的转线效率持续压缩。",
      "盘口若继续维持在 T1 -1.5 附近，说明市场也在承认双方系列赛稳定性的差距。",
    ],
    price: 36,
    isHot: true,
    performance: "近 18 中 12",
    tags: ["先锋节奏", "系列赛让图", "线权压制"],
  },
  {
    id: "plan-7",
    slug: "gg-liquid-roshan-tempo",
    sport: "esports",
    matchId: "m11",
    title: "Gaimin Gladiators vs Team Liquid：Roshan 节奏与买活窗口",
    league: "DreamLeague",
    kickoff: "2026-04-02T21:00:00+08:00",
    authorId: "a7",
    teaser: "DreamLeague 这组对局会更像一场耐心博弈，Roshan 控制权和买活窗口才是真正的胜负手。",
    marketSummary: "总地图数偏大，第三图决胜概率更高。",
    analysis: [
      "GG 近期在一代盾后的地图压制明显增强，但 Liquid 对拖后期和高地防守的处理依然具备顶级样本。",
      "双方都不愿意在前两波大型目标上过度 all-in，这会让比赛更容易进入拉长的资源博弈。",
      "如果系列赛第一图打到 40 分钟以上，后续盘口通常会继续抬高大图价值。",
    ],
    price: 32,
    isHot: false,
    performance: "近 15 中 10",
    tags: ["Roshan 控制", "买活窗口", "大图方向"],
  },
  {
    id: "plan-8",
    slug: "navi-vitality-side-split",
    sport: "esports",
    matchId: "m12",
    title: "Natus Vincere vs Team Vitality：手枪局与攻防侧切换",
    league: "BLAST Premier",
    kickoff: "2026-04-01T23:00:00+08:00",
    authorId: "a8",
    teaser: "CS2 这场的差异不在明星枪男，而在手枪局兑现率和中段经济管理谁更稳。",
    marketSummary: "看好 Vitality 让分局，附带 CT 端压制思路。",
    analysis: [
      "Vitality 近期在 Mirage 和 Inferno 的 CT 端开局更稳定，往往能把前五回合的经济优势持续滚大。",
      "NAVI 进攻端默认信息收集偏慢，遇到中段道具不足时，经常被拖进低成功率残局。",
      "如果赛前盘口仍给到 Vitality -3.5，说明市场对他们中段回合控制力仍然买账。",
    ],
    price: 34,
    isHot: true,
    performance: "近 17 中 11",
    tags: ["手枪局", "侧别压制", "残局处理"],
  },
];

export const membershipPlans: MembershipPlan[] = [
  {
    id: "monthly",
    name: "月度会员",
    description: "适合先体验高频比赛日。",
    durationDays: 30,
    price: 88,
    perks: ["解锁全部计划单", "AI 历史记录 30 天", "热门联赛快速筛选"],
    accent: "from-orange-500/30 to-transparent",
  },
  {
    id: "seasonal",
    name: "赛季会员",
    description: "适合联赛密集周期与运营首推。",
    durationDays: 90,
    price: 228,
    perks: ["解锁全部计划单", "AI 历史记录 90 天", "专家榜单与热门战报"],
    accent: "from-lime-400/25 to-transparent",
  },
  {
    id: "annual",
    name: "年度会员",
    description: "适合长期经营与深度看盘用户。",
    durationDays: 365,
    price: 798,
    perks: ["全部权益", "优先体验新模型", "运营白名单与数据导出占位"],
    accent: "from-sky-400/25 to-transparent",
  },
];

export const standings = [
  { rank: 1, team: "Arsenal", played: 30, win: 22, draw: 5, loss: 3, points: 71 },
  { rank: 2, team: "Liverpool", played: 30, win: 21, draw: 6, loss: 3, points: 69 },
  { rank: 3, team: "Man City", played: 30, win: 19, draw: 6, loss: 5, points: 63 },
  { rank: 4, team: "Aston Villa", played: 30, win: 18, draw: 7, loss: 5, points: 61 },
];

export const scheduleRows = [
  { date: "04-01", fixture: "神户胜利船 vs 清水鼓动", result: "待开赛", note: "J1 League 焦点战" },
  { date: "04-01", fixture: "町田泽维亚 vs FC 东京", result: "直播中", note: "滚球高频" },
  { date: "04-02", fixture: "Arsenal vs Liverpool", result: "待开赛", note: "榜首大战" },
  { date: "03-30", fixture: "毕尔巴鄂竞技 vs 皇家社会", result: "2-1", note: "已完场" },
];

export const h2hRows = [
  { season: "2025", fixture: "神户胜利船 2-0 清水鼓动", tag: "主场赢盘" },
  { season: "2024", fixture: "清水鼓动 1-1 神户胜利船", tag: "客场平局" },
  { season: "2024", fixture: "神户胜利船 3-1 清水鼓动", tag: "角球占优" },
];

export const cricketScheduleRowsByLeague: Record<string, ScheduleRow[]> = {
  ipl: [
    { id: "m7", date: "04-02", fixture: "孟买印度人 vs 钦奈超级国王", result: "直播中", note: "死亡回合焦点战" },
    { id: "m8", date: "04-02", fixture: "班加罗尔皇家挑战者 vs 加尔各答骑士", result: "待开赛", note: "追分效率对决" },
    { date: "03-30", fixture: "加尔各答骑士 vs 孟买印度人", result: "201/6 - 198/8", note: "高总分样本" },
  ],
  psl: [
    { id: "m9", date: "04-01", fixture: "拉合尔卡兰达斯 vs 卡拉奇国王", result: "182/7 - 176/9", note: "终盘提速兑现" },
    { date: "03-29", fixture: "卡拉奇国王 vs 拉合尔卡兰达斯", result: "待开赛", note: "次日焦点战" },
  ],
  "the-hundred": [
    { date: "08-11", fixture: "Oval Invincibles vs London Spirit", result: "待开赛", note: "联赛入口预留" },
  ],
};

export const cricketH2HRowsByLeague: Record<string, HeadToHeadRow[]> = {
  ipl: [
    { season: "2026", fixture: "孟买印度人 vs 钦奈超级国王", tag: "主队后段压制" },
    { season: "2025", fixture: "加尔各答骑士 vs 班加罗尔皇家挑战者", tag: "追分效率领先" },
  ],
  psl: [
    { season: "2026", fixture: "拉合尔卡兰达斯 vs 卡拉奇国王", tag: "终盘得分爆发" },
    { season: "2025", fixture: "卡拉奇国王 vs 拉合尔卡兰达斯", tag: "掉门拐点明显" },
  ],
  "the-hundred": [
    { season: "2025", fixture: "Oval Invincibles vs London Spirit", tag: "联赛样本预留" },
  ],
};

export const esportsScheduleRowsByLeague: Record<string, ScheduleRow[]> = {
  lpl: [
    { id: "m10", date: "04-02", fixture: "T1 vs Bilibili Gaming", result: "直播中", note: "LoL 焦点对局" },
    { date: "03-30", fixture: "Bilibili Gaming vs T1", result: "2-1", note: "中期团战样本" },
  ],
  dreamleague: [
    { id: "m11", date: "04-02", fixture: "Gaimin Gladiators vs Team Liquid", result: "待开赛", note: "Dota 2 焦点系列赛" },
    { date: "03-29", fixture: "Team Liquid vs Gaimin Gladiators", result: "1-2", note: "Roshan 控制样本" },
  ],
  "blast-premier": [
    { id: "m12", date: "04-01", fixture: "Natus Vincere vs Team Vitality", result: "1-2", note: "CS2 强强对话" },
    { date: "03-26", fixture: "Team Vitality vs Natus Vincere", result: "2-0", note: "残局处理优势" },
  ],
};

export const esportsH2HRowsByLeague: Record<string, HeadToHeadRow[]> = {
  lpl: [
    { season: "2026 Spring", fixture: "T1 vs Bilibili Gaming", tag: "中期团战决胜" },
    { season: "2025 Worlds", fixture: "Bilibili Gaming vs T1", tag: "前期线权领先" },
  ],
  dreamleague: [
    { season: "Season 27", fixture: "Gaimin Gladiators vs Team Liquid", tag: "Roshan 控制占优" },
    { season: "Season 26", fixture: "Team Liquid vs Gaimin Gladiators", tag: "后期团战翻盘" },
  ],
  "blast-premier": [
    { season: "2026 Spring", fixture: "Natus Vincere vs Team Vitality", tag: "残局稳定性更强" },
    { season: "2025 World Final", fixture: "Team Vitality vs Natus Vincere", tag: "CT 端压制明显" },
  ],
};

export function getMatchesBySport(sport: Sport) {
  return matches.filter((match) => match.sport === sport);
}

export function getFeaturedMatches() {
  const statusOrder = {
    live: 0,
    upcoming: 1,
    finished: 2,
  } as const;

  return [...matches]
    .sort((left, right) => {
      const statusDiff = statusOrder[left.status] - statusOrder[right.status];

      if (statusDiff !== 0) {
        return statusDiff;
      }

      return new Date(left.kickoff).getTime() - new Date(right.kickoff).getTime();
    })
    .slice(0, 4);
}

export function getArticleBySlug(slug: string) {
  return articlePlans.find((item) => item.slug === slug);
}

export function getAuthorById(id: string) {
  return authorTeams.find((item) => item.id === id);
}

export function getMatchById(id: string) {
  return matches.find((item) => item.id === id);
}

export function getPredictionByMatchId(matchId: string) {
  return predictions.find((item) => item.matchId === matchId);
}
