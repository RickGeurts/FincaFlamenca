// Pairing codes: the whole identity of a saved farm.
//
// There are no passwords. A code is long enough to be unguessable and short
// enough to type over once when adding a second device, which keeps the app's
// "no accounts" promise while still letting the farm live somewhere safe.
//
// Pure module — the server uses the same rules, so a code that looks valid on
// her phone is valid on the server too.

/**
 * No I/O/1/0 and no U: those are the characters people mistype when reading a
 * code off a screen. 30 symbols, 12 of them, is about 59 bits.
 */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTVWXYZ23456789";
export const CODE_LENGTH = 12;
const GROUP = 4;

/** `ABCD-EFGH-JKLM` — grouped for reading aloud and typing. */
export function formatCode(code: string): string {
  const clean = normalizeCode(code);
  const groups: string[] = [];
  for (let i = 0; i < clean.length; i += GROUP) groups.push(clean.slice(i, i + GROUP));
  return groups.join("-");
}

/** Strip spacing and case so a typed code matches a stored one. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCode(input: string): boolean {
  const clean = normalizeCode(input);
  if (clean.length !== CODE_LENGTH) return false;
  return [...clean].every((c) => CODE_ALPHABET.includes(c));
}

/**
 * A fresh code. Takes its randomness from the caller so the server and the
 * browser can each pass their own cryptographic source.
 */
export function generateCode(randomBytes: (n: number) => Uint8Array): string {
  // Rejection sampling keeps every symbol equally likely; a plain modulo would
  // quietly favour the first few letters of the alphabet.
  const out: string[] = [];
  const limit = 256 - (256 % CODE_ALPHABET.length);
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH)) {
      if (byte >= limit) continue;
      out.push(CODE_ALPHABET[byte % CODE_ALPHABET.length]);
      if (out.length === CODE_LENGTH) break;
    }
  }
  return out.join("");
}

/**
 * Which copy of the farm wins. Both sides carry the moment they were saved;
 * the newer one is authoritative, and an exact tie keeps the server's copy so
 * two devices can't ping-pong edits at each other.
 */
export function resolve(
  local: { savedAt: string } | null,
  remote: { savedAt: string } | null,
): "local" | "remote" | "none" {
  if (!local && !remote) return "none";
  if (!remote) return "local";
  if (!local) return "remote";
  return Date.parse(local.savedAt) > Date.parse(remote.savedAt) ? "local" : "remote";
}
