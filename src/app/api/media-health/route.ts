import { HAS_S3_CREDENTIALS, fetchMediaObject, getLastS3Error } from "@/lib/mediaOrigin";

/**
 * Says whether the media route can actually read from R2 with credentials, so
 * the bucket's public access can be switched off without guessing.
 *
 * Turning that switch off while the deployment is still falling back to the
 * public URL takes every lesson's audio down at once, and from outside the two
 * paths look identical until one of them stops working. This probes a real
 * object and reports which path answered.
 *
 * It returns booleans and an error *name* — never a key, bucket, account id or
 * credential. Knowing that credentials are configured tells an attacker nothing
 * they could not infer from the site working at all.
 */
export const dynamic = "force-dynamic";

// A free-preview object, so the probe never depends on a licence.
const PROBE_KEY = "audio/ld/d001.mp3";

export async function GET() {
  let probe: "ok" | "failed" = "failed";
  try {
    const res = await fetchMediaObject(PROBE_KEY, "bytes=0-15");
    if (res.status === 200 || res.status === 206) probe = "ok";
    await res.body?.cancel();
  } catch {
    probe = "failed";
  }

  const s3Error = getLastS3Error();

  return Response.json(
    {
      credentialsConfigured: HAS_S3_CREDENTIALS,
      probe,
      // Set when a read through the S3 API has failed since this instance
      // started. While the bucket is still public the request then falls back,
      // so the site keeps working and this is the only sign anything is wrong.
      s3Error,
      readyForPrivateBucket: HAS_S3_CREDENTIALS && probe === "ok" && s3Error === null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
