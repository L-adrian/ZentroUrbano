import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedOwnerImage, ownerMapUrl, ownerWhatsapp } from "../src/lib/owner-listing-edit";

test("owners can only point the contact button at a phone or wa.me", () => {
  assert.equal(ownerWhatsapp("7850 4969", null), "59178504969");
  assert.equal(ownerWhatsapp("+591 78504969", "59170000000"), "59178504969");
  assert.equal(ownerWhatsapp("https://wa.me/59178504969", null), "https://wa.me/59178504969");
  assert.equal(ownerWhatsapp("", "59178504969"), null);
  assert.equal(ownerWhatsapp("https://phishing.example/login", null), undefined);
  assert.equal(ownerWhatsapp("javascript:alert(1)", null), undefined);
});

test("a contact link already stored by Zentro is kept unchanged", () => {
  const original = "https://www.facebook.com/marketplace/item/123";
  assert.equal(ownerWhatsapp(original, original), original);
});

test("map links must be https unless unchanged", () => {
  assert.equal(ownerMapUrl("https://www.google.com/maps/search/?api=1&query=-17.7,-63.1", null), "https://www.google.com/maps/search/?api=1&query=-17.7,-63.1");
  assert.equal(ownerMapUrl("javascript:alert(1)", null), undefined);
  assert.equal(ownerMapUrl("http://example.com", "http://example.com"), "http://example.com");
});

test("new listing photos must come from Zentro storage or allowed hosts", () => {
  const current = ["https://legacy.example/photo.jpg"];
  assert.equal(allowedOwnerImage("/media/propiedades/abc/01.webp", current), true);
  assert.equal(allowedOwnerImage("/images/properties/x/01.jpg", current), true);
  assert.equal(allowedOwnerImage("https://images.unsplash.com/photo-1", current), true);
  assert.equal(allowedOwnerImage("https://legacy.example/photo.jpg", current), true);
  assert.equal(allowedOwnerImage("https://tracker.example/pixel.png", current), false);
});
