import "server-only";

import { randomUUID } from "crypto";

import {
  CONTENT_FEED_PAGE_SIZE,
  CONTENT_NETWORK_LEVEL_LIMIT,
  serializeContentPost,
  serializeCreatorProfile,
  type ContentDetailResponse,
  type ContentFeedItemRecord,
  type ContentFeedResponse,
  type ContentPostCreateRequest,
  type ContentPostDocument,
  type ContentPostRecord,
  type ContentPostUpdateRequest,
  type CreatorProfileDocument,
  type CreatorProfileRecord,
  type CreatorProfileUpsertRequest,
  type CreatorStudioPostsResponse,
} from "@/lib/content";
import { getMemberRegistrationStatus } from "@/lib/member-service";
import {
  getContentPostsCollection,
  getCreatorProfilesCollection,
  getMembersCollection,
} from "@/lib/mongodb";
import {
  normalizeEmail,
  normalizeReferralCode,
  serializeMember,
  type MemberDocument,
} from "@/lib/member";

type NetworkAncestor = {
  level: number;
  member: MemberDocument;
  referralCode: string;
};

const PROFILE_DISPLAY_NAME_LIMIT = 40;
const PROFILE_INTRO_LIMIT = 220;
const CONTENT_TITLE_LIMIT = 88;
const CONTENT_SUMMARY_LIMIT = 180;
const CONTENT_BODY_LIMIT = 12_000;
const CONTENT_TAG_LIMIT = 6;
const CONTENT_TAG_LENGTH_LIMIT = 24;

function trimToLength(value: string | null | undefined, limit: number) {
  return value?.trim().slice(0, limit) ?? "";
}

function normalizeOptionalText(value: string | null | undefined, limit: number) {
  const trimmed = trimToLength(value, limit);
  return trimmed || null;
}

function normalizeTags(tags?: string[]) {
  return (tags ?? [])
    .map((tag) => trimToLength(tag, CONTENT_TAG_LENGTH_LIMIT).toLowerCase())
    .filter(Boolean)
    .slice(0, CONTENT_TAG_LIMIT);
}

function getSponsorReferralCode(member: MemberDocument) {
  return normalizeReferralCode(
    member.sponsorReferralCode ?? member.referredByCode ?? null,
  );
}

function inferDisplayName(member: MemberDocument) {
  const brandedName = trimToLength(member.landingBranding?.brandName, PROFILE_DISPLAY_NAME_LIMIT);

  if (brandedName) {
    return brandedName;
  }

  const emailLocal = member.email.split("@")[0]?.trim();

  if (emailLocal) {
    return emailLocal.slice(0, PROFILE_DISPLAY_NAME_LIMIT);
  }

  return member.referralCode ?? "Creator";
}

function inferIntro(member: MemberDocument) {
  return trimToLength(member.landingBranding?.description, PROFILE_INTRO_LIMIT);
}

function createDefaultCreatorProfile(member: MemberDocument): CreatorProfileRecord {
  const now = member.updatedAt.toISOString();

  return {
    avatarImageUrl: member.landingBranding?.heroImageUrl ?? null,
    displayName: inferDisplayName(member),
    heroImageUrl: member.landingBranding?.heroImageUrl ?? null,
    intro: inferIntro(member),
    payoutWalletAddress: member.lastWalletAddress ?? null,
    referralCode: member.referralCode ?? "",
    status: "active",
    updatedAt: now,
  };
}

async function getCompletedMemberOrThrow(email: string) {
  const member = await getMemberRegistrationStatus(email);

  if (!member) {
    throw new Error("Member not found.");
  }

  if (member.status !== "completed") {
    throw new Error("Completed signup is required.");
  }

  return member;
}

async function resolveNetworkAncestors(member: MemberDocument) {
  const membersCollection = await getMembersCollection();
  const visited = new Set<string>();
  const ancestors: NetworkAncestor[] = [];
  let currentSponsorCode = getSponsorReferralCode(member);

  while (
    currentSponsorCode &&
    ancestors.length < CONTENT_NETWORK_LEVEL_LIMIT &&
    !visited.has(currentSponsorCode)
  ) {
    visited.add(currentSponsorCode);

    const ancestor = await membersCollection.findOne({
      referralCode: currentSponsorCode,
      status: "completed",
    });

    if (!ancestor) {
      break;
    }

    ancestors.push({
      level: ancestors.length + 1,
      member: ancestor,
      referralCode: currentSponsorCode,
    });

    currentSponsorCode = getSponsorReferralCode(ancestor);
  }

  return ancestors;
}

async function readStoredCreatorProfile(email: string) {
  const collection = await getCreatorProfilesCollection();
  return collection.findOne({ email: normalizeEmail(email) });
}

export async function getCreatorProfileForMember(
  email: string,
): Promise<CreatorProfileRecord> {
  const member = await getCompletedMemberOrThrow(email);
  const stored = await readStoredCreatorProfile(member.email);

  if (!stored) {
    return createDefaultCreatorProfile(member);
  }

  return serializeCreatorProfile(stored);
}

