import type { DisplayLocale, Locale } from "@/lib/i18n-config";
import { getSiteCopy } from "@/lib/ui-copy";

export function SiteFooter({ locale }: { locale: Locale | DisplayLocale }) {
  const { brandCopy, footerCopy } = getSiteCopy(locale);

  return (
    <footer className="border-t border-white/8 bg-[#040b12]">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 text-sm sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="display-title text-lg text-white">{brandCopy.footerTitle}</p>
          <p className="mt-3 max-w-sm text-slate-400">{footerCopy.description}</p>
        </div>
        <div>
          <p className="section-label">{footerCopy.coreModulesTitle}</p>
          <ul className="mt-3 space-y-2 text-slate-300">
            {footerCopy.coreModules.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="section-label">{footerCopy.commercialTitle}</p>
          <ul className="mt-3 space-y-2 text-slate-300">
            {footerCopy.commercialItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
