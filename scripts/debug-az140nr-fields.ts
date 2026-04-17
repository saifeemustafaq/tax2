#!/usr/bin/env tsx
/**
 * Debug script: fills every AZ 140NR AcroForm field with its own field name
 * and saves a debug PDF. Also outputs a sorted layout report showing each
 * field's physical position (page, x, y).
 *
 * Usage (from project root):
 *   npx tsx scripts/debug-az140nr-fields.ts
 *
 * Output:
 *   scripts/output/az140nr-debug.pdf   — PDF with field names filled in
 *   scripts/output/az140nr-layout.json  — fields sorted by page + visual position
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PDFDocument,
  PDFTextField,
  PDFCheckBox,
  PDFRadioGroup,
  StandardFonts,
} from "pdf-lib";

const PDF_PATH = resolve("public/forms/empty/az140nr.pdf");
const DEBUG_PDF_OUT = resolve("scripts/output/az140nr-debug.pdf");
const LAYOUT_OUT = resolve("scripts/output/az140nr-layout.json");

async function main() {
  await mkdir(resolve("scripts/output"), { recursive: true });

  const bytes = await readFile(PDF_PATH);
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const fields = form.getFields();

  type FieldLayout = {
    name: string;
    kind: string;
    page: number;
    x: number;
    y: number;
    yFromTop: number;
    width: number;
    height: number;
  };

  const layout: FieldLayout[] = [];

  for (const field of fields) {
    const name = field.getName();
    const kind = field.constructor.name.replace("PDF", "").replace("Field", "").toLowerCase();

    try {
      const widgets = (field as any).acroField.getWidgets();
      for (const widget of widgets) {
        const rect = widget.getRectangle();
        const pageRef = widget.P();
        let pageIndex = 0;
        if (pageRef) {
          const pages = pdf.getPages();
          for (let i = 0; i < pages.length; i++) {
            if (pages[i].ref === pageRef) {
              pageIndex = i;
              break;
            }
          }
        }
        const pageHeight = pdf.getPage(pageIndex).getHeight();
        layout.push({
          name,
          kind,
          page: pageIndex + 1,
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          yFromTop: Math.round(pageHeight - rect.y - rect.height),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    } catch {
      // Field has no widget — skip
    }
  }

  layout.sort(
    (a, b) =>
      a.page - b.page ||
      a.yFromTop - b.yFromTop ||
      a.x - b.x
  );

  await writeFile(LAYOUT_OUT, JSON.stringify(layout, null, 2), "utf8");
  console.log(`\nLayout report written to: ${LAYOUT_OUT}`);

  console.log("\n── Field layout (visual top-to-bottom, page by page) ──");
  let currentPage = 0;
  for (const f of layout) {
    if (f.page !== currentPage) {
      currentPage = f.page;
      console.log(`\n  ── Page ${currentPage} ──`);
    }
    console.log(
      `  [${f.name.padEnd(40)}] kind=${f.kind.padEnd(10)} ` +
      `page=${f.page} top=${String(f.yFromTop).padStart(4)} left=${String(f.x).padStart(4)} ` +
      `w=${String(f.width).padStart(4)} h=${String(f.height).padStart(3)}`
    );
  }

  // Fill every text field with its name for visual inspection
  const pdf2 = await PDFDocument.load(bytes);
  const form2 = pdf2.getForm();

  for (const field of form2.getFields()) {
    const name = field.getName();
    try {
      if (field instanceof PDFTextField) {
        field.setText(name);
      } else if (field instanceof PDFCheckBox) {
        field.check();
      } else if (field instanceof PDFRadioGroup) {
        const opts = field.getOptions();
        if (opts.length > 0) field.select(opts[0]);
      }
    } catch {
      // skip
    }
  }

  const font = await pdf2.embedFont(StandardFonts.Helvetica);
  form2.updateFieldAppearances(font);

  const filledBytes = await pdf2.save();
  await writeFile(DEBUG_PDF_OUT, filledBytes);
  console.log(`\nDebug PDF written to: ${DEBUG_PDF_OUT}`);
  console.log("Open it to verify each field name appears in the correct visual box.\n");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
