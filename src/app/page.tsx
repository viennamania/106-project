import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  localeCookieName,
  resolveLocale,
} from "@/lib/i18n";

export default async function Home() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const locale = resolveLocale({
    acceptLanguage: headerStore.get("accept-language"),
    requestedLocale: cookieStore.get(localeCookieName)?.value,
  });

  redirect(`/${locale}`);
}
