import "server-only";

export type FanletterFounderClubLiveOperation =
  | "creator_launch"
  | "founder_join";

export type FanletterFounderClubRuntimeState = {
  blockedReasons: string[];
  liveEnabled: boolean;
  operation: FanletterFounderClubLiveOperation;
  paymentEnabled: boolean;
  paymentRequired: boolean;
  responseMode: "live" | "preview";
  testPaymentBypassEnabled: boolean;
};

function readBooleanFlag(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "yes" || value === "on";
}

export function getFanletterFounderClubRuntimeState(
  operation: FanletterFounderClubLiveOperation,
): FanletterFounderClubRuntimeState {
  const founderJoinLiveEnabled = readBooleanFlag(
    "FANLETTER_FOUNDER_CLUB_LIVE_JOIN_ENABLED",
  );
  const creatorLaunchLiveEnabled = readBooleanFlag(
    "FANLETTER_FOUNDER_CLUB_LIVE_CREATOR_LAUNCH_ENABLED",
  );
  const paymentEnabled = readBooleanFlag(
    "FANLETTER_FOUNDER_CLUB_CREATOR_LAUNCH_PAYMENT_ENABLED",
  );
  const testPaymentBypassEnabled =
    process.env.NODE_ENV !== "production" &&
    readBooleanFlag(
      "FANLETTER_FOUNDER_CLUB_CREATOR_LAUNCH_TEST_PAYMENT_BYPASS_ENABLED",
    );
  const liveEnabled =
    operation === "founder_join"
      ? founderJoinLiveEnabled
      : creatorLaunchLiveEnabled;
  const paymentRequired = operation === "creator_launch";
  const blockedReasons: string[] = [];

  if (!liveEnabled) {
    blockedReasons.push(`${operation}_live_flag_disabled`);
  }

  if (paymentRequired && !testPaymentBypassEnabled) {
    blockedReasons.push(
      paymentEnabled
        ? "creator_launch_payment_verification_not_connected"
        : "creator_launch_payment_not_implemented",
    );
  }

  return {
    blockedReasons,
    liveEnabled,
    operation,
    paymentEnabled,
    paymentRequired,
    responseMode: blockedReasons.length === 0 ? "live" : "preview",
    testPaymentBypassEnabled,
  };
}

export function getFanletterFounderClubApiMode(value: unknown) {
  return value === "live" ? "live" : "preview";
}
