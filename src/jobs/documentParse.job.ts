import fs from "fs";
import path from "path";
import { reductoClient } from "../extractor/reducto";
import { supabase } from "../storage/supabase";
import { getDb } from "../storage/mongo";
import { embedText } from "../embeddings/voyage";

export async function parsePdfFromSupabase(
    org_id: string,
    entity_id: string,
    entity_type: "primary" | "competitor",
    supabasePath: string
) {
    const { data, error } = await supabase.storage
        .from("upload")
        .download(supabasePath);

    if (error || !data) throw error;

    const buffer = Buffer.from(await data.arrayBuffer());
    const tmp = `/tmp/${path.basename(supabasePath)}`;
    fs.writeFileSync(tmp, buffer);

    const upload = await reductoClient.upload({
        file: fs.createReadStream(tmp)
    });

    const parsed = (await reductoClient.parse.run({
        input: upload,
        formatting: { table_output_format: "md" }
    })) as any;

    const chunks = parsed.result?.chunks ?? parsed.chunks;
    if (!Array.isArray(chunks)) return;

    const db = await getDb();

    await db.collection("knowledge_chunks").deleteMany({
        org_id,
        entity_id,
        supabase_path: supabasePath
    });

    for (let i = 0; i < chunks.length; i++) {
        const content = chunks[i]?.content?.trim();
        if (!content || content.length < 20) continue;

        const embedding = await embedText(content);

        await db.collection("knowledge_chunks").insertOne({
            org_id,
            entity_id,
            entity_type,
            source: "document",
            supabase_path: supabasePath,
            chunk_index: i,
            content,
            embedding,
            embedding_model: "voyage-3-lite",
            created_at: new Date()
        });
    }
}
