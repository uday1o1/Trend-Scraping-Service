import { MongoClient } from "mongodb";

let client: MongoClient;

export async function getDb() {
    if (!client) {
        client = new MongoClient(process.env.MONGO_URI!);
        await client.connect();
    }
    return client.db("hackthestack");
}
