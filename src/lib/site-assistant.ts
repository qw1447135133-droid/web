import type { Locale } from "@/lib/i18n-config";

export type SiteAssistantLink = {
  href: string;
  label: string;
};

export type SiteAssistantReply = {
  text: string;
  links?: SiteAssistantLink[];
};

type AssistantPreset = {
  id: string;
  question: string;
};

type AssistantUiCopy = {
  triggerLabel: string;
  title: string;
  subtitle: string;
  close: string;
  intro: string;
  placeholder: string;
  send: string;
  presetsTitle: string;
  clear: string;
  emptyQuestion: string;
};

type AssistantKnowledgeBase = {
  ui: AssistantUiCopy;
  presets: AssistantPreset[];
  greeting: SiteAssistantReply;
  fallback: SiteAssistantReply;
  intents: Array<{
    keywords: string[];
    reply: SiteAssistantReply;
  }>;
};

const assistantKnowledgeBase: Record<Locale, AssistantKnowledgeBase> = {
  "zh-CN": {
    ui: {
      triggerLabel: "打开站内 AI 助手",
      title: "Signal Nine 助手",
      subtitle: "站内导航与功能问答",
      close: "关闭助手",
      intro: "我可以回答比分、资料库、会员、计划单、AI 预测和后台能力相关问题。",
      placeholder: "输入你想问的问题",
      send: "发送",
      presetsTitle: "常见问题",
      clear: "清空对话",
      emptyQuestion: "先输入一个与网站相关的问题，我就能帮你快速定位入口。",
    },
    presets: [
      { id: "live", question: "怎么看足球即时比分？" },
      { id: "member", question: "会员和单条购买有什么区别？" },
      { id: "ai", question: "AI 预测页在哪里？" },
      { id: "orders", question: "如何查看已购计划单？" },
      { id: "esports", question: "电竞模块支持哪些内容？" },
      { id: "language", question: "怎么切换简体、繁体和英文？" },
    ],
    greeting: {
      text: "你好，我是站内助手。你可以直接问我如何看比分、查资料库、开会员、找电竞/板球内容，或者点下面的常见问题。",
      links: [
        { href: "/live/football", label: "足球比分" },
        { href: "/database", label: "资料库" },
        { href: "/plans", label: "计划单" },
      ],
    },
    fallback: {
      text: "这个问题我暂时没有更细的站内答案。你可以换一种问法，或者先从比分、资料库、AI 预测、会员中心、计划单、电竞频道这些入口开始。",
      links: [
        { href: "/search", label: "站内搜索" },
        { href: "/member", label: "会员中心" },
        { href: "/ai-predictions", label: "AI 预测" },
      ],
    },
    intents: [
      {
        keywords: ["比分", "直播", "即时", "进球", "文字直播", "动画", "live", "score"],
        reply: {
          text: "看即时比分可以直接进入对应频道。足球、篮球、板球和电竞都已经拆成独立入口，比分页里还能按联赛、状态和时间筛选。",
          links: [
            { href: "/live/football", label: "足球比分" },
            { href: "/live/basketball", label: "篮球比分" },
            { href: "/live/cricket", label: "板球比分" },
            { href: "/live/esports", label: "电竞比分" },
          ],
        },
      },
      {
        keywords: ["会员", "套餐", "单条", "购买", "解锁", "付费", "member", "plan"],
        reply: {
          text: "会员套餐适合长期查看多场内容，单条购买适合只解锁某一篇计划单。会员有效期内可覆盖会员权益内容，单条购买则按已购记录长期保留在会员中心。",
          links: [
            { href: "/member", label: "会员中心" },
            { href: "/plans", label: "计划单列表" },
          ],
        },
      },
      {
        keywords: ["ai", "预测", "模型", "命中", "explain", "prediction"],
        reply: {
          text: "AI 预测集中在 AI Predictions 页面，可以按项目筛选足球、篮球、板球和电竞内容，并查看信心区间、预期边际和解释因子。",
          links: [
            { href: "/ai-predictions", label: "AI 预测页" },
            { href: "/plans", label: "推荐计划单" },
          ],
        },
      },
      {
        keywords: ["已购", "订单", "购买记录", "我的", "order", "history"],
        reply: {
          text: "已购内容、会员订单和单条订单都在会员中心。登录后可以查看订单状态、支付信息、会员到期时间以及已经解锁的计划单。",
          links: [
            { href: "/member", label: "查看会员中心" },
          ],
        },
      },
      {
        keywords: ["资料库", "积分", "赛程", "赛果", "历史", "交锋", "database", "standings", "schedule"],
        reply: {
          text: "资料库支持按项目查看积分榜、赛程赛果、球队资料和历史交锋。足球、篮球、板球和电竞都可以从统一资料库进入。",
          links: [
            { href: "/database", label: "综合资料库" },
            { href: "/database?sport=esports", label: "电竞资料库" },
          ],
        },
      },
      {
        keywords: ["电竞", "lol", "dota", "cs2", "esports"],
        reply: {
          text: "电竞频道一期覆盖 LoL、Dota 2、CS2。现在可以查看直播面板、轻量详情、资料库、电竞计划单和电竞 AI 预测内容。",
          links: [
            { href: "/live/esports", label: "电竞直播" },
            { href: "/database?sport=esports", label: "电竞资料库" },
            { href: "/ai-predictions?sport=esports", label: "电竞 AI" },
          ],
        },
      },
      {
        keywords: ["板球", "cricket"],
        reply: {
          text: "板球频道已经有直播面板、深度资料库和比赛详情分支，适合查看国际赛、联赛赛程、球队状态和核心数据。",
          links: [
            { href: "/live/cricket", label: "板球直播" },
            { href: "/database?sport=cricket", label: "板球资料库" },
          ],
        },
      },
      {
        keywords: ["语言", "英文", "繁体", "简体", "locale", "english", "traditional", "simplified"],
        reply: {
          text: "站点右上角有语言切换器，可以在简体中文、繁體中文和 English 之间切换。首页 Banner、前台页面和这个助手都会跟随当前语言一起变化。",
          links: [
            { href: "/", label: "返回首页" },
          ],
        },
      },
      {
        keywords: ["后台", "运营", "admin", "banner", "内容管理", "同步"],
        reply: {
          text: "后台支持内容发布、首页 Banner、推荐位、公告、订单与用户管理，以及数据同步与运营检查。需要 operator 或 admin 角色才能进入。",
          links: [
            { href: "/admin", label: "运营后台" },
          ],
        },
      },
    ],
  },
  "zh-TW": {
    ui: {
      triggerLabel: "打開站內 AI 助手",
      title: "Signal Nine 助手",
      subtitle: "站內導覽與功能問答",
      close: "關閉助手",
      intro: "我可以回答比分、資料庫、會員、計劃單、AI 預測和後台能力相關問題。",
      placeholder: "輸入你想詢問的問題",
      send: "送出",
      presetsTitle: "常見問題",
      clear: "清空對話",
      emptyQuestion: "先輸入一個與網站相關的問題，我就能幫你快速定位入口。",
    },
    presets: [
      { id: "live", question: "怎麼看足球即時比分？" },
      { id: "member", question: "會員和單條購買有什麼差別？" },
      { id: "ai", question: "AI 預測頁在哪裡？" },
      { id: "orders", question: "如何查看已購計劃單？" },
      { id: "esports", question: "電競模組支援哪些內容？" },
      { id: "language", question: "怎麼切換簡體、繁體和英文？" },
    ],
    greeting: {
      text: "你好，我是站內助手。你可以直接問我如何看比分、查資料庫、開會員、找電競或板球內容，或者點下面的常見問題。",
      links: [
        { href: "/live/football", label: "足球比分" },
        { href: "/database", label: "資料庫" },
        { href: "/plans", label: "計劃單" },
      ],
    },
    fallback: {
      text: "這個問題我暫時沒有更細的站內答案。你可以換一種問法，或者先從比分、資料庫、AI 預測、會員中心、計劃單、電競頻道這些入口開始。",
      links: [
        { href: "/search", label: "站內搜尋" },
        { href: "/member", label: "會員中心" },
        { href: "/ai-predictions", label: "AI 預測" },
      ],
    },
    intents: [
      {
        keywords: ["比分", "直播", "即時", "進球", "文字直播", "動畫", "live", "score"],
        reply: {
          text: "看即時比分可以直接進入對應頻道。足球、籃球、板球和電競都已拆成獨立入口，比分頁裡還能按聯賽、狀態和時間篩選。",
          links: [
            { href: "/live/football", label: "足球比分" },
            { href: "/live/basketball", label: "籃球比分" },
            { href: "/live/cricket", label: "板球比分" },
            { href: "/live/esports", label: "電競比分" },
          ],
        },
      },
      {
        keywords: ["會員", "套餐", "單條", "購買", "解鎖", "付費", "member", "plan"],
        reply: {
          text: "會員套餐適合長期查看多場內容，單條購買適合只解鎖某一篇計劃單。會員有效期內可覆蓋會員權益內容，單條購買則按已購記錄長期保留在會員中心。",
          links: [
            { href: "/member", label: "會員中心" },
            { href: "/plans", label: "計劃單列表" },
          ],
        },
      },
      {
        keywords: ["ai", "預測", "模型", "命中", "explain", "prediction"],
        reply: {
          text: "AI 預測集中在 AI Predictions 頁面，可以按項目篩選足球、籃球、板球和電競內容，並查看信心區間、預期邊際和解釋因子。",
          links: [
            { href: "/ai-predictions", label: "AI 預測頁" },
            { href: "/plans", label: "推薦計劃單" },
          ],
        },
      },
      {
        keywords: ["已購", "訂單", "購買記錄", "我的", "order", "history"],
        reply: {
          text: "已購內容、會員訂單和單條訂單都在會員中心。登入後可以查看訂單狀態、支付資訊、會員到期時間以及已經解鎖的計劃單。",
          links: [
            { href: "/member", label: "查看會員中心" },
          ],
        },
      },
      {
        keywords: ["資料庫", "積分", "賽程", "賽果", "歷史", "交鋒", "database", "standings", "schedule"],
        reply: {
          text: "資料庫支援按項目查看積分榜、賽程賽果、球隊資料和歷史交鋒。足球、籃球、板球和電競都可以從統一資料庫進入。",
          links: [
            { href: "/database", label: "綜合資料庫" },
            { href: "/database?sport=esports", label: "電競資料庫" },
          ],
        },
      },
      {
        keywords: ["電競", "lol", "dota", "cs2", "esports"],
        reply: {
          text: "電競頻道一期覆蓋 LoL、Dota 2、CS2。現在可以查看直播面板、輕量詳情、資料庫、電競計劃單和電競 AI 預測內容。",
          links: [
            { href: "/live/esports", label: "電競直播" },
            { href: "/database?sport=esports", label: "電競資料庫" },
            { href: "/ai-predictions?sport=esports", label: "電競 AI" },
          ],
        },
      },
      {
        keywords: ["板球", "cricket"],
        reply: {
          text: "板球頻道已經有直播面板、深度資料庫和比賽詳情分支，適合查看國際賽、聯賽賽程、球隊狀態和核心數據。",
          links: [
            { href: "/live/cricket", label: "板球直播" },
            { href: "/database?sport=cricket", label: "板球資料庫" },
          ],
        },
      },
      {
        keywords: ["語言", "英文", "繁體", "簡體", "locale", "english", "traditional", "simplified"],
        reply: {
          text: "站點右上角有語言切換器，可以在簡體中文、繁體中文和 English 之間切換。首頁 Banner、前台頁面和這個助手都會跟隨當前語言一起變化。",
          links: [
            { href: "/", label: "返回首頁" },
          ],
        },
      },
      {
        keywords: ["後台", "營運", "admin", "banner", "內容管理", "同步"],
        reply: {
          text: "後台支援內容發佈、首頁 Banner、推薦位、公告、訂單與用戶管理，以及資料同步與營運檢查。需要 operator 或 admin 角色才能進入。",
          links: [
            { href: "/admin", label: "營運後台" },
          ],
        },
      },
    ],
  },
  en: {
    ui: {
      triggerLabel: "Open site assistant",
      title: "Signal Nine Assistant",
      subtitle: "Site guidance and feature Q&A",
      close: "Close assistant",
      intro: "I can help with live scores, databases, memberships, plans, AI picks, and admin operations.",
      placeholder: "Ask a question about this site",
      send: "Send",
      presetsTitle: "Suggested questions",
      clear: "Clear chat",
      emptyQuestion: "Ask a site-related question and I will point you to the right page.",
    },
    presets: [
      { id: "live", question: "Where can I view football live scores?" },
      { id: "member", question: "What is the difference between membership and single plan purchase?" },
      { id: "ai", question: "Where is the AI predictions page?" },
      { id: "orders", question: "How do I view purchased plans?" },
      { id: "esports", question: "What does the esports module include?" },
      { id: "language", question: "How do I switch between Simplified, Traditional, and English?" },
    ],
    greeting: {
      text: "Hi, I am the site assistant. Ask me how to follow scores, open the database, unlock plans, or find esports and cricket coverage. You can also start from the suggested questions below.",
      links: [
        { href: "/live/football", label: "Football live" },
        { href: "/database", label: "Database" },
        { href: "/plans", label: "Plans" },
      ],
    },
    fallback: {
      text: "I do not have a more specific site answer for that yet. Try another phrasing, or start from live scores, database, AI predictions, member center, plans, or the esports hub.",
      links: [
        { href: "/search", label: "Site search" },
        { href: "/member", label: "Member center" },
        { href: "/ai-predictions", label: "AI predictions" },
      ],
    },
    intents: [
      {
        keywords: ["score", "live", "goal", "tracker", "instant", "直播", "比分"],
        reply: {
          text: "Live score access is split by channel. Football, basketball, cricket, and esports each have their own score page, with league, status, and time filters.",
          links: [
            { href: "/live/football", label: "Football live" },
            { href: "/live/basketball", label: "Basketball live" },
            { href: "/live/cricket", label: "Cricket live" },
            { href: "/live/esports", label: "Esports live" },
          ],
        },
      },
      {
        keywords: ["membership", "member", "purchase", "unlock", "paid", "single", "plan"],
        reply: {
          text: "Membership is best for broader ongoing access, while a single purchase unlocks one specific plan. Membership coverage follows the active entitlement window, and purchased plans stay visible in the member center.",
          links: [
            { href: "/member", label: "Member center" },
            { href: "/plans", label: "Plans" },
          ],
        },
      },
      {
        keywords: ["ai", "prediction", "model", "edge", "confidence"],
        reply: {
          text: "AI picks are grouped on the AI predictions page. You can filter by football, basketball, cricket, and esports, then inspect confidence, expected edge, and explainable factors.",
          links: [
            { href: "/ai-predictions", label: "AI predictions" },
            { href: "/plans", label: "Expert plans" },
          ],
        },
      },
      {
        keywords: ["order", "purchased", "history", "my plans", "bought"],
        reply: {
          text: "Purchased content, membership orders, and single-item orders all live in the member center. After login you can review order status, payment details, expiry, and unlocked plans.",
          links: [
            { href: "/member", label: "Open member center" },
          ],
        },
      },
      {
        keywords: ["database", "standings", "schedule", "results", "stats", "h2h", "history"],
        reply: {
          text: "The database area includes standings, schedules and results, team views, and head-to-head tables. Football, basketball, cricket, and esports all flow through the same database entry.",
          links: [
            { href: "/database", label: "Database" },
            { href: "/database?sport=esports", label: "Esports database" },
          ],
        },
      },
      {
        keywords: ["esports", "lol", "dota", "cs2"],
        reply: {
          text: "The esports channel currently covers LoL, Dota 2, and CS2. It includes live panels, lightweight match detail, database views, esports plans, and esports AI picks.",
          links: [
            { href: "/live/esports", label: "Esports live" },
            { href: "/database?sport=esports", label: "Esports database" },
            { href: "/ai-predictions?sport=esports", label: "Esports AI" },
          ],
        },
      },
      {
        keywords: ["cricket"],
        reply: {
          text: "The cricket channel includes live tracking, deeper database content, and a dedicated match-detail branch for schedules, form, and key metrics.",
          links: [
            { href: "/live/cricket", label: "Cricket live" },
            { href: "/database?sport=cricket", label: "Cricket database" },
          ],
        },
      },
      {
        keywords: ["language", "english", "traditional", "simplified", "locale"],
        reply: {
          text: "Use the locale switcher in the site header to move between Simplified Chinese, Traditional Chinese, and English. Homepage banners, site pages, and this assistant follow the active locale.",
          links: [
            { href: "/", label: "Homepage" },
          ],
        },
      },
      {
        keywords: ["admin", "operations", "banner", "content", "sync", "backend"],
        reply: {
          text: "The admin console covers content publishing, homepage banners, featured slots, announcements, users and orders, plus sync and operational checks. It requires operator or admin access.",
          links: [
            { href: "/admin", label: "Admin console" },
          ],
        },
      },
    ],
  },
};

function normalizeQuestion(question: string) {
  return question.trim().toLowerCase();
}

export function getSiteAssistantCopy(locale: Locale) {
  return assistantKnowledgeBase[locale] ?? assistantKnowledgeBase["zh-CN"];
}

export function answerSiteAssistantQuestion(question: string, locale: Locale): SiteAssistantReply {
  const copy = getSiteAssistantCopy(locale);
  const normalized = normalizeQuestion(question);

  if (!normalized) {
    return { text: copy.ui.emptyQuestion };
  }

  const match = copy.intents.find((intent) =>
    intent.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())),
  );

  return match?.reply ?? copy.fallback;
}
