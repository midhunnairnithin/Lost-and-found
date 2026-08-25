export function formatReportDate(value) {
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateOnly) return "Date unavailable";
  const [, year, month, day] = dateOnly;
  return `${day}/${month}/${year}`;
}

export function uniqueReports(reports) {
  const seen = new Set();
  return reports.filter((item) => {
    const key = item.reference || String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
