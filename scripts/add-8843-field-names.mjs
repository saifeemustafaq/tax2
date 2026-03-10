#!/usr/bin/env node
/**
 * Add fieldName to each field in f8843.json using Form 8843 layout
 * and existing placeholder values.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "output", "f8843.json");

const nameToFieldName = {
  "topmostSubform[0].Page1[0].Pg1Header[0].f1_1[0]": "Tax year beginning (from)",
  "topmostSubform[0].Page1[0].Pg1Header[0].f1_2[0]": "Tax year ending month",
  "topmostSubform[0].Page1[0].Pg1Header[0].f1_3[0]": "Tax year (2-digit year)",
  "topmostSubform[0].Page1[0].f1_4[0]": "First name and initial",
  "topmostSubform[0].Page1[0].f1_5[0]": "Last name",
  "topmostSubform[0].Page1[0].f1_6[0]": "Identifying number (TIN)",
  "topmostSubform[0].Page1[0].f1_7[0]": "Address in country of residence",
  "topmostSubform[0].Page1[0].f1_8[0]": "Address in the United States",
  "topmostSubform[0].Page1[0].f1_9[0]": "Type of U.S. visa",
  "topmostSubform[0].Page1[0].f1_10[0]": "Current nonimmigrant status",
  "topmostSubform[0].Page1[0].f1_11[0]": "Country(ies) of citizenship",
  "topmostSubform[0].Page1[0].f1_12[0]": "Country(ies) that issued passport",
  "topmostSubform[0].Page1[0].f1_13[0]": "Passport number(s)",
  "topmostSubform[0].Page1[0].f1_14[0]": "Days present in US (current year)",
  "topmostSubform[0].Page1[0].f1_15[0]": "Days present in US (1st prior year)",
  "topmostSubform[0].Page1[0].f1_16[0]": "Days present in US (2nd prior year)",
  "topmostSubform[0].Page1[0].f1_17[0]": "Days in current year you claim to exclude",
  "topmostSubform[0].Page1[0].f1_18[0]": "Part 2 Point 5 Teachers/trainees - 1",
  "topmostSubform[0].Page1[0].f1_19[0]": "Part 2 Point 5 Teachers/trainees - 2",
  "topmostSubform[0].Page1[0].f1_20[0]": "Part 2 Point 5 Teachers/trainees - 3",
  "topmostSubform[0].Page1[0].f1_21[0]": "Part 2 Point 6 - 1",
  "topmostSubform[0].Page1[0].f1_22[0]": "Part 2 Point 6 - 2",
  "topmostSubform[0].Page1[0].f1_23[0]": "Part 2 Point 6 - 3",
  "topmostSubform[0].Page1[0].f1_24[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].f1_25[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].f1_26[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].f1_27[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].f1_28[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].f1_29[0]": "Part 2 extra",
  "topmostSubform[0].Page1[0].c1_1[0]": "Part 3 Yes/No 1",
  "topmostSubform[0].Page1[0].c1_1[1]": "Part 3 Yes/No 1 (second)",
  "topmostSubform[0].Page1[0].f1_30[0]": "Part 3 Point 9 Field 1",
  "topmostSubform[0].Page1[0].f1_31[0]": "Part 3 Point 9 Field 2",
  "topmostSubform[0].Page1[0].f1_32[0]": "Part 3 Point 9 Field 3",
  "topmostSubform[0].Page1[0].f1_33[0]": "Director name/address/phone - 1",
  "topmostSubform[0].Page1[0].f1_34[0]": "Director name/address/phone - 2",
  "topmostSubform[0].Page1[0].f1_35[0]": "Director name/address/phone - 3",
  "topmostSubform[0].Page1[0].f1_36[0]": "Part 3 B - 1",
  "topmostSubform[0].Page1[0].f1_37[0]": "Part 3 B - 2",
  "topmostSubform[0].Page1[0].f1_38[0]": "Part 3 B - 3",
  "topmostSubform[0].Page1[0].f1_39[0]": "Part 3 B - 4",
  "topmostSubform[0].Page1[0].f1_40[0]": "Part 3 B - 5",
  "topmostSubform[0].Page1[0].f1_41[0]": "Part 3 B - 6",
  "topmostSubform[0].Page1[0].c1_2[0]": "Part 3 Yes/No 2",
  "topmostSubform[0].Page1[0].c1_2[1]": "Part 3 Yes/No 2 (second)",
  "topmostSubform[0].Page1[0].c1_3[0]": "Part 3 Yes/No 3",
  "topmostSubform[0].Page1[0].c1_3[1]": "Part 3 Yes/No 3 (second)",
  "topmostSubform[0].Page1[0].f1_42[0]": "Part 3 Point 14 Explain - 1",
  "topmostSubform[0].Page1[0].f1_43[0]": "Part 3 Point 14 Explain - 2",
  "topmostSubform[0].Page1[0].f1_44[0]": "Part 3 Point 14 Explain - 3",
  "topmostSubform[0].Page2[0].f2_1[0]": "Part 4 Point 15 Professional Athletes - 1",
  "topmostSubform[0].Page2[0].f2_2[0]": "Part 4 Point 15 - 2",
  "topmostSubform[0].Page2[0].f2_3[0]": "Part 4 Point 15 - 3",
  "topmostSubform[0].Page2[0].f2_4[0]": "Part 4 Point 16 - 1",
  "topmostSubform[0].Page2[0].f2_5[0]": "Part 4 Point 16 - 2",
  "topmostSubform[0].Page2[0].f2_6[0]": "Part 4 Point 16 - 3",
  "topmostSubform[0].Page2[0].f2_7[0]": "Part 5 Point 17A Medical - 1",
  "topmostSubform[0].Page2[0].f2_8[0]": "Part 5 Point 17A - 2",
  "topmostSubform[0].Page2[0].f2_9[0]": "Part 5 Point 17A - 3",
  "topmostSubform[0].Page2[0].f2_10[0]": "Part 5 Point 17A - 4",
  "topmostSubform[0].Page2[0].f2_11[0]": "Part 5 Point 17b",
  "topmostSubform[0].Page2[0].f2_12[0]": "Part 5 Point 17c",
  "topmostSubform[0].Page2[0].f2_13[0]": "Point 18 Physician - Name of taxpayer",
  "topmostSubform[0].Page2[0].f2_14[0]": "Point 18 Physician name",
  "topmostSubform[0].Page2[0].f2_15[0]": "Point 18 Physician address and phone",
};

const data = JSON.parse(readFileSync(jsonPath, "utf8"));
for (const field of data.fields) {
  field.fieldName = nameToFieldName[field.name] ?? "";
}
writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
console.log("Updated fieldName for", data.fields.length, "fields.");
