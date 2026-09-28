import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CaptureSupportIncidentDto {
  @IsOptional() @IsIn(['client_ui', 'support_portal']) source?: string;
  @IsString() @MaxLength(200) title!: string;
  @IsString() @MaxLength(2000) description!: string;
  @IsOptional() @IsString() @MaxLength(1000) page_url?: string;
  @IsOptional() @IsString() @MaxLength(500) route?: string;
  @IsOptional() @IsString() @MaxLength(100) module?: string;
  @IsOptional() @IsString() @MaxLength(500) browser_info?: string;
  @IsOptional() @IsString() @MaxLength(64) build_sha?: string;
  @IsOptional() @IsString() @MaxLength(1000) error_message?: string;
  @IsOptional() @IsString() @MaxLength(1000) failed_endpoint?: string;
  @IsOptional() @IsInt() @Min(100) @Max(599) http_status?: number;
  @IsOptional() @IsString() @MaxLength(128) request_id?: string;
  @IsOptional() @IsString() @MaxLength(500) screenshot_ref?: string;
  @IsOptional() @IsISO8601() @MaxLength(40) timestamp?: string;
}
