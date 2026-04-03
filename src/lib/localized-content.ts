import { defaultLocale, type Locale } from "@/lib/i18n-config";
import type {
  ArticlePlan,
  AuthorTeam,
  HeadToHeadRow,
  HomepageModule,
  League,
  Match,
  MembershipPlan,
  PredictionRecord,
  ScheduleRow,
  StandingRow,
  Team,
} from "@/lib/types";

type Localized<T> = Record<Locale, T>;

type MatchTranslation = {
  leagueName?: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  statLine: string;
  insight: string;
};

function pickLocale<T>(translations: Localized<T>, locale: Locale) {
  return translations[locale] ?? translations[defaultLocale];
}

function translateTeamName(value: string, locale: Locale) {
  switch (value) {
    case "Arsenal":
    case "阿森纳":
    case "阿森納":
      return pickLocale({ "zh-CN": "阿森纳", "zh-TW": "阿森納", en: "Arsenal" }, locale);
    case "Liverpool":
    case "利物浦":
      return pickLocale({ "zh-CN": "利物浦", "zh-TW": "利物浦", en: "Liverpool" }, locale);
    case "神户胜利船":
    case "神戶勝利船":
    case "Vissel Kobe":
      return pickLocale({ "zh-CN": "神户胜利船", "zh-TW": "神戶勝利船", en: "Vissel Kobe" }, locale);
    case "清水鼓动":
    case "清水心跳":
    case "Shimizu S-Pulse":
      return pickLocale({ "zh-CN": "清水鼓动", "zh-TW": "清水心跳", en: "Shimizu S-Pulse" }, locale);
    case "町田泽维亚":
    case "町田澤維亞":
    case "Machida Zelvia":
      return pickLocale({ "zh-CN": "町田泽维亚", "zh-TW": "町田澤維亞", en: "Machida Zelvia" }, locale);
    case "FC 东京":
    case "FC 東京":
    case "FC Tokyo":
      return pickLocale({ "zh-CN": "FC 东京", "zh-TW": "FC 東京", en: "FC Tokyo" }, locale);
    case "毕尔巴鄂竞技":
    case "畢爾包競技":
    case "Athletic Bilbao":
      return pickLocale({ "zh-CN": "毕尔巴鄂竞技", "zh-TW": "畢爾包競技", en: "Athletic Bilbao" }, locale);
    case "皇家社会":
    case "皇家社會":
    case "Real Sociedad":
      return pickLocale({ "zh-CN": "皇家社会", "zh-TW": "皇家社會", en: "Real Sociedad" }, locale);
    case "辽宁本钢":
    case "遼寧本鋼":
    case "Liaoning Flying Leopards":
      return pickLocale({ "zh-CN": "辽宁本钢", "zh-TW": "遼寧本鋼", en: "Liaoning Flying Leopards" }, locale);
    case "广东华南虎":
    case "廣東華南虎":
    case "Guangdong Southern Tigers":
      return pickLocale({ "zh-CN": "广东华南虎", "zh-TW": "廣東華南虎", en: "Guangdong Southern Tigers" }, locale);
    case "波士顿凯尔特人":
    case "波士頓塞爾提克":
    case "Boston Celtics":
      return pickLocale({ "zh-CN": "波士顿凯尔特人", "zh-TW": "波士頓塞爾提克", en: "Boston Celtics" }, locale);
    case "密尔沃基雄鹿":
    case "密爾瓦基公鹿":
    case "Milwaukee Bucks":
      return pickLocale({ "zh-CN": "密尔沃基雄鹿", "zh-TW": "密爾瓦基公鹿", en: "Milwaukee Bucks" }, locale);
    case "Mumbai Indians":
    case "孟买印度人":
    case "孟買印度人":
      return pickLocale({ "zh-CN": "孟买印度人", "zh-TW": "孟買印度人", en: "Mumbai Indians" }, locale);
    case "Chennai Super Kings":
    case "钦奈超级国王":
    case "清奈超級國王":
      return pickLocale({ "zh-CN": "钦奈超级国王", "zh-TW": "清奈超級國王", en: "Chennai Super Kings" }, locale);
    case "Royal Challengers Bengaluru":
    case "班加罗尔皇家挑战者":
    case "班加羅爾皇家挑戰者":
      return pickLocale({ "zh-CN": "班加罗尔皇家挑战者", "zh-TW": "班加羅爾皇家挑戰者", en: "Royal Challengers Bengaluru" }, locale);
    case "Kolkata Knight Riders":
    case "加尔各答骑士":
    case "加爾各答騎士":
      return pickLocale({ "zh-CN": "加尔各答骑士", "zh-TW": "加爾各答騎士", en: "Kolkata Knight Riders" }, locale);
    case "Lahore Qalandars":
    case "拉合尔卡兰达斯":
    case "拉合爾卡蘭達斯":
      return pickLocale({ "zh-CN": "拉合尔卡兰达斯", "zh-TW": "拉合爾卡蘭達斯", en: "Lahore Qalandars" }, locale);
    case "Karachi Kings":
    case "卡拉奇国王":
    case "卡拉奇國王":
      return pickLocale({ "zh-CN": "卡拉奇国王", "zh-TW": "卡拉奇國王", en: "Karachi Kings" }, locale);
    case "T1":
      return pickLocale({ "zh-CN": "T1", "zh-TW": "T1", en: "T1" }, locale);
    case "Bilibili Gaming":
    case "哔哩哔哩电竞":
    case "嗶哩嗶哩電競":
      return pickLocale({ "zh-CN": "哔哩哔哩电竞", "zh-TW": "嗶哩嗶哩電競", en: "Bilibili Gaming" }, locale);
    case "Gaimin Gladiators":
    case "盖米格斗士":
    case "蓋米格鬥士":
      return pickLocale({ "zh-CN": "盖米格斗士", "zh-TW": "蓋米格鬥士", en: "Gaimin Gladiators" }, locale);
    case "Team Liquid":
    case "液体战队":
    case "液體戰隊":
      return pickLocale({ "zh-CN": "液体战队", "zh-TW": "液體戰隊", en: "Team Liquid" }, locale);
    case "Natus Vincere":
    case "NaVi":
    case "NAVI":
      return pickLocale({ "zh-CN": "Natus Vincere", "zh-TW": "Natus Vincere", en: "Natus Vincere" }, locale);
    case "Team Vitality":
    case "Vitality":
      return pickLocale({ "zh-CN": "Team Vitality", "zh-TW": "Team Vitality", en: "Team Vitality" }, locale);
    default:
      return value;
  }
}

const leagueTranslations: Record<string, Localized<{ name: string; region: string }>> = {
  "premier-league": {
    "zh-CN": { name: "英超", region: "欧洲" },
    "zh-TW": { name: "英超", region: "歐洲" },
    en: { name: "Premier League", region: "Europe" },
  },
  "la-liga": {
    "zh-CN": { name: "西甲", region: "欧洲" },
    "zh-TW": { name: "西甲", region: "歐洲" },
    en: { name: "La Liga", region: "Europe" },
  },
  "j1-league": {
    "zh-CN": { name: "J1 联赛", region: "亚洲" },
    "zh-TW": { name: "J1 聯賽", region: "亞洲" },
    en: { name: "J1 League", region: "Asia" },
  },
  cba: {
    "zh-CN": { name: "CBA", region: "亚洲" },
    "zh-TW": { name: "CBA", region: "亞洲" },
    en: { name: "CBA", region: "Asia" },
  },
  nba: {
    "zh-CN": { name: "NBA", region: "北美" },
    "zh-TW": { name: "NBA", region: "北美" },
    en: { name: "NBA", region: "North America" },
  },
  euroleague: {
    "zh-CN": { name: "欧篮联", region: "欧洲" },
    "zh-TW": { name: "歐籃聯", region: "歐洲" },
    en: { name: "EuroLeague", region: "Europe" },
  },
  ipl: {
    "zh-CN": { name: "IPL", region: "亚洲" },
    "zh-TW": { name: "IPL", region: "亞洲" },
    en: { name: "Indian Premier League", region: "Asia" },
  },
  psl: {
    "zh-CN": { name: "PSL", region: "亚洲" },
    "zh-TW": { name: "PSL", region: "亞洲" },
    en: { name: "Pakistan Super League", region: "Asia" },
  },
  "the-hundred": {
    "zh-CN": { name: "The Hundred", region: "欧洲" },
    "zh-TW": { name: "The Hundred", region: "歐洲" },
    en: { name: "The Hundred", region: "Europe" },
  },
  lpl: {
    "zh-CN": { name: "LPL", region: "亚洲" },
    "zh-TW": { name: "LPL", region: "亞洲" },
    en: { name: "LPL", region: "Asia" },
  },
  dreamleague: {
    "zh-CN": { name: "DreamLeague", region: "国际" },
    "zh-TW": { name: "DreamLeague", region: "國際" },
    en: { name: "DreamLeague", region: "International" },
  },
  "blast-premier": {
    "zh-CN": { name: "BLAST Premier", region: "欧洲" },
    "zh-TW": { name: "BLAST Premier", region: "歐洲" },
    en: { name: "BLAST Premier", region: "Europe" },
  },
};

