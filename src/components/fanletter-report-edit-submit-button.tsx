"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";

export function FanletterReportEditSubmitButton({
  idleLabel,
  pendingLabel,
}: {
  idleLabel: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#111510] px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-wait disabled:opacity-70"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin text-[#44f26e]" />
      ) : (
        <Save className="size-4 text-[#44f26e]" />
      )}
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
