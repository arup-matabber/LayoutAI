// Local-first sketch storage. This is the source of truth for "what sketches
// does this user have" - the server (server/src/models/Sketch.js) is a sync
// target, not where reads go. Keeps the whole capture -> review -> browse
// loop usable with zero network, which on-device detection/codegen already
// were; this closes the gap for creating and re-opening sketches offline.
//
// One JSON array per logged-in user (AsyncStorage, same pattern as the
// al_token/al_email keys in api/client.js and the enhance:<id> cache in
// sketchProfile.js) - small enough at hackathon/demo scale that a blob is
// simpler than a real embedded DB.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

function storageKey(email) {
  return `al_sketches:${email}`;
}

// Not cryptographically unique, just needs to not collide within one user's
// sketch list (and, on the server, within Sketch's { from, clientId } unique
// index) - Date.now() + a random suffix is plenty for that.
export function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll() {
  const email = await api.getEmail();
  if (!email) return { email: null, list: [] };
  const raw = await AsyncStorage.getItem(storageKey(email));
  return { email, list: raw ? JSON.parse(raw) : [] };
}

async function writeAll(email, list) {
  await AsyncStorage.setItem(storageKey(email), JSON.stringify(list));
}

// Newest first, matching the server's `.sort({ createdAt: -1 })` in
// GET /sketches so the list screen looks the same whichever source served it.
export async function listLocal() {
  const { list } = await readAll();
  return [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getLocal(id) {
  const { list } = await readAll();
  return list.find((s) => s._id === id) || null;
}

// Upsert by _id. `fields` is merged onto any existing record (partial update,
// same shape as the server's PATCH /sketches/:id) so callers only pass what
// they changed.
export async function saveLocal(id, fields) {
  const { email, list } = await readAll();
  if (!email) throw new Error('saveLocal: no logged-in user');

  const now = new Date().toISOString();
  const idx = list.findIndex((s) => s._id === id);
  let record;
  if (idx === -1) {
    // Mirrors server/src/models/Sketch.js's defaults so a bare sketch (name
    // only, not captured yet) has the same shape as a fully synced one -
    // consumers can assume predictions/etc. always exist, never undefined.
    record = {
      _id: id,
      serverId: null,
      synced: false,
      image_url: '',
      predicted_url: '',
      code_url: '',
      code: '',
      predictions: [],
      num_predictions: 0,
      width: undefined,
      height: undefined,
      enhanced_code: '',
      enhanced_theme: null,
      enhanced_labels: null,
      enhanced_at: null,
      createdAt: now,
      updatedAt: now,
      ...fields,
    };
    list.push(record);
  } else {
    record = { ...list[idx], ...fields, _id: id, updatedAt: now };
    list[idx] = record;
  }

  await writeAll(email, list);
  return record;
}

export async function removeLocal(id) {
  const { email, list } = await readAll();
  if (!email) return;
  await writeAll(email, list.filter((s) => s._id !== id));
}

export async function clearAllLocal() {
  const { email, list } = await readAll();
  if (!email) return;
  const withServerIds = list.filter((s) => s.serverId); // caller may still need these to queue server deletes
  await writeAll(email, []);
  return withServerIds;
}

// Write-through cache for sketches that exist server-side but weren't created
// on this device (e.g. a reinstall, or a second device). Only inserts if this
// device doesn't already have a local record for that server doc, so it never
// clobbers newer local edits with a stale server copy.
export async function mergeFromServer(serverSketch) {
  const { email, list } = await readAll();
  if (!email) return;
  if (list.some((s) => s.serverId === serverSketch._id)) return;

  const now = new Date().toISOString();
  list.push({
    _id: serverSketch._id, // no local record exists, so the server id doubles as the local id
    serverId: serverSketch._id,
    synced: true,
    name: serverSketch.name,
    image_url: serverSketch.image_url,
    predicted_url: serverSketch.predicted_url,
    code_url: serverSketch.code_url,
    code: serverSketch.code,
    predictions: serverSketch.predictions,
    num_predictions: serverSketch.num_predictions,
    width: serverSketch.width,
    height: serverSketch.height,
    enhanced_code: serverSketch.enhanced_code,
    enhanced_theme: serverSketch.enhanced_theme,
    enhanced_labels: serverSketch.enhanced_labels,
    enhanced_at: serverSketch.enhanced_at,
    createdAt: serverSketch.createdAt || now,
    updatedAt: serverSketch.updatedAt || now,
  });
  await writeAll(email, list);
}
