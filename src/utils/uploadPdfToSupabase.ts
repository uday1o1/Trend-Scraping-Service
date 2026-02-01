import fs from "fs";
import path from "path";
import { supabase } from "../storage/supabase";

export async function uploadPdfToSupabase(
    companyId: string,
    localFilePath: string
): Promise<string> {
    const fileName = path.basename(localFilePath);
    const storagePath = `${companyId}/${Date.now()}-${fileName}`;

    const fileBuffer = fs.readFileSync(localFilePath);

    const { error } = await supabase.storage
        .from("upload")
        .upload(storagePath, fileBuffer, {
            contentType: "application/pdf"
        });

    if (error) throw error;

    return storagePath;
}
