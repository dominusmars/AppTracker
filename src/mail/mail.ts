import { removeAll, removeHtml } from "../utils/textParse";
import crypto from "node:crypto";
import { MailDocument } from "../data/types/mongoDbTypes";
import { MailClassification } from "../machinelearning/types/classifer";
import { mailCollection } from "../data/collections";
import { parseForAppStatus } from "./parseMail";
import { JobUpdate } from "../job/jobUpdate";
import { stripHtml } from "string-strip-html";
import { log } from "../utils/debug";

export class Mail {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
    date: Date;
    source: string;
    classification: MailClassification;
    classificationVerified: boolean = false;
    hash: string | null = null;
    parsed: boolean = false; // if the mail has been parsed or not
    jobUpdate: JobUpdate | null = null; // if the mail is a job update or not
    constructor(from: string, to: string, subject: string, text: string, html: string, date = Date.now(), source = "") {
        this.from = from;
        this.to = to;
        this.subject = subject;
        this.text = text || stripHtml(html).result;
        if (!this.text) {
            throw new Error("No text or html found in mail");
        }
        this.html = html;
        this.date = new Date(date);
        this.source = source;
        this.classification = "Unknown";
    }
    static async fromHash(hash: string) {
        const mail = await mailCollection.findOne<MailDocument>({
            hash: hash,
        });
        if (!mail) {
            throw new Error("Mail not found");
        }
        const dateOfMail = new Date(mail.date);

        return new Mail(mail.from, mail.to, mail.subject, mail.text, mail.html, dateOfMail.getTime(), mail.source);
    }
    forProcessing() {
        const text = removeHtml(this.text);
        return `From: ${this.from} To: ${this.to} Subject: ${this.subject} Text: ${text}}`;
    }

    toString() {
        return `From: ${this.from} To: ${this.to} Subject: ${this.subject} Date: ${this.date.toLocaleString()}`;
    }

    getText(sanitized = false) {
        if (sanitized) {
            return removeAll(this.text);
        }
        return this.text;
    }
    toJson() {
        return {
            from: this.from,
            to: this.to,
            subject: this.subject,
            text: this.text,
            html: this.html,
            date: this.date.toLocaleString(),
            source: this.source,
            classification: this.classification,
            classificationVerified: this.classificationVerified,
            hash: this.getHash(),
        };
    }
    compare(mail: Mail) {
        if (this.from !== mail.from) {
            return false;
        }
        if (this.to !== mail.to) {
            return false;
        }
        if (this.subject !== mail.subject) {
            return false;
        }
        if (this.source !== mail.source) {
            return false;
        }
        if (this.html !== mail.html) {
            return false;
        }
        if (this.date.getTime() !== mail.date.getTime()) {
            return false;
        }
        return true;
    }
    // returns the hash of the mail, used to identify the mail in the database
    // this is used to prevent duplicates in the database
    getHash() {
        if (this.hash) {
            return this.hash;
        }

        const emailContent = `${this.from}${this.to}${this.subject}${this.text}`;

        this.hash = crypto.createHash("sha256").update(emailContent).digest("hex");
        return this.hash;
    }
    // returns a short id for the mail, based on the hash
    // this is used to identify the mail in the discord message
    getId() {
        const hash = this.getHash();
        const id = hash.substring(0, 8) + "-" + hash.substring(8, 12) + "-" + hash.substring(12, 16) + "-" + hash.substring(16, 20);
        return id;
    }
    async setClassification(classification: MailClassification, verified = false) {
        this.classificationVerified = verified;
        const pastClassification = this.classification;
        this.classification = classification;
        // Update was verified and was a Job Update but was different from the previous classification, send to ai update parsing
        if (verified && classification == "JobUpdate" && pastClassification !== "JobUpdate" && !this.parsed) {
            log(`Mail ${this.toString()} classified as Job Update`, "info");
            // send to Ai update parsing
            for (let i = 0; i < 10; i++) {
                const result = await this.parseForJobStatus();
                if (result === true) {
                    log(`Mail ${this.toString()} parsed for job status`, "info");
                    break;
                } else {
                    log(`Mail ${this.toString()} failed to parse for job status`, "error");
                }
            }
        }
        if (verified && classification == "RegularMail" && pastClassification == "JobUpdate" && this.parsed) {
            // Check if the mail was parsed for job status and if it was, set the classification to RegularMail, and delete the job from the database

            if (this.jobUpdate) {
                log(`Mail ${this.toString()} classified as Regular Mail deleting Job: ${this.jobUpdate.toString()}`, "debug");
                this.jobUpdate.deleteJobFromDatabase();
            } else {
                const result = await parseForAppStatus(this);
                if (result instanceof JobUpdate) {
                    log(`Mail ${this.toString()} classified as Regular Mail deleting Job: ${result.toString()}`, "debug");
                    result.deleteJobFromDatabase();
                } else {
                    log(`Mail ${this.toString()} classified as Regular Mail`, "debug");
                }
            }
        }
    }

    // parses the mail and returns the job status if it is a job application
    async parseForJobStatus() {
        if (this.parsed) {
            return true;
        }
        log(`Parsing for app status ${this.toString()}`, "debug");
        const result = await parseForAppStatus(this);
        if (!(result instanceof JobUpdate)) {
            log(`Error parsing for app status ${this.toString()}: ${result.error}`, "error");
            return result.error;
        }
        // If mail was classified but a JobUpdate was found, check if the classification was verified
        // If it was user verified then the mail was not a job update and we can return false
        if (this.classification !== "JobUpdate" && this.classificationVerified) {
            return false;
        }
        this.jobUpdate = result;
        this.parsed = true;
        result.sendDirectMessage();
        result.saveJobInDatabase();
        this.saveToDatabase();
        return true;
    }

    // saves the mail to the database and inserts it if it doesn't exist, or updates it if it does
    async saveToDatabase() {
        try {
            const mailDocument: MailDocument = this.toJson();

            const existingMail = await mailCollection.findOne<MailDocument>({ hash: mailDocument.hash }, { projection: { _id: 0 } });
            if (existingMail) {
                // If the mail classification was verified, set the classification and classificationVerified to true
                // User already verified the classification, so we can set it to true
                if (existingMail.classificationVerified) {
                    mailDocument.classificationVerified = true;
                    mailDocument.classification = existingMail.classification;
                }
                let requestedMailUpdate = { ...existingMail, ...mailDocument };

                await mailCollection.updateOne({ hash: mailDocument.hash }, { $set: requestedMailUpdate });
                log(`Updated mail ${mailDocument.hash}`, "debug");
                return true;
            }

            await mailCollection.insertOne(mailDocument);
            log(`Inserted mail ${mailDocument.hash}`, "debug");
            return true;
        } catch (error) {
            log(`Error saving mail to database: ${error}`, "error");
            return false;
        }
    }

    static isMail(mail: any): mail is Mail {
        if (mail instanceof Mail) return true;
        return false;
    }
}
