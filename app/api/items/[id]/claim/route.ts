import { database } from "../../../../../db/runtime";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const itemId = Number(id);
    if (!Number.isInteger(itemId) || itemId <= 0)
      return Response.json({ error: "Invalid item" }, { status: 400 });
    const p = (await request.json()) as Record<string, unknown>;
    const value = (key: string) =>
      typeof p[key] === "string" ? p[key].trim() : "";
    if (
      !value("claimantName") ||
      !value("claimantContact") ||
      !value("ownershipDetails")
    )
      return Response.json(
        { error: "All fields are required" },
        { status: 400 },
      );
    const db = await database();
    const item = await db
      .prepare("SELECT id FROM item_reports WHERE id = ? LIMIT 1")
      .bind(itemId)
      .first();
    if (!item)
      return Response.json({ error: "Item not found" }, { status: 404 });
    await db
      .prepare(
        "INSERT INTO item_claims (item_id,claimant_name,claimant_contact,ownership_details,created_at) VALUES (?,?,?,?,?)",
      )
      .bind(
        itemId,
        value("claimantName").slice(0, 150),
        value("claimantContact").slice(0, 255),
        value("ownershipDetails").slice(0, 2000),
        new Date().toISOString(),
      )
      .run();
    return Response.json({ message: "Claim submitted" }, { status: 201 });
  } catch {
    return Response.json({ error: "Unable to submit claim" }, { status: 500 });
  }
}
