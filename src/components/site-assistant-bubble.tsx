"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n-config";
import { answerSiteAssistantQuestion, getSiteAssistantCopy, type SiteAssistantReply } from "@/lib/site-assistant";

type Message = {
  id: string;
  role: "assistant" | "user";
  text: string;
  links?: SiteAssistantReply["links"];
  createdAt?: string;
};

type ConversationListItem = {
  id: string;
  title: string;
  summary?: string;
  status: string;
  lastMessageAt: string;
};

const assistantTeaserStorageKey = "signal-nine-assistant-teaser-dismissed";
const assistantLastSeenMessageStorageKey = "signal-nine-assistant-last-seen-message";
const assistantDockAutoHideMs = 5000;
const assistantDockCloseAnimationMs = 280;

export function SiteAssistantBubble({ locale }: { locale: Locale }) {
  const copy = useMemo(() => getSiteAssistantCopy(locale), [locale]);
  const runtimeCopy = useMemo(
    () =>
      locale === "en"
        ? {
            teaserBadge: "AI desk",
            teaserTitle: "Need a quick answer?",
            teaserDescription:
              "Ask about match pages, memberships, purchased plans, esports, cricket, and site navigation.",
            teaserOpen: "Ask now",
            teaserClose: "Dismiss",
            dockBadge: "Recent reply",
            dockTitle: "Latest assistant reply",
            dockOpen: "Continue",
            dockDismiss: "Hide",
            composerHint: "Enter to send, Shift+Enter for a new line",
            handoffQueued: "Handoff request sent to operations",
            handoffFailed: "Handoff request failed. Please try again later.",
            sessionListTitle: "Recent chats",
            newConversation: "New chat",
            loadingConversation: "Loading conversation...",
            openStatus: "Open",
            handoffStatusLabel: "Handoff",
            resolvedStatus: "Resolved",
            modelReady: "Live model connected",
            modelFallback: "Fallback mode",
            loading: "Thinking...",
            sendFailed: "The assistant is temporarily unavailable. A fallback answer is shown below.",
            handoffButton: "Human handoff",
            handoffTitle: "Request human follow-up",
            handoffDescription:
              "Leave a contact and note. The request will appear in the admin queue for manual follow-up.",
            handoffName: "Name",
            handoffContact: "Contact",
            handoffNote: "Note",
            handoffSubmit: "Submit handoff",
            handoffCancel: "Cancel",
            handoffSuccess: "A human handoff request has been submitted. The operations team can now follow up from the admin queue.",
          }
        : locale === "zh-TW"
          ? {
              teaserBadge: "AI 客服",
              teaserTitle: "需要快速幫你定位內容嗎？",
              teaserDescription: "可詢問比賽頁、會員方案、已購內容、電競、板球與站內導航。",
              teaserOpen: "立即提問",
              teaserClose: "收起",
              dockBadge: "最近回覆",
              dockTitle: "最新助手回覆",
              dockOpen: "繼續",
              dockDismiss: "收起",
              composerHint: "Enter 送出，Shift+Enter 換行",
              handoffQueued: "人工轉接請求已送交營運隊列",
              handoffFailed: "人工轉接提交失敗，請稍後再試",
              sessionListTitle: "最近對話",
              newConversation: "新對話",
              loadingConversation: "正在載入對話...",
              openStatus: "進行中",
              handoffStatusLabel: "待人工",
              resolvedStatus: "已處理",
              modelReady: "已接入真實模型",
              modelFallback: "備援回覆模式",
              loading: "正在思考...",
              sendFailed: "助手暫時不可用，下面先為你顯示備援答案。",
              handoffButton: "轉人工",
              handoffTitle: "提交人工跟進",
              handoffDescription: "留下聯絡方式與問題補充，請求會進入後台待處理隊列。",
              handoffName: "姓名",
              handoffContact: "聯絡方式",
              handoffNote: "問題補充",
              handoffSubmit: "提交轉接",
              handoffCancel: "取消",
              handoffSuccess: "人工轉接請求已提交，營運可在後台隊列中跟進。",
            }
          : {
              teaserBadge: "AI 客服",
              teaserTitle: "需要快速帮你定位内容吗？",
              teaserDescription: "可询问比赛页、会员方案、已购内容、电竞、板球与站内导航。",
              teaserOpen: "立即提问",
              teaserClose: "收起",
              dockBadge: "最近回复",
              dockTitle: "最新助手回复",
              dockOpen: "继续",
              dockDismiss: "收起",
              composerHint: "Enter 发送，Shift+Enter 换行",
              handoffQueued: "人工转接请求已送交运营队列",
              handoffFailed: "人工转接提交失败，请稍后再试",
              sessionListTitle: "最近对话",
              newConversation: "新对话",
              loadingConversation: "正在加载对话...",
              openStatus: "进行中",
              handoffStatusLabel: "待人工",
              resolvedStatus: "已处理",
              modelReady: "已接入真实模型",
              modelFallback: "备用回复模式",
              loading: "正在思考...",
              sendFailed: "助手暂时不可用，下面先为你显示备用答案。",
              handoffButton: "转人工",
              handoffTitle: "提交人工跟进",
              handoffDescription: "留下联系方式与问题补充，请求会进入后台待处理队列。",
              handoffName: "姓名",
              handoffContact: "联系方式",
              handoffNote: "问题补充",
              handoffSubmit: "提交转接",
              handoffCancel: "取消",
              handoffSuccess: "人工转接请求已提交，运营可在后台队列中跟进。",
            },
    [locale],
  );
  const [open, setOpen] = useState(false);
  const [teaserVisible, setTeaserVisible] = useState(false);
  const [value, setValue] = useState("");
  const [hasLoadedSession, setHasLoadedSession] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [switchingConversation, setSwitchingConversation] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [modelEnabled, setModelEnabled] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationDockState, setConversationDockState] = useState<"hidden" | "visible" | "closing">("hidden");
  const [lastSeenAssistantMessageIds, setLastSeenAssistantMessageIds] = useState<Record<string, string>>({});
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffName, setHandoffName] = useState("");
  const [handoffContact, setHandoffContact] = useState("");
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffPending, setHandoffPending] = useState(false);
  const [handoffStatus, setHandoffStatus] = useState<"idle" | "success" | "error">("idle");
  const syncRequestRef = useRef(0);
  const messageViewportRef = useRef<HTMLDivElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "greeting",
      role: "assistant",
      text: copy.greeting.text,
      links: copy.greeting.links,
      createdAt: new Date().toISOString(),
    },
  ]);
  const lastSeenConversationKey = conversationId ?? "default";
  const lastSeenAssistantMessageId = lastSeenAssistantMessageIds[lastSeenConversationKey];

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const dismissed = window.localStorage.getItem(assistantTeaserStorageKey);
    setTeaserVisible(!dismissed);

    try {
      const rawValue = window.localStorage.getItem(assistantLastSeenMessageStorageKey);

      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, string>;

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        setLastSeenAssistantMessageIds(parsed);
        return;
      }
    } catch {
      const legacyValue = window.localStorage.getItem(assistantLastSeenMessageStorageKey);

      if (legacyValue) {
        setLastSeenAssistantMessageIds({ default: legacyValue });
      }
    }
  }, []);

  useEffect(() => {
    syncRequestRef.current += 1;
    setMessages([
      {
        id: "greeting",
        role: "assistant",
        text: copy.greeting.text,
        links: copy.greeting.links,
        createdAt: new Date().toISOString(),
      },
    ]);
    setValue("");
    setConversationId(undefined);
    setConversations([]);
    setHasLoadedSession(false);
    setModelEnabled(false);
    setConversationDockState("hidden");
    setHandoffOpen(false);
    setHandoffPending(false);
    setHandoffStatus("idle");
    setHandoffName("");
    setHandoffContact("");
    setHandoffNote("");
  }, [copy]);

  useEffect(() => {
    if (!open || hasLoadedSession) {
      return;
    }

    let cancelled = false;

    async function loadConversation() {
      setLoadingSession(true);

      try {
        await syncConversation();
      } catch {
        if (!cancelled) {
          setHasLoadedSession(true);
        }
      } finally {
        if (!cancelled) {
          setLoadingSession(false);
        }
      }
    }

    void loadConversation();

    return () => {
      cancelled = true;
    };
  }, [open, locale, hasLoadedSession]);

  const latestAssistantMessage = useMemo(() => {
    const reversed = [...messages].reverse();
    return reversed.find((message) => message.role === "assistant" && message.id !== "greeting");
  }, [messages]);

  const unreadAssistantCount = useMemo(() => {
    const assistantMessages = messages.filter(
      (message) => message.role === "assistant" && message.id !== "greeting",
    );

    if (!lastSeenAssistantMessageId) {
      return assistantMessages.length;
    }

    const lastSeenIndex = assistantMessages.findIndex(
      (message) => message.id === lastSeenAssistantMessageId,
    );

    if (lastSeenIndex === -1) {
      return assistantMessages.length;
    }

    return assistantMessages.length - lastSeenIndex - 1;
  }, [lastSeenAssistantMessageId, messages]);

  useEffect(() => {
    if (!open && latestAssistantMessage && latestAssistantMessage.id !== lastSeenAssistantMessageId) {
      setConversationDockState("visible");
    }
  }, [lastSeenAssistantMessageId, latestAssistantMessage, open]);

  useEffect(() => {
    if (!open || !latestAssistantMessage || latestAssistantMessage.id === lastSeenAssistantMessageId) {
      return;
    }

    markLatestAssistantMessageAsSeen();
  }, [lastSeenAssistantMessageId, latestAssistantMessage, open]);

  useEffect(() => {
    if (conversationDockState !== "visible") {
      return;
    }

    const timer = window.setTimeout(() => {
      closeConversationDock();
    }, assistantDockAutoHideMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conversationDockState, latestAssistantMessage?.id]);

  useEffect(() => {
    if (conversationDockState !== "closing") {
      return;
    }

    const timer = window.setTimeout(() => {
      setConversationDockState("hidden");
    }, assistantDockCloseAnimationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [conversationDockState]);

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      if (messageViewportRef.current) {
        messageViewportRef.current.scrollTop = messageViewportRef.current.scrollHeight;
      }
      messageEndRef.current?.scrollIntoView({
        behavior: messages.length > 1 ? "smooth" : "auto",
        block: "end",
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [isSending, loadingSession, messages, open]);

  function dismissTeaser() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(assistantTeaserStorageKey, "true");
    }

    setTeaserVisible(false);
  }

  function markLatestAssistantMessageAsSeen() {
    if (!latestAssistantMessage?.id) {
      return;
    }

    setLastSeenAssistantMessageIds((current) => {
      const next = {
        ...current,
        [lastSeenConversationKey]: latestAssistantMessage.id,
      };

      if (typeof window !== "undefined") {
        window.localStorage.setItem(assistantLastSeenMessageStorageKey, JSON.stringify(next));
      }

      return next;
    });
  }

  function closeConversationDock() {
    markLatestAssistantMessageAsSeen();
    setConversationDockState("closing");
  }

  async function syncConversation(conversationToOpen?: string) {
    const requestId = syncRequestRef.current + 1;
    syncRequestRef.current = requestId;
    const response = await fetch(
      conversationToOpen
        ? `/api/site-assistant/session?locale=${locale}&conversationId=${conversationToOpen}`
        : `/api/site-assistant/session?locale=${locale}`,
      {
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error("assistant-session-failed");
    }

    const payload = (await response.json()) as {
      conversationId?: string;
      modelEnabled?: boolean;
      messages?: Message[];
      conversations?: ConversationListItem[];
    };

    if (requestId !== syncRequestRef.current) {
      return;
    }

    setConversationId(payload.conversationId);
    setModelEnabled(Boolean(payload.modelEnabled));
    setConversations(payload.conversations ?? []);
    setValue("");
    setHandoffOpen(false);
    setHandoffStatus("idle");

    if (payload.messages && payload.messages.length > 0) {
      setMessages(payload.messages);
    } else {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          text: copy.greeting.text,
          links: copy.greeting.links,
          createdAt: new Date().toISOString(),
        },
      ]);
    }

    setHasLoadedSession(true);
  }

  async function startNewConversation() {
    setSwitchingConversation(true);

    try {
      const response = await fetch("/api/site-assistant/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          action: "new",
        }),
      });

      if (!response.ok) {
        throw new Error("assistant-new-conversation-failed");
      }

      const payload = (await response.json()) as {
        conversationId?: string;
        modelEnabled?: boolean;
        messages?: Message[];
        conversations?: ConversationListItem[];
      };

      setConversationId(payload.conversationId);
      setModelEnabled(Boolean(payload.modelEnabled));
      setConversations(payload.conversations ?? []);
      setMessages(
        payload.messages && payload.messages.length > 0
          ? payload.messages
          : [
              {
                id: "greeting",
                role: "assistant",
                text: copy.greeting.text,
                links: copy.greeting.links,
                createdAt: new Date().toISOString(),
              },
            ],
      );
      setValue("");
      setHandoffOpen(false);
      setHandoffStatus("idle");
      setHandoffName("");
      setHandoffContact("");
      setHandoffNote("");
      setOpen(true);
      setHasLoadedSession(true);
    } finally {
      setSwitchingConversation(false);
    }
  }

  async function openConversation(nextConversationId: string) {
    if (!nextConversationId || nextConversationId === conversationId) {
      return;
    }

    setSwitchingConversation(true);

    try {
      await syncConversation(nextConversationId);
      setOpen(true);
    } finally {
      setSwitchingConversation(false);
    }
  }

  function handleOpenAssistant() {
    setOpen((current) => {
      const next = !current;

      if (next) {
        markLatestAssistantMessageAsSeen();
        setConversationDockState("hidden");
      }

      return next;
    });

    if (teaserVisible) {
      dismissTeaser();
    }
  }

  async function pushQuestion(question: string) {
    if (isSending || switchingConversation || loadingSession) {
      return;
    }

    const nextQuestion = question.trim();

    if (!nextQuestion) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-empty-${current.length + 1}`,
          role: "assistant",
          text: copy.ui.emptyQuestion,
        },
      ]);
      return;
    }

    setMessages((current) => [
      ...current,
      {
        id: `user-${current.length + 1}`,
        role: "user",
        text: nextQuestion,
        createdAt: new Date().toISOString(),
      },
    ]);
    setValue("");
    setOpen(true);
    setIsSending(true);

    try {
      const response = await fetch("/api/site-assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          message: nextQuestion,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("assistant-chat-failed");
      }

      const payload = (await response.json()) as {
        conversationId?: string;
        modelEnabled?: boolean;
        message?: Message;
        conversations?: ConversationListItem[];
      };
      const assistantMessage = payload.message;

      setConversationId(payload.conversationId);
      setModelEnabled(Boolean(payload.modelEnabled));
      setConversations(payload.conversations ?? []);

      if (assistantMessage) {
        setMessages((current) => [...current, assistantMessage]);
      }
    } catch {
      const reply = answerSiteAssistantQuestion(nextQuestion, locale);

      setMessages((current) => [
        ...current,
        {
          id: `assistant-fallback-${current.length + 1}`,
          role: "assistant",
          text: `${runtimeCopy.sendFailed}\n\n${reply.text}`,
          links: reply.links,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
      setHasLoadedSession(true);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void pushQuestion(value);
  }

  function handleComposerKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();

    if (!isSending) {
      void pushQuestion(value);
    }
  }

  async function handleHandoffSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (handoffPending || switchingConversation || loadingSession) {
      return;
    }

    setHandoffPending(true);
    setHandoffStatus("idle");

    try {
      const response = await fetch("/api/site-assistant/handoff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          conversationId,
          contactName: handoffName,
          contactMethod: handoffContact,
          note: handoffNote || value,
        }),
      });

      if (!response.ok) {
        throw new Error("assistant-handoff-failed");
      }

      const payload = (await response.json()) as {
        conversationId?: string;
        conversations?: ConversationListItem[];
        message?: Message;
      };

      setConversationId(payload.conversationId ?? conversationId);
      setConversations(payload.conversations ?? []);

      if (payload.message) {
        setMessages((current) => [...current, payload.message as Message]);
      }

      setHandoffStatus("success");
      setHandoffOpen(false);
      setHandoffName("");
      setHandoffContact("");
      setHandoffNote("");
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-handoff-failed-${current.length + 1}`,
          role: "assistant",
          text:
            locale === "en"
              ? "The human handoff request could not be submitted right now. Please try again in a moment."
              : locale === "zh-TW"
                ? "人工轉接請求暫時提交失敗，請稍後再試。"
                : "人工转接请求暂时提交失败，请稍后再试。",
          createdAt: new Date().toISOString(),
        },
      ]);
      setHandoffStatus("error");
    } finally {
      setHandoffPending(false);
    }
  }

  function resetConversation() {
    void startNewConversation();
  }

  const interactionLocked = isSending || loadingSession || switchingConversation || handoffPending;

  function formatMessageTime(createdAt?: string) {
    if (!createdAt) {
      return "";
    }

    const date = new Date(createdAt);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat(
      locale === "en" ? "en-US" : locale === "zh-TW" ? "zh-Hant-TW" : "zh-CN",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(date);
  }

  function getConversationStatusLabel(status: string) {
    if (status === "handoff_requested") {
      return runtimeCopy.handoffStatusLabel;
    }

    if (status === "resolved") {
      return runtimeCopy.resolvedStatus;
    }

    return runtimeCopy.openStatus;
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 sm:right-6 sm:bottom-6">
      {!open && teaserVisible ? (
        <section className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[1.75rem] border border-white/12 bg-[linear-gradient(145deg,rgba(7,18,31,0.95),rgba(10,25,39,0.92))] shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="relative px-4 py-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,156,84,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(103,210,255,0.16),transparent_42%)]" />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.22em] text-orange-200/80 uppercase">
                    {runtimeCopy.teaserBadge}
                  </p>
                  <p className="mt-2 text-base font-semibold text-white">{runtimeCopy.teaserTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={dismissTeaser}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  {runtimeCopy.teaserClose}
                </button>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{runtimeCopy.teaserDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    dismissTeaser();
                    setOpen(true);
                  }}
                  className="rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
                >
                  {runtimeCopy.teaserOpen}
                </button>
                {copy.presets.slice(0, 2).map((preset) => (
                  <button
                    key={`teaser-${preset.id}`}
                    type="button"
                    onClick={() => {
                      dismissTeaser();
                      void pushQuestion(preset.question);
                    }}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200 transition hover:border-orange-300/30 hover:bg-orange-300/10 hover:text-white"
                  >
                    {preset.question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!open && !teaserVisible && conversationDockState !== "hidden" && latestAssistantMessage ? (
        <section
          className={`w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-[1.35rem] border border-white/12 bg-[linear-gradient(145deg,rgba(7,18,31,0.94),rgba(11,24,38,0.92))] px-3.5 py-3 shadow-[0_16px_46px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-300 ease-out ${
            conversationDockState === "closing"
              ? "pointer-events-none translate-y-2 opacity-0"
              : "translate-y-0 opacity-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={handleOpenAssistant}
              className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-orange-300/28 bg-[radial-gradient(circle_at_32%_28%,rgba(255,196,136,0.98),rgba(255,122,26,0.98)_58%,rgba(135,49,5,0.94))] shadow-[inset_0_1px_10px_rgba(255,255,255,0.16),0_8px_22px_rgba(255,122,26,0.18)]"
            >
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300/60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-lime-300" />
              </span>
              <span className="display-title text-[11px] font-semibold tracking-[0.22em] text-slate-950">AI</span>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-orange-200/75 uppercase">
                    {runtimeCopy.dockBadge}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{runtimeCopy.dockTitle}</p>
                </div>
                <button
                  type="button"
                  onClick={closeConversationDock}
                  className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold text-slate-300 transition hover:border-white/20 hover:text-white"
                >
                  {runtimeCopy.dockDismiss}
                </button>
              </div>
              <button
                type="button"
                onClick={handleOpenAssistant}
                className="mt-2 block w-full text-left"
              >
                <p className="line-clamp-2 text-[13px] leading-5 text-slate-300">{latestAssistantMessage.text}</p>
              </button>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">
                  {locale === "en" ? "Auto hides in 5s" : locale === "zh-TW" ? "5 秒後自動收起" : "5 秒后自动收起"}
                </span>
                <button
                  type="button"
                  onClick={handleOpenAssistant}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-orange-300/25 hover:bg-orange-300/10 hover:text-white"
                >
                  {runtimeCopy.dockOpen}
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {open ? (
        <section className="glass-panel w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-[1.6rem] border border-white/12 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
          <div className="border-b border-white/8 bg-[linear-gradient(135deg,rgba(255,122,26,0.22),rgba(103,210,255,0.18))] px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="display-title text-lg font-semibold text-white">{copy.ui.title}</p>
                <p className="mt-1 text-sm text-white/75">{copy.ui.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  markLatestAssistantMessageAsSeen();
                  setOpen(false);
                  setConversationDockState("hidden");
                }}
                aria-label={copy.ui.close}
                className="rounded-full border border-white/12 bg-slate-950/35 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white/24 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.16em] uppercase ${
                  modelEnabled
                    ? "border-lime-300/25 bg-lime-300/12 text-lime-100"
                    : "border-orange-300/25 bg-orange-300/12 text-orange-100"
                }`}
              >
                {modelEnabled ? runtimeCopy.modelReady : runtimeCopy.modelFallback}
              </span>
              {conversationId ? (
                <span className="rounded-full border border-white/10 bg-slate-950/35 px-3 py-1 text-[11px] text-slate-300">
                  {conversationId.slice(0, 8)}
                </span>
              ) : null}
            </div>
            <p className="mt-3 text-sm text-slate-100/85">{copy.ui.intro}</p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-300 uppercase">
                  {runtimeCopy.sessionListTitle}
                </p>
                <button
                  type="button"
                  onClick={() => void startNewConversation()}
                  disabled={interactionLocked}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-orange-300/25 hover:bg-orange-300/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {runtimeCopy.newConversation}
                </button>
              </div>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {conversations.map((item) => {
                  const active = item.id === conversationId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => void openConversation(item.id)}
                      disabled={interactionLocked}
                      className={`min-w-[9.5rem] shrink-0 rounded-2xl border px-3 py-2 text-left transition ${
                        active
                          ? "border-orange-300/30 bg-orange-300/12 text-white"
                          : "border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:bg-white/[0.06]"
                      }`}
                    >
                      <p className="line-clamp-1 text-xs font-semibold">{item.title}</p>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-400">
                        {item.summary || getConversationStatusLabel(item.status)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                          {getConversationStatusLabel(item.status)}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatMessageTime(item.lastMessageAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            ref={messageViewportRef}
            className="no-scrollbar max-h-[25rem] space-y-3 overflow-y-auto px-4 py-4"
          >
            {switchingConversation ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                {runtimeCopy.loadingConversation}
              </div>
            ) : null}
            {loadingSession ? (
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                {runtimeCopy.loading}
              </div>
            ) : null}
            {messages.map((message) => {
              const assistant = message.role === "assistant";

              return (
                <div
                  key={message.id}
                  className={`flex ${assistant ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[1.25rem] px-4 py-3 text-sm leading-6 ${
                      assistant
                        ? "border border-white/10 bg-white/[0.05] text-slate-100"
                        : "bg-orange-400 text-slate-950"
                    }`}
                  >
                    <p className="whitespace-pre-line">{message.text}</p>
                    {message.createdAt ? (
                      <p
                        className={`mt-2 text-[11px] ${
                          assistant ? "text-slate-500" : "text-slate-900/65"
                        }`}
                      >
                        {formatMessageTime(message.createdAt)}
                      </p>
                    ) : null}
                    {assistant && message.links && message.links.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.links.map((link) => (
                          <Link
                            key={`${message.id}-${link.href}-${link.label}`}
                            href={link.href}
                            className="rounded-full border border-orange-300/25 bg-orange-300/10 px-3 py-1 text-xs font-semibold text-orange-100 transition hover:border-orange-200/45 hover:bg-orange-300/18"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {isSending ? (
              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-slate-300">
                  {runtimeCopy.loading}
                </div>
              </div>
            ) : null}
            <div ref={messageEndRef} />
          </div>

          <div className="border-t border-white/8 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.16em] text-lime-300 uppercase">
                {copy.ui.presetsTitle}
              </p>
              <button
                type="button"
                onClick={resetConversation}
                className="text-xs text-slate-400 transition hover:text-white"
              >
                {copy.ui.clear}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {copy.presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => void pushQuestion(preset.question)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-slate-200 transition hover:border-orange-300/30 hover:bg-orange-300/10 hover:text-white"
                >
                  {preset.question}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
              <textarea
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder={copy.ui.placeholder}
                rows={2}
                disabled={interactionLocked}
                className="min-h-[3.25rem] min-w-0 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={interactionLocked}
                className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {copy.ui.send}
              </button>
            </form>
            <p className="mt-2 text-[11px] text-slate-500">{runtimeCopy.composerHint}</p>

            <div className="mt-4 border-t border-white/8 pt-4">
              <button
                type="button"
                onClick={() => setHandoffOpen((current) => !current)}
                className="rounded-full border border-white/12 px-4 py-2 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
              >
                {runtimeCopy.handoffButton}
              </button>
              {handoffStatus !== "idle" ? (
                <p
                  className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${
                    handoffStatus === "success"
                      ? "border-lime-300/20 bg-lime-300/10 text-lime-100"
                      : "border-orange-300/20 bg-orange-300/10 text-orange-100"
                  }`}
                >
                  {handoffStatus === "success" ? runtimeCopy.handoffQueued : runtimeCopy.handoffFailed}
                </p>
              ) : null}

              {handoffOpen ? (
                <form onSubmit={handleHandoffSubmit} className="mt-4 space-y-3 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{runtimeCopy.handoffTitle}</p>
                    <p className="mt-1 text-xs leading-6 text-slate-400">{runtimeCopy.handoffDescription}</p>
                  </div>
                  <input
                    value={handoffName}
                    onChange={(event) => setHandoffName(event.target.value)}
                    placeholder={runtimeCopy.handoffName}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <input
                    value={handoffContact}
                    onChange={(event) => setHandoffContact(event.target.value)}
                    placeholder={runtimeCopy.handoffContact}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <textarea
                    value={handoffNote}
                    onChange={(event) => setHandoffNote(event.target.value)}
                    placeholder={runtimeCopy.handoffNote}
                    rows={3}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      disabled={interactionLocked}
                      className="rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {runtimeCopy.handoffSubmit}
                    </button>
                    <button
                      type="button"
                      onClick={() => setHandoffOpen(false)}
                      className="rounded-2xl border border-white/12 px-4 py-3 text-sm text-slate-100 transition hover:border-white/25 hover:text-white"
                    >
                      {runtimeCopy.handoffCancel}
                    </button>
                  </div>
                </form>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <button
        type="button"
        aria-label={copy.ui.triggerLabel}
        onClick={handleOpenAssistant}
        className="group relative flex min-h-[4.4rem] items-center gap-3 overflow-hidden rounded-full border border-white/14 bg-[linear-gradient(135deg,rgba(18,31,46,0.96),rgba(9,20,33,0.94))] px-3 py-3 shadow-[0_20px_54px_rgba(0,0,0,0.34)] transition hover:-translate-y-0.5 hover:border-orange-300/35 hover:shadow-[0_24px_60px_rgba(255,122,26,0.22)]"
      >
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,156,84,0.2),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(103,210,255,0.14),transparent_34%)] opacity-90" />
        <span className="pointer-events-none absolute right-3 top-3 flex h-3 w-3 items-center justify-center">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-300/60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime-300 shadow-[0_0_18px_rgba(163,230,53,0.65)]" />
        </span>
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full border border-orange-300/30 bg-[radial-gradient(circle_at_32%_28%,rgba(255,196,136,0.98),rgba(255,122,26,0.98)_58%,rgba(135,49,5,0.94))] shadow-[inset_0_1px_10px_rgba(255,255,255,0.18),0_10px_28px_rgba(255,122,26,0.25)]">
          <span className="display-title text-sm font-semibold tracking-[0.24em] text-slate-950">AI</span>
        </span>
        <span className="relative hidden min-w-0 text-left sm:block">
          <span className="block text-sm font-semibold text-white">
            {locale === "en" ? "AI support" : locale === "zh-TW" ? "AI 客服" : "AI 客服"}
          </span>
          <span className="block text-[11px] tracking-[0.16em] text-slate-400 uppercase">
            {locale === "en" ? "scores / plans / member" : locale === "zh-TW" ? "比分 / 方案 / 會員" : "比分 / 方案 / 会员"}
          </span>
        </span>
        {!open && unreadAssistantCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-6 min-w-6 items-center justify-center rounded-full border border-slate-950/60 bg-orange-400 px-1.5 text-[11px] font-bold text-slate-950">
            {unreadAssistantCount > 9 ? "9+" : unreadAssistantCount}
          </span>
        ) : null}
      </button>
    </div>
  );
}
