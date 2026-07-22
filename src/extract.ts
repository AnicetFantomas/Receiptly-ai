/* eslint-disable*/
import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { JsonReceiptStore } from "./store.js";

// Created on first use so importing this module never requires an API key.
let client: OpenAI | undefined;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing OPENAI_API_KEY. Add it to your .env file.");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

// ── The contract ──────────────────────────────────────────
// This is the shape the model MUST return. Not a suggestion.
const LineItem = z.object({
  name: z.string(),
  quantity: z.number(),
  price: z.number(),
});

const Receipt = z.object({
  vendor: z.string(),
  date: z.string(), // ISO format: YYYY-MM-DD
  // 'UNKNOWN' must stay in this list: the prompt tells the model to use it
  // rather than guess a currency that isn't printed on the receipt.
  currency: z.enum(['RWF', 'USD', 'EUR', 'KES', 'GBP', 'UNKNOWN']),
  total: z.number(),
  lineItems: z.array(LineItem),
  confidence: z.enum(["high", "medium", "low"]),
  notes: z.string(), // anything unclear or unreadable
});

type Receipt = z.infer<typeof Receipt>;

// Only these are accepted by the vision endpoint.
const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// ── The extraction ────────────────────────────────────────
async function extractReceipt(imagePath: string): Promise<Receipt> {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`No such file: ${imagePath}`);
  }

  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = MIME_TYPES[ext];
  if (!mimeType) {
    throw new Error(
      `Unsupported image type "${ext || imagePath}". Supported: ${Object.keys(MIME_TYPES).join(", ")}`,
    );
  }

  // Read the image and turn it into base64
  const base64Image = fs.readFileSync(imagePath).toString("base64");

  const response = await getClient().chat.completions.parse({
    model: "gpt-4o-mini",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
        Today's date is ${new Date().toISOString().slice(0, 10)}.
You extract structured data from receipt photos.
Rules:
- Extract exactly what you see. Do not guess or invent values.
- If a value is unreadable, use 0 for numbers or "unknown" for text, and explain in notes.
- Set confidence to "low" if the image is blurry or key values are unclear.
- Dates must be YYYY-MM-DD. If no date is visible on the receipt, use today's date and say so in notes.
- Currency should be the 3-letter code (RWF, USD, EUR...).
- RWF has no decimal subunit. Never return decimal values for RWF amounts.
- If the currency is not printed on the receipt, use "UNKNOWN". Do not infer it from the vendor, location, or context.
- Read digit groups carefully: "10,686" is ten thousand six hundred eighty-six, not 106.86.`,

      },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract the data from this receipt." },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${base64Image}` },
          },
        ],
      },
    ],
    response_format: zodResponseFormat(Receipt, "receipt"),
  });

  const message = response.choices[0]?.message;
  if (!message) {
    throw new Error("Model returned no choices.");
  }
  if (message.refusal) {
    throw new Error(`Model refused the request: ${message.refusal}`);
  }
  if (!message.parsed) {
    throw new Error("Model returned no parsable receipt data.");
  }

  return message.parsed;
}

// ── Run it ────────────────────────────────────────────────
async function main() {
  const imagePath = process.argv[2] ?? "images/receipt.jpeg";

  console.log(`Reading: ${imagePath}\n`);
  const receipt = await extractReceipt(imagePath);

  console.log(`Vendor:     ${receipt.vendor}`);
  console.log(`Date:       ${receipt.date}`);
  console.log(`Total:      ${receipt.total} ${receipt.currency}`);
  console.log(`Confidence: ${receipt.confidence}`);
  if (receipt.notes) console.log(`Notes:      ${receipt.notes}`);

  console.log(`\nItems (${receipt.lineItems.length}):`);
  for (const item of receipt.lineItems) {
    console.log(`  ${item.quantity}x ${item.name} — ${item.price}`);
  }

  const store = new JsonReceiptStore();
  const saved = await store.save(receipt, imagePath);
  console.log(`\nSaved as ${saved.id}`);

  // The check that matters: do the items add up to the total?
  const sum = receipt.lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
  console.log(`\nLine items sum: ${sum} vs stated total: ${receipt.total}`);
  if (Math.abs(sum - receipt.total) > 1) {
    console.log("⚠️  Mismatch — worth flagging for user review");
  }
}

// Only run the CLI when executed directly, not when imported for `Receipt`.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

export { extractReceipt, Receipt };
