import { getSql } from "../../../db/postgres";

export const runtime = "nodejs";

const categories = new Set([
  "Phones & Electronics",
  "Wallets & Bags",
  "Keys",
  "ID Cards & Documents",
  "Jewellery",
  "Clothing",
  "Books",
  "Accessories",
  "Other",
]);
const contactPattern = /^(?:[^\s@]+@[^\s@]+\.[^\s@]+|\+?[0-9][0-9\s().-]{5,}[0-9])$/;

export async function GET() {
  try {
    const sql = await getSql();
    const items = await sql`
      SELECT id, reference, title, report_type AS "reportType", category,
        description, location, incident_date AS "incidentDate",
        image_data AS "imageData", image_alt_text AS "imageAltText",
        created_at AS "createdAt"
      FROM item_reports ORDER BY created_at DESC LIMIT 100
    `;
    return Response.json({ items });
  } catch {
    return Response.json({ error: "Unable to load reports" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const value = (key: string) =>
      typeof payload[key] === "string" ? payload[key].trim() : "";
    const required = [
      "title",
      "reportType",
      "category",
      "description",
      "location",
      "incidentDate",
      "reporterContact",
    ];
    const missing = required.find((key) => !value(key));
    if (missing)
      return Response.json({ error: `${missing} is required` }, { status: 400 });

    const reportType = value("reportType");
    const category = value("category");
    const incidentDate = value("incidentDate");
    if (!contactPattern.test(value("reporterContact")))
      return Response.json(
        { error: "Please enter a valid email address or phone number." },
        { status: 400 },
      );
    if (!(["lost", "found"] as string[]).includes(reportType))
      return Response.json({ error: "Invalid report type" }, { status: 400 });
    if (!categories.has(category))
      return Response.json({ error: "Invalid category" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(incidentDate))
      return Response.json({ error: "Invalid incident date" }, { status: 400 });
    const parsedDate = new Date(`${incidentDate}T00:00:00Z`);
    if (
      Number.isNaN(parsedDate.getTime()) ||
      incidentDate > new Date().toISOString().slice(0, 10)
    )
      return Response.json(
        { error: "Incident date cannot be in the future" },
        { status: 400 },
      );

    const imageData = value("imageData");
    if (imageData && imageData.length > 2_100_000)
      return Response.json({ error: "Image is too large" }, { status: 413 });
    if (imageData && !/^data:image\/(jpeg|png|webp);base64,/i.test(imageData))
      return Response.json(
        {
          error:
            "Unsupported file type. Please upload a JPEG, PNG, or WebP image.",
        },
        { status: 400 },
      );

    const sql = await getSql();
    const year = new Date().getFullYear();
    const reference = `LF-${year}-${String(Date.now()).slice(-8)}`;
    const imageAltText =
      value("imageAltText") || (imageData ? "Uploaded image of reported item" : "");
    const [item] = await sql`
      INSERT INTO item_reports (
        reference, title, report_type, category, description, location,
        incident_date, image_data, image_alt_text, private_verification_detail,
        reporter_contact
      ) VALUES (
        ${reference}, ${value("title").slice(0, 150)}, ${reportType},
        ${category}, ${value("description").slice(0, 2000)},
        ${value("location").slice(0, 255)}, ${incidentDate},
        ${imageData || null}, ${imageAltText.slice(0, 300)},
        ${value("privateVerificationDetail").slice(0, 1000) || null},
        ${value("reporterContact").slice(0, 255)}
      )
      RETURNING id, reference, title, report_type AS "reportType", category,
        description, location, incident_date AS "incidentDate",
        image_data AS "imageData", image_alt_text AS "imageAltText",
        created_at AS "createdAt"
    `;
    return Response.json({ item }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to save report" }, { status: 500 });
  }
}
