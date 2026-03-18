import { MongoClient, Db } from "mongodb";

let mongodbClient: MongoClient | null = null;
let mongodbDb: Db | null = null;

export async function getMongoDB(): Promise<Db> {
  if (!mongodbDb) {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017";
    const dbName = process.env.MONGODB_DB || "polymarket_impulse";
    mongodbClient = new MongoClient(uri);
    await mongodbClient.connect();
    mongodbDb = mongodbClient.db(dbName);
  }
  return mongodbDb;
}
