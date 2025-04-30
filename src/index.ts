import mailClient from "./mail/email";
import { Mail } from "./mail/mail";
import { mailClassifyQueston } from "./discord/questions";
import { mailClassifier } from "./machinelearning/classifier";
import { log } from "./utils/debug";

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
}

mailClient.events.on("new_mail", MailHandler);
