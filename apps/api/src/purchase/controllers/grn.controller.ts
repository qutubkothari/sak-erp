import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { GrnService } from '../services/grn.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, resolve, join } from 'path';
import { randomUUID } from 'crypto';

function getUploadsRoot(): string {
  return (
    process.env.UPLOAD_ROOT_DIR ||
    resolve(process.cwd(), '..', '..', 'uploads')
  );
}

function buildGrnUploadStorage(kind: 'invoice' | 'qc') {
  return diskStorage({
    destination: (req, _file, cb) => {
      try {
        const user = (req as any)?.user;
        const tenantId = user?.tenantId;
        const userId = user?.userId;
        if (!tenantId || !userId) {
          cb(new BadRequestException('Missing auth context for upload') as any, '');
          return;
        }

        const today = new Date().toISOString().slice(0, 10);
        const relativeDir =
          kind === 'invoice'
            ? `grn/invoices/${today}/${tenantId}/${userId}`
            : `grn/qc/${today}/${tenantId}/${userId}`;

        (req as any).__grnUploadRelativeDir = relativeDir;

        const uploadsRoot = getUploadsRoot();
        const targetDir = join(uploadsRoot, relativeDir);
        mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
      } catch (e) {
        cb(e as any, '');
      }
    },
    filename: (req, file, cb) => {
      try {
        const extensionFromName = extname(file.originalname || '').toLowerCase();
        const safeExtension =
          extensionFromName && extensionFromName.length <= 10
            ? extensionFromName
            : file.mimetype === 'application/pdf'
              ? '.pdf'
              : file.mimetype === 'image/png'
                ? '.png'
                : file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg'
                  ? '.jpg'
                  : '';

        const fileName = `${randomUUID()}${safeExtension}`;
        (req as any).__grnUploadFileName = fileName;
        cb(null, fileName);
      } catch (e) {
        cb(e as any, '');
      }
    },
  });
}

@Controller('purchase/grn')
@UseGuards(JwtAuthGuard)
export class GrnController {
  constructor(private readonly grnService: GrnService) {}

  @Post('invoice/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildGrnUploadStorage('invoice'),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadInvoice(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.grnService.uploadInvoice(req.user.tenantId, req.user.userId, file);
  }

  @Post('qc/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: buildGrnUploadStorage('qc'),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadQcAttachment(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.grnService.uploadQcAttachment(req.user.tenantId, req.user.userId, file);
  }

  @Post()
  async create(@Request() req: any, @Body() body: any) {
    return this.grnService.create(req.user.tenantId, req.user.userId, body);
  }

  @Get()
  async findAll(@Request() req: any, @Query() query: any) {
    return this.grnService.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.grnService.findOne(req.user.tenantId, id);
  }

  @Put(':id')
  async update(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.grnService.update(req.user.tenantId, id, body);
  }

  @Post(':id/submit')
  async submit(@Request() req: any, @Param('id') id: string) {
    return this.grnService.submit(req.user.tenantId, id, req.user.userId);
  }

  @Post(':id/status')
  async updateStatus(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.grnService.updateStatus(req.user.tenantId, id, body.status, req.user.userId);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.grnService.delete(req.user.tenantId, id);
  }

  @Post(':id/qc-accept')
  async qcAccept(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.grnService.qcAccept(req.user.tenantId, id, req.user.userId, body);
  }

  @Post('items/:itemId/generate-uids')
  async generateUIDs(@Request() req: any, @Param('itemId') itemId: string, @Body() body: any) {
    return this.grnService.generateUIDs(req.user.tenantId, itemId, body);
  }

  @Get(':id/uids')
  async getUIDsByGRN(@Request() req: any, @Param('id') id: string) {
    return this.grnService.getUIDsByGRN(req.user.tenantId, id);
  }
}
