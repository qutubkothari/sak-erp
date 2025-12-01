import { Controller, Post, Get } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Controller('migrate')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Post('hr-tables')
  async createHRTables() {
    return this.migrationService.createHRTables();
  }

  @Get('status')
  async getStatus() {
    return { status: 'Migration service ready', timestamp: new Date().toISOString() };
  }
}