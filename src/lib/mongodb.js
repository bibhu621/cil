import { MongoClient } from "mongodb";

let client;
let clientPromise;

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri || uri.includes("username:password")) {
    throw new Error("Please configure your valid MONGODB_URI in .env");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      client = new MongoClient(uri);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri);
      clientPromise = client.connect();
    }
  }

  const connectedClient = await clientPromise;
  return connectedClient.db();
}

