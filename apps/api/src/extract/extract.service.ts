import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { Receipt } from './receipt.schema';

/** Thrown when the model refuses, is unreachable, or returns nothing usable. */
export class ExtractionError extends Error {}

// Only these are accepted by the vision endpoint.
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

@Injectable()
export class ExtractService {
  private readonly logger = new Logger('ExtractService');
  private client: OpenAI | undefined;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (!apiKey) {
        throw new ExtractionError('Missing OPENAI_API_KEY. Add it to your .env file.');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  // ── The extraction ──────────────────────────────────────
  // Logic and prompt COPIED VERBATIM from the original src/extract.ts. The only
  // changes: the API key comes from ConfigService, and failures throw
  // ExtractionError (mapped to a 502) instead of exiting the process.
  async extractReceipt(imagePath: string): Promise<Receipt> {
    if (!fs.existsSync(imagePath)) {
      throw new ExtractionError(`No such file: ${imagePath}`);
    }

    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = MIME_TYPES[ext];
    if (!mimeType) {
      throw new ExtractionError(
        `Unsupported image type "${ext || imagePath}". Supported: ${Object.keys(MIME_TYPES).join(', ')}`,
      );
    }

    // Read the image and turn it into base64
    const base64Image = fs.readFileSync(imagePath).toString('base64');

    const response = await this.callModel(mimeType, base64Image);

    const message = response.choices[0]?.message;
    if (!message) {
      throw new ExtractionError('Model returned no choices.');
    }
    if (message.refusal) {
      throw new ExtractionError(`Model refused the request: ${message.refusal}`);
    }
    if (!message.parsed) {
      throw new ExtractionError('Model returned no parsable receipt data.');
    }

    return message.parsed;
  }

  // Isolated so any OpenAI SDK failure (bad key, rate limit, network, 5xx) is
  // converted into an ExtractionError → a clean 502, instead of leaking the
  // upstream message (which can include the API key) through a generic 500.
  private async callModel(mimeType: string, base64Image: string) {
    try {
      return await this.getClient().chat.completions.parse({
        model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        {
          role: 'system',
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
          role: 'user',
          content: [
            { type: 'text', text: 'Extract the data from this receipt.' },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Image}` },
            },
          ],
        },
      ],
      response_format: zodResponseFormat(Receipt, 'receipt'),
      });
    } catch (err) {
      // Our own pre-flight errors (unreachable file, etc.) pass through as-is.
      if (err instanceof ExtractionError) throw err;
      // Log the upstream detail (may include key/URL) server-side only; return a
      // generic message to the client so nothing sensitive leaks in the 502.
      this.logger.error(
        `OpenAI request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new ExtractionError(
        'The extraction service is unavailable. Check the API key and try again.',
      );
    }
  }
}
