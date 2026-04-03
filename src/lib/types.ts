export type Sport = "football" | "basketball" | "cricket" | "esports";

export type MatchStatus = "live" | "upcoming" | "finished";

export type UserRole = "visitor" | "member" | "operator" | "admin";

export type AnnouncementTone = "info" | "success" | "warning";
export type HomepageBannerTheme = "sunrise" | "field" | "midnight";

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
  kickoff: string;
  authorId: string;
  teaser: string;
  marketSummary: string;
  analysis: string[];
  price: number;
  isHot: boolean;
  performance: string;
  tags: string[];
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
  provider?: "mock" | "manual" | "hosted";
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
  provider?: "mock" | "manual" | "hosted";
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

export interface SessionUser {
  displayName: string;
  email: string;
  role: UserRole;
  membershipPlanId?: MembershipPlanId;
  membershipExpiresAt?: string;
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
}

export interface SessionContext {
  session: SessionUser;
  entitlements: SessionEntitlements;
}
