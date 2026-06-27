const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://www.net402.ai"
).replace(/\/$/, "");

function toAbsoluteUrl(value: string) {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `${SITE_URL}${value.startsWith("/") ? "" : "/"}${value}`;
}

// VideoObject JSON-LD for a published vlog content page. Rendered only when all
// Google-required fields are present (name, thumbnailUrl, uploadDate, and a video
// contentUrl) — otherwise nothing is emitted, so we never ship an invalid VideoObject
// that would surface as a Search Console error. duration is omitted (not stored).
export function FanletterContentVideoStructuredData({
  contentUrl,
  creatorName,
  description,
  name,
  pageUrl,
  thumbnailUrl,
  uploadDate,
}: {
  contentUrl?: string | null;
  creatorName?: string | null;
  description?: string | null;
  name?: string | null;
  pageUrl: string;
  thumbnailUrl?: string | null;
  uploadDate?: string | null;
}) {
  if (!name || !thumbnailUrl || !uploadDate || !contentUrl) {
    return null;
  }

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    contentUrl: toAbsoluteUrl(contentUrl),
    description: description?.trim() || name,
    name,
    thumbnailUrl: [toAbsoluteUrl(thumbnailUrl)],
    uploadDate,
    url: toAbsoluteUrl(pageUrl),
    ...(creatorName
      ? { creator: { "@type": "Person", name: creatorName } }
      : {}),
  };

  return (
    <script
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      type="application/ld+json"
    />
  );
}
