import client, { sendDM } from "./bot";
import { mailClassifier } from "../machinelearning/classifier";
import { Mail } from "../mail/mail";
import { createClassificationEmbed, createEmailEmbed } from "./embeds";
import config from "../utils/config";
import { ActionRowBuilder, ButtonBuilder, ButtonInteraction, ButtonStyle, CacheType, Events, Interaction, Message, MessageFlags } from "discord.js";
import { log } from "../utils/debug";
import nodeCleanUp from "node-cleanup";

class MailClassifyQuestion {
    sentMail: { id: string; mail: Mail; message: Promise<Message> }[];
    constructor() {
        this.sentMail = [];
        client.on(Events.InteractionCreate, (interaction) => {
            try {
                if (interaction.isButton()) {
                    log(`Button clicked: ${interaction.customId}`, "debug");
                    if (interaction.customId.startsWith("jobupdate_")) {
                        this.handleJobUpdateInteraction(interaction);
                        return;
                    }
                }
            } catch (error) {
                log(`Error handling interaction: ${error}`, "error");
            }
        });
        nodeCleanUp((code, signal) => {
            log("Cleaning up before exit", "info");
            // Delete all sent messages
            this.sentMail.forEach((mail) => {
                mail.message
                    .then((msg) => {
                        msg.delete().catch((err) => {
                            log(`Error deleting message: ${err}`, "error");
                        });
                    })
                    .catch((err) => {
                        log(`Error deleting message: ${err}`, "error");
                    });
            });
            log("All sent messages deleted", "info");
        });
    }
    async handleJobUpdateInteraction(interaction: ButtonInteraction<CacheType>) {
        const message = interaction.message;
        if (!message) {
            log("Message not found", "warn");
            return;
        }
        // Get the mail id from the message nonce
        const mail_id = message.nonce;
        const index = this.sentMail.findIndex((m) => m.id === mail_id);
        if (index === -1) {
            log(`Mail not found in sentMail queue`, "warn");
            return;
        }

        const mail = this.sentMail[index];
        this.sentMail.splice(index, 1);
        let jobUpdate = interaction.customId === "jobupdate_yes";
        this.updateClassifier(mail.mail, jobUpdate);
        mail.mail.setClassification(jobUpdate ? "JobUpdate" : "RegularMail", true);
        const result = await mail.mail.saveToDatabase();
        if (!result) {
            return;
        }

        // Delete message upon confirmation
        interaction.message.delete().catch((err) => {
            log(`Error deleting message: ${err}`, "error");
        });

        const embed = createClassificationEmbed(mail.mail, `Mail classified as ${jobUpdate ? "Job Update" : "Regular Mail"}`);

        let classificationMessage = interaction.user.send({ embeds: [embed] });
        // Log the result
        log(`Mail ${mail.mail.toString()} classified as ${jobUpdate ? "Job Update" : "Regular Mail"}`, "info");

        // Remove the classifcation message after 15 minutes
        setTimeout(async () => {
            try {
                const msg = await classificationMessage;
                if (!msg) {
                    log(`Message not found`, "debug");
                    return;
                }
                if (!msg.deletable) {
                    return;
                }
                await msg.delete();
                log(`Message deleted after 1 hour`, "debug");
            } catch (error) {
                log(`Error deleting message: ${error}`, "debug");
            }
        }, 1000 * 60 * 15); // 15 minutes
    }

    async updateClassifier(mail: Mail, job_update: boolean) {
        const text = mail.getText(true);
        if (job_update) {
            mailClassifier.addJobUpdate(text);
        } else {
            mailClassifier.addRegularMail(text);
        }
        log(`Classifier updated with ${mail.subject} ${job_update ? "is Job Update" : "is Regular Mail"}`, "debug");
        mailClassifier.retrain();
    }

    async sendDirectMessage(mail: Mail) {
        try {
            let embed = createEmailEmbed(mail, "Is this a job update?");

            // Build the button row for embed
            const yes = new ButtonBuilder().setCustomId("jobupdate_yes").setStyle(ButtonStyle.Success).setLabel("Yes");
            const no = new ButtonBuilder().setCustomId("jobupdate_no").setStyle(ButtonStyle.Danger).setLabel("No");
            const row = new ActionRowBuilder<ButtonBuilder>().addComponents(yes, no);
            const id = mail.getId();

            const user = await client.users.fetch(config.DISCORD_USER_ID);
            if (!user) {
                log(`User not found: ${config.DISCORD_USER_ID}`, "error");
                return;
            }

            const messageOptions = {
                content: "Is this a job update or job application?",
                enforceNonce: true,
                nonce: id,
                embeds: [embed],
                components: [row],
            };

            let message = sendDM(messageOptions);
            let timeToExpire = 1000 * 60 * 60 * 5; // 5 hour
            // Set a timeout to delete the message after 5 hour
            setTimeout(async () => {
                try {
                    const msg = await message;
                    if (!msg) {
                        log(`Message not found`, "warn");
                        return;
                    }
                    if (!msg.deletable) {
                        return;
                    }
                    await msg.delete();
                    log(`Message deleted after 5 hours`, "info");

                    // Remove the mail from the sentMail queue
                    this.sentMail = this.sentMail.filter((m) => m.id !== id);
                } catch (error) {
                    if (error instanceof Error) {
                        // check if error is message not found, because it was already deleted
                    }
                    log(`Error deleting message: ${error}`, "error");
                }
            }, timeToExpire);

            // Add the mail to the sentMail queue
            this.sentMail.push({ id: id, mail: mail, message: message });
            log(`Message sent to ${user.username}: ${mail.subject}`, "info");
        } catch (error: any) {
            log(`Error sending message to ${config.DISCORD_USER_ID}: ${error.message}`, "error");
            if (error.message == "Cannot send messages to this user") {
                log(`Make sure to add the discord bot to your allowed apps`, "warn");
            }
        }
    }
}

export const mailClassifyQueston = new MailClassifyQuestion();
