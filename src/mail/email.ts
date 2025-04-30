import { FetchMessageObject, ImapFlow, ImapFlowOptions } from "imapflow";
import config from "../utils/config";
import { simpleParser } from "mailparser";
import delay from "../utils/delay";
import { log } from "../utils/debug";
import EventEmitter from "node:events";
import { removeAll } from "../utils/textParse";
import crypto from "node:crypto";
import { MailDocument } from "../data/types/mongoDbTypes";
import { MailClassifications as MailClassification } from "../machinelearning/types/classifer";
import { mailCollection } from "../data/collections";
import { parseForAppStatus } from "./parseMail";
import { JobUpdate } from "../job/jobUpdate";
import { stripHtml } from "string-strip-html";

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
  constructor(
    from: string,
    to: string,
    subject: string,
    text: string,
    html: string,
    date = Date.now(),
    source = "",
  ) {
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

    return new Mail(
      mail.from,
      mail.to,
      mail.subject,
      mail.text,
      mail.html,
      dateOfMail.getTime(),
      mail.source,
    );
  }
  forProcessing() {
    return `From: ${this.from} To: ${this.to} Subject: ${this.subject} Text: ${this.text}}`;
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
    const id =
      hash.substring(0, 8) +
      "-" +
      hash.substring(8, 12) +
      "-" +
      hash.substring(12, 16) +
      "-" +
      hash.substring(16, 20);
    return id;
  }
  async setClassification(
    classification: MailClassification,
    verified = false,
  ) {
    this.classificationVerified = verified;
    // Update was verified and was a Job Update but was different from the previous classification, send to ai update parsing
    if (
      verified &&
      classification == "JobUpdate" &&
      this.classification !== "JobUpdate" &&
      !this.parsed
    ) {
      log(`Mail ${this.toString()} classified as Job Update`, "info");
      // send to Ai update parsing
      for (let i = 0; i < 10; i++) {
        const result = await this.parseForJobStatus();
        if (result === true) {
          log(`Mail ${this.toString()} parsed for job status`, "info");
          break;
        } else {
          log(
            `Mail ${this.toString()} failed to parse for job status`,
            "error",
          );
        }
      }
    }
    if (
      verified &&
      classification == "RegularMail" &&
      this.classification == "JobUpdate" &&
      this.parsed
    ) {
      // Check if the mail was parsed for job status and if it was, set the classification to RegularMail, and delete the job from the database

      if (this.jobUpdate) {
        log(
          `Mail ${this.toString()} classified as Regular Mail deleting Job: ${this.jobUpdate.toString()}`,
          "debug",
        );
        this.jobUpdate.deleteJobFromDatabase();
      } else {
        const result = await parseForAppStatus(this);
        if (result instanceof JobUpdate) {
          log(
            `Mail ${this.toString()} classified as Regular Mail deleting Job: ${result.toString()}`,
            "debug",
          );
          result.deleteJobFromDatabase();
        } else {
          log(`Mail ${this.toString()} classified as Regular Mail`, "debug");
        }
      }
    }

    this.classification = classification;
  }

  // parses the mail and returns the job status if it is a job application
  async parseForJobStatus() {
    if (this.parsed) {
      return true;
    }
    log(`Parsing for app status ${this.toString()}`, "debug");
    const result = await parseForAppStatus(this);
    if (!(result instanceof JobUpdate)) {
      log(
        `Error parsing for app status ${this.toString()}: ${result.error}`,
        "error",
      );
      return result.error;
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

      const existingMail = await mailCollection.findOne<MailDocument>(
        { hash: mailDocument.hash },
        { projection: { _id: 0 } },
      );
      if (existingMail) {
        // If the mail classification was verified, set the classification and classificationVerified to true
        // User already verified the classification, so we can set it to true
        if (existingMail.classificationVerified) {
          mailDocument.classificationVerified = true;
          mailDocument.classification = existingMail.classification;
        }
        let requestedMailUpdate = { ...existingMail, ...mailDocument };

        await mailCollection.updateOne(
          { hash: mailDocument.hash },
          { $set: requestedMailUpdate },
        );
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
    if (typeof mail !== "object") return false;
    return false;
  }
}

export interface MailEventsMap extends Record<string, any> {
  new_mail: Mail;
}

class MailClient {
  private client: ImapFlow;
  lastMail: Mail | null;
  options: ImapFlowOptions;
  connections = 0;
  private pollrate = 15000;
  events: EventEmitter<MailEventsMap>;
  constructor() {
    this.options = {
      host: config.EMAIL_HOST || "imap.example.com",
      port: 993,
      secure: true,
      auth: {
        user: config.EMAIL_USERNAME || "",
        pass: config.EMAIL_PASSWORD,
      },
      emitLogs: false,
      logRaw: false,
      logger: false,
    };
    this.client = new ImapFlow(this.options);
    this.client.on("error", (err) => {
      log(`Mail client error: ${err}`, "error");
    });

    this.lastMail = null;
    this.connections = 0;

    this.pollMail();
    this.events = new EventEmitter<MailEventsMap>({
      captureRejections: true,
    });
  }

  // Polls the mail server for new mail every 15 seconds
  private async pollMail() {
    log(`Polling Mail`, "debug");
    const mail = await this.getLatestMail();
    if (!mail) {
      return;
    }
    if (this.lastMail && this.lastMail.compare(mail)) {
      delay(this.pollrate).then(() => {
        this.pollMail();
      });
      return;
    }

    this.lastMail = mail;
    this.events.emit("new_mail", this.lastMail);
    delay(this.pollrate).then(() => {
      this.pollMail();
    });
  }
  // converts the message to a Mail object
  private async messageToMail(message: FetchMessageObject): Promise<Mail> {
    let parsed = await simpleParser(message.source);

    const from = message.envelope.from[0].address || "";
    const to = message.envelope.to[0].address || "";
    const subject = message.envelope.subject;
    const text = parsed.text || "";
    const html = parsed.html || "";
    const date = message.envelope.date;
    const source = message.source.toString();
    return new Mail(from, to, subject, text, html, date.getTime(), source);
  }

  // gets the latest mail from the server
  async getLatestMail() {
    if (this.connections > 3) {
      log(`Too many connections`, "warn");
      return;
    }
    const client = new ImapFlow(this.options);
    this.connections++;
    try {
      await client.connect();

      await client.mailboxOpen("INBOX");

      let message = await client.fetchOne("*", {
        source: true,
        envelope: true,
        headers: true,
        flags: true,
        bodyStructure: true,
        labels: true,
      });
      let result = await this.messageToMail(message);
      client.close();
      return result;
    } catch (error) {
      log(`Error getting latest mail: ${error}`, "error");
      return null;
    } finally {
      client.close();
      this.connections--;
    }
  }
  async disconnect() {
    await this.client.logout();
  }
}

const mailClient = new MailClient();
export default mailClient;
