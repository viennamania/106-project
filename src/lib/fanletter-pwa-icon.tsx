const iconBackground =
  "linear-gradient(135deg, #44f26e 0%, #1ed760 32%, #07150d 100%)";
const cardBackground =
  "linear-gradient(180deg, rgba(3, 5, 4, 0.98) 0%, rgba(8, 22, 13, 0.98) 100%)";

export function renderFanletterPwaIcon() {
  return (
    <div
      style={{
        alignItems: "center",
        background: iconBackground,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: cardBackground,
          border: "2px solid rgba(255, 255, 255, 0.24)",
          borderRadius: "28%",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)",
          display: "flex",
          height: "76%",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          width: "76%",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle, rgba(68, 242, 110, 0.34) 0%, rgba(68, 242, 110, 0) 64%)",
            borderRadius: "50%",
            height: "70%",
            position: "absolute",
            right: "-20%",
            top: "-24%",
            width: "70%",
          }}
        />
        <div
          style={{
            background: "#44f26e",
            borderRadius: "26% 26% 26% 10%",
            boxShadow: "0 18px 34px rgba(68, 242, 110, 0.28)",
            display: "flex",
            height: "46%",
            position: "relative",
            width: "58%",
          }}
        >
          <div
            style={{
              background: "#030504",
              borderRadius: "999px",
              height: "10%",
              left: "17%",
              position: "absolute",
              top: "27%",
              width: "66%",
            }}
          />
          <div
            style={{
              background: "#030504",
              borderRadius: "999px",
              height: "10%",
              left: "17%",
              position: "absolute",
              top: "49%",
              width: "44%",
            }}
          />
          <div
            style={{
              borderBottom: "13px solid transparent",
              borderLeft: "14px solid #44f26e",
              bottom: "-10%",
              height: 0,
              left: "18%",
              position: "absolute",
              width: 0,
            }}
          />
        </div>
        <div
          style={{
            bottom: "17%",
            color: "#ffffff",
            fontSize: "18%",
            fontWeight: 900,
            left: 0,
            letterSpacing: "0",
            lineHeight: 1,
            position: "absolute",
            right: 0,
            textAlign: "center",
          }}
        >
          FL
        </div>
      </div>
    </div>
  );
}
