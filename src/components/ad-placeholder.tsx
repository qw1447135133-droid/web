import type { DisplayLocale } from "@/lib/i18n-config";

const labels: Record<DisplayLocale, { title: string; subtitle: string }> = {
  "zh-CN": { title: "广告位招租", subtitle: "联系我们投放广告" },
  "zh-TW": { title: "廣告位招租", subtitle: "聯繫我們投放廣告" },
  en: { title: "Ad Space Available", subtitle: "Contact us to advertise" },
  th: { title: "พื้นที่โฆษณา", subtitle: "ติดต่อเราเพื่อลงโฆษณา" },
  vi: { title: "Vị trí quảng cáo", subtitle: "Liên hệ để đặt quảng cáo" },
  hi: { title: "Ad Space Available", subtitle: "Contact us to advertise" },
};

export function AdPlaceholder({ locale }: { locale: DisplayLocale }) {
  const copy = labels[locale] ?? labels["zh-CN"];
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/[0.02] p-6 text-center">
      <p className="text-sm font-medium text-slate-300">{copy.title}</p>
      <p className="mt-1 text-xs text-slate-500">{copy.subtitle}</p>
    </div>
  );
}
