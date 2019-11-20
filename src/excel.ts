/*
 * src/excel.ts
 * LeadershipTrakcer - Martial arts attendance logger
 *
 * Copyright (c) 2019, John Nunley and Larson Rivera
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this
 *    list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// read in information from an excel spreadsheet into the database
import * as excel from "exceljs";

import { exists } from "./promises";
import { query } from "./sql";

export async function readSpreadsheet(filename: string): Promise<void> {
  if (!(await exists(filename))) {
    console.log(`File ${filename} does not exist`);
    return;
  }

  const workbook = new excel.Workbook();
  try {
    await workbook.xlsx.readFile(filename);
  } catch (err) {
    console.log(`Unable to read xlsx file: ${err}`);
    return;
  }

  // run function on each worksheet
  workbook.eachSheet((worksheet: excel.Worksheet) => {
    // read each row of the sheet
    worksheet.eachRow((row: excel.Row) => {

    });
  });
}