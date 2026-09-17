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

// Server-only, and deliberately not NEXT_PUBLIC_MEDIA_URL: that one decides what
// the browser is told to request, and pointing the browser at the bucket would
// walk around the licence check this module exists to serve.
const PUBLIC_BASE = (
  process.env.R2_PUBLIC_BASE_URL ||
  "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev"
).replace(/\/+$/, "");

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;

export const HAS_S3_CREDENTIALS = Boolean(
  accountId?.trim() && accessKeyId?.trim() && secretAccessKey?.trim() && bucket?.trim(),
);

/**
 * A misconfigured account id points the SDK at a host that never answers, and
 * the default three attempts with backoff then outlast the whole function. One
 * attempt under a short deadline lets the fallback run while the listener is
 * still waiting.
 *
 * MEDIA-01: THE DEADLINE COVERS GETTING THE RESPONSE HEADERS, NOT THE WHOLE
 * TRANSFER. It used to be `AbortSignal.timeout(4000)`, which stays armed while
 * the body streams: the SDK removes its abort listener only once the body has
 * been read to the end. Any object that took longer than 4 s to pass from R2
 * through the function was cut off mid-stream, after a 200/206 with the full
 * Content-Length had already gone out, so the listener got a truncated file
 * rather than an error. Measured 2026-09-17: the same call shape with a 5 s
 * pause while reading stopped at 16,384 of 610,682 bytes at 4,012 ms. The
 * largest live-course clip (2.9 MB) took 1.9–2.2 s through iad1, so the margin
 * was about 2×; the retired CNN videos (up to 22.8 MB) would not have fitted.
 * The timer is now cleared as soon as `send()` resolves.
 *
 * THAT OLD TIMER WAS ALSO THE ONLY THING THAT FREED A CONNECTION WHOSE BODY
 * NOBODY READ, and removing it on its own leaked them (found in review before
 * deploy, 2026-09-18). A HEAD request and the health probe fetch an object and
 * never read the body; the SDK keeps that socket checked out until the body is
 * read to the end or destroyed, and its pool holds 50. After 50 such requests
 * every clip on that server instance waited for a socket, hit the deadline and
 * answered 502. So the body is handed out as a stream this module controls
 * (`toWebStream`): cancelling it destroys the connection, and a read that waits
 * longer than S3_BODY_STALL_MS for the next chunk fails instead of hanging.
 *
 * A second review found one more body nobody reads or cancels: a listener who
 * hangs up before R2's headers arrive (a skipped clip). Next then never starts
 * sending the response, so it never pulls or cancels it — reproduced on a local
 * `next start` against R2: 60 such hang-ups, then the next clip waited 4.5 s and
 * got 502. `mediaRoute.ts` now cancels on the request's abort signal. And because
 * each of these leaks was a path someone had to think of, a body that nobody
 * starts reading is also given back after S3_TRANSFER_MAX_MS, whatever path
 * forgot it.
 */
const S3_DEADLINE_MS = 4000;

/**
 * How long a body NOBODY HAS STARTED READING may hold its R2 connection, from the
 * moment the headers arrive. A backstop for whatever path forgets a body. It is
 * lifted as soon as a reader takes the first chunk: from then on a reader that
 * pauses — a player that preloads a little and waits for "play" — must not be
 * cut (a third review reproduced exactly that with the ceiling left armed: 200
 * with the full length, then the connection reset after 120 s). A body that is
 * being read is bounded instead by the stall limit while it reads, by the cancel
 * when the listener leaves, and by the function's own time limit.
 */
const S3_TRANSFER_MAX_MS = 120_000;

/**
 * How long a READ may wait for R2's next chunk. It runs only while someone is
 * reading, so a player that stops pulling (a paused download, back-pressure)
 * never trips it; only R2 going silent mid-transfer does. Not the SDK's
 * `socketTimeout`: that counts a paused reader as an idle socket and would bring
 * the mid-stream cut back.
 */
const S3_BODY_STALL_MS = 20_000;

type NodeBody = AsyncIterable<Uint8Array> & {
  destroy?: (error?: Error) => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => unknown;
};

/**
 * The S3 body (a Node stream) as a web stream whose `cancel()` really closes the
 * connection. Exported for `verify-media-origin-stream.cjs`.
 */
