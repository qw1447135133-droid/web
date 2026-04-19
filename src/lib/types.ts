export type Sport = "football" | "basketball" | "cricket" | "esports";

export type MatchStatus = "live" | "upcoming" | "finished";

export type UserRole = "visitor" | "member" | "operator" | "finance" | "admin";
export type NotificationCategory = "system" | "recharge" | "order" | "membership" | "support";

export type AnnouncementTone = "info" | "success" | "warning";
export type HomepageBannerTheme = "sunrise" | "field" | "midnight";
export type SiteAdPlacement =
  | "home-inline"
  | "member-inline"
  | "plans-inline"
  | "database-inline"
  | "match-detail-inline"
  | "live-footer"
  | "sidebar"
  | "hero"
  | "inline";
export type SiteAdTheme = "neutral" | "highlight" | "premium";

export type MembershipPlanId = "monthly" | "seasonal" | "annual";

export type OrderStatus = "pending" | "paid" | "failed" | "closed" | "refunded";

export interface League {
  id: string;
  slug: string;
  sport: Sport;
  name: string;
  region: string;
  season: string;
  featured: boolean;
}

export interface Team {
  id: string;
  leagueSlug: string;
  sport: Sport;
  name: string;
  shortName: string;
  ranking: number;
  form: string;
  homeRecord: string;
  awayRecord: string;
}

export interface OddsSnapshot {
  home: number | null;
  draw?: number | null;
  away: number | null;
  spread: string;
  total: string;
  movement: "up" | "flat" | "down";
}

export interface Match {
  id: string;
  sport: Sport;
  leagueSlug: string;
  leagueName?: string;
  kickoff: string;
  status: MatchStatus;
  clock?: string;
  venue: string;
  homeTeam: string;
  awayTeam: string;
  score: string;
  statLine: string;
  insight: string;
  odds: OddsSnapshot;
}

export interface StandingRow {
  rank: number;
  teamId?: string;
  team: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  form?: string;
  homeRecord?: string;
  awayRecord?: string;
}

export interface ScheduleRow {
  id?: string;
  date: string;
  fixture: string;
  result: string;
  note: string;
}

export interface HeadToHeadRow {
  season: string;
  fixture: string;
  tag: string;
}

export interface AuthorTeam {
  id: string;
  name: string;
  focus: string;
  streak: string;
  winRate: string;
  monthlyRoi: string;
  followers: string;
  badge: string;
}

export interface PredictionRecord {
  id: string;
  sport: Sport;
  matchId: string;
  market: string;
  pick: string;
  confidence: string;
  expectedEdge: string;
  explanation: string;
  factors: string[];
  result: "pending" | "won" | "lost";
}

export interface ArticlePlan {
  id: string;
  slug: string;
  sport: Sport;
  matchId?: string;
  title: string;
  league: string;
  leagueLabel?: string;
  kickoff: string;
  authorId: string;
  teaser: string;
  marketSummary: string;
  analysis: string[];
  price: number;
  isHot: boolean;
  performance: string;
  tags: string[];
  status?: string;
  publishedAt?: Date | string | null;
  updatedAt?: Date | string;
  // multilingual content
  titleZhCn?: string | null;
  titleZhTw?: string | null;
  titleEn?: string | null;
  titleTh?: string | null;
  titleVi?: string | null;
  contentZhCn?: string | null;
  contentZhTw?: string | null;
  contentEn?: string | null;
  contentTh?: string | null;
  contentVi?: string | null;
  fullAnalysisText?: string;
  seoDescription?: string | null;
  aiGenerated?: boolean;
  sourceUrl?: string | null;
}

export interface MembershipPlan {
  id: MembershipPlanId;
  name: string;
  description: string;
  durationDays: number;
  price: number;
  perks: string[];
  accent: string;
}

export interface MembershipOrder {
  id: string;
  planId: MembershipPlanId;
  amount: number;
  coinAmount?: number;
  provider?: "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu";
  providerOrderId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  paymentReference?: string;
  status: OrderStatus;
}

export interface ContentOrder {
  id: string;
  contentId: string;
  amount: number;
  coinAmount?: number;
  provider?: "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu";
  providerOrderId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  paymentReference?: string;
  status: OrderStatus;
}

export interface CoinPackage {
  id: string;
  key: string;
  title: string;
  description?: string;
  coinAmount: number;
  bonusAmount: number;
  price: number;
  validityDays?: number;
  badge?: string;
  status: "active" | "inactive";
  sortOrder: number;
}

export interface CoinRechargeOrder {
  id: string;
  orderNo: string;
  packageId: string;
  userId: string;
  coinAmount: number;
  bonusAmount: number;
  amount: number;
  provider?: "mock" | "manual" | "hosted" | "xendit" | "razorpay" | "payu";
  providerOrderId?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  failedAt?: string;
  failureReason?: string;
  closedAt?: string;
  refundedAt?: string;
  refundReason?: string;
  creditedAt?: string;
  paymentReference?: string;
  status: OrderStatus;
}

export interface UserNotification {
  id: string;
  category: NotificationCategory;
  type: string;
  level: "info" | "success" | "warning" | "error";
  title: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
  readAt?: string;
  createdAt: string;
}

export interface HomepageModule {
  id: string;
  key?: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  metric: string;
}

export interface HomepageFeaturedMatchSlot {
  id: string;
  key: string;
  matchRef: string;
  matchId?: string;
  status: string;
  sortOrder: number;
}

export interface HomepageBanner {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  ctaLabel: string;
  imageUrl: string;
  theme: HomepageBannerTheme;
}

export interface SiteAnnouncement {
  id: string;
  title: string;
  message: string;
  href?: string;
  ctaLabel?: string;
  tone: AnnouncementTone;
}

export interface SiteAd {
  id: string;
  placement: SiteAdPlacement;
  format?: "image" | "text" | "html-snippet";
  theme?: SiteAdTheme;
  title: string;
  description: string;
  ctaLabel?: string;
  href?: string;
  imageUrl?: string;
  htmlSnippet?: string;
}

export interface SessionUser {
  id?: string;
  displayName: string;
  email: string;
  role: UserRole;
  emailVerifiedAt?: string;
  pendingEmail?: string;
  preferredLocale?: string;
  countryCode?: string;
  contactMethod?: string;
  contactValue?: string;
  membershipPlanId?: MembershipPlanId;
  membershipExpiresAt?: string;
  coinBalance?: number;
  purchasedContentIds: string[];
  membershipOrders: MembershipOrder[];
  contentOrders: ContentOrder[];
}

export interface SessionEntitlements {
  isAuthenticated: boolean;
  activeMembership: boolean;
  canAccessMemberCenter: boolean;
  canAccessAdminConsole: boolean;
  canManageContent: boolean;
  canManageFinance: boolean;
  canManageAgents: boolean;
  canManageSystem: boolean;
  canViewReports: boolean;
}

export interface SessionContext {
  session: SessionUser;
  entitlements: SessionEntitlements;
}
