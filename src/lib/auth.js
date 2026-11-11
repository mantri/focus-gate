// Password hashing with WebCrypto PBKDF2. No plaintext stored.
const enc = new TextEncoder();

function b64encode(bytes) {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}
function b64decode(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function generateSalt(bytes = 16) {
  return b64encode(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function hashPassword(password, saltB64, iterations = 100000) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: b64decode(saltB64), iterations, hash: "SHA-256" },
    key,
    256
  );
  return b64encode(new Uint8Array(bits));
}

export async function verifyPassword(password, saltB64, expectedHash, iterations = 100000) {
  if (!saltB64 || !expectedHash) return false;
  const h = await hashPassword(password, saltB64, iterations);
  return h === expectedHash;
}
