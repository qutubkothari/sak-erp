import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

@Injectable()
export class EngineeringDrawingStorageService {
  private readonly client = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY!,
  );
  readonly bucket =
    process.env.DRAWING_STORAGE_BUCKET || "engineering-drawings";
  readonly maxFileBytes =
    Math.max(Number(process.env.DRAWING_MAX_FILE_SIZE_MB) || 500, 1) *
    1024 *
    1024;

  validateFile(fileName: unknown, fileSize: unknown) {
    const name = String(fileName || "").trim();
    const size = Number(fileSize);
    if (!name || name.length > 240) {
      throw new BadRequestException("A valid drawing filename is required");
    }
    if (!Number.isFinite(size) || size <= 0) {
      throw new BadRequestException("A valid drawing file size is required");
    }
    if (size > this.maxFileBytes) {
      throw new BadRequestException(
        `Drawing exceeds the ${Math.round(this.maxFileBytes / 1024 / 1024)} MB upload limit`,
      );
    }

    // CAD applications use inconsistent or generic MIME values, so the bucket
    // intentionally has no MIME allow-list. Only executable/script extensions
    // are rejected; DWG and other engineering/vendor formats are accepted.
    const extension = name.includes(".")
      ? name.slice(name.lastIndexOf(".")).toLowerCase()
      : "";
    const blockedExtensions = new Set([
      ".apk",
      ".app",
      ".bat",
      ".cmd",
      ".com",
      ".cpl",
      ".dll",
      ".dmg",
      ".exe",
      ".hta",
      ".html",
      ".htm",
      ".jar",
      ".js",
      ".jse",
      ".msi",
      ".msp",
      ".php",
      ".ps1",
      ".scr",
      ".sh",
      ".vbs",
      ".wsf",
    ]);
    if (blockedExtensions.has(extension)) {
      throw new BadRequestException(
        `The ${extension} file type is not permitted for engineering drawings`,
      );
    }
    return { name, size };
  }

  private async ensureBucket() {
    const { data: existing, error: lookupError } =
      await this.client.storage.getBucket(this.bucket);
    if (!existing) {
      const { error } = await this.client.storage.createBucket(this.bucket, {
        public: false,
        fileSizeLimit: this.maxFileBytes,
      });
      if (error && !/exist/i.test(error.message)) {
        throw new InternalServerErrorException(
          `Unable to configure drawing storage: ${error.message}`,
        );
      }
      return;
    }
    if (lookupError && !/not found/i.test(lookupError.message)) {
      throw new InternalServerErrorException(
        `Unable to inspect drawing storage: ${lookupError.message}`,
      );
    }

    const { error: updateError } = await this.client.storage.updateBucket(
      this.bucket,
      { public: false, fileSizeLimit: this.maxFileBytes },
    );
    if (updateError) {
      throw new InternalServerErrorException(
        `Unable to update drawing storage: ${updateError.message}`,
      );
    }
  }

  async prepare(
    tenantId: string,
    itemId: string,
    fileName: unknown,
    fileSize: unknown,
  ) {
    const { name, size } = this.validateFile(fileName, fileSize);
    await this.ensureBucket();
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `drawings/${tenantId}/${itemId}/${Date.now()}_${randomUUID()}_${safeName}`;
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        `Unable to prepare drawing upload: ${error?.message || "No signed URL returned"}`,
      );
    }
    return {
      bucket: this.bucket,
      path,
      signedUrl: data.signedUrl,
      token: data.token,
      maxFileSize: this.maxFileBytes,
      fileSize: size,
    };
  }

  async verify(
    tenantId: string,
    itemId: string,
    path: string,
    expectedSize: number,
  ) {
    const requiredPrefix = `drawings/${tenantId}/${itemId}/`;
    if (!path.startsWith(requiredPrefix) || path.includes("..")) {
      throw new BadRequestException("Invalid drawing storage path");
    }
    const separator = path.lastIndexOf("/");
    const folder = path.slice(0, separator);
    const name = path.slice(separator + 1);
    const { data, error } = await this.client.storage
      .from(this.bucket)
      .list(folder, { search: name, limit: 20 });
    if (error) {
      throw new BadRequestException(
        `Unable to verify drawing upload: ${error.message}`,
      );
    }
    const object = (data || []).find((entry) => entry.name === name);
    if (!object) {
      throw new BadRequestException(
        "Drawing upload has not completed in Supabase Storage",
      );
    }
    const storedSize = Number((object as any)?.metadata?.size);
    if (
      Number.isFinite(storedSize) &&
      Number.isFinite(expectedSize) &&
      storedSize !== Number(expectedSize)
    ) {
      throw new BadRequestException(
        "Uploaded drawing size does not match the selected file",
      );
    }
  }

  async createAccessUrl(
    bucket: string,
    path: string,
    fileName: string,
    download: boolean,
  ) {
    if (bucket !== this.bucket || path.includes("..")) {
      throw new BadRequestException("Invalid drawing storage reference");
    }
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(
        path,
        15 * 60,
        download ? { download: fileName || true } : undefined,
      );
    if (error || !data?.signedUrl) {
      throw new InternalServerErrorException(
        `Unable to open drawing: ${error?.message || "No signed URL returned"}`,
      );
    }
    return { url: data.signedUrl, expiresIn: 15 * 60 };
  }
}
