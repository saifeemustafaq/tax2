import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import { extractDocument, ExtractionError } from "@/extraction/openai";
import { isSupportedDocumentType } from "@/extraction/prompts";
import type { StoredDocument, StoredDocumentPassport, StoredDocumentW2 } from "@/lib/types/document";
import type { PassportExtraction, W2Extraction } from "@/extraction/prompts";

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

    const docType = documentType.trim();
    if (!isSupportedDocumentType(docType)) {
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

    const extracted = await extractDocument(docType, file, file.name);

    await ensureDocumentsIndexes();
    const documents = getDocumentsCollection();

    const storedDoc: StoredDocument =
      docType === "passport"
        ? ({
            userId: new ObjectId(payload.sub),
            documentType: "passport",
            data: extracted as PassportExtraction,
            originalFilename: file.name,
            createdAt: new Date(),
          } satisfies StoredDocumentPassport)
        : ({
            userId: new ObjectId(payload.sub),
            documentType: "w2",
            data: extracted as W2Extraction,
            originalFilename: file.name,
            createdAt: new Date(),
          } satisfies StoredDocumentW2);

    const result = await documents.insertOne(storedDoc);
    const id = result.insertedId.toString();

    return NextResponse.json(
      {
        document: {
          id,
          documentType: storedDoc.documentType,
          originalFilename: storedDoc.originalFilename,
          createdAt: storedDoc.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
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
    console.error("Document upload error:", err);
    return NextResponse.json(
      { error: "An error occurred while uploading the document." },
      { status: 500 }
    );
  }
}
