import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';

export interface CurrencyTotal {
  currency: string;
  total: number;
  count: number;
}

export interface VendorTotal {
  vendor: string;
  currency: string;
  total: number;
  count: number;
}

export interface Summary {
  byCurrency: CurrencyTotal[];
  byVendor: VendorTotal[];
  needsReviewCount: number;
}

@Injectable()
export class SummaryService {
  constructor(@Inject('DB_POOL') private readonly pool: Pool) {}

  // Aggregation happens in SQL (GROUP BY), not JavaScript — the reason for
  // moving off JSON files. Currencies are never summed together.
  async get(): Promise<Summary> {
    const byCurrency = await this.pool.query<{
      currency: string;
      total: string;
      count: string;
    }>(
      `SELECT currency, SUM(total) AS total, COUNT(*) AS count
         FROM receipts
        GROUP BY currency
        ORDER BY currency`,
    );

    // Group by (vendor, currency) so a vendor billing in two currencies yields
    // two rows rather than one nonsensical cross-currency total.
    const byVendor = await this.pool.query<{
      vendor: string;
      currency: string;
      total: string;
      count: string;
    }>(
      `SELECT vendor, currency, SUM(total) AS total, COUNT(*) AS count
         FROM receipts
        GROUP BY vendor, currency
        ORDER BY currency, SUM(total) DESC`,
    );

    const needsReview = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM receipts WHERE needs_review = true`,
    );

    return {
      byCurrency: byCurrency.rows.map((r) => ({
        currency: r.currency,
        total: Number(r.total),
        count: Number(r.count),
      })),
      byVendor: byVendor.rows.map((r) => ({
        vendor: r.vendor,
        currency: r.currency,
        total: Number(r.total),
        count: Number(r.count),
      })),
      needsReviewCount: Number(needsReview.rows[0]?.count ?? 0),
    };
  }
}
