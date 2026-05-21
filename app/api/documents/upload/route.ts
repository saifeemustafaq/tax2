import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import { extractDocument, ExtractionError } from "@/extraction/openai";
import { isSupportedDocumentType, SUPPORTED_DOCUMENT_TYPES } from "@/extraction/prompts";
import type { StoredDocument, StoredDocumentPassport, StoredDocumentI20, StoredDocumentW2, StoredDocumentTravelHistory } from "@/lib/types/document";
import type { PassportExtraction, I20Extraction, W2Extraction, TravelHistoryExtraction } from "@/extraction/prompts";

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
    const w2IndexRaw = formData.get("w2Index");
    const w2Index = typeof w2IndexRaw === "string" ? Math.max(0, parseInt(w2IndexRaw, 10) || 0) : 0;

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
        { error: `Unsupported document type: ${documentType}. Supported: ${SUPPORTED_DOCUMENT_TYPES.join(", ")}.` },
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
    const documents = await getDocumentsCollection();

    const storedDoc: StoredDocument =
      docType === "passport"
        ? ({
            userId: new ObjectId(payload.sub),
            documentType: "passport",
            data: extracted as PassportExtraction,
            originalFilename: file.name,
            createdAt: new Date(),
          } satisfies StoredDocumentPassport)
        : docType === "i20"
          ? ({
              userId: new ObjectId(payload.sub),
              documentType: "i20",
              data: extracted as I20Extraction,
              originalFilename: file.name,
              createdAt: new Date(),
            } satisfies StoredDocumentI20)
          : docType === "travel-history"
            ? ({
                userId: new ObjectId(payload.sub),
                documentType: "travel-history",
                data: extracted as TravelHistoryExtraction,
                originalFilename: file.name,
                createdAt: new Date(),
              } satisfies StoredDocumentTravelHistory)
            : ({
                userId: new ObjectId(payload.sub),
                documentType: "w2",
                w2Index,
                data: extracted as W2Extraction,
                originalFilename: file.name,
                createdAt: new Date(),
              } satisfies StoredDocumentW2);

    let id: string;
    if (docType === "w2") {
      const userId = new ObjectId(payload.sub);
      const replaceResult = await documents.replaceOne(
        { userId, documentType: "w2", w2Index },
        storedDoc,
        { upsert: true }
      );
      // upsertedId is set on insert; for a replace, look up the existing doc's _id
      if (replaceResult.upsertedId) {
        id = replaceResult.upsertedId.toString();
      } else {
        const existing = await documents.findOne(
          { userId, documentType: "w2", w2Index },
          { projection: { _id: 1 } }
        );
        id = existing?._id?.toString() ?? "";
      }
    } else {
      const result = await documents.insertOne(storedDoc);
      id = result.insertedId.toString();
    }

    const responseBody: {
      document: { id: string; documentType: string; originalFilename: string; createdAt: string };
      ssnLast4?: string;
      schoolName?: string;
      entryDate?: string;
    } = {
      document: {
        id,
        documentType: storedDoc.documentType,
        originalFilename: storedDoc.originalFilename ?? "",
        createdAt: storedDoc.createdAt.toISOString(),
      },
    };

    if (docType === "w2") {
      const w2Data = extracted as W2Extraction;
      const rawSsn = w2Data?.employee?.ssn ?? "";
      const digits = rawSsn.replace(/\D/g, "");
      if (digits.length >= 4) {
        responseBody.ssnLast4 = digits.slice(-4);
      }
    }

    if (docType === "i20") {
      responseBody.schoolName = (extracted as I20Extraction)?.school_information?.school_name ?? "";
    }

    if (docType === "travel-history") {
      const records = (extracted as TravelHistoryExtraction)?.records ?? [];
      const mostRecentArrival = records
        .filter((r) => r.type === "Arrival")
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (mostRecentArrival?.date) {
        responseBody.entryDate = mostRecentArrival.date;
      }
    }

    return NextResponse.json(responseBody, { status: 201 });
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
