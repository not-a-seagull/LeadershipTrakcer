// BSD LICENSE - c John Nunley and Larson Rivera

import { query } from './sql';

// initialize basic database schema
export async function initializeSchema(): Promise<void> {
  const studentTableSql = `CREATE TABLE IF NOT EXISTS Students (
                             studentId BIGSERIAL PRIMARY KEY,
                             first TEXT NOT NULL,
                             last TEXT NOT NULL,
                             belt TEXT NOT NULL,
                             rp INTEGER);`
  const userTableSql = `CREATE TABLE IF NOT EXISTS Users (
                          userId BIGSERIAL PRIMARY KEY,
                          username TEXT NOT NULL,
                          pwhash TEXT NOT NULL,
                          salt TEXT NOT NULL,
                          studentId INTEGER REFERENCES Students(studentId));`
  
  await query(studentTableSql, []);
  await query(userTableSql, []);
}