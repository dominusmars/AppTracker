import { FetchMessageObject, ImapFlow, ImapFlowOptions } from "imapflow";
import config from "../utils/config";
import { simpleParser } from "mailparser";
import delay from "../utils/delay";
import { log } from "../utils/debug";
import EventEmitter from "node:events";
import { Mail } from "./mail";

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
