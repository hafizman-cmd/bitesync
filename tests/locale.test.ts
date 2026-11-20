import assert from "node:assert/strict";
import { test } from "node:test";
import manifest from "../src/app/manifest";
import { copy } from "../src/lib/copy";
import { errors, isErrorCode } from "../src/lib/errors";
import { parseLocale } from "../src/lib/locale";

test("language preferences accept Bahasa Melayu and fall back to English", () => {
  assert.equal(parseLocale("ms"), "ms");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale(undefined), "en");
  assert.equal(parseLocale("fr"), "en");
  assert.deepEqual(Object.keys(copy.ms).sort(), Object.keys(copy.en).sort());
});

test("room error codes resolve to both languages", () => {
  assert.equal(isErrorCode("hostOnly"), true);
  assert.equal(isErrorCode("toString"), false);
  assert.equal(errors.hostOnly.en, "Only the host can start the round.");
  assert.equal(errors.hostOnly.ms, "Hanya hos boleh memulakan pusingan.");
});

test("the install manifest uses Make Mano for both labels", () => {
  const metadata = manifest();
  assert.equal(metadata.name, "Make Mano");
  assert.equal(metadata.short_name, "Make Mano");
  assert.equal(metadata.id, "/");
});
