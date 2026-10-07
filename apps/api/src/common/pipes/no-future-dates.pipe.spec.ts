import { BadRequestException, ValidationPipe } from "@nestjs/common";
import { NoFutureDatesPipe } from "./no-future-dates.pipe";
import { ReadDateRangeQuery } from "../dto/read-date-range-query.dto";

describe("NoFutureDatesPipe", () => {
  const pipe = new NoFutureDatesPipe();

  it("allows full-month bounds only on the typed read-only attendance report query", async () => {
    const metadata = { type: "query" as const, metatype: ReadDateRangeQuery };
    const validation = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
    const query = await validation.transform({ fromDate: "2999-10-01", toDate: "2999-10-31", employeeId: "5a503a02-9133-4de4-8462-8f4297602d32" }, metadata);
    expect(pipe.transform(query, metadata)).toBe(query);
    expect(() => pipe.transform({ fromDate: "2999-10-01", toDate: "2999-10-31" }, { type: "query", metatype: Object })).toThrow(BadRequestException);
    expect(() => pipe.transform({ attendance_date: "2999-10-01" }, { type: "body", metatype: Object })).toThrow(BadRequestException);
  });

  it("validates real dates and rejects transaction fields in the read report DTO", async () => {
    const metadata = { type: "query" as const, metatype: ReadDateRangeQuery };
    const validation = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });
    await expect(validation.transform({ fromDate: "2999-02-30", toDate: "2999-03-01" }, metadata)).rejects.toThrow(BadRequestException);
    await expect(validation.transform({ toDate: "2999-10-31", attendance_date: "2999-10-01" }, metadata)).rejects.toThrow(BadRequestException);
  });

  it("allows a future quotation validity date", () => {
    const body = { quotation_date: "2026-08-16", valid_until: "2999-12-31" };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows the camel-case validity field used by external clients", () => {
    const body = { validUntil: "2999-12-31" };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows future contract and warranty validity boundaries", () => {
    const body = {
      start_date: "2999-01-01",
      end_date: "2999-12-31",
      warranty_until: "2999-12-31",
    };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows future production planning boundaries inside build waves", () => {
    const body = {
      waves: [{ required_by: "2999-09-10" }],
      planned_start: "2999-09-01",
      planned_end: "2999-09-30",
    };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows a future promised delivery date on a sales-order line", () => {
    const body = {
      expected_delivery_date: "2999-09-30",
      items: [{ promised_date: "2999-09-30" }],
    };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows a future committed delivery date on a project", () => {
    const camelCaseBody = { committedDeliveryDate: "2999-09-30" };
    const snakeCaseBody = { committed_delivery_date: "2999-09-30" };

    expect(pipe.transform(camelCaseBody)).toBe(camelCaseBody);
    expect(pipe.transform(snakeCaseBody)).toBe(snakeCaseBody);
  });

  it("allows a future production planning freeze horizon", () => {
    const body = { action: "FREEZE", freeze_horizon_date: "2999-09-30" };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows future CRM commitments and activity scheduling", () => {
    const body = {
      expected_close_date: "2999-09-30",
      next_follow_up_at: "2999-09-10T10:30:00.000Z",
      activity: {
        scheduled_at: "2999-09-11T10:30:00.000Z",
        next_action_at: "2999-09-12T10:30:00.000Z",
      },
    };
    expect(pipe.transform(body)).toBe(body);
  });

  it("allows future FSM visit start and end timestamps, including offline batches", () => {
    const body = {
      scheduled_start: "2999-09-11T10:30:00.000Z",
      scheduled_end: "2999-09-11T11:15:00.000Z",
      operations: [
        {
          payload: {
            scheduledStart: "2999-09-12T10:30:00.000Z",
            scheduledEnd: "2999-09-12T11:15:00.000Z",
          },
        },
      ],
    };

    expect(pipe.transform(body)).toBe(body);
  });

  it("continues to reject future transaction and posting dates", () => {
    expect(() => pipe.transform({ invoice_date: "2999-12-31" })).toThrow(
      BadRequestException,
    );
  });

  it("allows future dates only in a shaped payroll review query", () => {
    const query = {
      employee: "SAS-10053",
      batch: "2b24655b-9ffb-4def-9d81-d35dbdb12161",
      from: "2026-10-01",
      to: "2026-10-31",
      kind: "attendance",
      review_mode: "PAYROLL_ATTENDANCE_REVIEW",
    };
    expect(pipe.transform(query, { type: "query", metatype: Object })).toBe(query);
  });

  it("does not allow arbitrary future query dates", () => {
    expect(() => pipe.transform({ to: "2999-12-31" }, { type: "query", metatype: Object })).toThrow(
      BadRequestException,
    );
  });
});
