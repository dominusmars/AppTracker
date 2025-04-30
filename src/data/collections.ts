import { MongoClient } from "mongodb";
import { JobDocument, MailDocument } from "./types/mongoDbTypes";
import config from "../utils/config";

const mongoClient = new MongoClient(config.MONGODB_URI || "");
const dbName = process.env.MONGO_DB_NAME || "jobtracker";
const mailCollectionName = process.env.MONGO_MAIL_COLLECTION_NAME || "mails";
const jobCollectionName = process.env.MONGO_JOB_COLLECTION_NAME || "jobs";

const mailCollection = mongoClient.db(dbName).collection<MailDocument>(mailCollectionName);
const jobCollection = mongoClient.db(dbName).collection<JobDocument>(jobCollectionName);

export { mailCollection, jobCollection };
