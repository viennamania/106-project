const shellGradient =
  "linear-gradient(135deg, #edf5ff 0%, #c8d9f8 28%, #102243 74%, #07111f 100%)";
const cardGradient =
  "linear-gradient(180deg, rgba(14, 25, 49, 0.96) 0%, rgba(7, 16, 29, 1) 100%)";
const highlightGradient =
  "linear-gradient(135deg, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 60%)";
const coinGradient =
  "linear-gradient(135deg, #f8ddb2 0%, #d8a86b 100%)";

export function renderPwaIcon() {
  return (
    <div
      style={{
        alignItems: "center",
        background: shellGradient,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: cardGradient,
          border: "2px solid rgba(255, 255, 255, 0.22)",
          borderRadius: "30%",
          boxShadow: "0 18px 42px rgba(3, 10, 22, 0.28)",
          display: "flex",
          height: "78%",
          justifyContent: "center",
          overflow: "hidden",
          position: "relative",
          width: "78%",
        }}
      >
        <div
          style={{
            background: highlightGradient,
            borderRadius: "50%",
            height: "58%",
            left: "-8%",
            position: "absolute",
            top: "-16%",
            width: "58%",
          }}
        />
        <div
          style={{
            background:
              "linear-gradient(180deg, rgba(39, 97, 101, 0) 0%, rgba(33, 146, 119, 0.4) 100%)",
            borderRadius: "50%",
            bottom: "-24%",
            height: "60%",
            position: "absolute",
            right: "-10%",
            width: "60%",
          }}
        />
        <div
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            borderRadius: "18%",
            boxShadow: "0 10px 30px rgba(8, 16, 30, 0.18)",
            display: "flex",
            height: "43%",
            position: "relative",
            width: "52%",
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(8, 17, 34, 0.96) 0%, rgba(17, 34, 66, 0.94) 100%)",
              borderRadius: "14%",
              height: "26%",
              left: "10%",
              position: "absolute",
              top: "18%",
              width: "80%",
            }}
          />
          <div
            style={{
              background: coinGradient,
              borderRadius: "50%",
              bottom: "18%",
              height: "24%",
              left: "18%",
              position: "absolute",
              width: "24%",
            }}
          />
          <div
            style={{
              background: "rgba(10, 19, 37, 0.14)",
              borderRadius: "999px",
              bottom: "23%",
              height: "10%",
              position: "absolute",
              right: "18%",
              width: "28%",
            }}
          />
          <div
            style={{
              background: "rgba(10, 19, 37, 0.14)",
              borderRadius: "999px",
              bottom: "39%",
              height: "10%",
              position: "absolute",
              right: "18%",
              width: "18%",
            }}
          />
        </div>
      </div>
    </div>
  );
}
