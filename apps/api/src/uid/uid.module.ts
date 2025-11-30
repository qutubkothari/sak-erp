import { Module } from '@nestjs/common';
import { UidService } from './uid.service';
import { UidSupabaseService } from './services/uid-supabase.service';
import { UidSupabaseController } from './controllers/uid-supabase.controller';

@Module({
  providers: [UidService, UidSupabaseService],
  controllers: [UidSupabaseController],
  exports: [UidService, UidSupabaseService],
})
export class UidModule {}
