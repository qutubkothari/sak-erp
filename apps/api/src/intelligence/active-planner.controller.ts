import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
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
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { SkipAutomaticAudit } from "../audit/skip-automatic-audit.decorator";
import {
  PlannerSupportService,
  supportIntent,
} from "./planner-support.service";
import { PlannerSupportAttachmentsService } from "./planner-support-attachments.service";
import { ActivePlannerService } from "./active-planner.service";
import { ActivePlannerAudioService } from "./active-planner-audio.service";
import { ActivePlannerMemoryService } from "./active-planner-memory.service";

@Controller("active-planner")
export class ActivePlannerController {
  constructor(
    private readonly planner: ActivePlannerService,
    private readonly audio: ActivePlannerAudioService,
    private readonly memory: ActivePlannerMemoryService,
    private readonly support: PlannerSupportService,
    private readonly screenshots: PlannerSupportAttachmentsService,
  ) {}
  @Get("audio/languages") audioLanguages() {
    return { languages: this.audio.languages(), recording_retained: false };
  }
  @Post("audio/transcribe")
  @UseInterceptors(
    FileInterceptor("audio", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  transcribe(
    @UploadedFile() file: Express.Multer.File,
    @Body("language") language: string,
  ) {
    return this.audio.transcribe(file, language);
  }
  @Post("audio/speech")
  async speech(@Req() req: any, @Body() body: any, @Res() response: Response) {
    const result = await this.audio.speech(req.user.tenantId, req.user, body);
    response.setHeader("Content-Type", "audio/mpeg");
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-AI-Generated-Voice", "true");
    response.setHeader("X-Audio-Model", result.model);
    response.status(200).send(result.audio);
  }
  @Post("capabilities") capabilities(@Req() req: any) {
    return this.planner.capabilities(req.user);
  }
  @Get("conversations") conversations(@Req() req: any) {
    return this.memory.history(req.user.tenantId, req.user);
  }
  @Get("conversations/:id") conversation(
    @Req() req: any,
    @Param("id") id: string,
  ) {
    return this.memory.history(req.user.tenantId, req.user, id);
  }
  @Post("conversations") createConversation(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.memory.create(req.user.tenantId, req.user, body?.title);
  }
  @Delete("conversations") clearConversations(@Req() req: any) {
    return this.memory.clear(req.user.tenantId, req.user);
  }
  @Post("feedback") feedback(@Req() req: any, @Body() body: any) {
    return this.memory.feedback(req.user.tenantId, req.user, body);
  }
  @Get("support-screenshots/:id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("support_autofix:read")
  async supportScreenshotForAdmin(
    @Req() req: any,
    @Param("id") id: string,
    @Res() response: Response,
  ) {
    const image = await this.screenshots.downloadForAdmin(
      req.user.tenantId,
      id,
    );
    response.setHeader("Content-Type", image.type);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.send(image.buffer);
  }
  @Post("support-intent")
  @SkipAutomaticAudit()
  supportIntent(@Body() body: any) {
    return {
      intent: supportIntent(String(body?.message || ""), body?.support_mode),
    };
  }
  @Get("support-status")
  supportStatus(@Req() req: any) {
    return this.support.history(req.user);
  }
  @Post("support-screenshot")
  @SkipAutomaticAudit()
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    }),
  )
  supportScreenshot(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.screenshots.upload(req.user, file);
  }
  @Post("interpret")
  @SkipAutomaticAudit()
  async interpret(@Req() req: any, @Body() body: any) {
    const supportReply = await this.support.route(req.user, body);
    if (supportReply) return supportReply;
    const prepared = await this.memory.prepare(
      req.user.tenantId,
      req.user,
      body,
    );
    const result = await this.planner.interpret(
      req.user.tenantId,
      req.user,
      prepared.body,
    );
    return this.memory.complete(
      req.user.tenantId,
      req.user,
      prepared.conversation,
      body?.message,
      result,
      prepared.body?.response_language,
    );
  }
  @Post("execute") execute(@Req() req: any, @Body() body: any) {
    return this.planner.execute(req.user.tenantId, req.user, body, req);
  }
  @Post("request-approval") requestApproval(
    @Req() req: any,
    @Body() body: any,
  ) {
    return this.planner.requestApproval(req.user.tenantId, req.user, body, req);
  }
}
