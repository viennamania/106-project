export type ReferralLevelTheme = {
  badgeClassName: string;
  compactCardClassName: string;
  compactValueClassName: string;
  dotClassName: string;
  eyebrowClassName: string;
  progressBarClassName: string;
  progressTrackClassName: string;
  surfaceClassName: string;
};

export function getReferralLevelTheme(level: number): ReferralLevelTheme {
  if (level === 1) {
    return {
      badgeClassName: "border-emerald-200 bg-emerald-50 text-emerald-900",
      compactCardClassName:
        "border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.98)_0%,rgba(209,250,229,0.88)_100%)] shadow-[0_16px_34px_rgba(16,185,129,0.10)]",
      compactValueClassName: "text-emerald-950",
      dotClassName: "bg-emerald-500",
      eyebrowClassName: "text-emerald-800",
      progressBarClassName: "from-emerald-500 via-emerald-400 to-lime-400",
      progressTrackClassName: "bg-emerald-100/80",
      surfaceClassName:
        "border-emerald-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(236,253,245,0.92)_100%)] shadow-[0_16px_40px_rgba(16,185,129,0.08)]",
    };
  }

  if (level === 2) {
    return {
      badgeClassName: "border-sky-200 bg-sky-50 text-sky-900",
      compactCardClassName:
        "border-sky-200 bg-[linear-gradient(180deg,rgba(240,249,255,0.98)_0%,rgba(224,242,254,0.88)_100%)] shadow-[0_16px_34px_rgba(14,165,233,0.10)]",
      compactValueClassName: "text-sky-950",
      dotClassName: "bg-sky-500",
      eyebrowClassName: "text-sky-800",
      progressBarClassName: "from-sky-500 via-cyan-400 to-blue-400",
      progressTrackClassName: "bg-sky-100/85",
      surfaceClassName:
        "border-sky-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(240,249,255,0.92)_100%)] shadow-[0_16px_40px_rgba(14,165,233,0.08)]",
    };
  }

  if (level === 3) {
    return {
      badgeClassName: "border-violet-200 bg-violet-50 text-violet-900",
      compactCardClassName:
        "border-violet-200 bg-[linear-gradient(180deg,rgba(245,243,255,0.98)_0%,rgba(237,233,254,0.88)_100%)] shadow-[0_16px_34px_rgba(139,92,246,0.10)]",
      compactValueClassName: "text-violet-950",
      dotClassName: "bg-violet-500",
      eyebrowClassName: "text-violet-800",
      progressBarClassName: "from-violet-500 via-fuchsia-400 to-pink-400",
      progressTrackClassName: "bg-violet-100/85",
      surfaceClassName:
        "border-violet-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(245,243,255,0.92)_100%)] shadow-[0_16px_40px_rgba(139,92,246,0.08)]",
    };
  }

  if (level === 4) {
    return {
      badgeClassName: "border-amber-200 bg-amber-50 text-amber-900",
      compactCardClassName:
        "border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98)_0%,rgba(254,243,199,0.88)_100%)] shadow-[0_16px_34px_rgba(245,158,11,0.10)]",
      compactValueClassName: "text-amber-950",
      dotClassName: "bg-amber-500",
      eyebrowClassName: "text-amber-800",
      progressBarClassName: "from-amber-500 via-orange-400 to-yellow-300",
      progressTrackClassName: "bg-amber-100/85",
      surfaceClassName:
        "border-amber-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,251,235,0.94)_100%)] shadow-[0_16px_40px_rgba(245,158,11,0.08)]",
    };
  }

  if (level === 5) {
    return {
      badgeClassName: "border-rose-200 bg-rose-50 text-rose-900",
      compactCardClassName:
        "border-rose-200 bg-[linear-gradient(180deg,rgba(255,241,242,0.98)_0%,rgba(255,228,230,0.88)_100%)] shadow-[0_16px_34px_rgba(244,63,94,0.10)]",
      compactValueClassName: "text-rose-950",
      dotClassName: "bg-rose-500",
      eyebrowClassName: "text-rose-800",
      progressBarClassName: "from-rose-500 via-pink-400 to-orange-300",
      progressTrackClassName: "bg-rose-100/85",
      surfaceClassName:
        "border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(255,241,242,0.94)_100%)] shadow-[0_16px_40px_rgba(244,63,94,0.08)]",
    };
  }

  return {
    badgeClassName: "border-indigo-200 bg-indigo-50 text-indigo-900",
    compactCardClassName:
      "border-indigo-200 bg-[linear-gradient(180deg,rgba(238,242,255,0.98)_0%,rgba(224,231,255,0.88)_100%)] shadow-[0_16px_34px_rgba(99,102,241,0.10)]",
    compactValueClassName: "text-indigo-950",
    dotClassName: "bg-indigo-500",
    eyebrowClassName: "text-indigo-800",
    progressBarClassName: "from-indigo-500 via-slate-500 to-sky-300",
    progressTrackClassName: "bg-indigo-100/85",
    surfaceClassName:
      "border-indigo-200 bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(238,242,255,0.94)_100%)] shadow-[0_16px_40px_rgba(99,102,241,0.08)]",
  };
}
