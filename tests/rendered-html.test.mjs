import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("FoundAgain production surfaces are present", async () => {
  const [page, layout, itemsApi, claimsApi] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/api/items/route.ts", root), "utf8"),
    readFile(new URL("app/api/items/[id]/claim/route.ts", root), "utf8"),
  ]);

  assert.match(layout, /FoundAgain/);
  assert.match(page, /Lost something\?/);
  assert.match(page, /What are you looking for\?/);
  assert.match(page, /Report Found Item/);
  assert.match(page, /Skip to main content/);
  assert.match(itemsApi, /export async function GET/);
  assert.match(itemsApi, /export async function POST/);
  assert.match(itemsApi, /getSql/);
  assert.match(claimsApi, /export async function POST/);
  assert.match(claimsApi, /Item not found/);
});
