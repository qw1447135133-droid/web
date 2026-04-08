import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 36,
          background: "linear-gradient(160deg, #f59e0b 0%, #f97316 35%, #07111f 100%)",
          color: "#07111f",
          fontSize: 72,
          fontWeight: 800,
          letterSpacing: "-0.08em",
        }}
      >
        SN
      </div>
    ),
    size,
  );
}
