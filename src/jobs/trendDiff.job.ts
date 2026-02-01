import { getDb } from "../storage/mongo";

export async function runTrendDiff(
    org_id: string,
    entity_id: string
) {
    const db = await getDb();

    const snapshots = await db
        .collection("website_signals")
        .find({ org_id, entity_id })
        .sort({ snapshot_time: -1 })
        .limit(2)
        .toArray();

    if (snapshots.length < 2) return;

    await db.collection("trend_events").insertOne({
        org_id,
        entity_id,
        detected_at: new Date(),
        change: "New snapshot detected"
    });
}
