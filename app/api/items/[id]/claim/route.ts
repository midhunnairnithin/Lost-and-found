import { getSql } from "../../../../../db/postgres";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0)
      return Response.json({ error: "Invalid item" }, { status: 400 });
    const payload = (await request.json()) as Record<string, unknown>;
    const value = (key: string) =>
      typeof payload[key] === "string" ? payload[key].trim() : "";
    if (
      !value("claimantName") ||
      !value("claimantContact") ||
      !value("ownershipDetails")
    )
      return Response.json({ error: "All fields are required" }, { status: 400 });

    const sql = await getSql();
    const [item] = await sql`
      SELECT id FROM item_reports WHERE id = ${itemId} LIMIT 1
    `;
    if (!item)
      return Response.json({ error: "Item not found" }, { status: 404 });

    await sql`
      INSERT INTO item_claims (
        item_id, claimant_name, claimant_contact, ownership_details
      ) VALUES (
        ${itemId}, ${value("claimantName").slice(0, 150)},
        ${value("claimantContact").slice(0, 255)},
        ${value("ownershipDetails").slice(0, 2000)}
      )
    `;
    return Response.json({ message: "Claim submitted" }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to submit claim" }, { status: 500 });
  }
}
