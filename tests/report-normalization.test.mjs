import assert from "node:assert/strict";
import test from "node:test";

import { formatReportDate, uniqueReports } from "../lib/reports.mjs";

test("Postgres timestamp dates render without time fragments", () => {
  assert.equal(formatReportDate("2026-08-18T00:00:00.000Z"), "18/08/2026");
  assert.equal(formatReportDate("2026-08-18"), "18/08/2026");
  assert.equal(formatReportDate("not-a-date"), "Date unavailable");
});

test("community reports render each reference once", () => {
  const reports = [
    { id: 1, reference: "FA-100" },
    { id: 1, reference: "FA-100" },
    { id: 2, reference: "FA-101" },
  ];
  assert.deepEqual(uniqueReports(reports), [reports[0], reports[2]]);
});
