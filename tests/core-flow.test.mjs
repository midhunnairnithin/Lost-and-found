import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const [page, itemsApi, claimsApi] = await Promise.all([
  readFile(new URL("app/page.tsx", root), "utf8"),
  readFile(new URL("app/api/items/route.ts", root), "utf8"),
  readFile(new URL("app/api/items/[id]/claim/route.ts", root), "utf8"),
]);

test("1. homepage exposes the lost/found reporting flow", () => {
  assert.match(page, /Report Lost Item/);
  assert.match(page, /Report Found Item/);
  assert.match(page, /What are you looking for\?/);
});
test("2. empty report fields are rejected", () => {
  assert.match(itemsApi, /const missing = required\.find/);
  assert.match(itemsApi, /is required/);
  assert.match(page, /required/);
});
test("3. whitespace-only input is treated as empty input", () => {
  assert.match(itemsApi, /typeof payload\[key\] === "string" \? payload\[key\]\.trim\(\) : ""/);
});
test("4. very long report input is safely bounded", () => {
  assert.match(itemsApi, /value\("description"\)\.slice\(0, 2000\)/);
  assert.match(page, /maxLength=\{2000\}/);
});
test("5. wrong input types are rejected instead of coerced", () => {
  assert.match(itemsApi, /typeof payload\[key\] === "string"/);
  assert.match(claimsApi, /typeof payload\[key\] === "string"/);
  assert.match(page, /Please enter a valid email address or phone number/);
  assert.match(itemsApi, /contactPattern\.test/);
  assert.match(claimsApi, /contactPattern\.test/);
});
test("6. invalid report types and categories are rejected", () => {
  assert.match(itemsApi, /Invalid report type/);
  assert.match(itemsApi, /Invalid category/);
  assert.match(itemsApi, /\["lost", "found"\]/);
});
test("7. malformed and future dates are rejected", () => {
  assert.match(itemsApi, /Invalid incident date/);
  assert.match(itemsApi, /Incident date cannot be in the future/);
});
test("8. oversized images are rejected", () => {
  assert.match(itemsApi, /Image is too large/);
  assert.match(page, /Maximum 1\.5 MB/);
});
test("9. unsupported image formats are rejected", () => {
  assert.match(itemsApi, /Unsupported file type/);
  assert.match(page, /Unsupported file type\. Please upload a JPEG, PNG, or WebP image/);
});
test("10. claims validate ownership data and item existence", () => {
  assert.match(claimsApi, /All fields are required/);
  assert.match(claimsApi, /Invalid item/);
  assert.match(claimsApi, /Item not found/);
  assert.match(claimsApi, /ownershipDetails/);
});
