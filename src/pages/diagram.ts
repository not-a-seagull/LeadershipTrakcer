/*
 * src/pages/diagram.ts
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

// leaderboard generator
import * as nunjucks from "nunjucks";

import { Attendance, AttendanceList } from "./../attendance";
import { EventRecord } from "./../eventRecord";
import { Nullable } from "./../utils";
import { Student } from "./../student";

nunjucks.configure({ autoescape: false });

const limit = 50;

const numEvents = 8;

const tableHeader =
    `<div id="errorMessage"></div>
     <table border="1" id="diagram-table">
       <tr>
         <th>Name</th>
         {{ event_names }}
         <th>Leadership Points (Quarterly)</th>
       </tr>`; 
const eventName = "<th>{{ event_name }}</th>";
const tableBody = 
    `  <tr>
         <form id="event-diagram-{{studentId}}">
           <td>{{ name }}</td>
           {{ events }}
           <td>{{ leadershipPoints }}</td>
         </form>
       </tr>`;
const eventBody = 
  `<td>
     <input type="checkbox" class="event-checkbox-{{eventId}}" {{ disabled }} name="event-checkbox-{{eventId}}" {{checked}} />
   </td>`;
const tableEnd = 
    `</table>

     <form id="submit-form"><p><input type="button" id="submit" value="Submit" class="vanished"/></p></form>

     <div id="diagram-pager" class="{{ total_page_num }}"></div>`;

export default async function getDiagramHTML(
  page: number, 
  eventPage: number, 
  eventsPerPage: number,
  accessStudentId: Array<number> | string
): Promise<string> {
  // sew it all together
  let parts = [];

  let promises = [];

  // load both the most recent students and most recent events
  let results = await Promise.all([
    Student.loadAll(page, limit),
    EventRecord.loadAll(eventPage, eventsPerPage)
  ]);
  const students = results[0];
  const events = results[1];

  // iterate through events to setup names
  let eventNamesParts = [];
  for (const event of events) { 
    eventNamesParts.push(nunjucks.renderString(eventName, { event_name: event.eventName }));
  }
  parts.push(nunjucks.renderString(tableHeader, { event_names: eventNamesParts.join("") }));

  // also get the attendance record
  let eventAttendance: Array<AttendanceList> = await Promise.all(events.map(
    function(value: EventRecord): Promise<AttendanceList> {
      return Attendance.getAttendanceList(value.eventId);
    }
  ));

  if (students.length === 0) return "<p>No students yet...</p>";

  // functions to generate HTML  
  function generateEventCheckboxes(studentId: number): string {
    let checkboxes = [];
    let eventId, attendanceList;
    for (let i = 0; i < events.length; i++) {
      eventId = events[i].eventId;
      attendanceList = eventAttendance[i];

      // student id is key in the event list
      checkboxes.push(nunjucks.renderString(eventBody, {
        eventId: eventId,
        checked: (function() {
          if (attendanceList[studentId]) return "checked";
          else return "";
        })(),
        disabled: (function() {
          if (accessStudentId === "admin" || (<number[]>accessStudentId).indexOf(studentId) !== -1) return "";
          else return "disabled";
        })()
      })); 
    }
    return checkboxes.join("\n");
  }

  async function generateRow(index: number, student: Student): Promise<void> {
    //console.log(`StudentId is ${student.studentId}`);
    const row = nunjucks.renderString(tableBody, {
      events: generateEventCheckboxes(student.studentId),
      name: `${student.first} ${student.last}`,
      leadershipPoints: await Attendance.getQuarterPoints(student.studentId),
      studentId: student.studentId
    });
    //console.log(row);
    parts[index] = row;
  }

  // generate promises
  for (let i = 0; i < students.length; i++) {
    promises.push(generateRow(i + 1, students[i]));
  }

  await Promise.all(promises);

  parts.push(nunjucks.renderString(tableEnd, { total_page_num: await EventRecord.numPages(eventsPerPage) }));
  const endResult = parts.join("\n");
  return endResult;
}
