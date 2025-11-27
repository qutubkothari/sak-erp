import { Module } from '@nestjs/common';
import { UidService } from './uid.service';
import { UidController } from './uid.controller';
import { UidSupabaseService } from './services/uid-supabase.service';
import { UidSupabaseController } from './controllers/uid-supabase.controller';

@Module({
  providers: [UidService, UidSupabaseService],
  controllers: [UidController, UidSupabaseController],
  exports: [UidService, UidSupabaseService],
})
export class UidModule {}
