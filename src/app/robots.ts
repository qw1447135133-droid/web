import { MetadataRoute } from "next";

const domain = process.env.NEXT_PUBLIC_SITE_DOMAIN ?? "localhost";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/account/"],
      },
    ],
    sitemap: `https://${domain}/sitemap.xml`,
  };
}
