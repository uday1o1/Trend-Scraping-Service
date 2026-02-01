const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY!;
const VOYAGE_EMBED_URL = "https://api.voyageai.com/v1/embeddings";
const MODEL = "voyage-3-lite";

/**
 * Generate an embedding for a text chunk using Voyage AI (REST API).
 */
export async function embedText(text: string): Promise<number[]> {
    const input = text.slice(0, 6000); // safety cap

    const res = await fetch(VOYAGE_EMBED_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${VOYAGE_API_KEY}`
        },
        body: JSON.stringify({
            model: MODEL,
            input
        })
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Voyage embedding failed: ${err}`);
    }

    const json = await res.json();
    return json.data[0].embedding as number[];
}
