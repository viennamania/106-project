import "server-only";

import { cache } from "react";

import {
  buildReferralLandingUrl,
  isCustomLandingBrandingActive,
  normalizeLandingBrandingInput,
  resolveLandingBrandingDraft,
  toLandingPageBranding,
  type LandingBrandingInput,
  type LandingPageBranding,
  type LandingBrandingRecord,
} from "@/lib/landing-branding";
import { getMembersCollection } from "@/lib/mongodb";
import { normalizeEmail, normalizeReferralCode } from "@/lib/member";
import { defaultLocale, hasLocale, type Locale } from "@/lib/i18n";

type BrandingStudioMember = {
  email: string;
  locale: string;
  referralCode: string | null;
  status: "completed" | "pending_payment";
};

export type BrandingStudioState = {
  branding: LandingBrandingRecord;
  member: BrandingStudioMember;
  referralLink: string | null;
};

export type ReferralLandingExperience = {
  branding: LandingPageBranding | null;
  memberEmail: string | null;
  referralCode: string | null;
};

function resolveStudioLocale(locale: string) {
  return hasLocale(locale) ? locale : defaultLocale;
}

async function getMemberByEmail(email: string) {
  const collection = await getMembersCollection();
  return collection.findOne({ email: normalizeEmail(email) });
}

const getCompletedMemberByReferralCode = cache(async (referralCode: string) => {
  const collection = await getMembersCollection();
  return collection.findOne({
    referralCode,
    status: "completed",
  });
});

function createBrandingStudioMember(member: Awaited<ReturnType<typeof getMemberByEmail>>) {
  if (!member) {
    return null;
  }

  return {
    email: member.email,
    locale: member.locale,
    referralCode: member.referralCode ?? null,
    status: member.status,
  } satisfies BrandingStudioMember;
}

export async function getBrandingStudioState(
  email: string,
  locale: Locale,
): Promise<BrandingStudioState | null> {
  const member = await getMemberByEmail(email);

  if (!member) {
    return null;
  }

  const draft = resolveLandingBrandingDraft({
    email: member.email,
    locale,
    storedBranding: member.landingBranding ?? null,
  });

  return {
    branding: draft,
    member: createBrandingStudioMember(member)!,
    referralLink: member.referralCode
      ? buildReferralLandingUrl(locale, member.referralCode)
      : null,
  };
}

export async function saveBrandingStudioState({
  branding,
  email,
  locale,
}: {
  branding: Partial<LandingBrandingInput> | null | undefined;
  email: string;
  locale: string;
}): Promise<BrandingStudioState> {
  const normalizedEmail = normalizeEmail(email);
  const { data, error } = normalizeLandingBrandingInput(branding);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  if (!data) {
    throw new Error(error ?? "Invalid branding payload.");
  }

  const collection = await getMembersCollection();
  const member = await collection.findOne({ email: normalizedEmail });

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.status !== "completed" || !member.referralCode) {
    throw new Error("Branding Studio is only available to completed members.");
  }

  const updatedAt = new Date();

  await collection.updateOne(
    { email: normalizedEmail },
    {
      $set: {
        landingBranding: {
          ...data,
          updatedAt,
        },
        updatedAt,
      },
    },
  );

  const nextMember = await collection.findOne({ email: normalizedEmail });

  if (!nextMember) {
    throw new Error("Member not found.");
  }

  const resolvedLocale = resolveStudioLocale(locale);

  return {
    branding: resolveLandingBrandingDraft({
      email: nextMember.email,
      locale: resolvedLocale,
      storedBranding: nextMember.landingBranding ?? null,
    }),
    member: createBrandingStudioMember(nextMember)!,
    referralLink: nextMember.referralCode
      ? buildReferralLandingUrl(resolvedLocale, nextMember.referralCode)
      : null,
  };
}

export const getReferralLandingExperience = cache(
  async (
    locale: Locale,
    referralCode: string | null,
  ): Promise<ReferralLandingExperience> => {
    const normalizedCode = normalizeReferralCode(referralCode);

    if (!normalizedCode) {
      return {
        branding: null,
        memberEmail: null,
        referralCode: null,
      };
    }

    const member = await getCompletedMemberByReferralCode(normalizedCode);

    if (!member) {
      return {
        branding: null,
        memberEmail: null,
        referralCode: normalizedCode,
      };
    }

    const resolvedBranding = resolveLandingBrandingDraft({
      email: member.email,
      locale,
      storedBranding: member.landingBranding ?? null,
    });

    return {
      branding: isCustomLandingBrandingActive(resolvedBranding)
        ? toLandingPageBranding({
            branding: resolvedBranding,
            locale,
            referralCode: member.referralCode ?? normalizedCode,
          })
        : null,
      memberEmail: member.email,
      referralCode: member.referralCode ?? normalizedCode,
    };
  },
);
