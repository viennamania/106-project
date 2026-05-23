import { MongoClient } from "mongodb";

import { loadLocalEnv } from "./lib/load-local-env.mjs";

loadLocalEnv();

const SOURCE_REVEAL_THRESHOLD = 6;
const VOTE_REWARD_POINTS = 10;
const UNLOCK_REWARD_POINTS = 40;
const POINT_TIER_RULES = [
  { minPoints: 0, tier: "basic" },
  { minPoints: 1_000, tier: "silver" },
  { minPoints: 5_000, tier: "gold" },
  { minPoints: 20_000, tier: "vip" },
];

const writeChanges = ["1", "true", "yes"].includes(
  (process.env.FANLETTER_NEWS_REPORTER_INCENTIVE_BACKFILL_WRITE ?? "")
    .trim()
    .toLowerCase(),
);
const targetContentIds = parseCsv(
  process.env.FANLETTER_NEWS_REPORTER_INCENTIVE_BACKFILL_CONTENT_IDS,
);
const targetReportIds = parseCsv(
  process.env.FANLETTER_NEWS_REPORTER_INCENTIVE_BACKFILL_REPORT_IDS,
);
const uri = process.env.MONGODB_URI?.trim();
const dbName = process.env.MONGODB_DB_NAME?.trim();
const membersCollectionName =
  process.env.MONGODB_MEMBERS_COLLECTION?.trim() ?? "members";
const reportsCollectionName =
  process.env.MONGODB_FANLETTER_NEWS_REPORTS_COLLECTION?.trim() ??
  "fanletterNewsReports";
const socialActionsCollectionName =
  process.env.MONGODB_CONTENT_SOCIAL_ACTIONS_COLLECTION?.trim() ??
  "contentSocialActions";
const pointLedgerCollectionName =
  process.env.MONGODB_POINT_LEDGER_COLLECTION?.trim() ?? "pointLedger";
const pointBalancesCollectionName =
  process.env.MONGODB_POINT_BALANCES_COLLECTION?.trim() ?? "pointBalances";

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

if (!dbName) {
  throw new Error("MONGODB_DB_NAME is not configured.");
}

function parseCsv(value) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function normalizeEmail(value) {
  return value?.trim().toLowerCase() ?? "";
}

function normalizeReferralCode(value) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return normalized || null;
}

function getPointTier(points) {
  let tier = POINT_TIER_RULES[0]?.tier ?? "basic";

  for (const rule of POINT_TIER_RULES) {
    if (points >= rule.minPoints) {
      tier = rule.tier;
      continue;
    }

    break;
  }

  return tier;
}

function getActionSortTime(action) {
  const candidate = action.sourceRevealRequestedAt ?? action.createdAt;

  if (candidate instanceof Date) {
    return candidate.getTime();
  }

  const parsed = new Date(candidate ?? 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function getVoteSourceId({ reportId, viewerEmail }) {
  return `fanletter-news:source-reveal-vote:${reportId}:${viewerEmail}`;
}

function getUnlockSourceId({ reportId, viewerEmail }) {
  return `fanletter-news:source-reveal-unlock:${reportId}:${viewerEmail}`;
}

async function syncPointBalance({ balances, ledger, memberEmail, session }) {
  const aggregateRows = await ledger
    .aggregate(
      [
        {
          $match: {
            memberEmail,
          },
        },
        {
          $group: {
            _id: null,
            lifetimePoints: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gt: ["$delta", 0] },
                      { $ne: ["$type", "rollback"] },
                    ],
                  },
                  "$delta",
                  0,
                ],
              },
            },
            spendablePoints: { $sum: "$delta" },
          },
        },
      ],
      { session },
    )
    .toArray();
  const aggregate = aggregateRows[0];
  const now = new Date();
  const spendablePoints = aggregate?.spendablePoints ?? 0;

  await balances.updateOne(
    { memberEmail },
    {
      $set: {
        spendablePoints,
        tier: getPointTier(spendablePoints),
        lifetimePoints: aggregate?.lifetimePoints ?? 0,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
        loyaltyCardTokenId: null,
        memberEmail,
        reservedPoints: 0,
      },
    },
    { session, upsert: true },
  );
}

