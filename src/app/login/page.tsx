import { getCurrentDisplayLocale } from "@/lib/i18n";
import { getSiteCopy } from "@/lib/ui-copy";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const displayLocale = await getCurrentDisplayLocale();
  const { authPageCopy, roleLabels } = getSiteCopy(displayLocale);
  const resolved = await searchParams;
  const next = pickValue(resolved.next);

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-5xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{authPageCopy.heroEyebrow}</p>
          <h1 className="display-title mt-3 text-5xl font-semibold text-white">{authPageCopy.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-slate-300">{authPageCopy.heroDescription}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <form action="/api/auth/login" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <input type="hidden" name="displayName" value={authPageCopy.adminPresetName} />
              <input type="hidden" name="email" value="ops@signalnine.demo" />
              <input type="hidden" name="role" value="admin" />
              <input type="hidden" name="returnTo" value={next || "/admin"} />
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{authPageCopy.adminEyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{authPageCopy.adminTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{authPageCopy.adminDescription}</p>
              <button
                type="submit"
                className="mt-6 rounded-full bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
              >
                {authPageCopy.adminAction}
              </button>
            </form>

            <form action="/api/auth/login" method="post" className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
              <input type="hidden" name="displayName" value={authPageCopy.memberPresetName} />
              <input type="hidden" name="email" value="member@signalnine.demo" />
              <input type="hidden" name="role" value="member" />
              <input type="hidden" name="returnTo" value={next || "/member"} />
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{authPageCopy.memberEyebrow}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{authPageCopy.memberTitle}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-400">{authPageCopy.memberDescription}</p>
              <button
                type="submit"
                className="mt-6 rounded-full bg-lime-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-lime-200"
              >
                {authPageCopy.memberAction}
              </button>
            </form>
          </div>
        </section>

        <section className="glass-panel rounded-[2rem] p-8">
          <p className="section-label">{authPageCopy.customEyebrow}</p>
          <h2 className="display-title mt-3 text-3xl font-semibold text-white">{authPageCopy.customTitle}</h2>
          <form action="/api/auth/login" method="post" className="mt-6 space-y-4">
            <input type="hidden" name="returnTo" value={next || "/member"} />
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{authPageCopy.displayName}</span>
              <input
                type="text"
                name="displayName"
                defaultValue={authPageCopy.customDefaultName}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{authPageCopy.email}</span>
              <input
                type="email"
                name="email"
                defaultValue="demo@signalnine.local"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              />
            </label>
            <label className="block space-y-2 text-sm">
              <span className="text-slate-400">{authPageCopy.role}</span>
              <select
                name="role"
                defaultValue="member"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none"
              >
                <option value="member">{roleLabels.member}</option>
                <option value="operator">{roleLabels.operator}</option>
                <option value="admin">{roleLabels.admin}</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-2xl bg-orange-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-orange-300"
            >
              {authPageCopy.submit}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
