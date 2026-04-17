import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes } from "@/lib/mongodb";
import type { StoredDocumentPassport, StoredDocumentW2 } from "@/lib/types/document";
import { isIndianCitizen } from "@/lib/tax-engine";
import { parseNum } from "@/lib/form-mappers/types";
import { STATE_TAX_MAP } from "@/lib/state-tax-config";

export type DetectedStateForm = {
  stateCode: string;
  stateName: string;
  hasIncomeTax: boolean;
  nonresidentForm: string | null;
  formId: string | null;
  emptyFile: string | null;
  filledFilename: string | null;
  implemented: boolean;
};

export type FormEligibility = {
  schedule_oi: boolean;
  detectedStates: DetectedStateForm[];
};

export async function GET() {
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

    await ensureDocumentsIndexes();
    const documents = await getDocumentsCollection();
    const userId = new ObjectId(payload.sub);

    const [passport, w2Docs] = await Promise.all([
      documents.findOne({ userId, documentType: "passport" }) as Promise<StoredDocumentPassport | null>,
      documents.find({ userId, documentType: "w2" }).toArray() as Promise<StoredDocumentW2[]>,
    ]);

    const stateCodes = new Set<string>();
    for (const w2 of w2Docs) {
      for (const sl of w2.data.state_local ?? []) {
        if (sl.state && parseNum(sl.state_wages) > 0) {
          stateCodes.add(sl.state.toUpperCase());
        }
      }
    }

    const detectedStates: DetectedStateForm[] = [];
    for (const code of stateCodes) {
      const config = STATE_TAX_MAP[code];
      if (!config) continue;
      detectedStates.push({
        stateCode: config.code,
        stateName: config.name,
        hasIncomeTax: config.hasIncomeTax,
        nonresidentForm: config.nonresidentForm,
        formId: config.formId,
        emptyFile: config.emptyFile,
        filledFilename: config.filledFilename,
        implemented: config.implemented,
      });
    }

    const eligibility: FormEligibility = {
      schedule_oi: isIndianCitizen(passport?.data ?? null),
      detectedStates,
    };

    return NextResponse.json(eligibility);
  } catch (err) {
    console.error("Form eligibility error:", err);
    return NextResponse.json(
      { error: "Failed to determine form eligibility" },
      { status: 500 }
    );
  }
}
