import assert from "node:assert/strict";
import { test } from "node:test";
import { getPropertyVideoUrl } from "../src/lib/property-video";

test("video accepts permanent same-origin media and HTTPS only", () => {
  assert.equal(getPropertyVideoUrl("/videos/properties/espiritu-santo.mp4"), "/videos/properties/espiritu-santo.mp4");
  assert.equal(getPropertyVideoUrl("https://example.com/video.mp4"), "https://example.com/video.mp4");
  for (const value of [undefined, "", "//example.com/video.mp4", "/\\example.com", "javascript:alert(1)", "data:video/mp4,test", "blob:https://example.com/test", "http://example.com/video.mp4", "https://user:pass@example.com/video.mp4", " /video.mp4", "/video\n.mp4"]) {
    assert.equal(getPropertyVideoUrl(value), null);
  }
});
