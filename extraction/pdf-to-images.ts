import { ExtractionError } from "@/extraction/errors";

export type Base64Image = {
  mimeType: string; // e.g. "image/png", "image/jpeg"
  base64: string; // raw base64, no data: prefix
};

function detectMimeType(buffer: Buffer): string {
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return "application/pdf";
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    return "image/gif";
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image/webp";
  }
  // Default to PDF -- the most common upload type; pdf-to-img will throw clearly if invalid
  return "application/pdf";
}

export async function fileToBase64Images(
  file: File | Blob | Buffer,
  mimeHint?: string,
): Promise<Base64Image[]> {
  const buffer =
    file instanceof Buffer
      ? file
      : Buffer.from(await (file as Blob).arrayBuffer());

  const mime =
    mimeHint && mimeHint !== "application/octet-stream"
      ? mimeHint
      : file instanceof File && file.type && file.type !== "application/octet-stream"
        ? file.type
        : file instanceof Blob && !(file instanceof File) && file.type && file.type !== "application/octet-stream"
          ? file.type
          : detectMimeType(buffer);

  if (mime.startsWith("image/")) {
    return [{ mimeType: mime, base64: buffer.toString("base64") }];
  }

  // PDF path
  try {
    const { pdf } = await import("pdf-to-img");
    const doc = await pdf(buffer, { scale: 2.0 });
    const images: Base64Image[] = [];

    for await (const page of doc) {
      images.push({
        mimeType: "image/png",
        base64: Buffer.from(page).toString("base64"),
      });
    }

    if (images.length === 0) {
      throw new ExtractionError("The PDF has no renderable pages.", "api");
    }

    return images;
  } catch (err) {
    if (err instanceof ExtractionError) throw err;

    const message = err instanceof Error ? err.message.toLowerCase() : "";
    if (message.includes("password") || message.includes("encrypt")) {
      throw new ExtractionError(
        "This PDF appears to be password-protected. Please remove the password and re-upload.",
        "api",
      );
    }

    throw new ExtractionError("Failed to process the document for extraction.", "api");
  }
}
