import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ExtractModule } from './extract/extract.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { SummaryModule } from './summary/summary.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ExtractModule,
    ReceiptsModule,
    SummaryModule,
  ],
})
export class AppModule {}
