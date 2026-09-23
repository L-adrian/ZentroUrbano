import { writeFile } from "node:fs/promises";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { House } from "lucide-react";
import sharp from "sharp";

// Same Lucide House, proportions and brand background as the header.
const house = renderToStaticMarkup(createElement(House, { x: 12, y: 12, size: 40, strokeWidth: 1.8, color: "white" }));
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#087c65"/>${house}</svg>`;
await writeFile("src/app/icon.svg", svg);
await sharp(Buffer.from(svg)).resize(180, 180).png().toFile("src/app/apple-icon.png");
const sizes = [16, 32, 48];
const images = [];
for (const size of sizes) images.push(await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer());
const directory = Buffer.alloc(6 + 16 * sizes.length);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
for (let i = 0; i < sizes.length; i++) {
  const at = 6 + 16 * i;
  directory[at] = sizes[i]; directory[at + 1] = sizes[i];
  directory.writeUInt16LE(1, at + 4); directory.writeUInt16LE(32, at + 6);
  directory.writeUInt32LE(images[i].length, at + 8); directory.writeUInt32LE(offset, at + 12);
  offset += images[i].length;
}
await writeFile("src/app/favicon.ico", Buffer.concat([directory, ...images]));
console.log("Header House exported to SVG, Apple PNG and 16/32/48px ICO.");