const moduleTranslations: Record<string, Localized<Omit<HomepageModule, "id" | "href">>> = {
  scores: {
    "zh-CN": {
      eyebrow: "Live Intelligence",
      title: "即时比分与赔率摘要",
      description: "覆盖足球、篮球、板球与电竞核心赛道，支持热门联赛、状态与赔率的联动浏览。",
      metric: "256 场比赛在线",
    },
    "zh-TW": {
      eyebrow: "Live Intelligence",
      title: "即時比分與賠率摘要",
      description: "覆蓋足球、籃球、板球與電競核心賽道，支援熱門聯賽、狀態與賠率的聯動瀏覽。",
      metric: "256 場比賽在線",
    },
    en: {
      eyebrow: "Live Intelligence",
      title: "Live scores and odds snapshots",
      description: "Cover football, basketball, cricket, and esports fixtures with league, status, and odds context in one surface.",
      metric: "256 matches online",
    },
  },
  plans: {
    "zh-CN": {
      eyebrow: "Paid Insight",
      title: "计划单与作者团队",
      description: "支持会员套餐与单条解锁，展示热门赛事、作者榜单与近期表现。",
      metric: "34 位作者在线",
    },
    "zh-TW": {
      eyebrow: "Paid Insight",
      title: "計畫單與作者團隊",
      description: "支援會員套餐與單條解鎖，展示熱門賽事、作者榜單與近期表現。",
      metric: "34 位作者在線",
    },
    en: {
      eyebrow: "Paid Insight",
      title: "Plans and author teams",
      description: "Support membership bundles and single unlocks with hot fixtures, leaderboards, and recent performance.",
      metric: "34 active authors",
    },
  },
  ai: {
    "zh-CN": {
      eyebrow: "Model Blend",
      title: "AI 预测与因子解释",
      description: "用规则引擎和轻量模型拼成可读预测卡片，展示信心、因子与历史记录。",
      metric: "近 30 天 62.8% 命中",
    },
    "zh-TW": {
      eyebrow: "Model Blend",
      title: "AI 預測與因子解釋",
      description: "用規則引擎與輕量模型組成可讀預測卡片，展示信心、因子與歷史記錄。",
      metric: "近 30 天 62.8% 命中",
    },
    en: {
      eyebrow: "Model Blend",
      title: "AI predictions and factor notes",
      description: "Turn rules and lightweight models into readable cards with confidence, factors, and hit history.",
      metric: "62.8% hit rate over 30 days",
    },
  },
  cricket: {
    "zh-CN": {
      eyebrow: "Cricket Dispatch",
      title: "板球比分与赛程入口",
      description: "先覆盖 IPL、PSL 等热门赛事的即时比分、赛果和联赛入口，作为板球板块的一期主入口。",
      metric: "3 场板球赛事可看",
    },
    "zh-TW": {
      eyebrow: "Cricket Dispatch",
      title: "板球比分與賽程入口",
      description: "先覆蓋 IPL、PSL 等熱門賽事的即時比分、賽果與聯賽入口，作為板球板塊的一期主入口。",
      metric: "3 場板球賽事可看",
    },
    en: {
      eyebrow: "Cricket Dispatch",
      title: "Cricket scores and schedule entry",
      description: "Expose IPL, PSL, and other cricket fixtures as a dedicated phase-one entry for live scores, results, and league discovery.",
      metric: "3 cricket fixtures in view",
    },
  },
  esports: {
    "zh-CN": {
      eyebrow: "Esports Grid",
      title: "电竞赛事入口",
      description: "补齐 LoL、Dota 2、CS2 三条电竞主线，把重点赛事、赛程和资料入口接进首页模块层。",
      metric: "3 条电竞主线",
    },
    "zh-TW": {
      eyebrow: "Esports Grid",
      title: "電競賽事入口",
      description: "補齊 LoL、Dota 2、CS2 三條電競主線，把重點賽事、賽程與資料入口接進首頁模組層。",
      metric: "3 條電競主線",
    },
    en: {
      eyebrow: "Esports Grid",
      title: "Esports match hub",
      description: "Add LoL, Dota 2, and CS2 as first-class modules across the homepage, live board, and database entry.",
      metric: "3 esports circuits live",
    },
  },
};

