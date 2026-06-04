"use client";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Mail,
  MessageSquareText,
  Send,
  UserRound,
} from "lucide-react";
import { type FormEvent, useState } from "react";

type InquiryOption = {
  label: string;
  value: string;
};

type InquiryErrorMessages = {
  blocked: string;
  duplicate: string;
  fallback: string;
  invalidEmail: string;
  messageRequired: string;
  nameRequired: string;
  rateLimited: string;
};

export type FanletterNewsPlatformInquiryFormCopy = {
  asideItems: string[];
  asideTitle: string;
  body: string;
  emailLabel: string;
  emailPlaceholder: string;
  errorMessages: InquiryErrorMessages;
  eyebrow: string;
  messageLabel: string;
  messagePlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  organizationLabel: string;
  organizationPlaceholder: string;
  privacyCta: string;
  privacyNote: string;
  responseHint: string;
  submit: string;
  submitting: string;
  successBody: string;
  successTitle: string;
  title: string;
  typeLabel: string;
  typeOptions: InquiryOption[];
};

type FormState = {
  email: string;
  inquiryType: string;
  message: string;
  name: string;
  organization: string;
  website: string;
};

const initialFormState: FormState = {
  email: "",
  inquiryType: "investment",
  message: "",
  name: "",
  organization: "",
  website: "",
};

function getInputClassName() {
  return "mt-1.5 w-full rounded-lg border border-black/10 bg-white px-3 py-3 text-sm font-bold text-[#111510] outline-none transition placeholder:text-black/32 focus:border-[#19b84b] focus:ring-4 focus:ring-[#44f26e]/20";
}

function getLocalizedErrorMessage(
  rawMessage: string | null | undefined,
  messages: InquiryErrorMessages,
) {
  switch (rawMessage) {
    case "Inquiry name is required.":
      return messages.nameRequired;
    case "Valid inquiry email is required.":
      return messages.invalidEmail;
    case "Inquiry message is required.":
      return messages.messageRequired;
    case "Inquiry contains blocked content.":
      return messages.blocked;
    case "Duplicate inquiry.":
      return messages.duplicate;
    case "Too many inquiries. Please try again later.":
      return messages.rateLimited;
    default:
      return messages.fallback;
  }
}

