import assert from "node:assert/strict";
import { test } from "node:test";
import { allowedOwnerImage, ownerMapUrl, ownerWhatsapp } from "../src/lib/owner-listing-edit";

test("owners can only point the contact button at a phone or wa.me", () => {
  assert.equal(ownerWhatsapp("7850 4969", null), "59178504969");
  assert.equal(ownerWhatsapp("+591 78504969", "59170000000"), "59178504969");
  assert.equal(ownerWhatsapp("https://wa.me/59178504969", null), "59178504969");
  assert.equal(ownerWhatsapp("33456789", null), undefined);
  assert.equal(ownerWhatsapp("+54 9 11 5555 1234", null), undefined);
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

test("editing a listing keeps only its own reviewed photos", () => {
  const current = ["/media/propiedades/publication_mine/01.webp", "https://legacy.example/photo.jpg"];
  assert.equal(allowedOwnerImage("/media/propiedades/publication_mine/01.webp", current), true);
  assert.equal(allowedOwnerImage("https://legacy.example/photo.jpg", current), true);
  assert.equal(allowedOwnerImage("/media/propiedades/publication_other/01.webp", current), false);
  assert.equal(allowedOwnerImage("/images/properties/x/01.jpg", current), false);
  assert.equal(allowedOwnerImage("https://tracker.example/pixel.png", current), false);
});
