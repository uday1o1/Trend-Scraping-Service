export function extractWebsiteSignals(markdown: string) {
    const lower = markdown.toLowerCase();

    return {
        pricing_mentions: (lower.match(/pricing|price|billing|usage/g) || []).length,
        enterprise_mentions: (lower.match(/enterprise|sales-led|custom pricing/g) || []).length,
        free_trial_mentions: (lower.match(/free trial|try for free/g) || []).length,
        compliance_mentions: (lower.match(/soc2|gdpr|iso/g) || []).length,
        product_mentions: (lower.match(/product|platform|solution/g) || []).length
    };
}
