/**
 * Reads a media object out of R2 on the server's behalf.
 *
 * Two modes, chosen by whether S3 credentials are configured:
 *
 *   - credentials present: the object is read through the S3 API, so the bucket
 *     can have its public r2.dev access switched off entirely. This is the
 *     deployed configuration.
 *   - credentials absent: the object is fetched from whatever public base URL
 *     is configured, which keeps a bare checkout working and lets the gate be
 *     tested before the bucket is locked down.
 *
 * Either way the caller has already decided whether this request is allowed;
 * this module only fetches bytes and preserves Range semantics, which audio
 * seeking depends on.
 */

import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

const PUBLIC_BASE = (
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev"
).replace(/\/+$/, "");

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

export const HAS_S3_CREDENTIALS = Boolean(
  accountId?.trim() && accessKeyId?.trim() && secretAccessKey?.trim() && bucket?.trim(),
);

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return client;
}

export interface OriginResponse {
  status: number;
  body: ReadableStream<Uint8Array> | null;
  headers: Headers;
}

/** `key` is the object key without a leading slash, e.g. "audio/ld/d150.mp3". */
export async function fetchMediaObject(
  key: string,
  range: string | null,
): Promise<OriginResponse> {
  if (!HAS_S3_CREDENTIALS) {
    const res = await fetch(`${PUBLIC_BASE}/${key}`, {
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });
    return { status: res.status, body: res.body, headers: new Headers(res.headers) };
  }

  try {
    const out = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: key, Range: range ?? undefined }),
    );
    const headers = new Headers();
    if (out.ContentType) headers.set("Content-Type", out.ContentType);
    if (out.ContentLength != null) headers.set("Content-Length", String(out.ContentLength));
    if (out.ContentRange) headers.set("Content-Range", out.ContentRange);
    if (out.ETag) headers.set("ETag", out.ETag);
    headers.set("Accept-Ranges", "bytes");
    return {
      status: out.ContentRange ? 206 : 200,
      body: out.Body ? (out.Body as unknown as ReadableStream<Uint8Array>) : null,
      headers,
    };
  } catch (err) {
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    // A Range past the end of the object is a 416, not a missing file.
    return { status: status === 416 ? 416 : 404, body: null, headers: new Headers() };
  }
}
