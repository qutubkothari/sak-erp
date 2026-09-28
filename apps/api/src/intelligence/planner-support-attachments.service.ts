import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { SupabaseStorageService } from "../documents/services/supabase-storage.service";

@Injectable()
export class PlannerSupportAttachmentsService {
  private readonly logger = new Logger(PlannerSupportAttachmentsService.name);
  private readonly db = createClient(
    process.env.SUPABASE_URL!,
    (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY)!,
  );
  constructor(private readonly storage: SupabaseStorageService) {}

  async upload(user: any, file: Express.Multer.File) {
    const png = file?.buffer
      ?.subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = file?.buffer
      ?.subarray(0, 3)
      .equals(Buffer.from([255, 216, 255]));
    if (
      !file ||
      file.size > 10 * 1024 * 1024 ||
      !(
        (png && file.mimetype === "image/png") ||
        (jpeg && file.mimetype === "image/jpeg")
      )
    )
      throw new BadRequestException(
        "Choose a PNG or JPEG screenshot up to 10 MB.",
      );
    const id = randomUUID();
    let path: string | undefined;
    try {
      // Never place incident screenshots into a publicly readable document bucket.
      const bucket = await this.db.storage.getBucket("erp-documents");
      if (bucket.error || !bucket.data || bucket.data.public)
        throw new Error("Private storage required.");
      const stored = await this.storage.uploadFile(
        { ...file, originalname: `${id}.${png ? "png" : "jpg"}` },
        "support-screenshots",
        user.tenantId,
      );
      path = stored.path;
      const { error } = await this.db.from("support_screenshots").insert({
        id,
        tenant_id: user.tenantId,
        uploaded_by: user.userId || user.id || user.sub,
        storage_path: path,
      });
      if (error) throw error;
      return { ref: id };
    } catch (error) {
      const code =
        typeof (error as any)?.code === "string" &&
        /^[A-Za-z0-9_-]{1,32}$/.test((error as any).code)
          ? (error as any).code
          : "unknown";
      this.logger.warn(`Support screenshot upload failed (code=${code}).`);
      if (path) await this.storage.deleteFile(path).catch(() => undefined);
      throw new ServiceUnavailableException(
        "Screenshot upload failed. Your description is still here; retry or remove the screenshot.",
      );
    }
  }

  async downloadForAdmin(tenantId: string, ref: string) {
    if (!/^[0-9a-f-]{36}$/i.test(ref))
      throw new BadRequestException("Screenshot not found.");
    const { data, error } = await this.db
      .from("support_screenshots")
      .select("storage_path")
      .eq("id", ref)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (error || !data) throw new ForbiddenException("Screenshot not found.");
    return {
      buffer: await this.storage.downloadFile(data.storage_path),
      type: data.storage_path.endsWith(".png") ? "image/png" : "image/jpeg",
    };
  }

  async assertOwned(user: any, ref: unknown) {
    if (!/^[0-9a-f-]{36}$/i.test(String(ref)))
      throw new BadRequestException("Please attach the screenshot again.");
    const { data, error } = await this.db
      .from("support_screenshots")
      .select("id")
      .eq("id", ref)
      .eq("tenant_id", user.tenantId)
      .eq("uploaded_by", user.userId || user.id || user.sub)
      .maybeSingle();
    if (error || !data)
      throw new ForbiddenException("Please attach your screenshot again.");
  }
}
