import {
  getBrandingStudioState,
  saveBrandingStudioState,
} from "@/lib/landing-branding-service";
import { hasLocale, type Locale } from "@/lib/i18n";
import { validateMemberWalletOwner } from "@/lib/member-owner";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const walletAddress = url.searchParams.get("walletAddress") ?? "";
  const localeInput = url.searchParams.get("lang") ?? "ko";
  const locale = (hasLocale(localeInput) ? localeInput : "ko") as Locale;

  if (!email.trim()) {
    return jsonError("email query parameter is required.", 400);
  }

  if (!walletAddress.trim()) {
    return jsonError("walletAddress query parameter is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email,
      walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const state = await getBrandingStudioState(
      authorization.normalizedEmail,
      locale,
    );

    if (!state) {
      return jsonError("Member not found.", 404);
    }

    if (state.member.status !== "completed" || !state.member.referralCode) {
      return jsonError("Branding Studio is only available to completed members.", 403);
    }

    return Response.json(state);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to load landing branding settings.",
      500,
    );
  }
}

export async function PUT(request: Request) {
  let payload:
    | {
        branding?: Record<string, unknown> | null;
        email?: string;
        locale?: string;
        walletAddress?: string;
      }
    | undefined;

  try {
    payload = (await request.json()) as typeof payload;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  if (!payload?.email?.trim()) {
    return jsonError("email is required.", 400);
  }

  if (!payload.walletAddress?.trim()) {
    return jsonError("walletAddress is required.", 400);
  }

  try {
    const authorization = await validateMemberWalletOwner({
      email: payload.email,
      walletAddress: payload.walletAddress,
    });

    if (authorization.error) {
      return authorization.error;
    }

    const state = await saveBrandingStudioState({
      branding: payload.branding ?? null,
      email: authorization.normalizedEmail,
      locale: payload.locale ?? "ko",
    });

    return Response.json(state);
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to save landing branding settings.",
      400,
    );
  }
}
