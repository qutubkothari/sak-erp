import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SkipAutomaticAudit } from "../audit/skip-automatic-audit.decorator";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { ActionOperatorService } from "./action-operator.service";

@Controller("active-planner/action-operator")
export class ActionOperatorController {
  constructor(private readonly operator: ActionOperatorService) {}
  @Get("configuration") configuration(@Req() request: any) {
    return this.operator.configuration(request.user);
  }
  @Get("plans") list(@Req() request: any) {
    return this.operator.list(request.user);
  }
  @Get("plans/:id") get(@Req() request: any, @Param("id") id: string) {
    return this.operator.get(request.user, id);
  }
  @Post("plans")
  @SkipAutomaticAudit()
  plan(@Req() request: any, @Body() body: any) {
    return this.operator.createPlan(request.user, body);
  }
  @Post("plans/:id/approve")
  @SkipAutomaticAudit()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchase_requisitions:create")
  approve(@Req() request: any, @Param("id") id: string, @Body() body: any) {
    return this.operator.approve(request.user, id, body);
  }
  @Post("plans/:id/execute")
  @SkipAutomaticAudit()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("purchase_requisitions:create")
  execute(@Req() request: any, @Param("id") id: string, @Body() body: any) {
    return this.operator.execute(request.user, id, body);
  }
  @Post("plans/:id/cancel")
  @SkipAutomaticAudit()
  cancel(@Req() request: any, @Param("id") id: string, @Body() body: any) {
    return this.operator.cancel(request.user, id, body);
  }
}
