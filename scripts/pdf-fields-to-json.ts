#!/usr/bin/env tsx

/**
 * Extract all AcroForm fields from a PDF and output JSON containing:
 * - field name
 * - field type
 * - current value(s)
 * - common metadata (readonly/required/export options where available)
 *
 * Usage (from project root):
 *   npm run pdf-fields-to-json -- --pdf ./form.pdf
 *   (writes to scripts/output/<pdf-basename>.json by default)
 *   npm run pdf-fields-to-json -- --pdf ./form.pdf --out path/to/fields.json
 * Or: npx tsx scripts/pdf-fields-to-json.ts --pdf ./form.pdf
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, basename, dirname } from "node:path";
import process from "node:process";
import {
  PDFDocument,
  PDFCheckBox,
  PDFDropdown,
  PDFOptionList,
  PDFRadioGroup,
  PDFSignature,
  PDFTextField,
  PDFButton,
} from "pdf-lib";

type FieldKind =
  | "text"
  | "checkbox"
  | "radio"
  | "dropdown"
  | "optionList"
  | "button"
  | "signature"
  | "unknown";

type ExtractedField = {
  name: string;
  fieldName: string; // reserved for a short/display name; empty for now
  kind: FieldKind;

  // current value in a normalized form
  value: string | boolean | string[] | null;

  // useful metadata (best-effort)
  readOnly?: boolean;
  required?: boolean;

  // for choice fields
  options?: string[];
  selected?: string | string[] | null;

  // for radios
  groups?: string[];

  // for debugging/visibility
  raw?: Record<string, unknown>;
};

type CliArgs = {
  pdfPath: string;
  outPath?: string;
  password?: string;
  pretty: boolean;
};

function fail(msg: string, code = 1): never {
  console.error(`Error: ${msg}`);
  process.exit(code);
}

function parseArgs(argv: string[]): CliArgs {
  const args = new Map<string, string | boolean>();

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;

    const key = a.slice(2);
    const next = argv[i + 1];

    // flags
    if (key === "pretty") {
      args.set(key, true);
      continue;
    }

    // key-value
    if (!next || next.startsWith("--")) {
      args.set(key, true);
    } else {
      args.set(key, next);
      i++;
    }
  }

  const pdfPath = args.get("pdf");
  if (!pdfPath || pdfPath === true) {
    fail(`Missing required argument --pdf <path-to-pdf>`);
  }

  const outPath = args.get("out");
  const password = args.get("password");
  const pretty =
    args.get("pretty") === true || (args.get("pretty") as string | undefined) === "true";

  return {
    pdfPath: String(pdfPath),
    outPath: outPath && outPath !== true ? String(outPath) : undefined,
    password: password && password !== true ? String(password) : undefined,
    pretty,
  };
}

function safeString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

function uniqueStrings(arr: string[]): string[] {
  return [...new Set(arr)].filter((s) => s.length > 0);
}

function detectKind(field: any): FieldKind {
  // pdf-lib classes are runtime-checkable via instanceof
  if (field instanceof PDFTextField) return "text";
  if (field instanceof PDFCheckBox) return "checkbox";
  if (field instanceof PDFRadioGroup) return "radio";
  if (field instanceof PDFDropdown) return "dropdown";
  if (field instanceof PDFOptionList) return "optionList";
  if (field instanceof PDFButton) return "button";
  if (field instanceof PDFSignature) return "signature";
  return "unknown";
}

function extractValue(field: any, kind: FieldKind): Pick<ExtractedField, "value" | "options" | "selected" | "groups" | "raw"> {
  try {
    switch (kind) {
      case "text": {
        const tf = field as PDFTextField;
        const text = tf.getText();
        return { value: text ?? "" };
      }
      case "checkbox": {
        const cb = field as PDFCheckBox;
        const checked = cb.isChecked();
        return { value: checked };
      }
      case "radio": {
        const rg = field as PDFRadioGroup;
        const selected = rg.getSelected(); // string | undefined
        const opts = rg.getOptions(); // string[]
        return {
          value: selected ?? null,
          options: opts,
          groups: opts,
          selected: selected ?? null,
        };
      }
      case "dropdown": {
        const dd = field as PDFDropdown;
        const opts = dd.getOptions();
        // getSelected() returns string[] (even for single select)
        const sel = dd.getSelected();
        const selected = sel?.length ? (sel.length === 1 ? sel[0] : sel) : null;
        return {
          value: selected,
          options: opts,
          selected,
        };
      }
      case "optionList": {
        const ol = field as PDFOptionList;
        const opts = ol.getOptions();
        const sel = ol.getSelected(); // string[]
        const selected = sel?.length ? sel : null;
        return {
          value: selected,
          options: opts,
          selected,
        };
      }
      case "button": {
        // buttons usually don't have "value" in the same way; we expose null
        return { value: null };
      }
      case "signature": {
        // signatures: we can’t reliably extract signer info without deeper parsing;
        // expose null value, but keep field present.
        return { value: null };
      }
      default: {
        // best-effort: try common methods if present
        const anyField = field as any;
        const raw: Record<string, unknown> = {};
        if (typeof anyField.getText === "function") raw["getText"] = anyField.getText();
        if (typeof anyField.getSelected === "function") raw["getSelected"] = anyField.getSelected();
        if (typeof anyField.isChecked === "function") raw["isChecked"] = anyField.isChecked();
        return { value: null, raw };
      }
    }
  } catch (e) {
    // never crash extraction; return best-effort null and include error in raw
    return {
      value: null,
      raw: { error: safeString(e) },
    };
  }
}

function extractFlags(field: any): Pick<ExtractedField, "readOnly" | "required"> {
  // pdf-lib has these on most field types, but we guard heavily
  const anyField = field as any;
  const out: { readOnly?: boolean; required?: boolean } = {};

  try {
    if (typeof anyField.isReadOnly === "function") out.readOnly = !!anyField.isReadOnly();
  } catch {
    // ignore
  }

  try {
    if (typeof anyField.isRequired === "function") out.required = !!anyField.isRequired();
  } catch {
    // ignore
  }

  return out;
}

async function loadPdfBytes(pdfPath: string): Promise<Uint8Array> {
  const abs = resolve(pdfPath);
  if (!existsSync(abs)) fail(`PDF file not found: ${abs}`);

  try {
    return await readFile(abs);
  } catch (e) {
    fail(`Failed to read PDF: ${abs}\n${safeString(e)}`);
  }
}

async function main() {
  const { pdfPath, outPath, password, pretty } = parseArgs(process.argv);
  const pdfBytes = await loadPdfBytes(pdfPath);

  let pdfDoc: PDFDocument;

  try {
    // pdf-lib LoadOptions: updateMetadata, ignoreEncryption, parseSpeed, etc. No password support.
    pdfDoc = await PDFDocument.load(pdfBytes, {
      updateMetadata: false,
      ignoreEncryption: false,
    });
  } catch (e) {
    const msg = safeString(e);
    if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("encrypted")) {
      fail(
        `Could not open PDF (possibly encrypted). Try providing --password.\nDetails: ${msg}`
      );
    }
    fail(`Could not parse PDF.\nDetails: ${msg}`);
  }

  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const extracted: ExtractedField[] = fields.map((f) => {
    const name = (() => {
      try {
        return f.getName();
      } catch {
        return "(unknown-name)";
      }
    })();

    const kind = detectKind(f);
    const flags = extractFlags(f);
    const valuePack = extractValue(f, kind);

    // Normalize options to strings (pdf-lib returns string[] but stay defensive)
    const options = valuePack.options ? uniqueStrings(valuePack.options.map(safeString)) : undefined;

    // normalize selected:
    let selected: string | string[] | null | undefined = valuePack.selected as any;
    if (Array.isArray(selected)) selected = selected.map(safeString);

    // normalize value:
    let value: ExtractedField["value"] = valuePack.value as any;
    if (Array.isArray(value)) value = value.map(safeString);
    if (typeof value === "string") value = value;

    return {
      name,
      fieldName: "",
      kind,
      value,
      ...flags,
      ...(options ? { options } : {}),
      ...(selected !== undefined ? { selected } : {}),
      ...(valuePack.groups ? { groups: uniqueStrings(valuePack.groups.map(safeString)) } : {}),
      ...(valuePack.raw ? { raw: valuePack.raw } : {}),
    };
  });

  const outputObj = {
    pdf: resolve(pdfPath),
    fieldCount: extracted.length,
    fields: extracted,
  };

  // Always write to a file: use --out path or default scripts/output/<pdf-basename>.json
  const outFile =
    outPath ?? join(process.cwd(), "scripts", "output", basename(pdfPath, ".pdf") + ".json");
  const absOut = resolve(outFile);
  const indent = pretty ? 2 : 0;
  const json = JSON.stringify(outputObj, null, indent);

  try {
    await mkdir(dirname(absOut), { recursive: true });
    await writeFile(absOut, json, "utf8");
    console.log(`Wrote ${extracted.length} fields to ${absOut}`);
  } catch (e) {
    fail(`Failed to write output file: ${absOut}\n${safeString(e)}`);
  }

  // Helpful note if no fields
  if (extracted.length === 0) {
    console.error(
      "Note: No AcroForm fields were found. If this PDF is a 'flat' form (just text), there are no fields to extract."
    );
  }
}

main().catch((e) => {
  fail(`Unexpected failure:\n${safeString(e)}`);
});