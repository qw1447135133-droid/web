import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { getArticleCoinPrice } from "@/lib/coin-wallet";
import { formatDateTime } from "@/lib/format";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { searchSite } from "@/lib/search-data";
import type { Sport } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function readValue(value: string | string[] | undefined, fallback = "") {
  if (Array.isArray(value)) {
    return value[0] ?? fallback;
  }

  return value ?? fallback;
}

function getSportLabels(copy: ReturnType<typeof getSiteCopy>) {
  return {
    football: copy.databasePageCopy.football,
    basketball: copy.databasePageCopy.basketball,
    cricket: copy.databasePageCopy.cricket,
    esports: copy.databasePageCopy.esports,
  } satisfies Record<Sport, string>;
}

function MetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
      {label}: {value}
    </span>
  );
}

function SearchSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (!count) {
    return null;
  }

  return (
    <section className="glass-panel rounded-[1.8rem] p-6">
      <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-4">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-100">{count}</span>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">{children}</div>
    </section>
  );
}

function EmptyState({
  title,
  description,
  quickLinks,
}: {
  title: string;
  description: string;
  quickLinks: Array<{ href: string; label: string }>;
}) {
  return (
    <section className="glass-panel rounded-[1.8rem] border border-dashed border-white/12 p-8 text-center">
      <p className="text-xl font-semibold text-white">{title}</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const copy = getSiteCopy(displayLocale);
  const sportLabels = getSportLabels(copy);
  const resolved = await searchParams;
  const query = readValue(resolved.q).trim();
  const results = query ? await searchSite(query, locale) : undefined;
  const formatCoinAmount = (amount: number) => {
    const formatted = new Intl.NumberFormat(displayLocale).format(amount);

    if (displayLocale === "en") {
      return `${formatted} coins`;
    }

    if (displayLocale === "zh-TW") {
      return `${formatted} 球幣`;
    }

    if (displayLocale === "th") {
      return `${formatted} เหรียญ`;
    }

    if (displayLocale === "vi") {
      return `${formatted} coin`;
    }

    if (displayLocale === "hi") {
      return `${formatted} coins`;
    }

    return `${formatted} 球币`;
  };
  const quickLinks = ["/live/football", "/database", "/plans"].map((href) => ({
    href,
    label: copy.siteNavItems.find((item) => item.href === href)?.label ?? href,
  }));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6">
        <SectionHeading
          eyebrow={copy.searchCopy.pageEyebrow}
          title={copy.searchCopy.pageTitle}
          description={copy.searchCopy.pageDescription}
        />

        <form className="mt-6 rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-4" action="/search">
          <label htmlFor="search-page-query" className="sr-only">
            {copy.searchCopy.inputLabel}
          </label>
          <div className="flex flex-col gap-3 md:flex-row">
            <input
              id="search-page-query"
              name="q"
              type="search"
              defaultValue={query}
              placeholder={copy.searchCopy.headerPlaceholder}
              className="flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-2xl bg-orange-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              {copy.searchCopy.headerSubmit}
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-400">{copy.searchCopy.inputHint}</p>
        </form>

        {query && results ? (
          <p className="mt-4 text-sm text-slate-300">{copy.searchCopy.totalResults(results.total, query)}</p>
        ) : null}
      </section>

      {!query ? (
        <EmptyState
          title={copy.searchCopy.noQueryTitle}
          description={copy.searchCopy.noQueryDescription}
          quickLinks={quickLinks}
        />
      ) : results && results.total === 0 ? (
        <EmptyState
          title={copy.searchCopy.noResultsTitle}
          description={copy.searchCopy.noResultsDescription(query)}
          quickLinks={quickLinks}
        />
      ) : (
        <>
          <SearchSection title={copy.searchCopy.sections.matches} count={results?.matches.length ?? 0}>
            {results?.matches.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {sportLabels[item.sport]}
                  </span>
                  <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-100">
                    {copy.matchStatusLabels[item.status]}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill label={copy.searchCopy.labels.league} value={item.league} />
                  <MetaPill label={copy.searchCopy.labels.kickoff} value={formatDateTime(item.kickoff, displayLocale)} />
                </div>
                <div className="mt-5">
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/15"
                  >
                    {copy.searchCopy.actions.match}
                  </Link>
                </div>
              </article>
            ))}
          </SearchSection>

          <SearchSection title={copy.searchCopy.sections.leagues} count={results?.leagues.length ?? 0}>
            {results?.leagues.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {sportLabels[item.sport]}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill label={copy.searchCopy.labels.region} value={item.region} />
                  <MetaPill label={copy.searchCopy.labels.season} value={item.season} />
                </div>
                <div className="mt-5">
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/15"
                  >
                    {copy.searchCopy.actions.league}
                  </Link>
                </div>
              </article>
            ))}
          </SearchSection>

          <SearchSection title={copy.searchCopy.sections.plans} count={results?.plans.length ?? 0}>
            {results?.plans.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {sportLabels[item.sport]}
                  </span>
                  <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-100">
                    {formatCoinAmount(getArticleCoinPrice(item.price))}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill label={copy.searchCopy.labels.league} value={item.league} />
                  <MetaPill label={copy.searchCopy.labels.kickoff} value={formatDateTime(item.kickoff, displayLocale)} />
                </div>
                <div className="mt-5">
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/15"
                  >
                    {copy.searchCopy.actions.plan}
                  </Link>
                </div>
              </article>
            ))}
          </SearchSection>

          <SearchSection title={copy.searchCopy.sections.authors} count={results?.authors.length ?? 0}>
            {results?.authors.map((item) => (
              <article key={item.id} className="rounded-[1.4rem] border border-white/8 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">
                    {item.sport ? sportLabels[item.sport] : copy.searchCopy.sections.authors}
                  </span>
                  <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-100">
                    {item.badge}
                  </span>
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">{item.title}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill label={copy.searchCopy.labels.focus} value={item.focus} />
                  <MetaPill label={copy.searchCopy.labels.badge} value={item.badge} />
                </div>
                <div className="mt-5">
                  <Link
                    href={item.href}
                    className="inline-flex rounded-full border border-orange-300/25 bg-orange-400/10 px-4 py-2 text-sm text-orange-100 transition hover:border-orange-300/40 hover:bg-orange-400/15"
                  >
                    {copy.searchCopy.actions.author}
                  </Link>
                </div>
              </article>
            ))}
          </SearchSection>
        </>
      )}
    </div>
  );
}
