import type { Dictionary } from "@/lib/i18n";

export type CreatorStudioDictionary = {
  common: Pick<Dictionary["common"], "connectWallet">;
  member: {
    errors: Pick<Dictionary["member"]["errors"], "missingEmail">;
  };
  meta: Pick<Dictionary["meta"], "description">;
  referralsPage: {
    actions: Pick<Dictionary["referralsPage"]["actions"], "completeSignup">;
  };
};

export function getCreatorStudioDictionary(
  dictionary: Dictionary,
): CreatorStudioDictionary {
  return {
    common: {
      connectWallet: dictionary.common.connectWallet,
    },
    member: {
      errors: {
        missingEmail: dictionary.member.errors.missingEmail,
      },
    },
    meta: {
      description: dictionary.meta.description,
    },
    referralsPage: {
      actions: {
        completeSignup: dictionary.referralsPage.actions.completeSignup,
      },
    },
  };
}
