#!/usr/bin/env node
/**
 * Add fieldName to each field in f1040nro.json per Schedule OI (Form 1040-NR) layout.
 * See docs/FORM_AUTOFILL.md and the form instructions.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jsonPath = join(__dirname, "output", "f1040nro.json");

const nameToFieldName = {
  "form1040-NR[0].Page1[0].f1_1[0]": "Name shown on Form 1040-NR",
  "form1040-NR[0].Page1[0].f1_2[0]": "Your identifying number",
  "form1040-NR[0].Page1[0].f1_3[0]": "A Country(ies) citizen or national during tax year",
  "form1040-NR[0].Page1[0].f1_4[0]": "B Country of tax residence",
  "form1040-NR[0].Page1[0].c1_1[0]": "D1 Were you ever a U.S. citizen Yes",
  "form1040-NR[0].Page1[0].c1_1[1]": "D1 Were you ever a U.S. citizen No",
  "form1040-NR[0].Page1[0].c1_2[0]": "D2 Green card holder Yes",
  "form1040-NR[0].Page1[0].c1_2[1]": "D2 Green card holder No",
  "form1040-NR[0].Page1[0].c1_3[0]": "C Applied for green card Yes",
  "form1040-NR[0].Page1[0].c1_3[1]": "C Applied for green card No",
  "form1040-NR[0].Page1[0].f1_5[0]": "C If yes explain",
  "form1040-NR[0].Page1[0].c1_4[0]": "F Changed visa type Yes",
  "form1040-NR[0].Page1[0].c1_4[1]": "F Changed visa type No",
  "form1040-NR[0].Page1[0].f1_6[0]": "F Date and nature of change",
  "form1040-NR[0].Page1[0].c1_5[0]": "E Subject to tax in foreign country Yes",
  "form1040-NR[0].Page1[0].c1_5[1]": "E Subject to tax in foreign country No",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow1[0].f1_7[0]": "G Row1 Visa type or date entered",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow1[0].f1_8[0]": "G Row1 Date departed",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow2[0].f1_9[0]": "G Row2 Date entered",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow2[0].f1_10[0]": "G Row2 Date departed",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow3[0].f1_11[0]": "G Row3 Date entered",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow3[0].f1_12[0]": "G Row3 Date departed",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow4[0].f1_13[0]": "G Row4 Date entered",
  "form1040-NR[0].Page1[0].LineG_Table1[0].BodyRow4[0].f1_14[0]": "G Row4 Date departed",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow1[0].f1_15[0]": "G Table2 Row1 Type",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow1[0].f1_16[0]": "G Table2 Row1 Date changed",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow2[0].f1_17[0]": "G Table2 Row2 Type",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow2[0].f1_18[0]": "G Table2 Row2 Date changed",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow3[0].f1_19[0]": "G Table2 Row3 Type",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow3[0].f1_20[0]": "G Table2 Row3 Date changed",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow4[0].f1_21[0]": "G Table2 Row4 Type",
  "form1040-NR[0].Page1[0].LineG_Table2[0].BodyRow4[0].f1_22[0]": "G Table2 Row4 Date changed",
  "form1040-NR[0].Page1[0].f1_23[0]": "H Days in US 2025",
  "form1040-NR[0].Page1[0].f1_24[0]": "H Days in US 2024",
  "form1040-NR[0].Page1[0].f1_25[0]": "H Days in US 2023",
  "form1040-NR[0].Page1[0].c1_6[0]": "L Treaty benefits Yes",
  "form1040-NR[0].Page1[0].c1_6[1]": "L Treaty benefits No",
  "form1040-NR[0].Page1[0].f1_26[0]": "I Latest year and form number filed",
  "form1040-NR[0].Page1[0].c1_7[0]": "I Filed prior year return Yes",
  "form1040-NR[0].Page1[0].c1_7[1]": "I Filed prior year return No",
  "form1040-NR[0].Page1[0].c1_8[0]": "J Filing for a trust Yes",
  "form1040-NR[0].Page1[0].c1_8[1]": "J Filing for a trust No",
  "form1040-NR[0].Page1[0].c1_9[0]": "J Trust sub-question Yes",
  "form1040-NR[0].Page1[0].c1_9[1]": "J Trust sub-question No",
  "form1040-NR[0].Page1[0].c1_10[0]": "K Compensation 250k or more Yes",
  "form1040-NR[0].Page1[0].c1_10[1]": "K Compensation 250k or more No",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow1[0].f1_27[0]": "L1 Row1 Country",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow1[0].f1_28[0]": "L1 Row1 Treaty article",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow1[0].f1_29[0]": "L1 Row1 Months prior years",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow1[0].f1_30[0]": "L1 Row1 Amount exempt",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow2[0].f1_31[0]": "L1 Row2 Country",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow2[0].f1_32[0]": "L1 Row2 Treaty article",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow2[0].f1_33[0]": "L1 Row2 Months prior years",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow2[0].f1_34[0]": "L1 Row2 Amount exempt",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow3[0].f1_35[0]": "L1 Row3 Country",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow3[0].f1_36[0]": "L1 Row3 Treaty article",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow3[0].f1_37[0]": "L1 Row3 Months prior years",
  "form1040-NR[0].Page1[0].LineL1_Table[0].BodyRow3[0].f1_38[0]": "L1 Row3 Amount exempt",
  "form1040-NR[0].Page1[0].f1_39[0]": "L Additional explanation",
  "form1040-NR[0].Page1[0].c1_11[0]": "L2 Subject to tax in foreign country Yes",
  "form1040-NR[0].Page1[0].c1_11[1]": "L2 Subject to tax in foreign country No",
  "form1040-NR[0].Page1[0].c1_12[0]": "L3 Competent Authority Yes",
  "form1040-NR[0].Page1[0].c1_12[1]": "L3 Competent Authority No",
  "form1040-NR[0].Page1[0].c1_13[0]": "M1 First year 871(d) election",
  "form1040-NR[0].Page1[0].c1_14[0]": "M2 Prior year 871(d) election not revoked",
};

const data = JSON.parse(readFileSync(jsonPath, "utf8"));
for (const field of data.fields) {
  field.fieldName = nameToFieldName[field.name] ?? "";
}
writeFileSync(jsonPath, JSON.stringify(data, null, 2), "utf8");
console.log("Updated fieldName for", data.fields.length, "Schedule OI fields.");