function buildLedgerUpdate({
  memberEmail,
  memo,
  points,
  sourceId,
  sourceMemberEmail,
}) {
  const now = new Date();

  return {
    $set: {
      delta: points,
      memberEmail,
      memo,
      rewardLevel: null,
      sourceId,
      sourceMemberEmail,
      sourceType: "bonus",
      type: "earn",
      updatedAt: now,
    },
    $setOnInsert: {
      createdAt: now,
    },
  };
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(dbName);
  const members = db.collection(membersCollectionName);
  const reports = db.collection(reportsCollectionName);
  const socialActions = db.collection(socialActionsCollectionName);
  const pointLedger = db.collection(pointLedgerCollectionName);
  const pointBalances = db.collection(pointBalancesCollectionName);
  const reportFilter = {
    status: "published",
    ...(targetContentIds.size > 0 ? { contentId: { $in: [...targetContentIds] } } : {}),
    ...(targetReportIds.size > 0 ? { reportId: { $in: [...targetReportIds] } } : {}),
  };
  const reportRows = await reports
    .find(reportFilter, {
      projection: {
        _id: 0,
        contentId: 1,
        reportId: 1,
        reporterReferralCode: 1,
        title: 1,
      },
    })
    .toArray();
  const reportsByContentId = new Map();

  for (const report of reportRows) {
    if (!report.contentId) {
      continue;
    }

    const current = reportsByContentId.get(report.contentId) ?? [];
    current.push(report);
    reportsByContentId.set(report.contentId, current);
  }

  const singleReportRows = [...reportsByContentId.values()]
    .filter((rows) => rows.length === 1)
    .map((rows) => rows[0]);
  const ambiguousContentIds = [...reportsByContentId.entries()]
    .filter(([, rows]) => rows.length !== 1)
    .map(([contentId]) => contentId);
  const reporterReferralCodes = [
    ...new Set(
      singleReportRows
        .map((report) => normalizeReferralCode(report.reporterReferralCode))
        .filter(Boolean),
    ),
  ];
  const reporterMembers = await members
    .find(
      {
        referralCode: { $in: reporterReferralCodes },
        status: "completed",
      },
      {
        projection: {
          _id: 0,
          email: 1,
          referralCode: 1,
        },
      },
    )
    .toArray();
  const reporterMemberByReferralCode = new Map(
    reporterMembers
      .map((member) => {
        const referralCode = normalizeReferralCode(member.referralCode);
        return referralCode ? [referralCode, member] : null;
      })
      .filter(Boolean),
  );
  const attributedActions = [];
  const voteRewardLedgerEntries = [];
  const unlockRewardLedgerEntries = [];
  const skipped = {
    ambiguousContent: ambiguousContentIds.length,
    missingReporterMember: 0,
    noEligibleActions: 0,
    reporterSelfVote: 0,
  };
  const samples = [];

  for (const report of singleReportRows) {
    const reporterReferralCode = normalizeReferralCode(report.reporterReferralCode);
    const reporterMember = reporterReferralCode
      ? reporterMemberByReferralCode.get(reporterReferralCode)
      : null;

    if (!reporterReferralCode || !reporterMember) {
      skipped.missingReporterMember += 1;
      continue;
    }

    const reporterEmail = normalizeEmail(reporterMember.email);
    const actions = await socialActions
      .find({
        contentId: report.contentId,
        sourceRevealRequested: true,
      })
      .toArray();
    const unlockActions = actions
      .sort((left, right) => {
        const timeDiff = getActionSortTime(left) - getActionSortTime(right);

        if (timeDiff !== 0) {
          return timeDiff;
        }

        return String(left.memberEmail).localeCompare(String(right.memberEmail));
      })
      .slice(0, SOURCE_REVEAL_THRESHOLD);
    const contentUnlocked = actions.length >= SOURCE_REVEAL_THRESHOLD;
    let eligibleCount = 0;

    for (const action of unlockActions) {
      const viewerEmail = normalizeEmail(action.memberEmail);

      if (!viewerEmail) {
        continue;
      }

      if (viewerEmail === reporterEmail) {
        skipped.reporterSelfVote += 1;
        continue;
      }

      eligibleCount += 1;

      if (!action.sourceRevealReportId) {
        attributedActions.push({
          action,
          report,
          reporterEmail,
          reporterReferralCode,
          viewerEmail,
        });
      }

      if (!action.sourceRevealReporterVoteRewardPoints) {
        const sourceId = getVoteSourceId({
          reportId: report.reportId,
          viewerEmail,
        });
        voteRewardLedgerEntries.push({
          action,
          ledgerEntryId: `${reporterEmail}:${sourceId}`,
          memo: `FanLetter News source reveal vote · ${report.reportId}`,
          points: VOTE_REWARD_POINTS,
          report,
          reporterEmail,
          sourceId,
          viewerEmail,
        });
      }

      if (contentUnlocked && !action.sourceRevealReporterUnlockRewardPoints) {
        const sourceId = getUnlockSourceId({
          reportId: report.reportId,
          viewerEmail,
        });
        unlockRewardLedgerEntries.push({
          action,
          ledgerEntryId: `${reporterEmail}:${sourceId}`,
          memo: `FanLetter News source reveal unlock · ${report.reportId}`,
          points: UNLOCK_REWARD_POINTS,
          report,
          reporterEmail,
          sourceId,
          viewerEmail,
        });
      }
    }

    if (eligibleCount === 0) {
      skipped.noEligibleActions += 1;
    }

    if (samples.length < 12 && eligibleCount > 0) {
      samples.push({
        contentId: report.contentId,
        eligibleCount,
        reportId: report.reportId,
        reporterEmail,
        reporterReferralCode,
        sourceRevealCount: actions.length,
        title: report.title,
      });
    }
  }

  const touchedReporterEmails = [
    ...new Set(
      [...voteRewardLedgerEntries, ...unlockRewardLedgerEntries].map(
        (entry) => entry.reporterEmail,
      ),
    ),
  ];
  const summary = {
    counts: {
      ambiguousContent: ambiguousContentIds.length,
      attributedActions: attributedActions.length,
      eligibleSingleReportContents: singleReportRows.length,
      reportsScanned: reportRows.length,
      touchedReporterEmails: touchedReporterEmails.length,
      unlockRewardLedgerEntries: unlockRewardLedgerEntries.length,
      voteRewardLedgerEntries: voteRewardLedgerEntries.length,
    },
    dryRun: !writeChanges,
    filters: {
      contentIds: [...targetContentIds],
      reportIds: [...targetReportIds],
    },
    samples,
    skipped,
  };

  if (!writeChanges) {
    console.log(JSON.stringify(summary, null, 2));
    console.log(
      "\nSet FANLETTER_NEWS_REPORTER_INCENTIVE_BACKFILL_WRITE=1 to apply this backfill.",
    );
    process.exit(0);
  }

  const session = client.startSession();

  try {
    await session.withTransaction(async () => {
      for (const item of attributedActions) {
        const requestedAt =
          item.action.sourceRevealRequestedAt ??
          item.action.createdAt ??
          new Date();

        await socialActions.updateOne(
          { _id: item.action._id },
          {
            $set: {
              sourceRevealReportId: item.report.reportId,
              sourceRevealReporterEmail: item.reporterEmail,
              sourceRevealReporterReferralCode: item.reporterReferralCode,
              sourceRevealRequestedAt: requestedAt,
            },
          },
          { session },
        );
      }

      for (const entry of voteRewardLedgerEntries) {
        await pointLedger.updateOne(
          { ledgerEntryId: entry.ledgerEntryId },
          {
            ...buildLedgerUpdate({
              memberEmail: entry.reporterEmail,
              memo: entry.memo,
              points: entry.points,
              sourceId: entry.sourceId,
              sourceMemberEmail: entry.viewerEmail,
            }),
            $setOnInsert: {
              createdAt:
                entry.action.sourceRevealRequestedAt ??
                entry.action.createdAt ??
                new Date(),
              ledgerEntryId: entry.ledgerEntryId,
            },
          },
          { session, upsert: true },
        );
        await socialActions.updateOne(
          { _id: entry.action._id },
          {
            $set: {
              sourceRevealReporterEmail: entry.reporterEmail,
              sourceRevealReporterVoteRewardedAt: new Date(),
              sourceRevealReporterVoteRewardPoints: entry.points,
            },
          },
          { session },
        );
      }

      for (const entry of unlockRewardLedgerEntries) {
        await pointLedger.updateOne(
          { ledgerEntryId: entry.ledgerEntryId },
          {
            ...buildLedgerUpdate({
              memberEmail: entry.reporterEmail,
              memo: entry.memo,
              points: entry.points,
              sourceId: entry.sourceId,
              sourceMemberEmail: entry.viewerEmail,
            }),
            $setOnInsert: {
              createdAt:
                entry.action.sourceRevealRequestedAt ??
                entry.action.createdAt ??
                new Date(),
              ledgerEntryId: entry.ledgerEntryId,
            },
          },
          { session, upsert: true },
        );
        await socialActions.updateOne(
          { _id: entry.action._id },
          {
            $set: {
              sourceRevealReporterEmail: entry.reporterEmail,
              sourceRevealReporterUnlockRewardedAt: new Date(),
              sourceRevealReporterUnlockRewardPoints: entry.points,
            },
          },
          { session },
        );
      }

      for (const reporterEmail of touchedReporterEmails) {
        await syncPointBalance({
          balances: pointBalances,
          ledger: pointLedger,
          memberEmail: reporterEmail,
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  console.log(
    JSON.stringify(
      {
        ...summary,
        dryRun: false,
      },
      null,
      2,
    ),
  );
} finally {
  await client.close();
}
