import { ContentDetailRoute } from "@/components/content-detail-route";
import { ContentModalFrame } from "@/components/content-modal-frame";
import type { ContentDetailRouteSearchParams } from "@/components/content-detail-route";
import { hasLocale } from "@/lib/i18n";

export default async function InterceptedContentDetailModalPage({
  params,
  searchParams,
}: {
  params: Promise<{ contentId: string; lang: string }>;
  searchParams: Promise<ContentDetailRouteSearchParams>;
}) {
  const { contentId, lang } = await params;
  const query = await searchParams;
  const closeLabel = hasLocale(lang) && lang === "ko" ? "닫기" : "Close";

  return (
    <ContentModalFrame closeLabel={closeLabel}>
      <ContentDetailRoute
        contentId={contentId}
        lang={lang}
        presentation="modal"
        searchParams={query}
      />
    </ContentModalFrame>
  );
}
