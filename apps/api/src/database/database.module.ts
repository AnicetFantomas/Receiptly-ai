import { Module, Global } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

// Same pattern as Vidya: a single pg Pool provided under the 'DB_POOL' token,
// injected wherever raw SQL is run. No ORM.
@Global()
@Module({
  providers: [
    {
      provide: 'DB_POOL',
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({ connectionString: config.get<string>('DATABASE_URL') }),
    },
  ],
  exports: ['DB_POOL'],
})
export class DatabaseModule {}