const matchTranslations: Record<string, Localized<MatchTranslation>> = {
  m1: {
    "zh-CN": {
      leagueName: "J1 联赛",
      venue: "神户诺埃维尔球场",
      homeTeam: "神户胜利船",
      awayTeam: "清水鼓动",
      statLine: "主队近 6 场 xG 1.82，客队近 5 个客场 3 连平。",
      insight: "主队高压回收与定位球效率都占优。",
    },
    "zh-TW": {
      leagueName: "J1 聯賽",
      venue: "神戶諾埃維爾球場",
      homeTeam: "神戶勝利船",
      awayTeam: "清水心跳",
      statLine: "主隊近 6 場 xG 1.82，客隊近 5 個客場 3 連平。",
      insight: "主隊高壓回收與定位球效率都佔優。",
    },
    en: {
      leagueName: "J1 League",
      venue: "Noevir Stadium Kobe",
      homeTeam: "Vissel Kobe",
      awayTeam: "Shimizu S-Pulse",
      statLine: "Home side averaged 1.82 xG across the last six matches, while the visitors drew their last three away fixtures.",
      insight: "Kobe hold the edge in pressing recoveries and set-piece efficiency.",
    },
  },
  m2: {
    "zh-CN": {
      leagueName: "J1 联赛",
      venue: "町田市立竞技场",
      homeTeam: "町田泽维亚",
      awayTeam: "FC 东京",
      statLine: "射门 11:7，危险进攻 39:22。",
      insight: "町田转换速度更快，东京后腰保护不足。",
    },
    "zh-TW": {
      leagueName: "J1 聯賽",
      venue: "町田市立競技場",
      homeTeam: "町田澤維亞",
      awayTeam: "FC 東京",
      statLine: "射門 11:7，危險進攻 39:22。",
      insight: "町田轉換速度更快，東京後腰保護不足。",
    },
    en: {
      leagueName: "J1 League",
      venue: "Machida Stadium",
      homeTeam: "Machida Zelvia",
      awayTeam: "FC Tokyo",
      statLine: "Shots 11:7, dangerous attacks 39:22.",
      insight: "Machida are transitioning faster and Tokyo are leaving space in front of the back line.",
    },
  },
  m3: {
    "zh-CN": {
      leagueName: "英超",
      venue: "酋长球场",
      homeTeam: "阿森纳",
      awayTeam: "利物浦",
      statLine: "榜首大战，主队近 10 个主场保持不败。",
      insight: "比赛节奏会很高，盘口倾向主队不败。",
    },
    "zh-TW": {
      leagueName: "英超",
      venue: "酋長球場",
      homeTeam: "阿森納",
      awayTeam: "利物浦",
      statLine: "榜首大戰，主隊近 10 個主場保持不敗。",
      insight: "比賽節奏會很高，盤口傾向主隊不敗。",
    },
    en: {
      leagueName: "Premier League",
      venue: "Emirates Stadium",
      homeTeam: "Arsenal",
      awayTeam: "Liverpool",
      statLine: "Top-of-the-table clash with Arsenal unbeaten in their last ten home league matches.",
      insight: "Expect a fast tempo with the market leaning toward Arsenal avoiding defeat.",
    },
  },
  m4: {
    "zh-CN": {
      leagueName: "西甲",
      venue: "圣马梅斯球场",
      homeTeam: "毕尔巴鄂竞技",
      awayTeam: "皇家社会",
      statLine: "控球 52%，xG 1.74 比 0.96。",
      insight: "边路压制最终兑现成终结效率。",
    },
    "zh-TW": {
      leagueName: "西甲",
      venue: "聖馬梅斯球場",
      homeTeam: "畢爾包競技",
      awayTeam: "皇家社會",
      statLine: "控球 52%，xG 1.74 比 0.96。",
      insight: "邊路壓制最終兌現成終結效率。",
    },
    en: {
      leagueName: "La Liga",
      venue: "San Mames",
      homeTeam: "Athletic Bilbao",
      awayTeam: "Real Sociedad",
      statLine: "Possession 52%, xG 1.74 versus 0.96.",
      insight: "Sustained wing pressure translated into better shot quality and finishing.",
    },
  },
  m5: {
    "zh-CN": {
      leagueName: "CBA",
      venue: "沈阳体育馆",
      homeTeam: "辽宁本钢",
      awayTeam: "广东华南虎",
      statLine: "篮板 31:24，三分 9:6。",
      insight: "辽宁替补轮换更稳，广东失误偏多。",
    },
    "zh-TW": {
      leagueName: "CBA",
      venue: "瀋陽體育館",
      homeTeam: "遼寧本鋼",
      awayTeam: "廣東華南虎",
      statLine: "籃板 31:24，三分 9:6。",
      insight: "遼寧替補輪換更穩，廣東失誤偏多。",
    },
    en: {
      leagueName: "CBA",
      venue: "Shenyang Arena",
      homeTeam: "Liaoning Flying Leopards",
      awayTeam: "Guangdong Southern Tigers",
      statLine: "Rebounds 31:24, threes 9:6.",
      insight: "Liaoning's second unit has been steadier while Guangdong are leaking possessions.",
    },
  },
  m6: {
    "zh-CN": {
      leagueName: "NBA",
      venue: "TD 花园",
      homeTeam: "波士顿凯尔特人",
      awayTeam: "密尔沃基雄鹿",
      statLine: "主队节奏 99.4，客队近 5 场防守效率下滑。",
      insight: "市场更看好主队半场建立优势。",
    },
    "zh-TW": {
      leagueName: "NBA",
      venue: "TD 花園",
      homeTeam: "波士頓塞爾提克",
      awayTeam: "密爾瓦基公鹿",
      statLine: "主隊節奏 99.4，客隊近 5 場防守效率下滑。",
      insight: "市場更看好主隊半場建立優勢。",
    },
    en: {
      leagueName: "NBA",
      venue: "TD Garden",
      homeTeam: "Boston Celtics",
      awayTeam: "Milwaukee Bucks",
      statLine: "Boston are playing at a 99.4 pace while Milwaukee's defensive efficiency has slipped across the last five games.",
      insight: "The market is leaning toward Boston building a first-half cushion.",
    },
  },
  m7: {
    "zh-CN": {
      leagueName: "IPL",
      venue: "旺克赫德球场",
      homeTeam: "孟买印度人",
      awayTeam: "钦奈超级国王",
      statLine: "界外球 18:16，当前所需跑分 6.4，死亡回合得分效率主队占优。",
      insight: "主队最后五个回合的长打储备更足，客队终结投球压力偏大。",
    },
    "zh-TW": {
      leagueName: "IPL",
      venue: "旺克赫德球場",
      homeTeam: "孟買印度人",
      awayTeam: "清奈超級國王",
      statLine: "界外球 18:16，目前所需跑分 6.4，死亡回合得分效率主隊佔優。",
      insight: "主隊最後五個回合的長打儲備更足，客隊終結投球壓力偏大。",
    },
    en: {
      leagueName: "Indian Premier League",
      venue: "Wankhede Stadium",
      homeTeam: "Mumbai Indians",
      awayTeam: "Chennai Super Kings",
      statLine: "Boundaries 18:16, required rate 6.4, and the home side hold the stronger death-overs output.",
      insight: "Mumbai have more finishing power left for the final overs while Chennai are under heavier bowling pressure.",
    },
  },
  m8: {
    "zh-CN": {
      leagueName: "IPL",
      venue: "钦奈斯瓦米球场",
      homeTeam: "班加罗尔皇家挑战者",
      awayTeam: "加尔各答骑士",
      statLine: "主队近 3 场前 6 回合失分偏高，客队追分效率联赛前列。",
      insight: "比赛可能从强攻开局，盘口更偏向高总分对抗。",
    },
    "zh-TW": {
      leagueName: "IPL",
      venue: "欽奈斯瓦米球場",
      homeTeam: "班加羅爾皇家挑戰者",
      awayTeam: "加爾各答騎士",
      statLine: "主隊近 3 場前 6 回合失分偏高，客隊追分效率位居聯賽前列。",
      insight: "比賽可能從強攻開局，盤口更偏向高總分對抗。",
    },
    en: {
      leagueName: "Indian Premier League",
      venue: "M. Chinnaswamy Stadium",
      homeTeam: "Royal Challengers Bengaluru",
      awayTeam: "Kolkata Knight Riders",
      statLine: "RCB have leaked heavily in the powerplay lately, while Kolkata remain one of the best chasing sides in the league.",
      insight: "Expect an aggressive start with the market leaning toward a higher total.",
    },
  },
  m9: {
    "zh-CN": {
      leagueName: "PSL",
      venue: "加达菲球场",
      homeTeam: "拉合尔卡兰达斯",
      awayTeam: "卡拉奇国王",
      statLine: "主队最后四回合打出 46 分，客队追分阶段连续掉门票。",
      insight: "拉合尔在终盘提速成功兑现优势，客队中段掉门成为转折点。",
    },
    "zh-TW": {
      leagueName: "PSL",
      venue: "加達菲球場",
      homeTeam: "拉合爾卡蘭達斯",
      awayTeam: "卡拉奇國王",
      statLine: "主隊最後四回合打出 46 分，客隊追分階段連續掉門票。",
      insight: "拉合爾在終盤提速成功兌現優勢，客隊中段掉門成為轉折點。",
    },
    en: {
      leagueName: "Pakistan Super League",
      venue: "Gaddafi Stadium",
      homeTeam: "Lahore Qalandars",
      awayTeam: "Karachi Kings",
      statLine: "Lahore posted 46 runs across the last four overs while Karachi lost wickets in clusters during the chase.",
      insight: "Lahore's late acceleration made the difference after Karachi's middle-order collapse.",
    },
  },
  m10: {
    "zh-CN": {
      leagueName: "LPL",
      venue: "上海电竞中心",
      homeTeam: "T1",
      awayTeam: "哔哩哔哩电竞",
      statLine: "小龙 2:1，先锋 1:0，经济差 2.4k。",
      insight: "BLG 前中期控图更稳，但 T1 团战切后排的成功率更高。",
    },
    "zh-TW": {
      leagueName: "LPL",
      venue: "上海電競中心",
      homeTeam: "T1",
      awayTeam: "嗶哩嗶哩電競",
      statLine: "小龍 2:1，先鋒 1:0，經濟差 2.4k。",
      insight: "BLG 前中期控圖更穩，但 T1 團戰切後排的成功率更高。",
    },
    en: {
      leagueName: "LPL",
      venue: "Shanghai Esports Center",
      homeTeam: "T1",
      awayTeam: "Bilibili Gaming",
      statLine: "Dragons 2:1, Herald 1:0, gold lead 2.4k.",
      insight: "BLG are controlling the map better early, but T1 have been cleaner at diving the back line in teamfights.",
    },
  },
  m11: {
    "zh-CN": {
      leagueName: "DreamLeague",
      venue: "DreamHack Studio",
      homeTeam: "盖米格斗士",
      awayTeam: "液体战队",
      statLine: "近 10 场一塔控制率 62% 对 55%，中期 Roshan 控制是关键差异。",
      insight: "GG 的中期节奏更成熟，Liquid 需要在对线期建立资源领先。",
    },
    "zh-TW": {
      leagueName: "DreamLeague",
      venue: "DreamHack Studio",
      homeTeam: "蓋米格鬥士",
      awayTeam: "液體戰隊",
      statLine: "近 10 場一塔控制率 62% 對 55%，中期 Roshan 控制是關鍵差異。",
      insight: "GG 的中期節奏更成熟，Liquid 需要在對線期建立資源領先。",
    },
    en: {
      leagueName: "DreamLeague",
      venue: "DreamHack Studio",
      homeTeam: "Gaimin Gladiators",
      awayTeam: "Team Liquid",
      statLine: "First-tower control is 62% versus 55% across the last ten matches, with Roshan control as the major separator.",
      insight: "GG have the cleaner mid-game cadence, while Liquid need to bank lane-phase resources early.",
    },
  },
  m12: {
    "zh-CN": {
      leagueName: "BLAST Premier",
      venue: "哥本哈根 BLAST Arena",
      homeTeam: "Natus Vincere",
      awayTeam: "Team Vitality",
      statLine: "首杀 17:14，平均回合时长 1:41，Vitality CT 端胜率 71%。",
      insight: "Vitality 在关键长枪局的残局处理更稳，NAVI 后两图进攻停滞明显。",
    },
    "zh-TW": {
      leagueName: "BLAST Premier",
      venue: "哥本哈根 BLAST Arena",
      homeTeam: "Natus Vincere",
      awayTeam: "Team Vitality",
      statLine: "首殺 17:14，平均回合時長 1:41，Vitality CT 端勝率 71%。",
      insight: "Vitality 在關鍵長槍局的殘局處理更穩，NAVI 後兩圖進攻停滯明顯。",
    },
    en: {
      leagueName: "BLAST Premier",
      venue: "BLAST Arena Copenhagen",
      homeTeam: "Natus Vincere",
      awayTeam: "Team Vitality",
      statLine: "Opening kills 17:14, average round time 1:41, and Vitality posted a 71% CT-side win rate.",
      insight: "Vitality handled the late-round rifle situations better, while NAVI stalled badly on the last two attacking halves.",
    },
  },
};

