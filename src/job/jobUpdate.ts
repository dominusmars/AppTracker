import { Mail } from "../mail/mail";
import { AppStatus, isAppStatus } from "../mail/parseMail";
import { jobCollection } from "../data/collections";
import { JobDocument } from "../data/types/mongoDbTypes";
import { log } from "../utils/debug";
import { createJobUpdateEmbed } from "../discord/embeds";
import { sendDM } from "../discord/bot";

export class JobUpdate {
    jobId: string;
    job: string;
    company: string;
    link: string;
    status: AppStatus["status"];
    mail: Mail;

    constructor(appStatus: AppStatus, mail: Mail) {
        this.jobId = appStatus.jobId;
        this.job = appStatus.job;
        this.company = appStatus.company;
        this.link = appStatus.link;
        this.status = appStatus.status;
        this.mail = mail;
    }
    toString() {
        return `${this.job} - ${this.company} (${this.status})`;
    }
    toJson(): AppStatus {
        return {
            jobId: this.jobId,
            job: this.job,
            company: this.company,
            link: this.link,
            status: this.status,
        };
    }
    static async fromCompanyAndJob(company: string, job: string) {
        const jobDocument = await jobCollection.findOne({
            company: company,
            job: job,
        });
        if (!jobDocument) {
            log(`Job not found: ${company} - ${job}`, "error");
            throw new Error(`Job not found: ${company} - ${job}`);
        }

        return JobUpdate.fromDocument(jobDocument);
    }
    static async fromDocument(jobDocument: JobDocument) {
        if (!isAppStatus(jobDocument.status)) {
            log(`Invalid status: ${jobDocument.status}`, "error");
            throw new Error(`Invalid status: ${jobDocument.status}`);
        }

        const mail = await Mail.fromHash(jobDocument.mailHashs[0]);

        const jobUpdate = new JobUpdate(
            {
                jobId: jobDocument.jobId || "",
                job: jobDocument.job,
                company: jobDocument.company,
                link: jobDocument.link || "",
                status: jobDocument.status,
            },
            mail
        );
        return jobUpdate;
    }

    async sendDirectMessage() {
        try {
            const embed = createJobUpdateEmbed(this, this.mail);

            sendDM({
                embeds: [embed],
            });
        } catch (error) {
            log(`Error sending DM - JobUpdate: ${error}`, "error");
        }
    }
    // Updates or inserts the job in the database
    // if the job already exists, it updates the mailids array, lastUpdated field and status field
    // if the job does not exist, it inserts it into the database
    async saveJobInDatabase() {
        const existingJob = await jobCollection.findOne({
            job: this.job,
            company: this.company,
        });
        if (existingJob) {
            // TODO: check if status is the same as before, if so, dont update or is an invalid update

            // if job already exists, update the mailids array, lastUpdated field, and status field
            await jobCollection.updateOne(
                { job: this.job, company: this.company },
                {
                    $addToSet: { mailHashs: this.mail?.getHash() },
                    $set: { lastUpdated: new Date().toISOString(), status: this.status },
                }
            );
            log(`Job Status updated: ${this.job} - ${this.company} ${this.status}`, "info");

            return;
        }
        if (!this.mail) {
            throw new Error("Mail is not set for job update");
        }

        // if job does not exist, insert it into the database
        const jobDocument: JobDocument = {
            ...this.toJson(),
            date: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            mailHashs: [this.mail?.getHash()],
        };

        await jobCollection.insertOne(jobDocument);
        log(`Job Status inserted: ${this.job} - ${this.company} ${this.status}`, "info");
    }
    async deleteJobFromDatabase() {
        const options = this.mail
            ? {
                  job: this.job,
                  company: this.company,
                  mailHashs: [this.mail.getHash()],
              }
            : { job: this.job, company: this.company };

        const existingJob = await jobCollection.findOne(options);
        if (!existingJob) {
            log(`Job not found in database: ${this.job} - ${this.company}`, "warn");
            return;
        }

        //if job already exists, delete from the database
        await jobCollection.deleteOne(options);
        log(`Job Status deleted: ${this.job} - ${this.company} ${this.status}`, "info");
    }
}
