import { randomUUID } from "crypto";
import "../src/config/env";
import express from "express";
import { ingestCompanySchema } from "./api/ingest";
import { startCompanyCrawlJob } from "./jobs/companyCrawl.job";

const app = express();
app.use(express.json());

console.log("🚀 Trend Scraper API booting…");

app.get("/health", (_, res) => {
    res.json({
        status: "ok",
        service: "trend-scraper",
        timestamp: new Date().toISOString()
    });
});

app.post("/ingest/company", async (req, res) => {
    console.log("📥 Incoming ingest request");

    const parsed = ingestCompanySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.format() });
    }

    const { company_name, primary_url, competitors } = parsed.data;
    const jobId = randomUUID();

    // Primary
    startCompanyCrawlJob({
        jobId,
        org_id: company_name,
        entity_id: company_name,
        entity_type: "primary",
        primary_url
    });

    // Competitors
    for (const competitor of competitors ?? []) {
        startCompanyCrawlJob({
            jobId: `${jobId}-${competitor.name}`,
            org_id: company_name,
            entity_id: competitor.name,
            entity_type: "competitor",
            primary_url: competitor.url
        });
    }

    return res.status(202).json({
        job_id: jobId,
        status: "queued",
        competitors_triggered: competitors?.length ?? 0
    });
});

export default app;
