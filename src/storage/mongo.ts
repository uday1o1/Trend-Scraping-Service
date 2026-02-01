import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI!;
if (!uri) {
    throw new Error("MONGO_URI not set");
}

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

export async function getDb() {
    if (!clientPromise) {
        client = new MongoClient(uri, {
            serverSelectionTimeoutMS: 10000
        });
        clientPromise = client.connect();
    }

    const connectedClient = await clientPromise;
    return connectedClient.db("hackthestack");
}