const authorTranslations: Record<string, Localized<Omit<AuthorTeam, "id">>> = {
  a1: {
    "zh-CN": { name: "全域足球观察站", focus: "日系与英系足球", streak: "37 连红", winRate: "63%", monthlyRoi: "141%", followers: "18.4k", badge: "高阶趋势" },
    "zh-TW": { name: "全域足球觀察站", focus: "日系與英系足球", streak: "37 連紅", winRate: "63%", monthlyRoi: "141%", followers: "18.4k", badge: "高階趨勢" },
    en: { name: "Global Football Desk", focus: "J.League and English football", streak: "37 straight wins", winRate: "63%", monthlyRoi: "141%", followers: "18.4k", badge: "Trend Desk" },
  },
  a2: {
    "zh-CN": { name: "篮板雷达实验室", focus: "CBA / NBA", streak: "16 连红", winRate: "66%", monthlyRoi: "88%", followers: "9.2k", badge: "分差模型" },
    "zh-TW": { name: "籃板雷達實驗室", focus: "CBA / NBA", streak: "16 連紅", winRate: "66%", monthlyRoi: "88%", followers: "9.2k", badge: "分差模型" },
    en: { name: "Rebound Radar Lab", focus: "CBA / NBA", streak: "16 straight wins", winRate: "66%", monthlyRoi: "88%", followers: "9.2k", badge: "Spread Model" },
  },
  a3: {
    "zh-CN": { name: "指数工作室", focus: "欧洲主流联赛", streak: "23 连红", winRate: "67%", monthlyRoi: "105%", followers: "12.1k", badge: "盘口追踪" },
    "zh-TW": { name: "指數工作室", focus: "歐洲主流聯賽", streak: "23 連紅", winRate: "67%", monthlyRoi: "105%", followers: "12.1k", badge: "盤口追蹤" },
    en: { name: "Index Workshop", focus: "Major European leagues", streak: "23 straight wins", winRate: "67%", monthlyRoi: "105%", followers: "12.1k", badge: "Line Tracker" },
  },
  a4: {
    "zh-CN": { name: "数据罗盘狙击手", focus: "冷门与单关", streak: "4 连红", winRate: "58%", monthlyRoi: "46%", followers: "6.7k", badge: "冷门解码" },
    "zh-TW": { name: "數據羅盤狙擊手", focus: "冷門與單關", streak: "4 連紅", winRate: "58%", monthlyRoi: "46%", followers: "6.7k", badge: "冷門解碼" },
    en: { name: "Data Compass Sniper", focus: "Underdogs and singles", streak: "4 straight wins", winRate: "58%", monthlyRoi: "46%", followers: "6.7k", badge: "Upset Decoder" },
  },
  a5: {
    "zh-CN": { name: "板球长局研究室", focus: "IPL / PSL", streak: "11 连红", winRate: "61%", monthlyRoi: "73%", followers: "7.8k", badge: "回合节奏" },
    "zh-TW": { name: "板球長局研究室", focus: "IPL / PSL", streak: "11 連紅", winRate: "61%", monthlyRoi: "73%", followers: "7.8k", badge: "回合節奏" },
    en: { name: "Cricket Long-Overs Lab", focus: "IPL / PSL", streak: "11 straight wins", winRate: "61%", monthlyRoi: "73%", followers: "7.8k", badge: "Over Tempo" },
  },
  a6: {
    "zh-CN": { name: "峡谷资源布控台", focus: "LoL / LPL / 国际赛", streak: "14 连红", winRate: "64%", monthlyRoi: "92%", followers: "8.6k", badge: "资源置换" },
    "zh-TW": { name: "峽谷資源布控台", focus: "LoL / LPL / 國際賽", streak: "14 連紅", winRate: "64%", monthlyRoi: "92%", followers: "8.6k", badge: "資源置換" },
    en: { name: "Rift Resource Desk", focus: "LoL / LPL / international events", streak: "14 straight wins", winRate: "64%", monthlyRoi: "92%", followers: "8.6k", badge: "Resource Trade" },
  },
  a7: {
    "zh-CN": { name: "Roshan 节奏研究室", focus: "Dota 2 / DreamLeague", streak: "9 连红", winRate: "62%", monthlyRoi: "71%", followers: "6.1k", badge: "团战转折" },
    "zh-TW": { name: "Roshan 節奏研究室", focus: "Dota 2 / DreamLeague", streak: "9 連紅", winRate: "62%", monthlyRoi: "71%", followers: "6.1k", badge: "團戰轉折" },
    en: { name: "Roshan Tempo Lab", focus: "Dota 2 / DreamLeague", streak: "9 straight wins", winRate: "62%", monthlyRoi: "71%", followers: "6.1k", badge: "Fight Swing" },
  },
  a8: {
    "zh-CN": { name: "爆头回合实验室", focus: "CS2 / BLAST / IEM", streak: "12 连红", winRate: "65%", monthlyRoi: "84%", followers: "7.4k", badge: "回合拆解" },
    "zh-TW": { name: "爆頭回合實驗室", focus: "CS2 / BLAST / IEM", streak: "12 連紅", winRate: "65%", monthlyRoi: "84%", followers: "7.4k", badge: "回合拆解" },
    en: { name: "Headshot Round Lab", focus: "CS2 / BLAST / IEM", streak: "12 straight wins", winRate: "65%", monthlyRoi: "84%", followers: "7.4k", badge: "Round Breakdown" },
  },
};

const membershipTranslations: Record<string, Localized<Pick<MembershipPlan, "name" | "description" | "perks">>> = {
  monthly: {
    "zh-CN": { name: "月度会员", description: "适合先体验高频比赛日。", perks: ["解锁全部计划单", "AI 历史记录 30 天", "热门联赛快速筛选"] },
    "zh-TW": { name: "月度會員", description: "適合先體驗高頻比賽日。", perks: ["解鎖全部計畫單", "AI 歷史記錄 30 天", "熱門聯賽快速篩選"] },
    en: { name: "Monthly Membership", description: "Best for testing the product during a dense match cycle.", perks: ["Unlock all plans", "30 days of AI history", "Fast filters for hot leagues"] },
  },
  seasonal: {
    "zh-CN": { name: "赛季会员", description: "适合联赛密集周期与高频关注。", perks: ["解锁全部计划单", "AI 历史记录 90 天", "专家榜单与热门战报"] },
    "zh-TW": { name: "賽季會員", description: "適合聯賽密集週期與高頻關注。", perks: ["解鎖全部計畫單", "AI 歷史記錄 90 天", "專家榜單與熱門戰報"] },
    en: { name: "Season Membership", description: "Designed for users following a league through its busiest stretch.", perks: ["Unlock all plans", "90 days of AI history", "Expert leaderboard and hot match briefs"] },
  },
  annual: {
    "zh-CN": { name: "年度会员", description: "适合长期经营与深度看盘用户。", perks: ["全部权益", "优先体验新模型", "运营白名单与数据导出占位"] },
    "zh-TW": { name: "年度會員", description: "適合長期經營與深度看盤用戶。", perks: ["全部權益", "優先體驗新模型", "營運白名單與數據匯出席位"] },
    en: { name: "Annual Membership", description: "Built for long-term operators and heavy daily users.", perks: ["Full entitlement bundle", "Early access to new models", "Reserved admin export privileges"] },
  },
};

