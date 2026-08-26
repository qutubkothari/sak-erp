import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { IntelligenceService } from "./intelligence.service";
import { GovernedActionService } from "./governed-action.service";
import { OnboardingIntelligenceService } from "./onboarding-intelligence.service";
import { KnowledgeGraphService } from "./knowledge-graph.service";
import { AgentOrchestrationService } from "./agent-orchestration.service";
import { DocumentIntelligenceService } from "./document-intelligence.service";

@Controller("intelligence")
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(
    private readonly intelligence: IntelligenceService,
    private readonly governedActions: GovernedActionService,
    private readonly onboardingIntelligence: OnboardingIntelligenceService,
    private readonly knowledgeGraph: KnowledgeGraphService,
    private readonly agents: AgentOrchestrationService,
    private readonly documentIntelligence: DocumentIntelligenceService,
  ) {}

  @Get("command-center")
  commandCenter(@Req() request: any) {
    if (!this.intelligence.canAccessCommandCenter(request.user))
      throw new ForbiddenException(
        "Management role access is required for Command Center.",
      );
    return this.intelligence.commandCenter(request.user.tenantId, request.user);
  }

  @Get("daily-brief")
  dailyBrief(@Req() request: any) {
    return this.intelligence.dailyBrief(request.user.tenantId, request.user);
  }

  @Get("brief-history")
  briefHistory(@Req() request: any, @Query("period") period?: string) {
    return this.intelligence.briefHistory(
      request.user.tenantId,
      period || "WEEK",
    );
  }

  @Get("root-cause-brief")
  rootCauseBrief(@Req() request: any, @Query("period") period?: string) {
    return this.intelligence.historicalRootCauseBrief(
      request.user.tenantId,
      period || "WEEK",
    );
  }

  @Post("ask")
  ask(@Req() request: any, @Body() body: { question?: string }) {
    return this.intelligence.ask(
      request.user.tenantId,
      request.user,
      body?.question || "",
      request,
    );
  }

  @Post("reports/query")
  report(@Req() request: any, @Body() body: { question?: string }) {
    return this.intelligence.naturalLanguageReport(
      request.user.tenantId,
      request.user,
      body?.question || "",
      request,
    );
  }

  @Post("actions")
  action(
    @Req() request: any,
    @Body()
    body: {
      insight_id?: string;
      action_code?: string;
      due_date?: string;
      payload?: Record<string, any>;
    },
  ) {
    return this.intelligence.executeControlledAction(
      request.user.tenantId,
      request.user,
      body || {},
      request,
    );
  }

  @Get("action-requests")
  actionRequests(@Req() request: any, @Query("status") status?: string) {
    return this.governedActions.list(
      request.user.tenantId,
      request.user,
      status,
    );
  }

  @Post("action-requests")
  requestAction(
    @Req() request: any,
    @Body() body: { action_code?: string; payload?: Record<string, any> },
  ) {
    return this.governedActions.request(
      request.user.tenantId,
      request.user,
      body?.action_code || "",
      body?.payload || {},
      request,
    );
  }

  @Patch("action-requests/:id/approve")
  approveAction(@Req() request: any, @Param("id") id: string) {
    return this.governedActions.approve(
      request.user.tenantId,
      request.user,
      id,
      request,
    );
  }

  @Patch("action-requests/:id/reject")
  rejectAction(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: { reason?: string },
  ) {
    return this.governedActions.reject(
      request.user.tenantId,
      request.user,
      id,
      body?.reason || "",
      request,
    );
  }

  @Post("action-requests/:id/execute")
  executeAction(@Req() request: any, @Param("id") id: string) {
    return this.governedActions.execute(
      request.user.tenantId,
      request.user,
      id,
      request,
    );
  }

  @Get("tools")
  tools() {
    return this.intelligence.governedTools();
  }

  @Post("workflows/draft")
  draftWorkflow(@Req() request: any, @Body() body: { instruction?: string }) {
    return this.intelligence.draftWorkflow(
      request.user.tenantId,
      request.user,
      body?.instruction || "",
      request,
    );
  }

  @Post("workflows/:id/execute")
  executeWorkflow(@Req() request: any, @Param("id") id: string) {
    return this.intelligence.executeWorkflowDraft(
      request.user.tenantId,
      request.user,
      id,
      request,
    );
  }

  @Get("events")
  events(
    @Req() request: any,
    @Query("limit") limit?: string,
    @Query("correlation_id") correlationId?: string,
  ) {
    return this.intelligence.recentEvents(
      request.user.tenantId,
      Number(limit) || 25,
      correlationId,
    );
  }

  @Get("health-history")
  healthHistory(@Req() request: any, @Query("days") days?: string) {
    return this.intelligence.healthHistory(
      request.user.tenantId,
      Number(days) || 14,
    );
  }

  @Get("health-configuration")
  healthConfiguration(@Req() request: any) {
    return this.intelligence.healthConfiguration(request.user.tenantId);
  }

  @Patch("health-configuration")
  saveHealthConfiguration(@Req() request: any, @Body() body: any) {
    return this.intelligence.saveHealthConfiguration(
      request.user.tenantId,
      request.user,
      body || {},
      request,
    );
  }

  @Get("health-forecast")
  healthForecast(@Req() request: any, @Query("days") days?: string) {
    return this.intelligence.healthForecast(
      request.user.tenantId,
      Number(days) || 7,
    );
  }

  @Get("memory")
  memory(@Req() request: any, @Query("limit") limit?: string) {
    return this.intelligence.businessMemory(
      request.user.tenantId,
      Number(limit) || 100,
    );
  }

  @Post("knowledge-graph/refresh")
  refreshKnowledgeGraph(@Req() request: any) {
    return this.knowledgeGraph.refresh(request.user.tenantId);
  }

  @Get("knowledge-graph")
  knowledgeGraphView(@Req() request: any, @Query("limit") limit?: string) {
    return this.knowledgeGraph.graph(
      request.user.tenantId,
      Number(limit) || 500,
    );
  }

  @Get("knowledge-graph/path")
  knowledgeGraphPath(
    @Req() request: any,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.knowledgeGraph.path(
      request.user.tenantId,
      from || "",
      to || "",
    );
  }

  @Get("onboarding-readiness")
  onboarding(@Req() request: any) {
    return this.intelligence.onboardingReadiness(request.user.tenantId);
  }

  @Get("onboarding/batches")
  onboardingBatches(@Req() request: any) {
    return this.onboardingIntelligence.list(request.user.tenantId);
  }

  @Get("document-intakes")
  documentIntakes(@Req() request: any) {
    return this.documentIntelligence.list(request.user.tenantId);
  }

  @Post("document-intakes/:documentId/analyse")
  analyseDocument(
    @Req() request: any,
    @Param("documentId") documentId: string,
    @Body() body: any,
  ) {
    return this.documentIntelligence.analyse(
      request.user.tenantId,
      request.user,
      documentId,
      request,
      body || {},
    );
  }

  @Patch("document-intakes/:id/approve")
  approveDocument(@Req() request: any, @Param("id") id: string) {
    return this.documentIntelligence.approve(
      request.user.tenantId,
      request.user,
      id,
    );
  }

  @Get("onboarding/batches/:id")
  onboardingBatch(@Req() request: any, @Param("id") id: string) {
    return this.onboardingIntelligence.detail(request.user.tenantId, id);
  }

  @Post("onboarding/analyse")
  analyseOnboarding(@Req() request: any, @Body() body: any) {
    return this.onboardingIntelligence.analyse(
      request.user.tenantId,
      request.user.userId || request.user.id,
      body || {},
    );
  }

  @Patch("onboarding/batches/:id/approve")
  approveOnboarding(@Req() request: any, @Param("id") id: string) {
    return this.onboardingIntelligence.approve(
      request.user.tenantId,
      request.user,
      id,
    );
  }

  @Post("onboarding/batches/:id/apply")
  applyOnboarding(@Req() request: any, @Param("id") id: string) {
    return this.onboardingIntelligence.apply(
      request.user.tenantId,
      request.user,
      id,
    );
  }

  @Get("observability")
  observability(@Req() request: any) {
    return this.intelligence.observability(request.user.tenantId);
  }

  @Get("agents")
  agentDashboard(@Req() request: any) {
    return this.agents.dashboard(request.user.tenantId);
  }

  @Post("agents/policies")
  createAgentPolicy(@Req() request: any, @Body() body: any) {
    return this.agents.createPolicy(
      request.user.tenantId,
      request.user,
      body || {},
    );
  }

  @Patch("agents/policies/:id/approve")
  approveAgentPolicy(@Req() request: any, @Param("id") id: string) {
    return this.agents.approvePolicy(request.user.tenantId, request.user, id);
  }

  @Post("agents/policies/:id/run")
  runAgentPolicy(@Req() request: any, @Param("id") id: string) {
    return this.agents.run(request.user.tenantId, request.user, id);
  }

  @Get("exceptions")
  exceptions(@Req() request: any, @Query("status") status?: string) {
    return this.intelligence.exceptionRegister(request.user.tenantId, status);
  }

  @Get("exception-assignees")
  exceptionAssignees(@Req() request: any) {
    return this.intelligence.exceptionAssignees(request.user.tenantId);
  }

  @Get("notifications")
  exceptionNotifications(@Req() request: any, @Query("limit") limit?: string) {
    return this.intelligence.exceptionNotifications(
      request.user.tenantId,
      request.user,
      Number(limit) || 50,
    );
  }

  @Patch("notifications/:id/read")
  markExceptionNotificationRead(@Req() request: any, @Param("id") id: string) {
    return this.intelligence.markExceptionNotificationRead(
      request.user.tenantId,
      request.user,
      id,
    );
  }

  @Patch("exceptions/:id")
  updateException(
    @Req() request: any,
    @Param("id") id: string,
    @Body() body: any,
  ) {
    return this.intelligence.updateException(
      request.user.tenantId,
      request.user,
      id,
      body || {},
    );
  }
}
