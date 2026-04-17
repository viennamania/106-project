import {
  getBrandingStudioState,
  saveBrandingStudioState,
} from "@/lib/landing-branding-service";
import { hasLocale, type Locale } from "@/lib/i18n";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const localeInput = url.searchParams.get("lang") ?? "ko";
  const locale = (hasLocale(localeInput) ? localeInput : "ko") as Locale;

  if (!email.trim()) {
    return jsonError("email query parameter is required.", 400);
  }

  try {
    const state = await getBrandingStudioState(email, locale);

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

  try {
    const state = await saveBrandingStudioState({
      branding: payload.branding ?? null,
      email: payload.email,
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