const predictionTranslations: Record<string, Localized<Pick<PredictionRecord, "market" | "pick" | "explanation" | "factors">>> = {
  p1: {
    "zh-CN": { market: "亚洲让球", pick: "神户胜利船 -0.75", explanation: "主队高位回收效率更稳，客队防线连续转移时会露出明显空档。", factors: ["主场压制", "定位球优势", "客队客场疲劳"] },
    "zh-TW": { market: "亞洲讓球", pick: "神戶勝利船 -0.75", explanation: "主隊高位回收效率更穩，客隊防線連續轉移時會露出明顯空檔。", factors: ["主場壓制", "定位球優勢", "客隊客場疲勞"] },
    en: { market: "Asian Handicap", pick: "Vissel Kobe -0.75", explanation: "Kobe are more stable in high regains and Shimizu leave obvious gaps when the back line shifts across.", factors: ["Home pressure", "Set-piece edge", "Away fatigue"] },
  },
  p2: {
    "zh-CN": { market: "全场胜平负", pick: "町田泽维亚 胜", explanation: "中路推进持续占优，东京的反击质量不足。", factors: ["危险进攻领先", "对抗成功率更高", "盘口稳定"] },
    "zh-TW": { market: "全場勝平負", pick: "町田澤維亞 勝", explanation: "中路推進持續佔優，東京的反擊質量不足。", factors: ["危險進攻領先", "對抗成功率更高", "盤口穩定"] },
    en: { market: "Full Time Result", pick: "Machida Zelvia to win", explanation: "Machida keep winning the central progression battle while Tokyo are not creating enough in transition.", factors: ["Danger attack lead", "Better duel success", "Stable line"] },
  },
  p3: {
    "zh-CN": { market: "让分胜负", pick: "辽宁本钢 -4.5", explanation: "替补单位正负值占优，广东失误导致转换得分被拉开。", factors: ["篮板优势", "替补深度", "主场攻防效率"] },
    "zh-TW": { market: "讓分勝負", pick: "遼寧本鋼 -4.5", explanation: "替補單位正負值佔優，廣東失誤導致轉換得分被拉開。", factors: ["籃板優勢", "替補深度", "主場攻防效率"] },
    en: { market: "Spread", pick: "Liaoning -4.5", explanation: "Liaoning's bench units are winning the plus-minus battle and Guangdong turnovers are creating transition gaps.", factors: ["Rebound edge", "Bench depth", "Home floor efficiency"] },
  },
  p4: {
    "zh-CN": { market: "总分", pick: "229.5 小分", explanation: "高压对位可能拖慢回合数，防守轮转会更保守。", factors: ["强强对话", "节奏下修", "市场追高"] },
    "zh-TW": { market: "總分", pick: "229.5 小分", explanation: "高壓對位可能拖慢回合數，防守輪轉會更保守。", factors: ["強強對話", "節奏下修", "市場追高"] },
    en: { market: "Total", pick: "Under 229.5", explanation: "The matchup intensity could drag the pace down and both teams may lean into more conservative defensive rotations.", factors: ["Heavyweight matchup", "Lower pace", "Market chasing the over"] },
  },
  p5: {
    "zh-CN": { market: "总分", pick: "341.5 小分", explanation: "两队虽然都有终盘长打能力，但当前所需跑分仍在可控区间，盘口对后段爆发给出的溢价偏高。", factors: ["所需跑分可控", "死亡回合投球质量", "市场预期过热"] },
    "zh-TW": { market: "總分", pick: "341.5 小分", explanation: "兩隊雖然都有終盤長打能力，但目前所需跑分仍在可控區間，盤口對後段爆發給出的溢價偏高。", factors: ["所需跑分可控", "死亡回合投球質量", "市場預期過熱"] },
    en: { market: "Total", pick: "Under 341.5", explanation: "Both sides can finish hard, but the required rate is still manageable and the market is charging too much for a late scoring explosion.", factors: ["Manageable chase rate", "Death-over bowling quality", "Overheated market"] },
  },
  p6: {
    "zh-CN": { market: "独赢", pick: "加尔各答骑士", explanation: "客队近阶段追分效率和后段火力都更稳定，主队前六回合防守泄压问题仍未解决。", factors: ["追分效率", "前六回合失分", "终盘长打储备"] },
    "zh-TW": { market: "獨贏", pick: "加爾各答騎士", explanation: "客隊近階段追分效率和後段火力都更穩定，主隊前六回合防守洩壓問題仍未解決。", factors: ["追分效率", "前六回合失分", "終盤長打儲備"] },
    en: { market: "Moneyline", pick: "Kolkata Knight Riders", explanation: "Kolkata are more stable late in the chase and Bengaluru still have not solved their powerplay leakage.", factors: ["Chasing efficiency", "Powerplay leakage", "Late hitting depth"] },
  },
  p7: {
    "zh-CN": { market: "系列赛让图", pick: "T1 -1.5", explanation: "T1 的前期线权和二先锋转换更稳，BLG 如果无法在第二条小龙前打开边路，系列赛容易被直接带走。", factors: ["先锋节奏", "边线压制", "系列赛经验"] },
    "zh-TW": { market: "系列賽讓圖", pick: "T1 -1.5", explanation: "T1 的前期線權和第二隻先鋒轉換更穩，BLG 如果無法在第二條小龍前打開邊路，系列賽很容易被直接帶走。", factors: ["先鋒節奏", "邊線壓制", "系列賽經驗"] },
    en: { market: "Series Handicap", pick: "T1 -1.5", explanation: "T1 are cleaner in lane control and second-Herald conversion. If BLG fail to crack side lanes before the second drake, the series can get away from them quickly.", factors: ["Herald tempo", "Side-lane pressure", "Series experience"] },
  },
  p8: {
    "zh-CN": { market: "总地图数", pick: "2.5 大图", explanation: "两队近期都更依赖后期团战和买活节奏，系列赛拉满三图的概率高于盘口定价。", factors: ["Roshan 控制拉锯", "后期决策", "英雄池对冲"] },
    "zh-TW": { market: "總地圖數", pick: "2.5 大圖", explanation: "兩隊近期都更依賴後期團戰和買活節奏，系列賽打滿三圖的機率高於盤口定價。", factors: ["Roshan 控制拉鋸", "後期決策", "英雄池對沖"] },
    en: { market: "Total Maps", pick: "Over 2.5 Maps", explanation: "Both teams are leaning harder on late-fight execution and buyback control, so a full three-map series is more likely than the line suggests.", factors: ["Roshan tug-of-war", "Late-game decisions", "Draft counterplay"] },
  },
  p9: {
    "zh-CN": { market: "让分局", pick: "Team Vitality -3.5", explanation: "Vitality 在手枪局和中段道具转换的稳定性更高，NAVI 近期在 T 侧默认阶段经常掉第一波资源。", factors: ["手枪局优势", "CT 端稳态", "残局终结"] },
    "zh-TW": { market: "讓分局", pick: "Team Vitality -3.5", explanation: "Vitality 在手槍局和中段道具轉換的穩定性更高，NAVI 近期在 T 側預設階段經常掉第一波資源。", factors: ["手槍局優勢", "CT 端穩態", "殘局終結"] },
    en: { market: "Round Handicap", pick: "Team Vitality -3.5", explanation: "Vitality are cleaner in pistol rounds and mid-round utility conversion, while NAVI keep leaking the first layer of map control on T sides.", factors: ["Pistol edge", "Stable CT halves", "Late-round closeouts"] },
  },
};

