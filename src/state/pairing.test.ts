import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  CODE_LENGTH,
  formatCode,
  generateCode,
  isValidCode,
  normalizeCode,
  resolve,
} from "./pairing";

/** Counts bytes 0,1,2,... so the sampling logic is checked, not luck. */
const counting = () => {
  let n = 0;
  return (size: number) => Uint8Array.from({ length: size }, () => n++ % 256);
};

const fixed = (value: number) => (size: number) => new Uint8Array(size).fill(value);

describe("pairing codes", () => {
  it("makes a code of the agreed length from the agreed alphabet", () => {
    const code = generateCode(counting());
    expect(code).toHaveLength(CODE_LENGTH);
    expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
  });

  it("leaves out the characters people mistype", () => {
    for (const confusable of ["I", "O", "U", "0", "1"]) {
      expect(CODE_ALPHABET).not.toContain(confusable);
    }
  });

  it("keeps every symbol equally likely", () => {
    // 248 is past the rejection limit for a 31-symbol alphabet, so a naive
    // modulo would bias towards the start; rejection sampling must skip it.
    const code = generateCode((size) => {
      const bytes = new Uint8Array(size);
      bytes.fill(248);
      bytes[0] = 5;
      return bytes;
    });
    expect(code).toBe(CODE_ALPHABET[5].repeat(CODE_LENGTH));
  });

  it("survives a source that keeps returning rejected bytes at first", () => {
    let call = 0;
    const code = generateCode((size) => {
      call++;
      return call < 3 ? new Uint8Array(size).fill(255) : fixed(0)(size);
    });
    expect(code).toHaveLength(CODE_LENGTH);
  });

  it("groups a code for reading and typing", () => {
    expect(formatCode("ABCDEFGHJKLM")).toBe("ABCD-EFGH-JKLM");
  });

  it("accepts a code however she types it", () => {
    const code = generateCode(counting());
    for (const typed of [code, formatCode(code), code.toLowerCase(), ` ${formatCode(code)} `]) {
      expect(isValidCode(typed), typed).toBe(true);
      expect(normalizeCode(typed)).toBe(code);
    }
  });

  it("rejects a code that is the wrong length or has stray characters", () => {
    expect(isValidCode("ABCD")).toBe(false);
    expect(isValidCode("ABCDEFGHJKLMNP")).toBe(false);
    expect(isValidCode("ABCD-EFGH-JKL0")).toBe(false); // zero is not in the set
    expect(isValidCode("")).toBe(false);
  });
});

describe("choosing which copy of the farm wins", () => {
  const at = (savedAt: string) => ({ savedAt });

  it("takes the newer side", () => {
    expect(resolve(at("2026-08-10T10:00:00Z"), at("2026-08-10T09:00:00Z"))).toBe("local");
    expect(resolve(at("2026-08-10T09:00:00Z"), at("2026-08-10T10:00:00Z"))).toBe("remote");
  });

  it("keeps the server's copy on an exact tie, so devices cannot ping-pong", () => {
    expect(resolve(at("2026-08-10T10:00:00Z"), at("2026-08-10T10:00:00Z"))).toBe("remote");
  });

  it("uses whichever side exists when only one does", () => {
    expect(resolve(at("2026-08-10T10:00:00Z"), null)).toBe("local");
    expect(resolve(null, at("2026-08-10T10:00:00Z"))).toBe("remote");
    expect(resolve(null, null)).toBe("none");
  });
});
