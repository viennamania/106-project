export function renderFanletterPwaIcon() {
  return (
    <div
      style={{
        alignItems: "center",
        background:
          "radial-gradient(circle at 34% 20%, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 32%, rgba(245,248,255,1) 100%)",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: "rgba(255, 255, 255, 0.96)",
          border: "1px solid rgba(18, 28, 47, 0.06)",
          borderRadius: "28%",
          boxShadow:
            "0 20px 56px rgba(28, 42, 76, 0.12), inset 0 1px 0 rgba(255,255,255,0.96)",
          display: "flex",
          height: "80%",
          justifyContent: "center",
          width: "80%",
        }}
      >
        <svg
          fill="none"
          height="74%"
          viewBox="0 0 96 96"
          width="74%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="fanletter-pwa-stroke"
              x1="22"
              x2="78"
              y1="70"
              y2="24"
            >
              <stop stopColor="#ff347f" />
              <stop offset="0.52" stopColor="#bd55e8" />
              <stop offset="1" stopColor="#3f7cff" />
            </linearGradient>
            <linearGradient
              gradientUnits="userSpaceOnUse"
              id="fanletter-pwa-fill"
              x1="38"
              x2="60"
              y1="42"
              y2="58"
            >
              <stop stopColor="#ff347f" />
              <stop offset="1" stopColor="#7a58ff" />
            </linearGradient>
          </defs>
          <g
            stroke="url(#fanletter-pwa-stroke)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="5"
          >
            <path d="M23.5 44.5v28c0 4.6 3.7 8.3 8.3 8.3h34.6c4.6 0 8.3-3.7 8.3-8.3V52.8" />
            <path d="M23.9 44.9 45.7 62c3.4 2.7 8.2 2.7 11.6 0l14.5-11.4" />
            <path d="m23.9 44.9 10.6-8.4" />
            <path d="M34.6 36.4V26.9c0-5.1 4.1-9.2 9.2-9.2h19.1c5.1 0 9.2 4.1 9.2 9.2v22.4" />
            <path d="M70.6 48.1c-.9-1.9-1.3-4.1-1.3-6.4 0-7.3 5.9-13.2 13.2-13.2" />
            <path d="M70.6 48.1 69 56.3l7.9-2.5c1.9 1.3 4.1 2 6.5 2" />
            <path d="M82.5 28.5c7.3 0 13.2 5.9 13.2 13.2s-5.9 13.2-13.2 13.2" />
            <path d="M82.5 35.2c.6 3.6 1.8 4.8 5.4 5.4-3.6.6-4.8 1.8-5.4 5.4-.6-3.6-1.8-4.8-5.4-5.4 3.6-.6 4.8-1.8 5.4-5.4Z" />
            <path d="M91.2 32.7c.3 1.8.9 2.4 2.7 2.7-1.8.3-2.4.9-2.7 2.7-.3-1.8-.9-2.4-2.7-2.7 1.8-.3 2.4-.9 2.7-2.7Z" />
          </g>
          <path
            d="M49.4 47.4c-4.7-4.8-12.2-2.2-12.2 4.1 0 5.3 6.1 9.3 12.2 13.6 6.1-4.3 12.2-8.3 12.2-13.6 0-6.3-7.5-8.9-12.2-4.1Z"
            fill="url(#fanletter-pwa-fill)"
          />
        </svg>
      </div>
    </div>
  );
}
