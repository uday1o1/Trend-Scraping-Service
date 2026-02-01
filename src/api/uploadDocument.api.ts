import { Request, Response } from "express";
import { getDb } from "../storage/mongo";
import { uploadPdfToSupabase } from "../utils/uploadPdfToSupabase";
import { parsePdfFromSupabase } from "../jobs/documentParse.job";

/**
 * Upload a user-provided document and ingest it
 */
export async function uploadDocumentHandler(
    req: Request,
    res: Response
) {
    const { org_id, entity_id, entity_type } = req.body;
    const file = (req as any).file;

    if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const db = await getDb();

    const supabasePath = await uploadPdfToSupabase(
        org_id,
        file.path
    );

    await db.collection("documents").insertOne({
        org_id,
        entity_id,
        entity_type,
        source: "user_upload",
        original_url: null,
        supabase_path: supabasePath,
        uploaded_at: new Date()
    });

    await parsePdfFromSupabase(
        org_id,
        entity_id,
        entity_type,
        supabasePath
    );

    res.json({ status: "uploaded" });
}
