import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { EnterpriseEdgeModule } from '../enterprise-edge/enterprise-edge.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { OperatingEventsService } from './operating-events.service';
import { FactoryHealthScheduler } from './factory-health.scheduler';
import { ExceptionNotificationScheduler } from './exception-notification.scheduler';
import { GovernedToolRegistryService } from './governed-tool-registry.service';
import { ManagementBriefScheduler } from './management-brief.scheduler';
import { GovernedActionService } from './governed-action.service';
import { PurchaseModule } from '../purchase/purchase.module';
import { PlantMaintenanceModule } from '../plant-maintenance/plant-maintenance.module';
import { QualityModule } from '../quality/quality.module';
import { AiModule } from '../ai/ai.module';
import { OnboardingIntelligenceService } from './onboarding-intelligence.service';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { AgentOrchestrationService } from './agent-orchestration.service';

@Module({
  imports: [AuditModule, DashboardModule, EnterpriseEdgeModule, PurchaseModule, PlantMaintenanceModule, QualityModule, AiModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, OperatingEventsService, GovernedToolRegistryService, GovernedActionService, OnboardingIntelligenceService, KnowledgeGraphService, AgentOrchestrationService, FactoryHealthScheduler, ManagementBriefScheduler, ExceptionNotificationScheduler],
  exports: [OperatingEventsService],
})
export class IntelligenceModule {}
