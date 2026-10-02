import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { SkipAutomaticAudit } from "../audit/skip-automatic-audit.decorator";
import { ReportingService } from "./reporting.service";

@Controller("active-planner/reports")
export class ReportingController {
  constructor(private readonly reports: ReportingService) {}
  @Get("configuration") configuration(@Req() request: any) {
    return this.reports.configuration(request.user);
  }
  @Get("health") health(@Req() request: any) {
    return this.reports.health(request.user);
  }
  @Post("interpret") @SkipAutomaticAudit() interpret(
    @Req() request: any,
    @Body() body: any,
  ) {
    return this.reports.interpret(request.user, body);
  }
  @Post("query") @SkipAutomaticAudit() query(
    @Req() request: any,
    @Body() body: any,
  ) {
    return this.reports.query(request.user, body);
  }
  @Post("export")
  @SkipAutomaticAudit()
  async export(
    @Req() request: any,
    @Body() body: any,
    @Res() response: Response,
  ) {
    const buffer = await this.reports.export(request.user, body);
    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="mizantra-report.xlsx"',
    );
    response.setHeader("Cache-Control", "no-store");
    response.send(buffer);
  }
  @Get("saved") saved(@Req() request: any, @Query("kind") kind?: string) {
    return this.reports.list(request.user, kind || "REPORT");
  }
  @Post("saved") @SkipAutomaticAudit() save(
    @Req() request: any,
    @Body() body: any,
  ) {
    return this.reports.saveReport(request.user, body);
  }
  @Post("saved/:id/duplicate") @SkipAutomaticAudit() duplicate(
    @Req() request: any,
    @Param("id") id: string,
  ) {
    return this.reports.duplicateReport(request.user, id);
  }
  @Delete("saved/:id") @SkipAutomaticAudit() remove(
    @Req() request: any,
    @Param("id") id: string,
  ) {
    return this.reports.remove(request.user, id);
  }
  @Post("dashboards") @SkipAutomaticAudit() dashboard(
    @Req() request: any,
    @Body() body: any,
  ) {
    return this.reports.saveDashboard(request.user, body);
  }
}
