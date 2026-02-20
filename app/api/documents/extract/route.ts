import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { extractDocument, ExtractionError } from "@/extraction/openai";
import { isSupportedDocumentType } from "@/extraction/prompts";

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_PREFIXES = ["application/pdf", "image/"];

function isAllowedMimeType(mime: string): boolean {
  return ALLOWED_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const documentType = formData.get("documentType");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing or invalid file. Send a single file under the key 'file'." },
        { status: 400 }
      );
    }

    if (typeof documentType !== "string" || !documentType.trim()) {
      return NextResponse.json(
        { error: "Missing or invalid documentType. Send a string under the key 'documentType' (e.g. passport, w2)." },
        { status: 400 }
      );
    }

    if (!isSupportedDocumentType(documentType.trim())) {
      return NextResponse.json(
        { error: `Unsupported document type: ${documentType}. Supported: passport, w2.` },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    const mime = file.type || "application/octet-stream";
    if (!isAllowedMimeType(mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: PDF or image (e.g. JPEG, PNG)." },
        { status: 400 }
      );
    }

    const extracted = await extractDocument(documentType.trim(), file, file.name);
    return NextResponse.json(extracted);
  } catch (err) {
    if (err instanceof ExtractionError) {
      if (err.code === "missing_key") {
        return NextResponse.json(
          { error: "Document extraction is not configured." },
          { status: 503 }
        );
      }
      if (err.code === "unsupported_type") {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.code === "parse" || err.code === "validation") {
        return NextResponse.json({ error: "Extraction failed: invalid response." }, { status: 422 });
      }
      return NextResponse.json(
        { error: "Extraction failed. Please try again." },
        { status: 502 }
      );
    }
    console.error("Document extract error:", err);
    return NextResponse.json(
      { error: "An error occurred while extracting document data." },
      { status: 500 }
    );
  }
}
