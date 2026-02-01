import { z } from "zod";

export const ingestCompanySchema = z.object({
    company_name: z.string(),
    primary_url: z.string().url(),
    competitors: z.array(
        z.object({
            name: z.string(),
            url: z.string().url()
        })
    ).optional()
});

export type IngestCompanyInput = z.infer<
    typeof ingestCompanySchema
>;
