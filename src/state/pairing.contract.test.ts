// The browser and the server each carry their own copy of the pairing-code
// rules — the server is plain JS with no build step, the client is TypeScript.
// If those two drift apart, a code generated on one side stops validating on
// the other and syncing breaks in a way that is very hard to see.
//
// So this reads the server source and checks the rules still match.

import { describe, expect, it } from "vitest";
// Vite hands us the file as text, so no Node type declarations are needed.
import server from "../../server/api.js?raw";
import { CODE_ALPHABET, CODE_LENGTH } from "./pairing";

function constant(name: string): string {
  const match = server.match(new RegExp(`const ${name} = ("[^"]*"|\\d+);`));
  if (!match) throw new Error(`server/api.js no longer declares ${name}`);
  return match[1].replace(/"/g, "");
}

describe("pairing rules shared with the server", () => {
  it("uses the same alphabet on both sides", () => {
    expect(constant("CODE_ALPHABET")).toBe(CODE_ALPHABET);
  });

  it("uses the same code length on both sides", () => {
    expect(Number(constant("CODE_LENGTH"))).toBe(CODE_LENGTH);
  });

  it("normalises a typed code the same way on both sides", () => {
    // Both must strip separators and upper-case before comparing.
    expect(server).toContain('.toUpperCase().replace(/[^A-Z0-9]/g, "")');
  });
});
