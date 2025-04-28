import { EmbedBuilder } from "discord.js";
import { Mail } from "../mail/email";
import { AppStatus } from "../mail/parseMail";
import { JobUpdate } from "../job/jobUpdate";

function createDefaultEmbed() {
    const embed = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Default Title")
        .setDescription("Default Description")
        .setTimestamp()
        .setFooter({ text: "Job Tracker" });

    return embed;
}

function createEmailEmbed(mail: Mail, title: string) {
    const embed = createDefaultEmbed()
        .setTitle(title)
        .setDescription(mail.subject)
        .setAuthor({ name: mail.from })
        .addFields(
            { name: "Classification", value: mail.classification },
            { name: "To", value: mail.to, inline: true },
            { name: "From", value: mail.from, inline: true },
            { name: "Date", value: mail.date.toString(), inline: true },
            { name: "Text", value: mail.getText(true).substring(0, 255) }
        );
    return embed;
}
function createClassificationEmbed(mail: Mail, title: string) {
    const embed = createDefaultEmbed()
        .setTitle(title)
        .setDescription(mail.subject)
        .addFields({ name: "Classification", value: mail.classification }, { name: "From", value: mail.from, inline: true });

    return embed;
}

function createJobUpdateEmbed(jobStatus: JobUpdate, mail: Mail) {
    const color = jobStatus.status === "applied" ? "#00ff00" : jobStatus.status === "rejected" ? "#ff0000" : "#ffff00";

    const embed = createDefaultEmbed()
        .setTitle(`Job Update: ${jobStatus.toString()}`)
        .setDescription(mail.subject)
        .setColor(color)
        .addFields({ name: "From", value: mail.from, inline: true }, { name: "To", value: mail.to, inline: true })
        .addFields({ name: "Date", value: mail.date.toString(), inline: true });

    if (jobStatus.link) {
        embed.addFields({ name: "Link", value: jobStatus.link });
    }

    return embed;
}

export { createDefaultEmbed, createEmailEmbed, createClassificationEmbed, createJobUpdateEmbed };
