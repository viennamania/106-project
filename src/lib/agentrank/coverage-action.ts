export type AgentRankCoverageActionContext = {
  action: string;
  memberEmail?: string | null;
  starId?: string | null;
};

export function readFirstSearchParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeAgentRankCoverageAction(value?: string | string[]) {
  const normalized = readFirstSearchParam(value)?.trim();

  return normalized ? normalized.slice(0, 96) : null;
}
