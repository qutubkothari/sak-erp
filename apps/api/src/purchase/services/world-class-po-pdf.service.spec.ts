import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  formatVendorContactName,
  makePdfTextSafe,
  parseSupabaseStorageReference,
  resolveVendorContactSalutation,
} from "./world-class-po-pdf.service";

describe("PO attachment storage references", () => {
  it("parses a private Supabase Storage object reference", () => {
    expect(
      parseSupabaseStorageReference(
        "storage://engineering-drawings/drawings/tenant/item/file.step",
      ),
    ).toEqual({
      bucket: "engineering-drawings",
      path: "drawings/tenant/item/file.step",
    });
  });

  it("leaves non-storage URLs for the existing loaders", () => {
    expect(parseSupabaseStorageReference("https://example.com/file.pdf")).toBeNull();
    expect(parseSupabaseStorageReference("data:application/pdf;base64,AA==")).toBeNull();
  });

  it("rejects incomplete and traversing storage references", () => {
    expect(() => parseSupabaseStorageReference("storage://engineering-drawings")).toThrow(
      "Invalid Supabase Storage reference",
    );
    expect(() =>
      parseSupabaseStorageReference("storage://engineering-drawings/drawings/../secret"),
    ).toThrow("Invalid Supabase Storage reference");
  });
});

describe("PO vendor contact salutation", () => {
  it("uses the salutation belonging to the PO contact person", () => {
    const vendor = {
      contact_person: "Kamlesh Gupta",
      metadata: {
        contacts: [
          { salutation: "Ms.", name: "Accounts Desk", isDefault: true },
          { salutation: "Mr.", name: "Kamlesh Gupta", isDefault: false },
        ],
      },
    };

    expect(resolveVendorContactSalutation(vendor)).toBe("Mr.");
    expect(
      formatVendorContactName(
        resolveVendorContactSalutation(vendor),
        vendor.contact_person,
      ),
    ).toBe("Mr. Kamlesh Gupta");
  });

  it("falls back to the default contact and does not duplicate an existing salutation", () => {
    const vendor = {
      contact_person: "Ms. Asha Khan",
      metadata: {
        contacts: [{ salutation: "Ms.", name: "Asha Khan", isDefault: true }],
      },
    };

    expect(resolveVendorContactSalutation(vendor)).toBe("Ms.");
    expect(formatVendorContactName("Ms.", vendor.contact_person)).toBe(
      "Ms. Asha Khan",
    );
  });
});

describe("PO PDF text encoding", () => {
  it("renders rupee values safely with a standard WinAnsi font", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);

    const safe = makePdfTextSafe("Total cost: ₹20,700", font);

    expect(safe).toBe("Total cost: Rs.20,700");
    expect(() => font.encodeText(safe)).not.toThrow();
  });

  it("replaces any other unsupported symbol instead of crashing generation", async () => {
    const document = await PDFDocument.create();
    const font = await document.embedFont(StandardFonts.Helvetica);

    const safe = makePdfTextSafe("Approved 🚀", font);

    expect(safe).toBe("Approved ?");
    expect(() => font.encodeText(safe)).not.toThrow();
  });
});
