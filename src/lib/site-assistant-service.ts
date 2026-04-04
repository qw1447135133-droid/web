import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { answerSiteAssistantQuestion, type SiteAssistantLink } from "@/lib/site-assistant";
import { resolveRenderLocale, type DisplayLocale, type Locale } from "@/lib/i18n-config";

export const assistantCookieName = "signal-nine-assistant";
const assistantCookieMaxAge = 60 * 60 * 24 * 30;
const defaultAssistantModel = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
const defaultOpenAiBaseUrl = process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1";

type AssistantRole = "assistant" | "user";

export type AssistantChatMessage = {
  id: string;
  role: AssistantRole;
  text: string;
  links?: SiteAssistantLink[];
  createdAt: string;
};

export type AssistantConversationSnapshot = {
  conversationId?: string;
  messages: AssistantChatMessage[];
  modelEnabled: boolean;
  handoffAvailable: boolean;
  conversations: AssistantConversationListItem[];
};

export type AssistantConversationListItem = {
  id: string;
  title: string;
  summary?: string;
  status: string;
  lastMessageAt: string;
};

export type AssistantReply = {
  message: AssistantChatMessage;
  conversationId: string;
  modelEnabled: boolean;
  usedFallback: boolean;
  conversations: AssistantConversationListItem[];
};

export type AssistantHandoffRecord = {
  id: string;
  status: string;
  locale: string;
  contactName?: string;
  contactMethod?: string;
  note?: string;
  conversationId: string;
  conversationTitle?: string;
  conversationSummary?: string;
  requesterName?: string;
  requesterEmail?: string;
  createdAt: string;
  updatedAt: string;
};

function getDefaultConversationTitle(locale: Locale | DisplayLocale) {
  if (locale === "en") {
    return "New conversation";
  }

  if (locale === "zh-TW") {
    return "新對話";
  }

  if (locale === "th") {
    return "บทสนทนาใหม่";
  }

  if (locale === "vi") {
    return "Cuộc trò chuyện mới";
  }

  if (locale === "hi") {
    return "नई बातचीत";
  }

  return "新对话";
}

type SupportKnowledgeSeed = {
  key: string;
  category: string;
  href?: string;
  tags: string[];
  translations: Record<Locale, { question: string; answer: string }>;
};