export function toWebStream(
  body: NodeBody,
  stallMs = S3_BODY_STALL_MS,
  onSettled: () => void = () => {},
): ReadableStream<Uint8Array> {
  // A destroyed Node stream emits 'error'; with no listener that would crash the
  // process. The iterator below reports the same error to the reader.
  body.on?.("error", () => {});
  // Runs when the body ends — read to the end, failed, cancelled — AND as soon as
  // a reader has taken the first chunk (see the pull counter below). Calling it
  // more than once is harmless.
  body.on?.("close", onSettled);
  // With the default high-water mark of 1 the stream pulls once on its own to
  // fill its queue. A second pull therefore means someone has read.
  let pulls = 0;
  const destroy = (error?: Error) => {
    try {
      body.destroy?.(error);
    } catch {
      /* already gone */
    }
    onSettled();
  };
  const iterator = body[Symbol.asyncIterator]();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (++pulls === 2) onSettled();
      let timer: ReturnType<typeof setTimeout> | undefined;
      const stalled = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`R2 sent nothing for ${stallMs} ms`)), stallMs);
      });
      try {
        const next = await Promise.race([iterator.next(), stalled]);
        if (next.done) controller.close();
        else controller.enqueue(next.value);
      } catch (error) {
        destroy(error instanceof Error ? error : new Error(String(error)));
        controller.error(error);
      } finally {
        clearTimeout(timer);
      }
    },
    // Called when the listener disconnects, and by callers that do not want the
    // body (HEAD, the health probe). Destroying — not `iterator.return()` — frees
    // the socket even while a read is still pending.
    cancel() {
      destroy();
    },
  });
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
      maxAttempts: 1,
    });
  }
  return client;
}

export interface OriginResponse {
  status: number;
  body: ReadableStream<Uint8Array> | null;
  headers: Headers;
}

/**
 * The last S3 failure, so /api/media-health can name it. Only the error's own
 * code and HTTP status are kept — never a key, a bucket or a credential.
 */
let lastS3Error: { name: string; status?: number; at: string } | null = null;
export function getLastS3Error() {
  return lastS3Error;
}

async function fetchFromPublicUrl(key: string, range: string | null): Promise<OriginResponse> {
  const res = await fetch(`${PUBLIC_BASE}/${key}`, {
    headers: range ? { Range: range } : undefined,
    cache: "no-store",
    // With a signal, Next's fetch in a route handler does not tee the body for its
    // de-duplication cache, so cancelling the body really closes the connection
    // (`next/dist/server/lib/dedupe-fetch.js`). Without one, a cancel left the
    // second tee branch holding it until garbage collection.
    signal: new AbortController().signal,
  });
  return { status: res.status, body: res.body, headers: new Headers(res.headers) };
}

/**
 * `key` is the object key without a leading slash, e.g. "audio/ld/d150.mp3".
 * `transferMaxMs` exists for `verify-media-origin-stream.cjs`; the app never passes it.
 */
export async function fetchMediaObject(
  key: string,
  range: string | null,
  { transferMaxMs = S3_TRANSFER_MAX_MS }: { transferMaxMs?: number } = {},
): Promise<OriginResponse> {
  if (!HAS_S3_CREDENTIALS) return fetchFromPublicUrl(key, range);

  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), S3_DEADLINE_MS);
  try {
    const out = await s3().send(
      new GetObjectCommand({ Bucket: bucket, Key: key, Range: range ?? undefined }),
      { abortSignal: deadline.signal },
    );
    // The headers are in. From here the body streams for as long as it needs. The
    // backstop below applies only until someone starts reading; the SDK still
    // listens to `deadline` until the body closes, so aborting it frees the socket.
    clearTimeout(timer);
    const ceiling = setTimeout(() => deadline.abort(), transferMaxMs);
    ceiling.unref?.();
    const settled = () => clearTimeout(ceiling);
    if (!out.Body) settled();
    const headers = new Headers();
    if (out.ContentType) headers.set("Content-Type", out.ContentType);
    if (out.ContentLength != null) headers.set("Content-Length", String(out.ContentLength));
    if (out.ContentRange) headers.set("Content-Range", out.ContentRange);
    if (out.ETag) headers.set("ETag", out.ETag);
    headers.set("Accept-Ranges", "bytes");
    return {
      status: out.ContentRange ? 206 : 200,
      body: out.Body ? toWebStream(out.Body as unknown as NodeBody, S3_BODY_STALL_MS, settled) : null,
      headers,
    };
  } catch (err) {
    clearTimeout(timer);
    const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata?.httpStatusCode;
    const name = (err as { name?: string })?.name ?? "UnknownError";

    // A Range past the end of the object is a real 416, not a configuration fault.
    if (status === 416) return { status: 416, body: null, headers: new Headers() };

    // Neither is a missing object. Falling back for a 404 asks the public URL —
    // switched off since the bucket went private — which answers 401 with its
    // own HTML, so an absent clip surfaced as someone else's error page instead
    // of a plain 404, after a pointless second round trip.
    if (status === 404 || name === "NoSuchKey") {
      return { status: 404, body: null, headers: new Headers() };
    }

    // What remains is a fault on our side: a wrong bucket, a token without read
    // access, a transient failure. Those must not take the audio down while the
    // public URL still works, so fall back and let /api/media-health name it.
    lastS3Error = { name, status, at: new Date().toISOString() };
    return fetchFromPublicUrl(key, range);
  }
}
