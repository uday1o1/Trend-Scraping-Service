import dotenv from "dotenv";

dotenv.config();

export const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;

if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY is not set");
}
