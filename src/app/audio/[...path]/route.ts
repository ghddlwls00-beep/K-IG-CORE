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
  return new Response(null, { status: res.status, headers: res.headers });
}