const supportKnowledgeSeeds: SupportKnowledgeSeed[] = [
  {
    key: "live-scores",
    category: "navigation",
    href: "/live/football",
    tags: ["比分", "直播", "live", "score", "football", "basketball", "cricket", "esports"],
    translations: {
      "zh-CN": {
        question: "如何查看各项目即时比分？",
        answer:
          "即时比分按频道拆分为足球、篮球、板球和电竞入口。比分页支持按联赛、状态和开赛时间筛选，并可进入赛事详情页。",
      },
      "zh-TW": {
        question: "如何查看各項目即時比分？",
        answer:
          "即時比分按頻道拆分為足球、籃球、板球和電競入口。比分頁支援按聯賽、狀態和開賽時間篩選，並可進入賽事詳情頁。",
      },
      en: {
        question: "How do I view live scores across sports?",
        answer:
          "Live scores are split into football, basketball, cricket, and esports channels. Each page supports league, match status, and kickoff-time filters, plus links into match detail.",
      },
    },
  },
  {
    key: "membership",
    category: "commerce",
    href: "/member",
    tags: ["会员", "membership", "single purchase", "plan", "unlock", "order"],
    translations: {
      "zh-CN": {
        question: "会员和单条购买有什么区别？",
        answer:
          "会员套餐适合长期查看多篇内容，按有效期覆盖会员权益；单条购买只解锁某一篇计划单，但会保留在已购记录中，可在会员中心查看订单和解锁内容。",
      },
      "zh-TW": {
        question: "會員和單條購買有什麼差別？",
        answer:
          "會員套餐適合長期查看多篇內容，按有效期覆蓋會員權益；單條購買只解鎖某一篇計劃單，但會保留在已購記錄中，可在會員中心查看訂單和解鎖內容。",
      },
      en: {
        question: "What is the difference between membership and single purchase?",
        answer:
          "Membership is designed for broader access during the active entitlement window, while a single purchase unlocks one specific plan and remains visible in purchase history inside the member center.",
      },
    },
  },
  {
    key: "database",
    category: "content",
    href: "/database",
    tags: ["资料库", "database", "standings", "schedule", "teams", "h2h", "history"],
    translations: {
      "zh-CN": {
        question: "资料库可以看什么？",
        answer:
          "资料库提供积分榜、赛程赛果、球队资料和历史交锋。足球、篮球、板球和电竞都能从统一资料库入口进入，并按项目切换。",
      },
      "zh-TW": {
        question: "資料庫可以看什麼？",
        answer:
          "資料庫提供積分榜、賽程賽果、球隊資料和歷史交鋒。足球、籃球、板球和電競都能從統一資料庫入口進入，並按項目切換。",
      },
      en: {
        question: "What can I see in the database area?",
        answer:
          "The database section includes standings, schedules and results, team profiles, and head-to-head records. Football, basketball, cricket, and esports all share the same database entry with sport-level filters.",
      },
    },
  },
  {
    key: "ai-predictions",
    category: "content",
    href: "/ai-predictions",
    tags: ["ai", "prediction", "模型", "预测", "confidence", "edge"],
    translations: {
      "zh-CN": {
        question: "AI 预测页提供什么？",
        answer:
          "AI 预测页集中展示各项目预测结果、信心区间、预期边际、解释因子和历史命中记录，可按足球、篮球、板球和电竞筛选。",
      },
      "zh-TW": {
        question: "AI 預測頁提供什麼？",
        answer:
          "AI 預測頁集中展示各項目預測結果、信心區間、預期邊際、解釋因子和歷史命中記錄，可按足球、籃球、板球和電競篩選。",
      },
      en: {
        question: "What is available on the AI predictions page?",
        answer:
          "The AI predictions page groups model outputs, confidence bands, expected edge, explainable factors, and historical hit records, with sport-level filters across football, basketball, cricket, and esports.",
      },
    },
  },
  {
    key: "esports",
    category: "channel",
    href: "/live/esports",
    tags: ["esports", "lol", "dota2", "cs2", "电竞"],
    translations: {
      "zh-CN": {
        question: "电竞模块目前支持哪些内容？",
        answer:
          "电竞频道一期覆盖 LoL、Dota 2、CS2，包含直播面板、统一轻详情、资料库、计划单和 AI 预测筛选入口。",
      },
      "zh-TW": {
        question: "電競模組目前支援哪些內容？",
        answer:
          "電競頻道一期覆蓋 LoL、Dota 2、CS2，包含直播面板、統一輕詳情、資料庫、計劃單和 AI 預測篩選入口。",
      },
      en: {
        question: "What does the esports module currently include?",
        answer:
          "The esports channel currently covers LoL, Dota 2, and CS2 with live panels, unified lightweight match detail, database views, plans, and AI prediction filters.",
      },
    },
  },
  {
    key: "cricket",
    category: "channel",
    href: "/live/cricket",
    tags: ["cricket", "板球", "schedule", "database"],
    translations: {
      "zh-CN": {
        question: "板球频道可以做什么？",
        answer:
          "板球频道支持即时比分、赛程赛果、深度资料库和比赛详情分支，适合查看国际赛、联赛、球队状态和核心数据。",
      },
      "zh-TW": {
        question: "板球頻道可以做什麼？",
        answer:
          "板球頻道支援即時比分、賽程賽果、深度資料庫和比賽詳情分支，適合查看國際賽、聯賽、球隊狀態和核心數據。",
      },
      en: {
        question: "What is available in the cricket channel?",
        answer:
          "The cricket channel supports live scores, schedules and results, deeper database views, and a dedicated match-detail branch for international and league coverage.",
      },
    },
  },
  {
    key: "locale",
    category: "settings",
    href: "/",
    tags: ["语言", "locale", "english", "traditional", "simplified"],
    translations: {
      "zh-CN": {
        question: "如何切换站点语言？",
        answer:
          "站点头部右上角提供语言切换器，可以切换简体中文、繁體中文、English，并提供泰语、越南语、印地语入口。当前泰语、越语、印地语会先显示英文界面。",
      },
      "zh-TW": {
        question: "如何切換站點語言？",
        answer:
          "站點頭部右上角提供語言切換器，可以切換簡體中文、繁體中文、English，並提供泰語、越南語、印地語入口。當前泰語、越語、印地語會先顯示英文介面。",
      },
      en: {
        question: "How do I switch the site language?",
        answer:
          "Use the locale switcher in the top-right area of the header to switch between Simplified Chinese, Traditional Chinese, and English, with Thai, Vietnamese, and Hindi also available in the selector. Thai, Vietnamese, and Hindi currently fall back to the English interface.",
      },
    },
  },
  {
    key: "admin",
    category: "operations",
    href: "/admin",
    tags: ["后台", "admin", "operations", "banner", "orders", "sync"],
    translations: {
      "zh-CN": {
        question: "后台可以做什么？",
        answer:
          "后台支持内容发布、首页 Banner、推荐位、公告、用户与订单管理，以及数据同步与运营检查。只有 operator 或 admin 角色可访问。",
      },
      "zh-TW": {
        question: "後台可以做什麼？",
        answer:
          "後台支援內容發佈、首頁 Banner、推薦位、公告、用戶與訂單管理，以及資料同步與營運檢查。只有 operator 或 admin 角色可訪問。",
      },
      en: {
        question: "What can the admin console do?",
        answer:
          "The admin console covers content publishing, homepage banners, featured slots, announcements, user and order management, plus sync and operations checks. It is limited to operator or admin roles.",
      },
    },
  },
];

