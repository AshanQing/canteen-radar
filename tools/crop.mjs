import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const sharp = require("../.tmpdom/node_modules/sharp");
const [,, input, output, w] = process.argv;
const width = Number(w || 585);
await sharp(input)
  .extract({ left: 0, top: 0, width: 780, height: 1688 })
  .resize({ width })
  .png({ compressionLevel: 9, palette: true })
  .toFile(output);
console.log("ok", output);
