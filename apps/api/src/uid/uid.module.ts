import { Module } from '@nestjs/common';
import { UidService } from './uid.service';
import { UidSupabaseService } from './services/uid-supabase.service';
import { UidSupabaseController } from './controllers/uid-supabase.controller';
import { UidController } from './uid.controller';
import { DeploymentService } from './deployment.service';
import { DeploymentController } from './deployment.controller';
import { PublicWarrantyController } from './public-warranty.controller';

@Module({
  providers: [UidService, UidSupabaseService, DeploymentService],
  controllers: [
    UidSupabaseController,
    UidController,
    DeploymentController,
    PublicWarrantyController,
  ],
  exports: [UidService, UidSupabaseService, DeploymentService],
})
export class UidModule {}
