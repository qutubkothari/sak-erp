import { IsISO8601, IsOptional, IsUUID, Matches } from "class-validator";

// For read-only report endpoints. Transaction bodies continue to use the
// ordinary future-date guard; this DTO permits only validated report bounds.
export class ReadDateRangeQuery {
  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fromDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  toDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
