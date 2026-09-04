// Enhance step, part 2: RAG lookup of a well-designed RN component pattern to
// restyle the raw detection into. Uses Gemini's text-embedding-004 for vectors
// (768-dim) since Actian's own embedding story is unconfirmed.
//
// Talks to a real Actian VectorAI DB (https://docs.vectoraidb.actian.com,
// docker image actian/vectorai:latest) via the official @actian/vectorai-client
// SDK - gRPC under the hood (ACTIAN_CONNECTION_STRING is a host:port like
// localhost:6574, not a URL), no auth required for local dev. This replaces an
// earlier hand-guessed REST wrapper that was written without real docs (see
// git history) - verified against the actual JS SDK reference this time.
// If Actian is unreachable/misconfigured, lib/cosineFallback.js is the
// documented fallback (same interface, in-process, no sponsor-tech credit but
// keeps the Gemini-restyling demo intact).
const { embedText } = require('./gemini');

const COLLECTION = 'layout_patterns';
const VECTOR_DIM = 768; // Gemini text-embedding-004 output size

let clientPromise = null;
function getClient() {
  if (!process.env.ACTIAN_CONNECTION_STRING) {
    throw new Error('ACTIAN_CONNECTION_STRING not set');
  }
  if (!clientPromise) {
    // @actian/vectorai-client ships ESM-only (no require()) - dynamic import
    // works fine from this CJS module and only pays the import cost once.
    clientPromise = import('@actian/vectorai-client').then(
      ({ VectorAIClient }) => new VectorAIClient(process.env.ACTIAN_CONNECTION_STRING)
    );
  }
  return clientPromise;
}

// Memoized for the process lifetime - swallows the error either way (already
// exists, or a real problem that'll surface clearly on the next upsert/search
// call anyway), so this never needs to know the SDK's exact "exists" signal.
let collectionReady = null;
function ensureCollection(client) {
  if (!collectionReady) {
    collectionReady = client.collections
      .create(COLLECTION, { dimension: VECTOR_DIM, distanceMetric: 'COSINE' })
      .catch(() => {});
  }
  return collectionReady;
}

// id must be an integer or UUID string per Actian's point schema - callers
// can't pass arbitrary text (see scripts/seedPatterns.js).
async function upsertPattern({ id, description, style }) {
  const client = await getClient();
  await ensureCollection(client);
  const vector = await embedText(description);
  await client.points.upsert(COLLECTION, [{ id, vector, payload: { description, style } }]);
}

async function findClosestPattern(layoutDescription) {
  const client = await getClient();
  await ensureCollection(client);
  const vector = await embedText(layoutDescription);
  const results = await client.points.search(COLLECTION, vector, { limit: 1 });
  return results?.[0]?.payload?.style || null;
}

module.exports = { upsertPattern, findClosestPattern };
