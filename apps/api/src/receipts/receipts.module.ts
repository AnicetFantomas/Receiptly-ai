import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { ReceiptsService } from './receipts.service';
import { PostgresReceiptStore } from './postgres-receipt-store';
import { ExtractModule } from '../extract/extract.module';

@Module({
  imports: [ExtractModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService, PostgresReceiptStore],
  exports: [PostgresReceiptStore],
})
export class ReceiptsModule {}