export async function upsertCreatorProfileForMember(
  input: CreatorProfileUpsertRequest,
): Promise<CreatorProfileRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  const displayName = trimToLength(input.displayName, PROFILE_DISPLAY_NAME_LIMIT);
  const intro = trimToLength(input.intro, PROFILE_INTRO_LIMIT);

  if (!displayName) {
    throw new Error("displayName is required.");
  }

  const collection = await getCreatorProfilesCollection();
  const now = new Date();

  const nextProfile: CreatorProfileDocument = {
    avatarImageUrl: normalizeOptionalText(input.avatarImageUrl, 500),
    createdAt: now,
    displayName,
    email: member.email,
    heroImageUrl: normalizeOptionalText(input.heroImageUrl, 500),
    intro,
    payoutWalletAddress: normalizeOptionalText(input.payoutWalletAddress, 120),
    referralCode: member.referralCode,
    status: "active",
    updatedAt: now,
  };

  const existing = await collection.findOne({ email: member.email });

  await collection.updateOne(
    { email: member.email },
    {
      $set: {
        ...nextProfile,
        createdAt: existing?.createdAt ?? now,
      },
    },
    { upsert: true },
  );

  const stored = await collection.findOne({ email: member.email });

  if (!stored) {
    throw new Error("Failed to save creator profile.");
  }

  return serializeCreatorProfile(stored);
}

function buildFeedItem({
  authorProfile,
  content,
  networkLevel,
}: {
  authorProfile: CreatorProfileRecord | null;
  content: ContentPostDocument;
  networkLevel: number | null;
}): ContentFeedItemRecord {
  return {
    ...serializeContentPost(content),
    authorProfile,
    canAccess: true,
    networkLevel,
    previewAssets: [],
  };
}

export async function getNetworkFeedForMember(
  email: string,
): Promise<ContentFeedResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const ancestors = await resolveNetworkAncestors(member);
  const levelByReferralCode = new Map<string, number>();

  for (const ancestor of ancestors) {
    levelByReferralCode.set(ancestor.referralCode, ancestor.level);
  }

  if (ancestors.length === 0) {
    return {
      items: [],
      member: serializeMember(member),
      nextCursor: null,
    };
  }

  const postsCollection = await getContentPostsCollection();
  const creatorProfilesCollection = await getCreatorProfilesCollection();
  const referralCodes = ancestors.map((ancestor) => ancestor.referralCode);
  const posts = await postsCollection
    .find({
      authorReferralCode: { $in: referralCodes },
      priceType: "free",
      status: "published",
    })
    .sort({
      publishedAt: -1,
      createdAt: -1,
    })
    .limit(CONTENT_FEED_PAGE_SIZE)
    .toArray();

  const authorEmails = [...new Set(posts.map((post) => post.authorEmail))];
  const storedProfiles = authorEmails.length
    ? await creatorProfilesCollection.find({
        email: { $in: authorEmails },
      }).toArray()
    : [];
  const storedProfileByEmail = new Map(
    storedProfiles.map((profile) => [profile.email, profile]),
  );
  const ancestorByEmail = new Map(
    ancestors.map((ancestor) => [ancestor.member.email, ancestor.member]),
  );

  const items = posts
    .map((post) => {
      const storedProfile = storedProfileByEmail.get(post.authorEmail);
      const authorProfile = storedProfile
        ? serializeCreatorProfile(storedProfile)
        : ancestorByEmail.has(post.authorEmail)
          ? createDefaultCreatorProfile(ancestorByEmail.get(post.authorEmail)!)
          : null;

      return buildFeedItem({
        authorProfile,
        content: post,
        networkLevel: levelByReferralCode.get(post.authorReferralCode) ?? null,
      });
    })
    .sort((left, right) => {
      const leftLevel = left.networkLevel ?? CONTENT_NETWORK_LEVEL_LIMIT + 1;
      const rightLevel = right.networkLevel ?? CONTENT_NETWORK_LEVEL_LIMIT + 1;

      if (leftLevel !== rightLevel) {
        return leftLevel - rightLevel;
      }

      return (
        new Date(right.publishedAt ?? right.createdAt).getTime() -
        new Date(left.publishedAt ?? left.createdAt).getTime()
      );
    });

  return {
    items,
    member: serializeMember(member),
    nextCursor: null,
  };
}

export async function getCreatorStudioPostsForMember(
  email: string,
): Promise<CreatorStudioPostsResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const postsCollection = await getContentPostsCollection();
  const posts = await postsCollection
    .find({ authorEmail: member.email })
    .sort({ updatedAt: -1, createdAt: -1 })
    .toArray();

  return {
    member: serializeMember(member),
    posts: posts.map((post) => serializeContentPost(post)),
    profile: await getCreatorProfileForMember(member.email),
  };
}