const planTranslations: Record<string, Localized<Pick<ArticlePlan, "title" | "league" | "teaser" | "marketSummary" | "analysis" | "performance" | "tags">>> = {
  "plan-1": {
    "zh-CN": {
      title: "神户胜利船 vs 清水鼓动：主场推进链与角球压制",
      league: "J1 联赛",
      teaser: "主队在边中结合阶段的压制极稳，本场最大差异点是清水的二点球保护。",
      marketSummary: "让球与主胜方向联动更顺。",
      analysis: ["神户最近六场的高位回收速度明显提升，尤其在对手推进到中场后的逼抢效率很高。", "清水的防线在连续转移时经常慢半拍，本场边路对位不占优。", "如果临场盘口继续维持在 -0.75 附近，市场对主胜的容忍度会更高。"],
      performance: "近 21 中 17",
      tags: ["主场压制", "盘口稳定", "角球强势"],
    },
    "zh-TW": {
      title: "神戶勝利船 vs 清水心跳：主場推進鏈與角球壓制",
      league: "J1 聯賽",
      teaser: "主隊在邊中結合階段的壓制極穩，本場最大差異點是清水的第二點保護。",
      marketSummary: "讓球與主勝方向聯動更順。",
      analysis: ["神戶最近六場的高位回收速度明顯提升，尤其在對手推進到中場後的逼搶效率很高。", "清水的防線在連續轉移時經常慢半拍，本場邊路對位不佔優。", "如果臨場盤口繼續維持在 -0.75 附近，市場對主勝的容忍度會更高。"],
      performance: "近 21 中 17",
      tags: ["主場壓制", "盤口穩定", "角球強勢"],
    },
    en: {
      title: "Vissel Kobe vs Shimizu S-Pulse: home progression and corner pressure",
      league: "J1 League",
      teaser: "Kobe are dominating the wide-to-central progression phases, while Shimizu keep losing the second-ball layer.",
      marketSummary: "Handicap and home-win angles are aligned.",
      analysis: ["Kobe have improved their regain speed across the last six matches, especially once opponents cross midfield.", "Shimizu's back line regularly loses shape during consecutive switches, leaving the wide matchups exposed.", "If the closing number stays near -0.75, the market is still comfortable leaning into the home side."],
      performance: "17 wins from last 21",
      tags: ["Home pressure", "Stable line", "Corner edge"],
    },
  },
  "plan-2": {
    "zh-CN": {
      title: "町田泽维亚 vs FC 东京：直播中盘面与体能断点",
      league: "J1 联赛",
      teaser: "比赛进入 60 分钟后，东京肋部保护明显下滑，盘口变化与场面一致。",
      marketSummary: "倾向主队不败与小比分。",
      analysis: ["町田在 55 到 70 分钟的推进效率会明显提速，这和东京边后卫的体能下滑是同步发生的。", "盘口没有快速修正到深盘，说明市场对东京绝对反扑的预期有限。", "如果临场出现东京连续换人，反而会增加下半场节奏被切碎的概率。"],
      performance: "近 19 中 13",
      tags: ["临场解读", "滚球方向", "体能断点"],
    },
    "zh-TW": {
      title: "町田澤維亞 vs FC 東京：直播中盤面與體能斷點",
      league: "J1 聯賽",
      teaser: "比賽進入 60 分鐘後，東京肋部保護明顯下滑，盤口變化與場面一致。",
      marketSummary: "傾向主隊不敗與小比分。",
      analysis: ["町田在 55 到 70 分鐘的推進效率會明顯提速，這與東京邊後衛體能下滑同步發生。", "盤口沒有快速修正到深盤，說明市場對東京絕對反撲的預期有限。", "如果臨場出現東京連續換人，反而會增加下半場節奏被切碎的機率。"],
      performance: "近 19 中 13",
      tags: ["臨場解讀", "滾球方向", "體能斷點"],
    },
    en: {
      title: "Machida Zelvia vs FC Tokyo: live angle and fitness breakpoint",
      league: "J1 League",
      teaser: "After the hour mark, Tokyo's half-space protection drops sharply and the line movement matches the eye test.",
      marketSummary: "Leaning toward Machida not to lose and a lower scoreline.",
      analysis: ["Machida's progression rate spikes between minutes 55 and 70, which lines up with Tokyo's falling full-back legs.", "The market has not rushed into a deeper line, suggesting limited belief in a full Tokyo comeback.", "If Tokyo burn multiple substitutions early, the second half is more likely to fragment and lose flow."],
      performance: "13 wins from last 19",
      tags: ["Live reading", "In-play angle", "Fitness breakpoint"],
    },
  },
  "plan-3": {
    "zh-CN": {
      title: "辽宁本钢 vs 广东华南虎：第三节分差模型",
      league: "CBA",
      teaser: "辽宁的轮换稳定性和二次进攻转化，仍是本场分差拉开的核心来源。",
      marketSummary: "让分与主队节奏控制并行。",
      analysis: ["广东的失误率偏高，而且第三节以来对篮板的冲抢并没有改善。", "辽宁替补端的对位更完整，保住了轮换段净胜分。", "如果总分盘继续维持高位，分差盘的主队价值会更明显。"],
      performance: "近 16 中 12",
      tags: ["分差模型", "轮换优势", "篮板控制"],
    },
    "zh-TW": {
      title: "遼寧本鋼 vs 廣東華南虎：第三節分差模型",
      league: "CBA",
      teaser: "遼寧的輪換穩定性與二次進攻轉化，仍是本場分差拉開的核心來源。",
      marketSummary: "讓分與主隊節奏控制並行。",
      analysis: ["廣東的失誤率偏高，而且第三節以來對籃板的衝搶並沒有改善。", "遼寧替補端的對位更完整，保住了輪換段淨勝分。", "如果總分盤繼續維持高位，分差盤的主隊價值會更明顯。"],
      performance: "近 16 中 12",
      tags: ["分差模型", "輪換優勢", "籃板控制"],
    },
    en: {
      title: "Liaoning vs Guangdong: third-quarter spread model",
      league: "CBA",
      teaser: "Liaoning's rotation stability and second-chance conversion remain the key source of separation in this matchup.",
      marketSummary: "The spread angle and home pace control are moving together.",
      analysis: ["Guangdong's turnover rate remains high and their third-quarter rebounding push has not improved.", "Liaoning are keeping the matchup structure intact through bench minutes and holding their rotation net rating.", "If the total stays elevated, the home side becomes even more interesting on the spread."],
      performance: "12 wins from last 16",
      tags: ["Spread model", "Rotation edge", "Rebound control"],
    },
  },
  "plan-4": {
    "zh-CN": {
      title: "孟买印度人 vs 钦奈超级国王：死亡回合节奏与总分回摆",
      league: "IPL",
      teaser: "盘口把两队后段长打能力放得很足，但当前回合推进和投球轮转仍有压总分空间。",
      marketSummary: "总分与主队终盘压制方向更顺。",
      analysis: ["孟买在最后五个回合的长打储备确实更强，但钦奈目前仍能把所需跑分压在安全区内，市场对大分的追价偏快。", "两队本场的终盘投球分配并不激进，意味着真正的失控回合数量可能低于盘口假设。", "如果即时总分继续上抬到 345.5 以上，小分和主队方向会同步变得更有交易价值。"],
      performance: "近 14 中 9",
      tags: ["死亡回合", "总分模型", "临场交易"],
    },
    "zh-TW": {
      title: "孟買印度人 vs 清奈超級國王：死亡回合節奏與總分回擺",
      league: "IPL",
      teaser: "盤口把兩隊後段長打能力放得很足，但目前回合推進和投球輪轉仍有壓總分空間。",
      marketSummary: "總分與主隊終盤壓制方向更順。",
      analysis: ["孟買在最後五個回合的長打儲備確實更強，但清奈目前仍能把所需跑分壓在安全區內，市場對大分的追價偏快。", "兩隊本場的終盤投球分配並不激進，意味著真正失控的回合數量可能低於盤口假設。", "如果即時總分繼續上抬到 345.5 以上，小分和主隊方向會同步變得更有交易價值。"],
      performance: "近 14 中 9",
      tags: ["死亡回合", "總分模型", "臨場交易"],
    },
    en: {
      title: "Mumbai Indians vs Chennai Super Kings: death-over tempo and total retrace",
      league: "Indian Premier League",
      teaser: "The market is fully pricing the late hitting, but there is still room for the total to compress based on the current over flow and bowling usage.",
      marketSummary: "The total angle lines up with a late Mumbai edge.",
      analysis: ["Mumbai do have more finishing power in the last five overs, but Chennai are still keeping the required rate in a safe zone and the over has been bid too aggressively.", "Neither side has used an ultra-risky death-over bowling pattern, which lowers the number of truly chaotic overs relative to the market assumption.", "If the live total pushes beyond 345.5, both the under and the home side become more attractive."],
      performance: "9 wins from last 14",
      tags: ["Death overs", "Total model", "In-play trading"],
    },
  },
  "plan-5": {
    "zh-CN": {
      title: "班加罗尔皇家挑战者 vs 加尔各答骑士：追分效率与前六回合断层",
      league: "IPL",
      teaser: "主队前六回合掉分偏高，客队追分效率和后段稳定性更完整，独赢与总分都有可做空间。",
      marketSummary: "倾向加尔各答骑士独赢，辅看高总分。",
      analysis: ["班加罗尔最近三场的 powerplay 掉分都偏高，导致他们常常在前段就让出局面主动权。", "加尔各答的追分样本里，后七回合的边界球转换率一直处于联赛上游，适合处理中高压追分场景。", "如果临场独赢赔率维持在 1.85 到 1.90 之间，客队方向依然具备正边际。"],
      performance: "近 10 中 6",
      tags: ["追分效率", "Powerplay", "独赢方向"],
    },
    "zh-TW": {
      title: "班加羅爾皇家挑戰者 vs 加爾各答騎士：追分效率與前六回合斷層",
      league: "IPL",
      teaser: "主隊前六回合掉分偏高，客隊追分效率和後段穩定性更完整，獨贏與總分都有可做空間。",
      marketSummary: "傾向加爾各答騎士獨贏，輔看高總分。",
      analysis: ["班加羅爾最近三場的 powerplay 掉分都偏高，導致他們常常在前段就讓出局面主動權。", "加爾各答的追分樣本裡，後七回合的界外球轉換率一直處於聯賽上游，適合處理中高壓追分場景。", "如果臨場獨贏賠率維持在 1.85 到 1.90 之間，客隊方向依然具備正邊際。"],
      performance: "近 10 中 6",
      tags: ["追分效率", "Powerplay", "獨贏方向"],
    },
    en: {
      title: "Royal Challengers Bengaluru vs Kolkata Knight Riders: chase pressure and powerplay gap",
      league: "Indian Premier League",
      teaser: "Bengaluru keep leaking early, while Kolkata are carrying a cleaner chasing profile and a steadier late-hitting floor.",
      marketSummary: "Lean Kolkata moneyline with a secondary look toward the over.",
      analysis: ["RCB have bled heavily in the powerplay across the last three matches, which keeps forcing them into recovery mode early.", "Kolkata remain one of the better chase teams late, with strong boundary conversion in the last seven overs.", "If the closing moneyline stays in the 1.85 to 1.90 band, the away side still holds positive edge."],
      performance: "6 wins from last 10",
      tags: ["Chasing efficiency", "Powerplay", "Moneyline angle"],
    },
  },
  "plan-6": {
    "zh-CN": {
      title: "T1 vs Bilibili Gaming：资源置换与系列赛压制",
      league: "LPL",
      teaser: "这组对局的核心不是单点操作，而是谁能先把先锋、小龙和边路线权串成连续收益。",
      marketSummary: "倾向 T1 系列赛让图，次看小龙节奏压制。",
      analysis: ["T1 最近的中野联动把第一条先锋后的推进收益兑现得更完整，尤其擅长用视野提前锁死第二波资源交换。", "BLG 的团战爆发力仍在，但如果前十五分钟没打出足够的线优，边路会被 T1 的转线效率持续压缩。", "盘口若继续维持在 T1 -1.5 附近，说明市场也在承认双方系列赛稳定性的差距。"],
      performance: "近 18 中 12",
      tags: ["先锋节奏", "系列赛让图", "线权压制"],
    },
    "zh-TW": {
      title: "T1 vs Bilibili Gaming：資源置換與系列賽壓制",
      league: "LPL",
      teaser: "這組對局的核心不是單點操作，而是誰能先把先鋒、小龍與邊線權串成連續收益。",
      marketSummary: "傾向 T1 系列賽讓圖，次看小龍節奏壓制。",
      analysis: ["T1 近期的中野聯動把第一隻先鋒後的推進收益兌現得更完整，尤其擅長用視野提前鎖死第二波資源交換。", "BLG 的團戰爆發力仍在，但如果前十五分鐘沒有打出足夠線優，邊路會被 T1 的轉線效率持續壓縮。", "如果盤口繼續維持在 T1 -1.5 附近，代表市場也在承認雙方系列賽穩定性的差距。"],
      performance: "近 18 中 12",
      tags: ["先鋒節奏", "系列賽讓圖", "線權壓制"],
    },
    en: {
      title: "T1 vs Bilibili Gaming: resource trades and series control",
      league: "LPL",
      teaser: "This matchup is less about isolated mechanics and more about who chains Herald, drake, and side-lane pressure into repeatable gains.",
      marketSummary: "Lean T1 on the series handicap, with a secondary angle on early drake control.",
      analysis: ["T1 have been converting their first Herald setups into cleaner map progression, especially when they can lock the second resource cycle with vision first.", "BLG still own explosive teamfight windows, but if they fail to build enough lane leverage in the first 15 minutes the side lanes tend to collapse under T1's rotations.", "If the number stays near T1 -1.5, the market is still pricing a visible stability gap across the full series."],
      performance: "12 wins from last 18",
      tags: ["Herald tempo", "Series handicap", "Lane control"],
    },
  },
  "plan-7": {
    "zh-CN": {
      title: "Gaimin Gladiators vs Team Liquid：Roshan 节奏与买活窗口",
      league: "DreamLeague",
      teaser: "DreamLeague 这组对局会更像一场耐心博弈，Roshan 控制权和买活窗口才是真正的胜负手。",
      marketSummary: "总地图数偏大，第三图决胜概率更高。",
      analysis: ["GG 近期在一代盾后的地图压制明显增强，但 Liquid 对拖后期和高地防守的处理依然具备顶级样本。", "双方都不愿意在前两波大型目标上过度 all-in，这会让比赛更容易进入拉长的资源博弈。", "如果系列赛第一图打到 40 分钟以上，后续盘口通常会继续抬高大图价值。"],
      performance: "近 15 中 10",
      tags: ["Roshan 控制", "买活窗口", "大图方向"],
    },
    "zh-TW": {
      title: "Gaimin Gladiators vs Team Liquid：Roshan 節奏與買活窗口",
      league: "DreamLeague",
      teaser: "DreamLeague 這組對局更像一場耐心博弈，Roshan 控制權與買活窗口才是真正的勝負手。",
      marketSummary: "總地圖數偏大，第三圖決勝機率更高。",
      analysis: ["GG 近期在一代盾後的地圖壓制明顯增強，但 Liquid 對拖後期和高地防守的處理依然具備頂級樣本。", "雙方都不願意在前兩波大型目標上過度 all-in，這會讓比賽更容易進入拉長的資源博弈。", "如果系列賽第一圖打到 40 分鐘以上，後續盤口通常會繼續抬高大圖價值。"],
      performance: "近 15 中 10",
      tags: ["Roshan 控制", "買活窗口", "大圖方向"],
    },
    en: {
      title: "Gaimin Gladiators vs Team Liquid: Roshan tempo and buyback windows",
      league: "DreamLeague",
      teaser: "This DreamLeague series is more likely to become a patience test where Roshan control and buyback timing decide the outcome.",
      marketSummary: "Leaning toward the over on total maps, with map three live in the range.",
      analysis: ["GG have improved their post-Aegis map control, but Liquid still grade out as an elite team when games stretch into late high-ground sequences.", "Neither side has shown a strong appetite to overcommit on the first two major objective windows, which makes longer resource trades more likely.", "If map one goes beyond the 40-minute mark, the market usually starts repricing the full-series over more aggressively."],
      performance: "10 wins from last 15",
      tags: ["Roshan control", "Buyback window", "Over maps"],
    },
  },
  "plan-8": {
    "zh-CN": {
      title: "Natus Vincere vs Team Vitality：手枪局与攻防侧切换",
      league: "BLAST Premier",
      teaser: "CS2 这场的差异不在明星枪男，而在手枪局兑现率和中段经济管理谁更稳。",
      marketSummary: "看好 Vitality 让分局，附带 CT 端压制思路。",
      analysis: ["Vitality 近期在 Mirage 和 Inferno 的 CT 端开局更稳定，往往能把前五回合的经济优势持续滚大。", "NAVI 进攻端默认信息收集偏慢，遇到中段道具不足时，经常被拖进低成功率残局。", "如果赛前盘口仍给到 Vitality -3.5，说明市场对他们中段回合控制力仍然买账。"],
      performance: "近 17 中 11",
      tags: ["手枪局", "侧别压制", "残局处理"],
    },
    "zh-TW": {
      title: "Natus Vincere vs Team Vitality：手槍局與攻防側切換",
      league: "BLAST Premier",
      teaser: "CS2 這場的差異不在明星槍男，而在手槍局兌現率與中段經濟管理誰更穩。",
      marketSummary: "看好 Vitality 讓分局，附帶 CT 端壓制思路。",
      analysis: ["Vitality 近期在 Mirage 和 Inferno 的 CT 端開局更穩定，往往能把前五回合的經濟優勢持續滾大。", "NAVI 進攻端預設資訊收集偏慢，遇到中段道具不足時，經常被拖進低成功率殘局。", "如果賽前盤口仍給到 Vitality -3.5，代表市場對他們中段回合控制力仍然買帳。"],
      performance: "近 17 中 11",
      tags: ["手槍局", "側別壓制", "殘局處理"],
    },
    en: {
      title: "Natus Vincere vs Team Vitality: pistol rounds and side-switch control",
      league: "BLAST Premier",
      teaser: "The edge in this CS2 matchup is less about star aim and more about pistol conversion plus cleaner mid-game economy control.",
      marketSummary: "Back Vitality on the round handicap with a supporting CT-side angle.",
      analysis: ["Vitality have opened Mirage and Inferno CT halves more cleanly of late, often rolling their first-five-round economy edge forward.", "NAVI are still a little slow in default information gathering on T sides, which keeps forcing them into low-percentage late-rounds once utility thins out.", "If the pre-match line remains near Vitality -3.5, the market is still paying respect to their round-to-round control."],
      performance: "11 wins from last 17",
      tags: ["Pistol rounds", "Side control", "Late-round execution"],
    },
  },
};

