export type FanletterPromoSponsor = {
  ctaLabel: string;
  description: string;
  displayUrl: string;
  href: string;
  name: string;
  slug: string;
};

const defaultSponsor: FanletterPromoSponsor = {
  ctaLabel: "Fanvue 둘러보기",
  description:
    "AI 크리에이터와 팬 커뮤니티 트렌드를 확인할 수 있는 글로벌 플랫폼입니다.",
  displayUrl: "fanvue.com",
  href: "https://fanvue.com/",
  name: "Fanvue",
  slug: "fanvue",
};

const sponsors = new Map<string, FanletterPromoSponsor>([
  [defaultSponsor.slug, defaultSponsor],
]);

export function normalizeFanletterPromoSponsorSlug(value: unknown) {
  const candidate = typeof value === "string" ? value.trim().toLowerCase() : "";

  if (!/^[a-z0-9-]{2,32}$/.test(candidate)) {
    return defaultSponsor.slug;
  }

  return candidate;
}

export function getFanletterPromoSponsor(value: unknown) {
  const slug = normalizeFanletterPromoSponsorSlug(value);

  return sponsors.get(slug) ?? defaultSponsor;
}

export function getDefaultFanletterPromoSponsor() {
  return defaultSponsor;
}
