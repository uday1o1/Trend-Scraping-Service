import "./config/env";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { ingestCompanySchema } from "./api/ingest";
import { startCompanyCrawlJob } from "./jobs/companyCrawl.job";

const app = express();
app.use(express.json());

console.log("====================================");
console.log("🚀 Trend Scraping Service starting…");
console.log("====================================");

/**
 * Health check (judges sometimes hit this)
 */
app.get("/health", (_, res) => {
    res.json({
        status: "ok",
        service: "trend-scraper",
        timestamp: new Date().toISOString()
    });
});

/**
 * MAIN INGEST ENDPOINT
 * Triggers crawl for primary company + competitors
 */
app.post("/ingest/company", async (req, res) => {
    console.log("\n📥 Incoming ingest request");
    console.log("Payload:", JSON.stringify(req.body, null, 2));

    const parsed = ingestCompanySchema.safeParse(req.body);

    if (!parsed.success) {
        console.error("❌ Invalid request body");
        return res.status(400).json({
            error: parsed.error.format()
        });
    }

    const { company_name, primary_url, competitors } = parsed.data;

    const jobId = uuidv4();

    console.log("------------------------------------");
    console.log("🆔 Job ID:", jobId);
    console.log("🏢 Org:", company_name);
    console.log("🌐 Primary URL:", primary_url);
    console.log(
        "🧩 Competitors:",
        competitors?.map(c => c.name) ?? []
    );
    console.log("------------------------------------");

    // 🔹 PRIMARY COMPANY
    console.log("▶️ Triggering PRIMARY company crawl");
    startCompanyCrawlJob({
        jobId,
        org_id: company_name,
        entity_id: company_name,
        entity_type: "primary",
        primary_url
    });

    // 🔹 COMPETITORS
    for (const competitor of competitors ?? []) {
        console.log(
            `▶️ Triggering COMPETITOR crawl: ${competitor.name}`
        );

        startCompanyCrawlJob({
            jobId: `${jobId}-${competitor.name}`,
            org_id: company_name,
            entity_id: competitor.name,
            entity_type: "competitor",
            primary_url: competitor.url
        });
    }

    console.log("✅ All jobs queued (async)");
    console.log("------------------------------------");

    return res.status(202).json({
        job_id: jobId,
        status: "queued",
        competitors_triggered: competitors?.length ?? 0
    });
});

/**
 * Server start
 */
const PORT = 3000;
app.listen(PORT, () => {
    console.log("====================================");
    console.log(`✅ Server listening on port ${PORT}`);
    console.log("🔁 Ready to ingest companies");
    console.log("====================================");
});
