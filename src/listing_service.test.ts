import test from "node:test";
import assert from "node:assert/strict";
import { listingRequest } from "./listing_service.ts";

test("a listing request needs an image and a subscriber destination", () => {
  const parsed = listingRequest.safeParse({ listingId: "shirt-7", imageBase64: "aW1hZ2U=", subscriberId: "sub-2" });
  assert.equal(parsed.success, true);
  assert.equal(listingRequest.safeParse({ listingId: "shirt-7", imageBase64: "", subscriberId: "sub-2" }).success, false);
});