export async function createContentPostForMember(
  input: ContentPostCreateRequest,
): Promise<ContentPostRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);

  if (!member.referralCode) {
    throw new Error("Completed member is missing referral code.");
  }

  if (input.priceType !== "free") {
    throw new Error("Only free content is supported in this release.");
  }

  const title = trimToLength(input.title, CONTENT_TITLE_LIMIT);
  const summary = trimToLength(input.summary, CONTENT_SUMMARY_LIMIT);
  const body = trimToLength(input.body, CONTENT_BODY_LIMIT);

  if (!title) {
    throw new Error("title is required.");
  }

  if (!summary) {
    throw new Error("summary is required.");
  }

  if (!body) {
    throw new Error("body is required.");
  }

  const status = input.status === "published" ? "published" : "draft";
  const now = new Date();
  const post: ContentPostDocument = {
    authorEmail: member.email,
    authorReferralCode: member.referralCode,
    body,
    contentId: randomUUID(),
    coverImageUrl: normalizeOptionalText(input.coverImageUrl, 500),
    createdAt: now,
    previewAssetIds: (input.previewAssetIds ?? []).slice(0, 4),
    previewText: normalizeOptionalText(input.previewText, CONTENT_SUMMARY_LIMIT),
    priceType: "free",
    priceUsdt: null,
    publishedAt: status === "published" ? now : null,
    status,
    summary,
    tags: normalizeTags(input.tags),
    title,
    updatedAt: now,
  };

  const postsCollection = await getContentPostsCollection();
  await postsCollection.insertOne(post);

  return serializeContentPost(post);
}

export async function updateContentPostForMember(
  input: ContentPostUpdateRequest,
): Promise<ContentPostRecord> {
  const normalizedEmail = normalizeEmail(input.email);

  if (!normalizedEmail) {
    throw new Error("email is required.");
  }

  const member = await getCompletedMemberOrThrow(normalizedEmail);
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({ contentId: input.contentId });

  if (!post) {
    throw new Error("Content not found.");
  }

  if (post.authorEmail !== member.email) {
    throw new Error("Only the author can update this content.");
  }

  if (input.priceType && input.priceType !== "free") {
    throw new Error("Only free content is supported in this release.");
  }

  const nextStatus =
    input.status && ["draft", "published", "archived"].includes(input.status)
      ? input.status
      : post.status;
  const now = new Date();
  const nextPublishedAt =
    nextStatus === "published" ? post.publishedAt ?? now : post.publishedAt ?? null;

  await postsCollection.updateOne(
    { contentId: post.contentId },
    {
      $set: {
        body:
          input.body !== undefined
            ? trimToLength(input.body, CONTENT_BODY_LIMIT)
            : post.body,
        coverImageUrl:
          input.coverImageUrl !== undefined
            ? normalizeOptionalText(input.coverImageUrl, 500)
            : post.coverImageUrl ?? null,
        previewAssetIds:
          input.previewAssetIds !== undefined
            ? input.previewAssetIds.slice(0, 4)
            : post.previewAssetIds,
        previewText:
          input.previewText !== undefined
            ? normalizeOptionalText(input.previewText, CONTENT_SUMMARY_LIMIT)
            : post.previewText ?? null,
        publishedAt: nextPublishedAt,
        status: nextStatus,
        summary:
          input.summary !== undefined
            ? trimToLength(input.summary, CONTENT_SUMMARY_LIMIT)
            : post.summary,
        tags: input.tags !== undefined ? normalizeTags(input.tags) : post.tags,
        title:
          input.title !== undefined
            ? trimToLength(input.title, CONTENT_TITLE_LIMIT)
            : post.title,
        updatedAt: now,
      },
    },
  );

  const nextPost = await postsCollection.findOne({ contentId: post.contentId });

  if (!nextPost) {
    throw new Error("Content not found.");
  }

  return serializeContentPost(nextPost);
}

export async function getContentDetailForMember(
  contentId: string,
  email: string,
): Promise<ContentDetailResponse> {
  const member = await getCompletedMemberOrThrow(email);
  const postsCollection = await getContentPostsCollection();
  const post = await postsCollection.findOne({ contentId });

  if (!post) {
    throw new Error("Content not found.");
  }

  const isAuthor = post.authorEmail === member.email;

  if (!isAuthor) {
    if (post.status !== "published") {
      throw new Error("Content not found.");
    }

    if (post.priceType !== "free") {
      throw new Error("This content requires a paid unlock.");
    }

    const ancestors = await resolveNetworkAncestors(member);
    const visibleReferralCodes = new Set(
      ancestors.map((ancestor) => ancestor.referralCode),
    );

    if (!visibleReferralCodes.has(post.authorReferralCode)) {
      throw new Error("Content is not available in your network.");
    }
  }

  const storedProfile = await readStoredCreatorProfile(post.authorEmail);
  const authorMember = isAuthor
    ? member
    : await (async () => {
        const membersCollection = await getMembersCollection();
        return membersCollection.findOne({ email: post.authorEmail });
      })();
  const authorProfile = storedProfile
    ? serializeCreatorProfile(storedProfile)
    : authorMember
      ? createDefaultCreatorProfile(authorMember)
      : null;

  return {
    content: {
      ...serializeContentPost(post),
      assets: [],
      authorProfile,
      body: post.body,
      canAccess: true,
      entitlementSource: "free",
    },
    member: serializeMember(member),
  };
}
