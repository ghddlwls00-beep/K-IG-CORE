import { handleMediaRequest } from "@/lib/mediaRoute";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return handleMediaRequest(request, "audio", path);
}

export async function HEAD(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const res = await handleMediaRequest(request, "audio", path);
  // The body is not sent for HEAD. Cancelling it closes the R2 connection behind
  // it; left alone, it stays checked out of the pool (see `mediaOrigin.ts`).
  // Not awaited, so a stream that never settles cannot hold this answer up.
  void res.body?.cancel().catch(() => {});
  return new Response(null, { status: res.status, headers: res.headers });
}
