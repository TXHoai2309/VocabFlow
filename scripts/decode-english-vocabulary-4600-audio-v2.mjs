import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const inputPath = process.argv[2];
const outputPath = process.argv[3];
if (!inputPath || !outputPath) throw new Error("INPUT_OUTPUT_REQUIRED");

const sources = JSON.parse(readFileSync(inputPath, "utf8"));
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><meta charset=\"utf-8\"><title>Audio validation</title>");
  const results = [];
  const batchSize = 48;
  for (let start = 0; start < sources.length; start += batchSize) {
    const sourceBatch = sources.slice(start, start + batchSize).map((item) => ({
      sourceMediaIndex: item.sourceMediaIndex,
      sourceFilename: item.sourceFilename,
      sha256: item.sha256,
      base64: readFileSync(item.temporaryPath).toString("base64"),
    }));
    const decoded = await page.evaluate(async (files) => {
      const context = new AudioContext();
      const output = [];
      for (const file of files) {
        try {
          const binary = atob(file.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
          const audio = await context.decodeAudioData(bytes.buffer);
          output.push({
            sourceMediaIndex: file.sourceMediaIndex,
            sourceFilename: file.sourceFilename,
            sha256: file.sha256,
            valid: audio.duration > 0 && audio.sampleRate > 0 && audio.numberOfChannels > 0,
            durationSeconds: audio.duration,
            sampleRate: audio.sampleRate,
            channels: audio.numberOfChannels,
          });
        } catch {
          output.push({
            sourceMediaIndex: file.sourceMediaIndex,
            sourceFilename: file.sourceFilename,
            sha256: file.sha256,
            valid: false,
          });
        }
      }
      await context.close();
      return output;
    }, sourceBatch);
    results.push(...decoded);
  }
  writeFileSync(outputPath, JSON.stringify({
    validator: "Chromium AudioContext.decodeAudioData",
    audioFileCount: sources.length,
    validFileCount: results.filter((item) => item.valid).length,
    invalidFileCount: results.filter((item) => !item.valid).length,
    results,
  }, null, 2) + "\n", "utf8");
  process.stdout.write("AUDIO_DECODE_FILES=" + results.length +
    "\nAUDIO_DECODE_VALID=" + results.filter((item) => item.valid).length +
    "\nAUDIO_DECODE_INVALID=" + results.filter((item) => !item.valid).length + "\n");
} finally {
  await browser.close();
}
