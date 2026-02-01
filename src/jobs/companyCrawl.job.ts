import Firecrawl from "firecrawl";
import { FIRECRAWL_API_KEY } from "../config/env";
import { getDb } from "../storage/mongo";
import { downloadFile } from "../utils/downloadFile";
import { uploadPdfToSupabase } from "../utils/uploadPdfToSupabase";
import { parsePdfFromSupabase } from "./documentParse.job";
import { runTrendDiff } from "./trendDiff.job";
import { extractWebsiteSignals } from "./websiteSignals.job";

const firecrawl = new Firecrawl({
    apiKey: FIRECRAWL_API_KEY
});

type CompanyCrawlJob = {
    jobId: string;
    org_id: string;
    entity_id: string;
    entity_type: "primary" | "competitor";
    primary_url: string;
};

function normalizePdfUrl(url: string): string | null {
    if (url.includes("#url=")) {
        return decodeURIComponent(url.split("#url=")[1]);
    }
    return url.endsWith(".pdf") ? url : null;
}

function extractInternalLinks(
    markdown: string,
    baseUrl: string
): string[] {
    const matches =
        markdown.match(/\((https?:\/\/[^\s)]+)\)/g) || [];
    const host = new URL(baseUrl).host;

    return Array.from(
        new Set(
            matches
                .map(m => m.slice(1, -1))
                .filter(u => {
                    try {
                        const x = new URL(u);
                        return (
                            x.host === host &&
                            /pricing|product|solution|docs|blog|resource|security|compliance/i.test(
                                x.pathname
                            )
                        );
                    } catch {
                        return false;
                    }
                })
        )
    );
}

export async function startCompanyCrawlJob(job: CompanyCrawlJob) {
    process.nextTick(async () => {
        const db = await getDb();

        // 1️⃣ Homepage
        const result = await firecrawl.scrape(job.primary_url, {
            formats: ["markdown"]
        });

        await db.collection("raw_pages").insertOne({
            org_id: job.org_id,
            entity_id: job.entity_id,
            entity_type: job.entity_type,
            url: job.primary_url,
            content: result.markdown,
            source_type: "website",
            scraped_at: new Date()
        });

        const signals = extractWebsiteSignals(result.markdown);
        await db.collection("website_signals").insertOne({
            org_id: job.org_id,
            entity_id: job.entity_id,
            entity_type: job.entity_type,
            snapshot_time: new Date(),
            signals
        });

        // 2️⃣ Internal pages
        const pages = extractInternalLinks(
            result.markdown,
            job.primary_url
        ).slice(0, 5);

        for (const pageUrl of pages) {
            const pageResult = await firecrawl.scrape(pageUrl, {
                formats: ["markdown"]
            });

            await db.collection("raw_pages").insertOne({
                org_id: job.org_id,
                entity_id: job.entity_id,
                entity_type: job.entity_type,
                url: pageUrl,
                content: pageResult.markdown,
                source_type: "website",
                scraped_at: new Date()
            });

            const rawPdfLinks =
                pageResult.markdown?.match(/https?:\/\/[^\s]+\.pdf/gi) || [];

            const pdfLinks = Array.from(
                new Set(
                    rawPdfLinks
                        .map(normalizePdfUrl)
                        .filter((u): u is string => !!u)
                )
            );

            for (const pdfUrl of pdfLinks.slice(0, 3)) {
                const localPath = await downloadFile(pdfUrl);
                const supabasePath = await uploadPdfToSupabase(
                    job.org_id,
                    localPath
                );

                await db.collection("documents").insertOne({
                    org_id: job.org_id,
                    entity_id: job.entity_id,
                    entity_type: job.entity_type,
                    source: "firecrawl",
                    original_url: pdfUrl,
                    supabase_path: supabasePath,
                    uploaded_at: new Date()
                });

                await parsePdfFromSupabase(
                    job.org_id,
                    job.entity_id,
                    job.entity_type,
                    supabasePath
                );
            }
        }

        await runTrendDiff(job.org_id, job.entity_id);
    });
}