export function localizeHomepageModule(module: HomepageModule, locale: Locale): HomepageModule {
  const translation = moduleTranslations[module.key ?? module.id];
  return translation ? { ...module, ...pickLocale(translation, locale) } : module;
}

export function localizeAuthorTeam(author: AuthorTeam, locale: Locale): AuthorTeam {
  const translation = authorTranslations[author.id];
  return translation ? { ...author, ...pickLocale(translation, locale) } : author;
}

export function localizeMembershipPlan(plan: MembershipPlan, locale: Locale): MembershipPlan {
  const translation = membershipTranslations[plan.id];
  return translation ? { ...plan, ...pickLocale(translation, locale) } : plan;
}

export function localizeLeague(league: League, locale: Locale): League {
  const translation = leagueTranslations[league.slug];
  return translation ? { ...league, ...pickLocale(translation, locale) } : league;
}

export function localizeTeam(team: Team, locale: Locale): Team {
  return {
    ...team,
    name: translateTeamName(team.name, locale),
  };
}

export function localizeMatch(match: Match, locale: Locale): Match {
  const translation = matchTranslations[match.id];

  if (translation) {
    return {
      ...match,
      ...pickLocale(translation, locale),
    };
  }

  const leagueTranslation = leagueTranslations[match.leagueSlug];

  return {
    ...match,
    leagueName: match.leagueName ? (leagueTranslation ? pickLocale(leagueTranslation, locale).name : match.leagueName) : match.leagueName,
    homeTeam: translateTeamName(match.homeTeam, locale),
    awayTeam: translateTeamName(match.awayTeam, locale),
  };
}

