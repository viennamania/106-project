import type { Dictionary } from "@/lib/i18n";

export type CreatorStudioDictionary = {
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
