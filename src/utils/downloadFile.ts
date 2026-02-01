import fs from "fs";
import https from "https";
import path from "path";

export async function downloadFile(url: string): Promise<string> {
    const fileName = path.basename(url.split("?")[0]);
    const filePath = `/tmp/${fileName}`;

    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        https
            .get(url, response => {
                response.pipe(file);
                file.on("finish", () => {
                    file.close();
                    resolve(filePath);
                });
            })
            .on("error", reject);
    });
}
