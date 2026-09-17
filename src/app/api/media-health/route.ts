import { verifyAdminSession } from "@/lib/adminAuth";
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
 * credential.
 *
 * SEC-06: anyone could read which storage path answers, whether credentials are
 * configured and the last S3 error name, and every anonymous call made the
 * server fetch from R2. Now an anonymous caller gets only `{ ok }` — enough for
 * an uptime check — and the detail needs the admin session. The R2 probe runs at
 * most once a minute per server instance, whoever asks.
 */
export const dynamic = "force-dynamic";

// A free-preview object, so the probe never depends on a licence.
const PROBE_KEY = "audio/ld/d001.mp3";
const PROBE_TTL_MS = 60_000;
let lastProbe: { at: number; probe: "ok" | "failed"; probeStatus: number } | null = null;

async function runProbe() {
  if (lastProbe && Date.now() - lastProbe.at < PROBE_TTL_MS) return lastProbe;
  let probe: "ok" | "failed" = "failed";
  let probeStatus = 0;
  try {
    const res = await fetchMediaObject(PROBE_KEY, "bytes=0-15");
    probeStatus = res.status;
    if (res.status === 200 || res.status === 206) probe = "ok";
    // The body is left unread on purpose: cancelling a stream that was never
    // consumed hung this handler until the function timed out, which is the
    // one thing a health check must not do.
  } catch {
    probe = "failed";
  }
  lastProbe = { at: Date.now(), probe, probeStatus };
  return lastProbe;
}

export async function GET(request: Request) {
  const { probe, probeStatus } = await runProbe();
  const s3Error = getLastS3Error();
  const readyForPrivateBucket = HAS_S3_CREDENTIALS && probe === "ok" && s3Error === null;
  const headers = { "Cache-Control": "no-store" };

  if (!verifyAdminSession(request)) {
    return Response.json({ ok: readyForPrivateBucket }, { headers });
  }

  return Response.json(
    {
      ok: readyForPrivateBucket,
      credentialsConfigured: HAS_S3_CREDENTIALS,
      probe,
      probeStatus,
      // Set when a read through the S3 API has failed since this instance
      // started. While the bucket is still public the request then falls back,
      // so the site keeps working and this is the only sign anything is wrong.
      s3Error,
      readyForPrivateBucket,
    },
    { headers },
  );
}
