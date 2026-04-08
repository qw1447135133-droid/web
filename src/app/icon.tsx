import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 20%, rgba(245,158,11,0.95), rgba(245,158,11,0.2) 32%, transparent 36%), linear-gradient(145deg, #081120 0%, #111f36 55%, #06101d 100%)",
          color: "white",
          fontSize: 220,
          fontWeight: 700,
          letterSpacing: "-0.08em",
        }}
      >
        SN
      </div>
    ),
    size,
  );
}
