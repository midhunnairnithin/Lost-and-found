import { database } from "../../../db/runtime";
const publicFields =
  "id, reference, title, report_type AS reportType, category, description, location, incident_date AS incidentDate, image_data AS imageData, image_alt_text AS imageAltText, created_at AS createdAt";
export async function GET() {
  try {
    const db = await database();
    const result = await db
      .prepare(
        `SELECT ${publicFields} FROM item_reports ORDER BY created_at DESC LIMIT 100`,
      )
      .all();
    return Response.json({ items: result.results });
  } catch {
    return Response.json({ error: "Unable to load reports" }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const p = (await request.json()) as Record<string, unknown>;
    const value = (key: string) =>
      typeof p[key] === "string" ? p[key].trim() : "";
    for (const key of [
      "title",
      "reportType",
      "category",
      "description",
      "location",
      "incidentDate",
      "reporterContact",
    ])
      if (!value(key))
        return Response.json({ error: `${key} is required` }, { status: 400 });
    const reportType = value("reportType");
    const incidentDate = value("incidentDate");
    if (!["lost", "found"].includes(reportType))
      return Response.json({ error: "Invalid report type" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate))
      return Response.json({ error: "Invalid incident date" }, { status: 400 });
    const parsedDate = new Date(`${incidentDate}T00:00:00Z`);
    if (Number.isNaN(parsedDate.getTime()) || incidentDate > new Date().toISOString().slice(0, 10))
      return Response.json({ error: "Incident date cannot be in the future" }, { status: 400 });
    const imageData = value("imageData");
    if (imageData && imageData.length > 2_100_000)
      return Response.json({ error: "Image is too large" }, { status: 413 });
    if (imageData && !/^data:image\/(jpeg|png|webp);base64,/i.test(imageData))
      return Response.json({ error: "Unsupported image format" }, { status: 400 });
    const db = await database();
    const year = new Date().getFullYear();
    const reference = `LF-${year}-${String(Date.now()).slice(-5)}`;
    const createdAt = new Date().toISOString();
    const alt =
      value("imageAltText") || (imageData ? "Uploaded image of reported item" : "");
    const row = await db
      .prepare(
        "INSERT INTO item_reports (reference,title,report_type,category,description,location,incident_date,image_data,image_alt_text,private_verification_detail,reporter_contact,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id,reference,title,report_type AS reportType,category,description,location,incident_date AS incidentDate,image_data AS imageData,image_alt_text AS imageAltText,created_at AS createdAt",
      )
      .bind(
        reference,
        value("title").slice(0, 150),
        reportType,
        value("category").slice(0, 100),
        value("description").slice(0, 2000),
        value("location").slice(0, 255),
        incidentDate,
        imageData || null,
        alt.slice(0, 300),
        value("privateVerificationDetail").slice(0, 1000) || null,
        value("reporterContact").slice(0, 255),
        createdAt,
      )
      .first();
    return Response.json({ item: row }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to save report" }, { status: 500 });
  }
}
