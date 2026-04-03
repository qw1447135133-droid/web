export async function GET() {
  return Response.json({
    ok: true,
    service: "signal-nine-web",
    environment: process.env.NODE_ENV ?? "development",
    timestamp: new Date().toISOString(),
  });
}