function parseLinksJson(value?: string | null) {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value) as SiteAssistantLink[];
    return Array.isArray(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function serializeLinks(links?: SiteAssistantLink[]) {
  return links && links.length > 0 ? JSON.stringify(links) : null;
}

function truncate(value: string, limit = 240) {
  const next = value.trim();
  return next.length > limit ? `${next.slice(0, limit - 1)}…` : next;
}

function splitTags(value?: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split("|")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getLocalizedKnowledge(record: {
  questionZhCn: string;
  questionZhTw: string;
  questionEn: string;
  answerZhCn: string;
  answerZhTw: string;
  answerEn: string;
}, locale: Locale | DisplayLocale) {
  const renderLocale = getAssistantRenderLocale(locale);

  if (renderLocale === "zh-TW") {
    return {
      question: record.questionZhTw,
      answer: record.answerZhTw,
    };
  }

  if (renderLocale === "en") {
    return {
      question: record.questionEn,
      answer: record.answerEn,
    };
  }

  return {
    question: record.questionZhCn,
    answer: record.answerZhCn,
  };
}

function getAssistantRenderLocale(locale: Locale | DisplayLocale): Locale {
  return resolveRenderLocale(locale);
}

function scoreKnowledgeRecord(
  record: {
    questionZhCn: string;
    questionZhTw: string;
    questionEn: string;
    answerZhCn: string;
    answerZhTw: string;
    answerEn: string;
    tagsText: string | null;
  },
  question: string,
  locale: Locale | DisplayLocale,
) {
  const lowered = question.toLowerCase();
  const localized = getLocalizedKnowledge(record, locale);
  let score = 0;

  for (const tag of splitTags(record.tagsText)) {
    if (lowered.includes(tag)) {
      score += 4;
    }
  }

  for (const token of lowered.split(/[\s,.;!?/|]+/).filter(Boolean)) {
    if (localized.question.toLowerCase().includes(token)) {
      score += 3;
    }

    if (localized.answer.toLowerCase().includes(token)) {
      score += 1;
    }
  }

  return score;
}

function extractResponseText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const direct = (payload as { output_text?: unknown }).output_text;

  if (typeof direct === "string" && direct.trim()) {
    return direct.trim();
  }

  const output = (payload as { output?: unknown }).output;

  if (!Array.isArray(output)) {
    return "";
  }

  const parts: string[] = [];

  for (const item of output) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const content = (item as { content?: unknown }).content;

    if (!Array.isArray(content)) {
      continue;
    }

    for (const block of content) {
      if (!block || typeof block !== "object") {
        continue;
      }

      const text = (block as { text?: unknown }).text;
      const type = (block as { type?: unknown }).type;

      if ((type === "output_text" || type === "text") && typeof text === "string" && text.trim()) {
        parts.push(text.trim());
      }
    }
  }

  return parts.join("\n\n").trim();
}