export function localizeStandingRow(row: StandingRow, locale: Locale): StandingRow {
  return {
    ...row,
    team: translateTeamName(row.team, locale),
  };
}

export function localizeScheduleRow(row: ScheduleRow, locale: Locale): ScheduleRow {
  const resultMap = {
    待开赛: { "zh-CN": "待开赛", "zh-TW": "未開賽", en: "Upcoming" },
    直播中: { "zh-CN": "直播中", "zh-TW": "直播中", en: "Live" },
    已完场: { "zh-CN": "已完场", "zh-TW": "已完場", en: "Finished" },
  } as const;
  const noteMap = {
    "J1 League 焦点战": { "zh-CN": "J1 联赛焦点战", "zh-TW": "J1 聯賽焦點戰", en: "J1 League featured match" },
    滚球高频: { "zh-CN": "滚球高频", "zh-TW": "滾球高頻", en: "In-play hot match" },
    榜首大战: { "zh-CN": "榜首大战", "zh-TW": "榜首大戰", en: "Top-of-table clash" },
    已完场: { "zh-CN": "已完场", "zh-TW": "已完場", en: "Final" },
    死亡回合焦点战: { "zh-CN": "死亡回合焦点战", "zh-TW": "死亡回合焦點戰", en: "Death-over focus match" },
    追分效率对决: { "zh-CN": "追分效率对决", "zh-TW": "追分效率對決", en: "Chasing-efficiency matchup" },
    高总分样本: { "zh-CN": "高总分样本", "zh-TW": "高總分樣本", en: "High-total sample" },
    终盘提速兑现: { "zh-CN": "终盘提速兑现", "zh-TW": "終盤提速兌現", en: "Late acceleration delivered" },
    次日焦点战: { "zh-CN": "次日焦点战", "zh-TW": "次日焦點戰", en: "Next-match headline fixture" },
    联赛入口预留: { "zh-CN": "联赛入口预留", "zh-TW": "聯賽入口預留", en: "League entry placeholder" },
    "LoL 焦点对局": { "zh-CN": "LoL 焦点对局", "zh-TW": "LoL 焦點對局", en: "LoL featured matchup" },
    中期团战样本: { "zh-CN": "中期团战样本", "zh-TW": "中期團戰樣本", en: "Mid-game teamfight sample" },
    "Dota 2 焦点系列赛": { "zh-CN": "Dota 2 焦点系列赛", "zh-TW": "Dota 2 焦點系列賽", en: "Dota 2 featured series" },
    "Roshan 控制样本": { "zh-CN": "Roshan 控制样本", "zh-TW": "Roshan 控制樣本", en: "Roshan control sample" },
    "CS2 强强对话": { "zh-CN": "CS2 强强对话", "zh-TW": "CS2 強強對話", en: "CS2 heavyweight clash" },
    残局处理优势: { "zh-CN": "残局处理优势", "zh-TW": "殘局處理優勢", en: "Late-round execution edge" },
  } as const;

  return {
    ...row,
    fixture: row.fixture.split(" vs ").map((item) => translateTeamName(item, locale)).join(" vs "),
    result: resultMap[row.result as keyof typeof resultMap] ? pickLocale(resultMap[row.result as keyof typeof resultMap], locale) : row.result,
    note: noteMap[row.note as keyof typeof noteMap] ? pickLocale(noteMap[row.note as keyof typeof noteMap], locale) : row.note,
  };
}

export function localizeHeadToHeadRow(row: HeadToHeadRow, locale: Locale): HeadToHeadRow {
  const tagMap = {
    主场赢盘: { "zh-CN": "主场赢盘", "zh-TW": "主場贏盤", en: "Home cover" },
    客场平局: { "zh-CN": "客场平局", "zh-TW": "客場平局", en: "Away draw" },
    角球占优: { "zh-CN": "角球占优", "zh-TW": "角球佔優", en: "Corner edge" },
    主队后段压制: { "zh-CN": "主队后段压制", "zh-TW": "主隊後段壓制", en: "Home side late-over control" },
    追分效率领先: { "zh-CN": "追分效率领先", "zh-TW": "追分效率領先", en: "Superior chase efficiency" },
    终盘得分爆发: { "zh-CN": "终盘得分爆发", "zh-TW": "終盤得分爆發", en: "Late scoring burst" },
    掉门拐点明显: { "zh-CN": "掉门拐点明显", "zh-TW": "掉門拐點明顯", en: "Wicket-loss turning point" },
    联赛样本预留: { "zh-CN": "联赛样本预留", "zh-TW": "聯賽樣本預留", en: "League sample placeholder" },
    中期团战决胜: { "zh-CN": "中期团战决胜", "zh-TW": "中期團戰決勝", en: "Mid-game teamfights decided it" },
    前期线权领先: { "zh-CN": "前期线权领先", "zh-TW": "前期線權領先", en: "Early lane control edge" },
    "Roshan 控制占优": { "zh-CN": "Roshan 控制占优", "zh-TW": "Roshan 控制佔優", en: "Roshan control edge" },
    后期团战翻盘: { "zh-CN": "后期团战翻盘", "zh-TW": "後期團戰翻盤", en: "Late teamfight comeback" },
    残局稳定性更强: { "zh-CN": "残局稳定性更强", "zh-TW": "殘局穩定性更強", en: "Stronger late-round stability" },
    CT端压制明显: { "zh-CN": "CT 端压制明显", "zh-TW": "CT 端壓制明顯", en: "Clear CT-side control" },
  } as const;

  return {
    ...row,
    fixture: row.fixture
      .split(/ (?=\d-\d|vs )/)
      .map((part) => translateTeamName(part, locale))
      .join(" "),
    tag: tagMap[row.tag as keyof typeof tagMap] ? pickLocale(tagMap[row.tag as keyof typeof tagMap], locale) : row.tag,
  };
}

export function localizePrediction(prediction: PredictionRecord, locale: Locale): PredictionRecord {
  const translation = predictionTranslations[prediction.id];
  return translation ? { ...prediction, ...pickLocale(translation, locale) } : prediction;
}

export function localizeArticlePlan(plan: ArticlePlan, locale: Locale): ArticlePlan {
  const translation = planTranslations[plan.id];
  return translation ? { ...plan, ...pickLocale(translation, locale) } : plan;
}
