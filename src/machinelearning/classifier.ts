import nautral, { BayesClassifier } from "natural";
import { log } from "../utils/debug";
import { MailClassifications } from "./types/classifer";
import { Mail } from "../mail/email";
import { mailCollection } from "../data/data";
import { MailDocument } from "../data/types/mongoDbTypes";
import path from "node:path";

const classiferLocation = path.join(__dirname, "..", "..", "models", "classifer.json");

class MailClassifier {
    private classifer: BayesClassifier;

    classifierLoss = 0;
    jobApplicationLoss = 0;
    regularMailLoss = 0;
    lastChecked = 0;

    constructor() {
        this.classifer = new nautral.BayesClassifier();
        this.load();
    }
    async load() {
        const loadPromise: Promise<BayesClassifier | null> = new Promise((resolve, reject) => {
            nautral.BayesClassifier.load(classiferLocation, null, (err: any, classifer: BayesClassifier | undefined) => {
                if (err || !classifer) {
                    resolve(null);
                    return;
                }
                log("Classifier loaded", "info");
                resolve(classifer);
            });
        });

        const classifer = await loadPromise;
        if (!classifer) {
            return this.classifer;
        }
        this.classifer = classifer;
        return this.classifer;
    }
    async createNewClassifierFromDatabase() {
        const mails = await mailCollection.find({ classificationVerified: true }).toArray();
        if (!mails) {
            log("No Verified mails found in database", "warn");
            return;
        }

        for (const mail of mails) {
            if (mail.classification === "JobUpdate") {
                this.addJobUpdate(mail.text);
            } else if (mail.classification === "RegularMail") {
                this.addRegularMail(mail.text);
            }
        }

        this.retrain();
    }

    // Returns a number between 0 and 1, where 0 is a perfect classifier and 1 is a bad classifier
    // returns 1 if not enough mails to check classifier loss
    // loss should go down over time as classifier is trained
    async checkClassifierLoss() {
        // return if last checked was less than 1 hour ago, to avoid checking too often
        if (Date.now() - this.lastChecked < 1000 * 60 * 60) {
            return this.jobApplicationLoss;
        }
        this.lastChecked = Date.now();
        const mails = await mailCollection.find({ classificationVerified: true }).toArray();
        let totalOfRegularMails = mails.filter((mail) => mail.classification === "RegularMail").length;
        let totalOfJobApplications = mails.filter((mail) => mail.classification === "JobUpdate").length;

        if (!mails) {
            log("No Verified mails found in database", "warn");
            return 1;
        }
        if (mails.length < 10) {
            log("Not enough mails to check classifier loss", "warn");
            return 1;
        }
        if (totalOfRegularMails < 5 || totalOfJobApplications < 5) {
            log("Not enough mails to check classifier loss", "warn");
            return 1;
        }
        let correct = 0;
        let total = 0;

        let correctRegularMails = 0;
        let correctJobApplications = 0;

        for (const mail of mails) {
            this.classifer.classify(mail.text) as MailClassifications;
            if (mail.classification === this.classifer.classify(mail.text)) {
                correct++;
                if (mail.classification === "RegularMail") {
                    correctRegularMails++;
                } else if (mail.classification === "JobUpdate") {
                    correctJobApplications++;
                }
            }
            total++;
        }
        const loss = 1 - correct / total;
        const regularMailLoss = 1 - correctRegularMails / totalOfRegularMails;
        const jobApplicationLoss = 1 - correctJobApplications / totalOfJobApplications;
        log(`Classifier loss: ${loss}, Regular Loss: ${regularMailLoss}, Job Update Loss: ${jobApplicationLoss}`, "info");

        // Prioritize loss on Job Applications over Regular Mails, for checking if a mail is a job application, making sure most of the job applications are classified correctly
        this.classifierLoss = loss;
        this.regularMailLoss = regularMailLoss;
        this.jobApplicationLoss = jobApplicationLoss;

        return jobApplicationLoss;
    }

    async classify(mail: Mail): Promise<MailClassifications> {
        try {
            if (!this.classifer) {
                this.classifer = await this.load();
            }
            const classifcaiton = this.classifer.classify(mail.text) as "RegularMail" | "JobUpdate";
            await mail.setClassification(classifcaiton);
            log(`Classified mail ${mail.toString()} as ${classifcaiton}`, "debug");
            return classifcaiton;
        } catch (error) {
            log(`Error classifying text: ${error}`, "error");
            return "Unknown";
        }
    }
    addRegularMail(text: string) {
        this.classifer.addDocument(text, "RegularMail");
    }
    addJobUpdate(text: string) {
        this.classifer.addDocument(text, "JobUpdate");
    }
    retrain() {
        this.classifer.train();
        this.classifer.save(classiferLocation, (err: any, classifer: any) => {
            if (err) {
                log("Error saving classifier", "error");
                return;
            }
            log("Classifier saved", "info");
        });
    }
}

const mailClassifier = new MailClassifier();

export { mailClassifier };
