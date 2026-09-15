import { HAS_S3_CREDENTIALS } from "@/lib/mediaOrigin";

/**
 * Says which way the media route is reading from R2, so the bucket's public
 * access can be switched off without guessing.
 *
 * Turning that switch off while the deployment is still reading through the
 * public URL takes every lesson's audio down at once, and the only way to tell
 * the two modes apart from outside is that one of them has stopped working.
 * This reports the mode before the change instead.
 *
 * It returns two booleans and nothing else: no key, no bucket name, no account
 * id. Knowing that credentials are configured tells an attacker nothing they
 * could not infer from the site working at all.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json(
    {
      storage: HAS_S3_CREDENTIALS ? "s3" : "public-url",
      readyForPrivateBucket: HAS_S3_CREDENTIALS,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
