import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { AppModule } from '../app.module';
import { AllExceptionsFilter } from '../common/all-exceptions.filter';
import { ExtractService, NotAReceiptError } from '../extract/extract.service';

// Proves the full HTTP path for a non-receipt upload without needing an API
// key: the extraction is stubbed, everything else (routing, Multer, the
// exception filter, the store) is the real thing.
describe('POST /receipts — non-receipt rejection (e2e)', () => {
  let app: INestApplication;
  let pool: Pool;
  let available = true;
  const uploadDir = join(process.cwd(), 'uploads');

  beforeAll(async () => {
    try {
      const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
      })
        .overrideProvider(ExtractService)
        .useValue({
          extractReceipt: () => {
            throw new NotAReceiptError(
              'This looks like a photo of a dog, not a receipt.',
            );
          },
        })
        .compile();

      app = moduleRef.createNestApplication();
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      app.useGlobalFilters(new AllExceptionsFilter());
      await app.init();

      pool = app.get<Pool>('DB_POOL');
      await pool.query('SELECT 1');
    } catch {
      available = false;
    }
  });

  afterAll(async () => {
    if (app) await app.close();
    // The pool is a plain provider, not closed by app.close(); end it so Jest
    // doesn't hang on the open handle.
    if (pool) await pool.end().catch(() => {});
  });

  it('returns 422, stores nothing, and leaves no orphaned upload', async () => {
    if (!available) {
      console.warn('Skipping: no database reachable');
      return;
    }

    const before = await pool.query<{ n: string }>(
      'SELECT count(*)::text AS n FROM receipts',
    );
    const filesBefore = existsSync(uploadDir) ? readdirSync(uploadDir).length : 0;

    // supertest isn't a dependency here; use the running HTTP adapter directly.
    const server = app.getHttpServer();
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as { port: number }).port;

    const form = new FormData();
    form.append(
      'image',
      new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xdb])], {
        type: 'image/jpeg',
      }),
      'dog.jpg',
    );

    const res = await fetch(`http://127.0.0.1:${port}/receipts`, {
      method: 'POST',
      body: form,
    });

    expect(res.status).toBe(422);
    const body = (await res.json()) as { message: string };
    expect(body.message).toMatch(/photo of a dog/);

    // Nothing filed.
    const after = await pool.query<{ n: string }>(
      'SELECT count(*)::text AS n FROM receipts',
    );
    expect(after.rows[0].n).toBe(before.rows[0].n);

    // And the rejected image was cleaned up rather than left on disk.
    const filesAfter = existsSync(uploadDir) ? readdirSync(uploadDir).length : 0;
    expect(filesAfter).toBe(filesBefore);
  });
});
