import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { SuperAdminGuard } from "../support-autofix/super-admin.guard";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import {
  Body,
  ForbiddenException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  Optional,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { Response } from "express";
import { SkipAutomaticAudit } from "../audit/skip-automatic-audit.decorator";
import {
  PlannerSupportService,
  autoEngineerIntent,
  askIntent,
} from "./planner-support.service";
import { PlannerSupportAttachmentsService } from "./planner-support-attachments.service";
import { ActivePlannerService } from "./active-planner.service";
import { ActivePlannerAudioService } from "./active-planner-audio.service";
import { ActivePlannerMemoryService } from "./active-planner-memory.service";
import { BrainService } from "./brain.service";
import { DataDoctorService } from "./data-doctor.service";
import { SmartApprovalService } from "./smart-approval.service";
import { ReportingService } from "./reporting.service";
import { reportIntent } from "./reporting.registry";
import { DocumentAnalysisService } from "./document-analysis.service";
import { ActionOperatorService } from './action-operator.service';
import { ProactiveOperationsService } from './proactive-operations.service';
import { UnifiedAiService } from './unified-ai.service';

@Controller("active-planner")
export class ActivePlannerController {
  constructor(
    private readonly planner: ActivePlannerService,
    private readonly audio: ActivePlannerAudioService,
    private readonly memory: ActivePlannerMemoryService,
    private readonly support: PlannerSupportService,
    private readonly screenshots: PlannerSupportAttachmentsService,
    private readonly brain: BrainService,
    private readonly doctor: DataDoctorService,
    private readonly approval: SmartApprovalService,
    @Optional() private readonly reporting?: ReportingService,
    @Optional() private readonly documents?: DocumentAnalysisService,
    @Optional() private readonly operator?: ActionOperatorService,
    @Optional() private readonly proactive?: ProactiveOperationsService,
    @Optional() private readonly unified?: UnifiedAiService,
  ) {}
  @Get('unified/configuration') unifiedConfiguration(@Req() req: any) {
    return this.unified?.configuration(req.user) || { enabled: false, router: false, capabilities: [] };
  }
  @Get('unified/health') unifiedHealth(@Req() req: any) {
    return this.unified?.health(req.user);
  }
  @Post('unified/route')
  @SkipAutomaticAudit()
  unifiedRoute(@Req() req: any, @Body() body: any) {
    return this.unified?.preview(req.user, body);
  }
  @Post('unified/correction')
  @SkipAutomaticAudit()
  unifiedCorrection(@Req() req: any, @Body() body: any) {
    return this.unified?.correction(req.user, body);
  }
  @Get("brain/configuration") brainConfiguration(@Req() req: any) {
    return this.brain.configuration(req.user);
  }
  @Get("brain/health") brainHealth(@Req() req: any) {
    return { ...this.brain.health(req.user), data_doctor: this.doctor.health(req.user), smart_approval: this.approval.health(req.user) };
  }

  @Get("smart-approval/configuration") approvalConfiguration(@Req() req: any) { return this.approval.configuration(req.user); }

  @Post("smart-approval/review")
  @SkipAutomaticAudit()
  reviewApproval(@Req() req: any, @Body() body: any) { return this.approval.review(req.user, body); }

  @Post("data-doctor/prepare-fix")
  @SkipAutomaticAudit()
  async prepareDoctorFix(@Req() req: any, @Body() body: any) {
    const evidence = await this.doctor.prepareFix(req.user, body);
    return this.support.prepareDoctorFix(req.user, evidence);
  }
  @Post("brain/context")
  @SkipAutomaticAudit()
  brainContext(@Req() req: any, @Body() body: any) {
    return this.brain.validateContext(req.user, body);
  }
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
  @UseGuards(SuperAdminGuard, PermissionsGuard)
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
      intent: askIntent(String(body?.message || ""), body?.support_mode),
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
    const unified = this.unified && await this.unified.interpret(req.user, body, next => this.interpretErp(req, next));
    if (unified) return unified;
    const brief = this.proactive && await this.proactive.interpret(req.user, body);
    if (brief) return brief;
    const actionPlan = this.operator && await this.operator.interpret(req.user, body);
    if (actionPlan) return actionPlan;
    if (body?.document_ids?.length && !["support", "improvement", "status"].includes(body?.support_mode)) {
      if (!this.documents) throw new ForbiddenException("Document Intelligence is unavailable.");
      const references = [...new Set((String(body?.message || "").match(/\b(?:RFQ|PO)[-/][A-Z0-9_/-]+/gi) || []).map(value => value.trim()))];
      if (!body.brain_context && references.length > 1) return { status: "DOCUMENT_CONTEXT_REQUIRED", intent_type: "DOCUMENT_COMPARE", provider: "MIZANTRA_DOCUMENT_INTELLIGENCE_V1", extracted: {}, resolved: {}, questions: ["Choose one exact authorized RFQ or PO for comparison."], context_token: "", safety: { read_only: true, executable: false }, assistant_message: "Choose one exact authorized RFQ or PO for comparison." };
      const comparison = await this.documents.compare(req.user, { ...body, reference: body?.reference || references[0] });
      return { ...comparison, extracted: {}, resolved: {}, questions: [], context_token: "", document_comparison: comparison };
    }
    const review = await this.approval.interpret(req.user, body);
    if (review) return review;
    const diagnosis = await this.doctor.interpret(req.user, body);
    if (diagnosis) return diagnosis;
    if (this.reporting && process.env.MIZANTRA_REPORT_BUILDER_ENABLED === "true" && reportIntent(String(body?.message || ""), !!body?.session_id)) {
      const reply: any = await this.reporting.interpret(req.user, body);
      return { intent_type: "REPORT_QUERY", provider: "DETERMINISTIC_REPORT_BUILDER_V1", extracted: {}, resolved: {}, questions: [], context_token: "", safety: { read_only: true, executable: false }, ...reply, assistant_message: reply.summary || reply.report?.plan.title || (reply.saved_report ? `${reply.saved_report.title} saved.` : reply.dashboard ? `${reply.dashboard.title} saved.` : reply.status === "REPORT_DISCOVERY" ? reply.categories.join(", ") : "Report ready.") };
    }
    const brainReply = await this.brain.interpret(req.user, body);
    if (brainReply) return brainReply;
    if (body?.brain_context) {
      const validated = await this.brain.validateContext(req.user, body.brain_context);
      body = { ...body, brain_context: validated.context };
    }
    const supportReply = await this.support.route(req.user, body);
    if (supportReply) return supportReply;
    return this.interpretErp(req, body);
  }
  private async interpretErp(req: any, body: any) {
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
    if (body?.action_operator_plan || body?.intent_type === 'ACTION_OPERATOR' || body?.provider === 'MIZANTRA_ACTION_OPERATOR_V1') throw new ForbiddenException('Use the scoped one-time Action Operator approval and execution endpoints.');
    if (body?.document_ids?.length || body?.intent_type === "DOCUMENT_COMPARE" || body?.provider === "MIZANTRA_DOCUMENT_INTELLIGENCE_V1" || String(body?.status || "").startsWith("DOCUMENT_")) throw new ForbiddenException("Document comparison cannot execute ERP business changes.");
    if (body?.intent_type === "REPORT_QUERY" || body?.provider === "DETERMINISTIC_REPORT_BUILDER_V1" || String(body?.status || "").startsWith("REPORT_")) throw new ForbiddenException("Reports cannot execute ERP business changes.");
    if (body?.intent_type === "SMART_APPROVAL_REVIEW" || body?.status === "SMART_APPROVAL_READ_ONLY" || body?.provider === "DETERMINISTIC_SMART_APPROVAL_V1") throw new ForbiddenException("Mizantra Review cannot execute approval or workflow changes.");
    if (body?.intent_type === "DATA_DOCTOR" || body?.status === "DATA_DOCTOR_READ_ONLY" || body?.provider === "DETERMINISTIC_DATA_DOCTOR_V1") throw new ForbiddenException("Data Doctor V1 cannot execute corrections.");
    if (body?.provider === "DETERMINISTIC_BRAIN_V1" || body?.intent_type === "BRAIN_QUERY" || body?.status === "BRAIN_READ_ONLY") throw new ForbiddenException("Execution is not enabled in Brain V1.");
    return this.planner.execute(req.user.tenantId, req.user, body, req);
  }
  @Post("request-approval") requestApproval(
    @Req() req: any,
    @Body() body: any,
  ) {
    if (body?.action_operator_plan || body?.intent_type === 'ACTION_OPERATOR' || body?.provider === 'MIZANTRA_ACTION_OPERATOR_V1') throw new ForbiddenException('Operator approval binds to one persisted plan, not generic future actions.');
    if (body?.document_ids?.length || body?.intent_type === "DOCUMENT_COMPARE" || body?.provider === "MIZANTRA_DOCUMENT_INTELLIGENCE_V1" || String(body?.status || "").startsWith("DOCUMENT_")) throw new ForbiddenException("Document comparison cannot request approvals.");
    if (body?.intent_type === "REPORT_QUERY" || body?.provider === "DETERMINISTIC_REPORT_BUILDER_V1" || String(body?.status || "").startsWith("REPORT_")) throw new ForbiddenException("Reports cannot request workflow approvals.");
    if (body?.intent_type === "SMART_APPROVAL_REVIEW" || body?.status === "SMART_APPROVAL_READ_ONLY" || body?.provider === "DETERMINISTIC_SMART_APPROVAL_V1") throw new ForbiddenException("Mizantra Review cannot request or execute approvals.");
    if (body?.intent_type === "DATA_DOCTOR" || body?.status === "DATA_DOCTOR_READ_ONLY" || body?.provider === "DETERMINISTIC_DATA_DOCTOR_V1") throw new ForbiddenException("Data Doctor V1 cannot approve corrections.");
    if (body?.provider === "DETERMINISTIC_BRAIN_V1" || body?.intent_type === "BRAIN_QUERY" || body?.status === "BRAIN_READ_ONLY") throw new ForbiddenException("Approvals are not enabled in Brain V1.");
    return this.planner.requestApproval(req.user.tenantId, req.user, body, req);
  }
}
