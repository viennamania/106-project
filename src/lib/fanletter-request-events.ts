export const FANLETTER_FAN_REQUEST_SUBMITTED_EVENT =
  "fanletter:fan-request-submitted";

export type FanletterFanRequestSubmittedDetail = {
  creatorReferralCode: string | null;
  requestId: string;
  sourceContentId: string | null;
};
