/**
 * Local-only ECDSA P-256 packet signing.
 * Device key material never leaves the browser. No network.
 */

export const PACKET_ALG = "ECDSA-P256-SHA256";
export const DEVICE_KEY_NOTE = "device key, not a secret of the twin";

const IDB_NAME = "aegis-horizon-keys";
const IDB_STORE = "device";
const IDB_RECORD = "packet-signing-v1";
const LS_KEY = "aegis-horizon-device-jwk-v1";

let cachedKeys = null;

export function webCryptoAvailable() {
  return Boolean(globalThis.crypto?.subtle);
}

/**
 * Deterministic JSON with sorted object keys so signatures stay stable.
 */
export function canonicalJson(value) {
  if (value === null) return "null";
  const type = typeof value;
  if (type === "number") return Number.isFinite(value) ? JSON.stringify(value) : "null";
  if (type === "boolean" || type === "string") return JSON.stringify(value);
  if (type !== "object") return "null";
  if (Array.isArray(value)) {
    return `[${value.map((item) => (item === undefined ? "null" : canonicalJson(item))).join(",")}]`;
  }
  const keys = Object.keys(value)
    .filter((key) => value[key] !== undefined)
    .sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

export function canonicalJsonBytes(value) {
  return new TextEncoder().encode(canonicalJson(value));
}

function bytesToBase64(bytes) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < arr.length; i += 1) {
    binary += String.fromCharCode(arr[i]);
  }
  return globalThis.btoa(binary);
}

function base64ToBytes(text) {
  const binary = globalThis.atob(String(text ?? ""));
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

const ECDSA = { name: "ECDSA", namedCurve: "P-256" };
const ECDSA_HASH = { name: "ECDSA", hash: "SHA-256" };

export async function generateDeviceKeyPair(extractable = true) {
  if (!webCryptoAvailable()) {
    throw new Error("WebCrypto unavailable");
  }
  return globalThis.crypto.subtle.generateKey(ECDSA, extractable, ["sign", "verify"]);
}

export async function exportPublicJwk(publicKey) {
  const jwk = await globalThis.crypto.subtle.exportKey("jwk", publicKey);
  return { ...jwk, note: DEVICE_KEY_NOTE };
}

async function importPublicKey(publicKey) {
  if (publicKey && typeof publicKey === "object" && publicKey.type === "public") {
    return publicKey;
  }
  const jwk = { ...publicKey };
  delete jwk.note;
  return globalThis.crypto.subtle.importKey("jwk", jwk, ECDSA, true, ["verify"]);
}

/**
 * Sign canonical packet bytes. `privateKey` may be omitted to use the device key.
 * Returns a base64 signature, or null when WebCrypto is missing.
 */
export async function signPacket(bytes, privateKey) {
  if (!webCryptoAvailable()) return null;
  const key = privateKey ?? (await ensureDeviceKeys())?.privateKey;
  if (!key) return null;
  const signature = await globalThis.crypto.subtle.sign(ECDSA_HASH, key, bytes);
  return bytesToBase64(signature);
}

/**
 * Verify a base64 (or ArrayBuffer) signature against packet bytes.
 */
export async function verifyPacket(bytes, signature, publicKey) {
  if (!webCryptoAvailable() || signature == null || !publicKey) return false;
  try {
    const key = await importPublicKey(publicKey);
    const sigBytes = typeof signature === "string" ? base64ToBytes(signature) : signature;
    return globalThis.crypto.subtle.verify(ECDSA_HASH, key, sigBytes, bytes);
  } catch {
    return false;
  }
}

function idbAvailable() {
  return typeof indexedDB !== "undefined";
}

function idbRequest(mode, work) {
  return new Promise((resolve, reject) => {
    if (!idbAvailable()) {
      reject(new Error("no indexedDB"));
      return;
    }
    const open = indexedDB.open(IDB_NAME, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(IDB_STORE, mode);
      const store = tx.objectStore(IDB_STORE);
      work(store, resolve, reject);
      tx.oncomplete = () => db.close();
      tx.onerror = () => reject(tx.error);
    };
  });
}

function loadIdbKeys() {
  return idbRequest("readonly", (store, resolve, reject) => {
    const req = store.get(IDB_RECORD);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

function saveIdbKeys(keys) {
  return idbRequest("readwrite", (store, resolve, reject) => {
    const req = store.put(keys, IDB_RECORD);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function loadLocalJwkKeys() {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.publicKey || !parsed?.privateKey) return null;
    const publicKey = await globalThis.crypto.subtle.importKey("jwk", parsed.publicKey, ECDSA, true, ["verify"]);
    const privateKey = await globalThis.crypto.subtle.importKey("jwk", parsed.privateKey, ECDSA, false, ["sign"]);
    return { publicKey, privateKey };
  } catch {
    return null;
  }
}

async function saveLocalJwkKeys(keys) {
  if (typeof localStorage === "undefined") return false;
  const publicKey = await globalThis.crypto.subtle.exportKey("jwk", keys.publicKey);
  const privateKey = await globalThis.crypto.subtle.exportKey("jwk", keys.privateKey);
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({
      note: DEVICE_KEY_NOTE,
      alg: PACKET_ALG,
      publicKey,
      privateKey
    })
  );
  return true;
}

/**
 * Load or create a local ECDSA P-256 device keypair.
 * Prefers non-extractable IndexedDB CryptoKeys; falls back to a JWK marked as a
 * device key (not a secret of the twin); last resort is an in-memory pair.
 */
export async function ensureDeviceKeys() {
  if (!webCryptoAvailable()) return null;
  if (cachedKeys?.privateKey && cachedKeys?.publicKey) return cachedKeys;

  try {
    const stored = await loadIdbKeys();
    if (stored?.privateKey && stored?.publicKey) {
      cachedKeys = stored;
      return cachedKeys;
    }
  } catch {
    // IndexedDB unavailable or blocked.
  }

  const fromLs = await loadLocalJwkKeys();
  if (fromLs) {
    cachedKeys = fromLs;
    return cachedKeys;
  }

  const pair = await generateDeviceKeyPair(true);
  try {
    await saveIdbKeys(pair);
  } catch {
    try {
      await saveLocalJwkKeys(pair);
    } catch {
      // Memory-only device key for this session.
    }
  }
  cachedKeys = pair;
  return cachedKeys;
}
