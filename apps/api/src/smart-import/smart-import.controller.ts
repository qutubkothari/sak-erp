import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SmartImportService } from './smart-import.service';

@Controller('smart-imports')
@UseGuards(JwtAuthGuard)
export class SmartImportController {
  constructor(private readonly imports: SmartImportService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } }))
  upload(@Req() req: any, @UploadedFile() file: Express.Multer.File, @Body('instruction') instruction: string) {
    return this.imports.upload(req.user, file, instruction);
  }
  @Get() list(@Req() req: any, @Query('limit') limit: string) { return this.imports.list(req.user, Number(limit)); }
  @Get(':id') get(@Req() req: any, @Param('id') id: string) { return this.imports.get(req.user, id); }
  @Post(':id/preview') preview(@Req() req: any, @Param('id') id: string) { return this.imports.refreshPreview(req.user, id); }
  @Patch(':id/mappings') mappings(@Req() req: any, @Param('id') id: string, @Body('mappings') body: any[]) { return this.imports.updateMappings(req.user, id, body); }
  @Patch(':id/corrections') corrections(@Req() req: any, @Param('id') id: string, @Body('corrections') body: any[]) { return this.imports.updateCorrections(req.user, id, body); }
  @Patch(':id/decisions') decisions(@Req() req: any, @Param('id') id: string, @Body('decisions') body: any[]) { return this.imports.decideRows(req.user, id, body); }
  @Post(':id/approve') approve(@Req() req: any, @Param('id') id: string) { return this.imports.approve(req.user, id); }
  @Post(':id/import') run(@Req() req: any, @Param('id') id: string) { return this.imports.importApproved(req.user, id); }
  @Post(':id/missing-template') async missing(@Req() req: any, @Param('id') id: string, @Res() res: Response) { const data = await this.imports.downloadMissingTemplate(req.user, id); res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'); res.setHeader('Content-Disposition', 'attachment; filename="smart-import-missing-data.xlsx"'); res.setHeader('Cache-Control', 'private, no-store'); res.send(data); }
  @Post(':id/missing-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 1 } }))
  mergeMissing(@Req() req: any, @Param('id') id: string, @UploadedFile() file: Express.Multer.File) { return this.imports.mergeMissingTemplate(req.user, id, file); }
  @Post(':id/cancel') cancel(@Req() req: any, @Param('id') id: string) { return this.imports.cancel(req.user, id); }
  @Post(':id/undo') undo(@Req() req: any, @Param('id') id: string) { return this.imports.undo(req.user, id); }
}