function buildAssistantSystemPrompt(locale: Locale | DisplayLocale) {
  const languageLabel =
    locale === "en"
      ? "English"
      : locale === "zh-TW"
        ? "Traditional Chinese"
        : locale === "th"
          ? "Thai"
          : locale === "vi"
            ? "Vietnamese"
            : locale === "hi"
              ? "Hindi"
              : "Simplified Chinese";

  return [
    `You are the customer assistant for Signal Nine Sports.`,
    `Always answer in ${languageLabel}.`,
    `Only answer questions related to this website, its content, navigation, memberships, plans, AI predictions, admin operations, and supported sports channels.`,
    `If the user asks outside the website scope, gently redirect them back to site-related topics.`,
    `Do not invent payment confirmations, admin permissions, live results, or support promises that are not present in the supplied context.`,
    `Prefer short, direct answers with practical navigation guidance.`,
    `If the knowledge base contains a matching route, mention it naturally.`,
    `Important site routes: /, /live/football, /live/basketball, /live/cricket, /live/esports, /database, /ai-predictions, /plans, /member, /login, /admin.`,
  ].join("\n");
}

async function callOpenAiAssistant({
  locale,
  question,
  conversationMessages,
  knowledgeItems,
  userContext,
}: {
  locale: Locale | DisplayLocale;
  question: string;
  conversationMessages: Array<{ role: string; content: string }>;
  knowledgeItems: Array<{ question: string; answer: string; href?: string }>;
  userContext: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  const knowledgeText =
    knowledgeItems.length > 0
      ? knowledgeItems
          .map((item, index) =>
            `KB${index + 1}\nQuestion: ${item.question}\nAnswer: ${item.answer}${item.href ? `\nRoute: ${item.href}` : ""}`,
          )
          .join("\n\n")
      : "No matched knowledge items.";

  const response = await fetch(`${defaultOpenAiBaseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: defaultAssistantModel,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text: `${buildAssistantSystemPrompt(locale)}\n\nCurrent user context:\n${userContext}\n\nRelevant knowledge:\n${knowledgeText}`,
            },
          ],
        },
        ...conversationMessages.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: [{ type: "input_text", text: message.content }],
        })),
        {
          role: "user",
          content: [{ type: "input_text", text: question }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI response failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { output_text?: string; output?: unknown; status?: string };
  const text = extractResponseText(payload);

  if (!text) {
    throw new Error("OpenAI response did not include output text");
  }

  return {
    text,
    model: defaultAssistantModel,
    provider: "openai",
  };
}

function toChatMessage(record: {
  id: string;
  role: string;
  content: string;
  linksJson: string | null;
  createdAt: Date;
}): AssistantChatMessage {
  return {
    id: record.id,
    role: record.role === "assistant" ? "assistant" : "user",
    text: record.content,
    links: parseLinksJson(record.linksJson),
    createdAt: record.createdAt.toISOString(),
  };
}

function toConversationListItem(
  record: {
  id: string;
  title: string | null;
  summary: string | null;
  status: string;
  lastMessageAt: Date;
},
  locale: Locale | DisplayLocale,
) {
  return {
    id: record.id,
    title: record.title?.trim() || getDefaultConversationTitle(locale),
    summary: record.summary ?? undefined,
    status: record.status,
    lastMessageAt: record.lastMessageAt.toISOString(),
  };
}

function getAssistantFallbackLinks(
  knowledgeItems: Array<{ href?: string; question: string }>,
  locale: Locale | DisplayLocale,
) {
  const preferred = knowledgeItems
    .filter((item): item is { href: string; question: string } => Boolean(item.href))
    .slice(0, 3)
    .map((item) => ({
      href: item.href,
      label:
        locale === "en"
          ? "Open related page"
          : locale === "zh-TW"
            ? "打開相關頁面"
            : locale === "th"
              ? "เปิดหน้าที่เกี่ยวข้อง"
              : locale === "vi"
                ? "Mở trang liên quan"
                : locale === "hi"
                  ? "संबंधित पेज खोलें"
                  : "打开相关页面",
    }));

  return preferred.length > 0 ? preferred : undefined;
}

export function resolveAssistantSessionKey(existingValue?: string | null) {
  if (existingValue && existingValue.trim()) {
    return {
      sessionKey: existingValue.trim(),
      shouldSetCookie: false,
    };
  }

  return {
    sessionKey: randomUUID(),
    shouldSetCookie: true,
  };
}

export function getAssistantCookieConfig() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: assistantCookieMaxAge,
  };
}

export async function bootstrapSupportKnowledgeBase() {
  for (const [index, item] of supportKnowledgeSeeds.entries()) {
    await prisma.supportKnowledgeItem.upsert({
      where: { key: item.key },
      update: {
        category: item.category,
        questionZhCn: item.translations["zh-CN"].question,
        questionZhTw: item.translations["zh-TW"].question,
        questionEn: item.translations.en.question,
        answerZhCn: item.translations["zh-CN"].answer,
        answerZhTw: item.translations["zh-TW"].answer,
        answerEn: item.translations.en.answer,
        href: item.href ?? null,
        tagsText: item.tags.join("|"),
        status: "active",
        sortOrder: index,
      },
      create: {
        key: item.key,
        category: item.category,
        questionZhCn: item.translations["zh-CN"].question,
        questionZhTw: item.translations["zh-TW"].question,
        questionEn: item.translations.en.question,
        answerZhCn: item.translations["zh-CN"].answer,
        answerZhTw: item.translations["zh-TW"].answer,
        answerEn: item.translations.en.answer,
        href: item.href ?? null,
        tagsText: item.tags.join("|"),
        status: "active",
        sortOrder: index,
      },
    });
  }
}

async function ensureSupportKnowledgeBase() {
  const count = await prisma.supportKnowledgeItem.count({
    where: { status: "active" },
  });

  if (count > 0) {
    return;
  }

  await bootstrapSupportKnowledgeBase();
}

async function getRelevantKnowledgeItems(question: string, locale: Locale | DisplayLocale) {
  await ensureSupportKnowledgeBase();
  const renderLocale = getAssistantRenderLocale(locale);

  const items = await prisma.supportKnowledgeItem.findMany({
    where: { status: "active" },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  type KnowledgeItem = (typeof items)[number];
  type ScoredKnowledgeItem = KnowledgeItem & {
    localized: ReturnType<typeof getLocalizedKnowledge>;
    score: number;
  };

  return items
    .map((item: KnowledgeItem): ScoredKnowledgeItem => ({
      ...item,
      localized: getLocalizedKnowledge(item, renderLocale),
      score: scoreKnowledgeRecord(item, question, renderLocale),
    }))
    .sort((left: ScoredKnowledgeItem, right: ScoredKnowledgeItem) => right.score - left.score || left.sortOrder - right.sortOrder)
    .slice(0, 4);
}

async function listAssistantConversations(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  userId?: string;
}) {
  const conversations = await prisma.assistantConversation.findMany({
    where: {
      sessionKey: params.sessionKey,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 8,
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      lastMessageAt: true,
    },
  });

  return conversations.map((item: (typeof conversations)[number]) => toConversationListItem(item, params.locale));
}

async function getOrCreateConversation(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  userId?: string;
  conversationId?: string;
  forceNew?: boolean;
}) {
  if (params.conversationId) {
    const selected = await prisma.assistantConversation.findFirst({
      where: {
        id: params.conversationId,
        sessionKey: params.sessionKey,
      },
    });

    if (selected) {
      if (selected.locale !== params.locale || selected.userId !== params.userId) {
        return prisma.assistantConversation.update({
          where: { id: selected.id },
          data: {
            locale: params.locale,
            userId: params.userId ?? selected.userId,
          },
        });
      }

      return selected;
    }
  }

  if (params.forceNew) {
    return prisma.assistantConversation.create({
      data: {
        sessionKey: params.sessionKey,
        locale: params.locale,
        userId: params.userId,
        status: "open",
        lastMessageAt: new Date(),
      },
    });
  }

  const existing = await prisma.assistantConversation.findFirst({
    where: {
      sessionKey: params.sessionKey,
    },
    orderBy: [{ updatedAt: "desc" }],
  });

  if (existing) {
    if (existing.locale !== params.locale || existing.userId !== params.userId) {
      return prisma.assistantConversation.update({
        where: { id: existing.id },
        data: {
          locale: params.locale,
          userId: params.userId ?? existing.userId,
        },
      });
    }

    return existing;
  }

  return prisma.assistantConversation.create({
    data: {
      sessionKey: params.sessionKey,
      locale: params.locale,
      userId: params.userId,
      status: "open",
      lastMessageAt: new Date(),
    },
  });
}

export async function getAssistantConversationSnapshot(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  userId?: string;
  conversationId?: string;
}): Promise<AssistantConversationSnapshot> {
  const conversations = await listAssistantConversations({
    sessionKey: params.sessionKey,
    locale: params.locale,
    userId: params.userId,
  });

  const selectedConversationId = params.conversationId ?? conversations[0]?.id;
  const conversation = selectedConversationId
    ? await prisma.assistantConversation.findFirst({
        where: {
          id: selectedConversationId,
          sessionKey: params.sessionKey,
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            take: 30,
          },
        },
      })
    : null;

  if (!conversation) {
    return {
      messages: [],
      modelEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
      handoffAvailable: true,
      conversations,
    };
  }

  return {
    conversationId: conversation.id,
    messages: conversation.messages.map(toChatMessage),
    modelEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
    handoffAvailable: true,
    conversations,
  };
}

export async function sendAssistantMessage(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  message: string;
  conversationId?: string;
  user?: {
    id: string;
    displayName: string;
    email: string;
    role: string;
    membershipPlanId: string | null;
    membershipExpiresAt: Date | null;
  } | null;
}): Promise<AssistantReply> {
  const question = params.message.trim();

  if (!question) {
    throw new Error("Assistant message cannot be empty.");
  }

  const conversation = await getOrCreateConversation({
    sessionKey: params.sessionKey,
    locale: params.locale,
    userId: params.user?.id,
    conversationId: params.conversationId,
  });

  await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: question,
    },
  });

  const recentMessages = await prisma.assistantMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  type RecentMessage = (typeof recentMessages)[number];
  type KnowledgeItem = Awaited<ReturnType<typeof getRelevantKnowledgeItems>>[number];

  const knowledgeItems = await getRelevantKnowledgeItems(question, params.locale);
  const userContext = params.user
    ? [
        `displayName: ${params.user.displayName || "unknown"}`,
        `email: ${params.user.email || "unknown"}`,
        `role: ${params.user.role}`,
        `membershipPlanId: ${params.user.membershipPlanId ?? "none"}`,
        `membershipExpiresAt: ${params.user.membershipExpiresAt?.toISOString() ?? "none"}`,
      ].join("\n")
    : "visitor session";

  let assistantText = "";
  let assistantLinks: SiteAssistantLink[] | undefined;
  let provider = "fallback";
  let model: string | undefined;
  let usedFallback = false;

  try {
    const modelResponse = await callOpenAiAssistant({
      locale: params.locale,
      question,
      conversationMessages: recentMessages.slice(0, -1).slice(-8).map((item: RecentMessage) => ({
        role: item.role,
        content: item.content,
      })),
      knowledgeItems: knowledgeItems.map((item: KnowledgeItem) => ({
        question: item.localized.question,
        answer: item.localized.answer,
        href: item.href ?? undefined,
      })),
      userContext,
    });

    if (!modelResponse) {
      usedFallback = true;
      const fallback = answerSiteAssistantQuestion(question, params.locale);
      assistantText = fallback.text;
      assistantLinks =
        fallback.links ??
        getAssistantFallbackLinks(
          knowledgeItems.map((item: KnowledgeItem) => ({ href: item.href ?? undefined, question: item.localized.question })),
          params.locale,
        );
    } else {
      assistantText = modelResponse.text;
      assistantLinks = knowledgeItems
        .filter((item: KnowledgeItem): item is KnowledgeItem & { href: string } => Boolean(item.href))
        .slice(0, 3)
        .map((item: KnowledgeItem & { href: string }) => ({
          href: item.href,
          label: item.localized.question,
        }));
      provider = modelResponse.provider;
      model = modelResponse.model;
    }
  } catch {
    usedFallback = true;
    const fallback = answerSiteAssistantQuestion(question, params.locale);
    assistantText = fallback.text;
    assistantLinks =
      fallback.links ??
      getAssistantFallbackLinks(
        knowledgeItems.map((item: KnowledgeItem) => ({ href: item.href ?? undefined, question: item.localized.question })),
        params.locale,
      );
  }

  const assistantMessage = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: assistantText,
      linksJson: serializeLinks(assistantLinks),
      provider,
      model: model ?? null,
      finishReason: usedFallback ? "fallback" : "stop",
    },
  });

  await prisma.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      title: conversation.title ?? truncate(question, 80),
      summary: truncate(assistantText, 220),
      status: conversation.status === "handoff_requested" ? "handoff_requested" : "open",
      lastMessageAt: assistantMessage.createdAt,
      userId: params.user?.id ?? conversation.userId,
    },
  });

  return {
    conversationId: conversation.id,
    modelEnabled: Boolean(process.env.OPENAI_API_KEY?.trim()),
    usedFallback,
    conversations: await listAssistantConversations({
      sessionKey: params.sessionKey,
      locale: params.locale,
      userId: params.user?.id,
    }),
    message: {
      id: assistantMessage.id,
      role: "assistant",
      text: assistantMessage.content,
      links: assistantLinks,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
  };
}

export async function requestAssistantHandoff(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  conversationId?: string;
  user?: {
    id: string;
  } | null;
  contactName?: string;
  contactMethod?: string;
  note?: string;
}) {
  const conversation = await getOrCreateConversation({
    sessionKey: params.sessionKey,
    locale: params.locale,
    userId: params.user?.id,
    conversationId: params.conversationId,
  });

  const handoff = await prisma.assistantHandoffRequest.create({
    data: {
      conversationId: conversation.id,
      userId: params.user?.id,
      locale: params.locale,
      contactName: params.contactName?.trim() || null,
      contactMethod: params.contactMethod?.trim() || null,
      note: params.note?.trim() || null,
      status: "pending",
    },
  });

  const acknowledgement =
    params.locale === "en"
      ? "A human handoff request has been submitted. The operations team can now follow up from the admin queue."
      : params.locale === "zh-TW"
        ? "人工轉接請求已提交，營運可在後台隊列中跟進。"
        : params.locale === "th"
          ? "ส่งคำขอโอนไปยังเจ้าหน้าที่แล้ว ทีมปฏิบัติการจะติดตามต่อจากคิวหลังบ้าน"
          : params.locale === "vi"
            ? "Yêu cầu chuyển cho nhân viên đã được gửi. Bộ phận vận hành sẽ tiếp nhận từ hàng chờ quản trị."
            : params.locale === "hi"
              ? "मानव सहायता अनुरोध जमा कर दिया गया है। ऑपरेशंस टीम अब एडमिन कतार से आगे देख सकती है।"
        : "人工转接请求已提交，运营可在后台队列中跟进。";

  const assistantMessage = await prisma.assistantMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: acknowledgement,
      provider: "system",
      finishReason: "handoff-requested",
    },
  });

  await prisma.assistantConversation.update({
    where: { id: conversation.id },
    data: {
      status: "handoff_requested",
      handoffRequestedAt: new Date(),
      summary: acknowledgement,
      lastMessageAt: assistantMessage.createdAt,
    },
  });

  return {
    id: handoff.id,
    conversationId: conversation.id,
    conversations: await listAssistantConversations({
      sessionKey: params.sessionKey,
      locale: params.locale,
      userId: params.user?.id,
    }),
    message: {
      id: assistantMessage.id,
      role: "assistant" as const,
      text: assistantMessage.content,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
  };
}

export async function createAssistantConversation(params: {
  sessionKey: string;
  locale: Locale | DisplayLocale;
  userId?: string;
}) {
  const conversation = await getOrCreateConversation({
    sessionKey: params.sessionKey,
    locale: params.locale,
    userId: params.userId,
    forceNew: true,
  });

  return {
    conversationId: conversation.id,
    conversations: await listAssistantConversations({
      sessionKey: params.sessionKey,
      locale: params.locale,
      userId: params.userId,
    }),
  };
}

export async function getAdminAssistantHandoffRequests(limit = 12): Promise<AssistantHandoffRecord[]> {
  const requests = await prisma.assistantHandoffRequest.findMany({
    orderBy: [{ updatedAt: "desc" }],
    take: limit,
    include: {
      conversation: {
        select: {
          id: true,
          title: true,
          summary: true,
        },
      },
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  return requests.map((item: (typeof requests)[number]) => ({
    id: item.id,
    status: item.status,
    locale: item.locale,
    contactName: item.contactName ?? undefined,
    contactMethod: item.contactMethod ?? undefined,
    note: item.note ?? undefined,
    conversationId: item.conversationId,
    conversationTitle: item.conversation.title ?? undefined,
    conversationSummary: item.conversation.summary ?? undefined,
    requesterName: item.user?.displayName ?? undefined,
    requesterEmail: item.user?.email ?? undefined,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));
}

export async function resolveAssistantHandoffRequest(id: string) {
  const request = await prisma.assistantHandoffRequest.findUnique({
    where: { id },
    select: {
      id: true,
      conversationId: true,
      status: true,
    },
  });

  if (!request) {
    throw new Error("Assistant handoff request not found.");
  }

  await prisma.assistantHandoffRequest.update({
    where: { id },
    data: {
      status: "resolved",
    },
  });

  const pendingCount = await prisma.assistantHandoffRequest.count({
    where: {
      conversationId: request.conversationId,
      status: "pending",
    },
  });

  await prisma.assistantConversation.update({
    where: { id: request.conversationId },
    data: {
      status: pendingCount > 0 ? "handoff_requested" : "resolved",
      resolvedAt: pendingCount > 0 ? null : new Date(),
    },
  });
}
