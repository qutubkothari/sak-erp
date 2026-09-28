import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { SupportAutofixService } from './support-autofix.service';

@Processor('support-autofix')
export class SupportAutofixProcessor {
  constructor(private readonly service: SupportAutofixService) {}

  @Process('incident')
  async processIncident(job: Job<{ tenantId: string; incidentId: string }>) {
    try {
      await this.service.processIncident(job.data.tenantId, job.data.incidentId);
    } catch (error) {
      await this.service.recordWorkerFailure(job.data.tenantId, job.data.incidentId, error);
      throw error;
    }
  }

  @Process('deploy-approved')
  async deployApproved(job: Job<{ tenantId: string; incidentId: string; attemptId: string; targetId: string }>) {
    try {
      await this.service.processApprovedDeployment(job.data.tenantId, job.data.incidentId, job.data.attemptId, job.data.targetId);
    } catch (error) {
      await this.service.recordWorkerFailure(job.data.tenantId, job.data.incidentId, error);
      throw error;
    }
  }

  @Process('rollback')
  async rollback(job: Job<{ tenantId: string; incidentId: string; deploymentId: string; targetId: string }>) {
    try {
      await this.service.processRollback(job.data.tenantId, job.data.incidentId, job.data.deploymentId, job.data.targetId);
    } catch (error) {
      await this.service.recordWorkerFailure(job.data.tenantId, job.data.incidentId, error);
      throw error;
    }
  }
}
