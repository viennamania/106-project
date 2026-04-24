import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LocaleSync } from "@/components/locale-sync";
import {
  defaultLocale,
  getDictionary,
  hasLocale,
  supportedLocales,
} from "@/lib/i18n";

export function generateStaticParams() {
  return supportedLocales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dictionary = getDictionary(hasLocale(lang) ? lang : defaultLocale);

  return {
    title: dictionary.meta.title,
    description: dictionary.meta.description,
  };
}

export default async function LocaleLayout({
  children,
  contentModal,
  params,
}: Readonly<{
  children: ReactNode;
  contentModal: ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  if (!hasLocale(lang)) {
    notFound();
  }

  return (
    <>
      <LocaleSync locale={lang} />
      {children}
      {contentModal}
    </>
  );
}