export function FanletterNewsPlatformInquiryForm({
  copy,
  locale,
  referralCode,
}: {
  copy: FanletterNewsPlatformInquiryFormCopy;
  locale: string;
  referralCode: string | null;
}) {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field: keyof FormState, value: string) => {
    setErrorMessage(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const sourceUrl =
        typeof window === "undefined" ? null : window.location.href;
      const sourcePath =
        typeof window === "undefined"
          ? null
          : `${window.location.pathname}${window.location.search}`;
      const response = await fetch("/api/fanletter/news-platform/inquiries", {
        body: JSON.stringify({
          ...form,
          locale,
          referralCode,
          sourcePath,
          sourceUrl,
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        throw new Error(
          getLocalizedErrorMessage(payload?.error, copy.errorMessages),
        );
      }

      setSubmitted(true);
      setForm(initialFormState);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.errorMessages.fallback,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="border-b border-black/10 bg-[#f8faf4]"
      id="platform-inquiry"
    >
      <div className="mx-auto grid max-w-[92rem] gap-4 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:items-start lg:px-8">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-[#16702e]">
            <Mail className="size-4" />
            {copy.eyebrow}
          </p>
          <h2 className="mt-3 max-w-2xl text-3xl font-black leading-tight tracking-normal text-[#111510] [word-break:keep-all] sm:text-5xl">
            {copy.title}
          </h2>
          <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-black/58 sm:text-base sm:leading-7">
            {copy.body}
          </p>
          <div className="mt-6 rounded-lg border border-black/10 bg-[#071108] p-4 text-white sm:p-5">
            <p className="text-sm font-black text-[#7cff98]">
              {copy.asideTitle}
            </p>
            <div className="mt-4 grid gap-3">
              {copy.asideItems.map((item) => (
                <p
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 text-sm font-bold leading-6 text-white/74"
                  key={item}
                >
                  <CheckCircle2 className="mt-0.5 size-4 text-[#44f26e]" />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <form
          className="rounded-lg border border-black/10 bg-white p-4 shadow-[0_24px_70px_rgba(17,21,16,0.08)] sm:p-5"
          data-testid="platform-inquiry-form"
          onSubmit={handleSubmit}
        >
          <input
            autoComplete="off"
            className="hidden"
            name="website"
            onChange={(event) => updateField("website", event.target.value)}
            tabIndex={-1}
            value={form.website}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-black text-[#111510]">
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-4 text-[#16702e]" />
                {copy.nameLabel}
              </span>
              <input
                autoComplete="name"
                className={getInputClassName()}
                name="name"
                onChange={(event) => updateField("name", event.target.value)}
                placeholder={copy.namePlaceholder}
                required
                value={form.name}
              />
            </label>
            <label className="min-w-0 text-sm font-black text-[#111510]">
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="size-4 text-[#16702e]" />
                {copy.organizationLabel}
              </span>
              <input
                autoComplete="organization"
                className={getInputClassName()}
                name="organization"
                onChange={(event) =>
                  updateField("organization", event.target.value)
                }
                placeholder={copy.organizationPlaceholder}
                value={form.organization}
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-black text-[#111510]">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4 text-[#16702e]" />
                {copy.emailLabel}
              </span>
              <input
                autoComplete="email"
                className={getInputClassName()}
                inputMode="email"
                name="email"
                onChange={(event) => updateField("email", event.target.value)}
                placeholder={copy.emailPlaceholder}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label className="min-w-0 text-sm font-black text-[#111510]">
              <span className="inline-flex items-center gap-1.5">
                <MessageSquareText className="size-4 text-[#16702e]" />
                {copy.typeLabel}
              </span>
              <select
                className={getInputClassName()}
                name="inquiryType"
                onChange={(event) =>
                  updateField("inquiryType", event.target.value)
                }
                value={form.inquiryType}
              >
                {copy.typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block text-sm font-black text-[#111510]">
            <span className="inline-flex items-center gap-1.5">
              <MessageSquareText className="size-4 text-[#16702e]" />
              {copy.messageLabel}
            </span>
            <textarea
              className={`${getInputClassName()} min-h-36 resize-y leading-6`}
              maxLength={1200}
              name="message"
              onChange={(event) => updateField("message", event.target.value)}
              placeholder={copy.messagePlaceholder}
              required
              value={form.message}
            />
          </label>

          {errorMessage ? (
            <div
              className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-red-500/20 bg-red-50 px-3 py-3 text-sm font-bold leading-5 text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-4" />
              <p>{errorMessage}</p>
            </div>
          ) : null}

          {submitted ? (
            <div
              className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-2 rounded-lg border border-[#19b84b]/24 bg-[#ecfff0] px-3 py-3 text-sm font-bold leading-5 text-[#0f6b29]"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 size-4" />
              <div>
                <p className="font-black">{copy.successTitle}</p>
                <p className="mt-1 font-semibold text-[#0f6b29]/78">
                  {copy.successBody}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <p className="text-xs font-semibold leading-5 text-black/48">
              {copy.privacyNote}{" "}
              <a
                className="font-black text-[#16702e] underline decoration-[#44f26e]/50 underline-offset-2"
                href={`/${locale}/disclaimer`}
              >
                {copy.privacyCta}
              </a>
            </p>
            <button
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#071108] px-5 py-3 text-sm font-black text-white transition hover:bg-[#19251a] disabled:cursor-not-allowed disabled:opacity-58"
              disabled={submitting}
              type="submit"
            >
              {submitting ? copy.submitting : copy.submit}
              <Send className="size-4 text-[#44f26e]" />
            </button>
          </div>
          <p className="mt-3 text-xs font-bold leading-5 text-black/44">
            {copy.responseHint}
          </p>
        </form>
      </div>
    </section>
  );
}
