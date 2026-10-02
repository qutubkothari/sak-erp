import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { SkipAutomaticAudit } from "../audit/skip-automatic-audit.decorator";
import { DocumentAnalysisService } from "./document-analysis.service";
@Controller("active-planner/document-intelligence")
export class DocumentAnalysisController {
  constructor(private readonly documents: DocumentAnalysisService) {}
  @Get("configuration") configuration(@Req() request: any) {
    return this.documents.configuration(request.user);
  }
  @Get("health") health(@Req() request: any) {
    return this.documents.health(request.user);
  }
  @Post("retention") @SkipAutomaticAudit() retention(@Req() request: any) {
    return this.documents.cleanupExpired(request.user);
  }
  @Get("uploads") list(@Req() request: any) {
    return this.documents.list(request.user);
  }
  @Post("uploads")
  @SkipAutomaticAudit()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10485760, files: 1, fields: 1, fieldSize: 2000 },
    }),
  )
  upload(
    @Req() request: any,
    @UploadedFile() file: Express.Multer.File,
    @Body("instruction") instruction?: string,
  ) {
    return this.documents.upload(request.user, file, instruction);
  }
  @Get("uploads/:id") get(@Req() request: any, @Param("id") id: string) {
    return this.documents.get(request.user, id);
  }
  @Post("uploads/:id/review") @SkipAutomaticAudit() correct(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.documents.correct(request.user, id, body);
  }
  @Get("uploads/:id/file") async file(
    @Req() request: any,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const file = await this.documents.download(request.user, id);
    response.setHeader("Content-Type", file.mime);
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="analysis-document.' +
        (file.mime === "application/pdf"
          ? "pdf"
          : file.mime === "image/png"
            ? "png"
            : "jpg") +
        '"',
    );
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(file.bytes);
  }
  @Delete("uploads/:id") @SkipAutomaticAudit() remove(
    @Req() request: any,
    @Param("id") id: string,
  ) {
    return this.documents.remove(request.user, id);
  }
  @Post("compare") @SkipAutomaticAudit() compare(
    @Req() request: any,
    @Body() body: any,
  ) {
    return this.documents.compare(request.user, body);
  }
  @Post("comparisons/:id/export") @SkipAutomaticAudit() async export(
    @Req() request: any,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="mizantra-document-comparison.xlsx"',
    );
    response.setHeader("Cache-Control", "no-store");
    response.send(await this.documents.export(request.user, id));
  }
}
