import type { FanletterFounderUniverseRole } from "@/lib/fanletter-founder-universe";
import type { AIStarStatus } from "@/mock/fanletterV2";

export type FanletterFounderUniverseExplorerStar = {
  accentColor: string;
  accentSecondary: string;
  displayName: string;
  founderCount: number;
  growthPercent: number;
  id: string;
  initials: string;
  name: string;
  openSlots: number;
  portraitImageUrl: string | null;
  starScore: number;
  status: AIStarStatus;
  universeName: string;
};

export type FanletterFounderUniverseExplorerNode = {
  childNodeIds: string[];
  depth: number;
  directChildrenCount: number;
  initials: string;
  isCreator: boolean;
  joinedAt: string | null;
  label: string;
  memberReferralCode: string | null;
  nodeId: string;
  parentNodeId: string | null;
  role: FanletterFounderUniverseRole;
  searchText: string;
  source: string | null;
  starReferralCode: string | null;
};

export type FanletterFounderUniverseExplorerEdge = {
  sourceNodeId: string;
  targetNodeId: string;
};

export type FanletterFounderUniverseExplorerTier = {
  capacity: number;
  cpPoolReward: number;
  depth: number;
  memberCount: number;
  openSlots: number;
  role: FanletterFounderUniverseRole;
};

export type FanletterFounderUniverseExplorerSpawnedStar = {
  createdAt: string | null;
  creatorDepth: number | null;
  creatorLabel: string | null;
  creatorNodeId: string | null;
  creatorRole: FanletterFounderUniverseRole | null;
  directSpawnedStars: number;
  growthPercent: number;
  id: string;
  name: string;
  ownerLabel: string | null;
  portraitImageUrl: string | null;
  starScore: number;
  status: AIStarStatus;
};

export type FanletterFounderUniverseExplorerData = {
  edges: FanletterFounderUniverseExplorerEdge[];
  generatedAt: string;
  nodes: FanletterFounderUniverseExplorerNode[];
  spawnedStars: FanletterFounderUniverseExplorerSpawnedStar[];
  star: FanletterFounderUniverseExplorerStar;
  tiers: FanletterFounderUniverseExplorerTier[];
  totals: {
    activeReferralCodes: number;
    edgeCount: number;
    maxDepth: number;
    rootResolved: boolean;
    spawnedStars: number;
    totalCapacity: number;
    totalMembers: number;
  };
};
