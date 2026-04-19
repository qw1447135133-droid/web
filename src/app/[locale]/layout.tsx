import type { Metadata } from "next";
import type { DisplayLocale } from "@/lib/i18n-config";
import { displayLocales } from "@/lib/i18n-config";
import { notFound } from "next/navigation";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return displayLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "足球资讯";
  const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost";

  return {
    metadataBase: new URL(`https://${domain}`),
    title: { default: siteName, template: `%s | ${siteName}` },
    alternates: {
      languages: Object.fromEntries(
        displayLocales.map((l) => [l, `/${l}`])
      ),
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!displayLocales.includes(locale as DisplayLocale)) {
    notFound();
  }
  return <>{children}</>;
}
