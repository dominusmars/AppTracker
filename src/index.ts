import mailClient, { Mail } from "./mail/email";
import { parseForAppStatus } from "./mail/parseMail";
import { normalizeJsons } from "./utils/jsonParser";
import { mailClassifyQueston } from "./discord/questions";
import { mailClassifier } from "./machinelearning/classifier";
import { log } from "./utils/debug";
import { JobUpdate } from "./job/jobUpdate";

async function MailHandler(mail: Mail) {
    if (!Mail.isMail(mail)) {
        log("Not a mail", "warn");
        return;
    }
    log(`New mail received ${mail.toString()}`, "info");

    const category = await mailClassifier.classify(mail);
    const classifierLoss = await mailClassifier.checkClassifierLoss();
    mailClassifyQueston.sendDirectMessage(mail);
    if (classifierLoss < 0.5 && category === "RegularMail") {
        return;
    }
    mail.parseForJobStatus();
    // Parse for app status
    // log(`Parsing For App Status ${mail.toString()}`, "debug");
    // let result = await parseForAppStatus(mail);

    // if (!(result instanceof JobUpdate)) {
    //     log(`Error parsing for app status ${mail.toString()}: ${result.error}`, "error");
    //     return;
    // }
    // result.sendDirectMessage();
    // result.saveJobInDatabase();
    // mail.saveToDatabase();
}

mailClient.events.on("new_mail", MailHandler);
