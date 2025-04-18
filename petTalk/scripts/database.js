import { MongoClient, ServerApiVersion, ObjectId } from "mongodb";

export class database {
    constructor() {
        // Define the connection string
        this.connectionString = "mongodb://127.0.0.1:27017?retryWrites=true&w=majority";

        // Create a MongoDB client instance
        this.client = new MongoClient(this.connectionString, {
            serverApi: {
                version: ServerApiVersion.v1,
                strict: false,
                deprecationErrors: true,
            }
        });
    }

    // Connect to the database
    async connect() {
        try {
            // Connect to the MongoDB server
            await this.client.connect();
            console.log("Connected to MongoDB successfully.");
        } catch (error) {
            console.error("Error connecting to MongoDB:", error);
        }
    }

    // Get database
    getDatabase(databaseName) {
        if (!this.client) {
            throw new Error("MongoDB client is not initialized. Call connect() first.");
        }
        return this.client.db(databaseName);
    }

    // Get a specific collection
    getCollection(databaseName, collectionName) {
        const db = this.getDatabase(databaseName);
        return db.collection(collectionName);
    }

    // Close the database connection
    async close() {
        try {
            await this.client.close();
            console.log("Disconnected from MongoDB.");
        } catch (error) {
            console.error("Error closing MongoDB connection:", error);
        }
    }

}
