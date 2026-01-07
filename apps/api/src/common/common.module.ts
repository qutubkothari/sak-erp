import { Module, Global } from '@nestjs/common';
import { DuplicateDetectionService } from './services/duplicate-detection.service';

@Global()
@Module({
  providers: [DuplicateDetectionService],
  exports: [DuplicateDetectionService],
})
export class CommonModule {}
