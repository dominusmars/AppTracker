import { Client, GatewayIntentBits, Message, MessageCreateOptions, MessagePayload } from "discord.js";
import config from "../utils/config";
import { log } from "../utils/debug";
import { Mail } from "../mail/email";

const client = new Client({
    intents: [GatewayIntentBits.MessageContent],
});

client.once("ready", () => {
    log("Discord bot is ready!", "info");
});

client.login(config.DISCORD_TOKEN);

export async function sendDM(message: MessageCreateOptions) {
    const user = await client.users.fetch(config.DISCORD_USER_ID);
    if (!user) {
        log(`User not found: ${config.DISCORD_USER_ID}`, "error");
        throw new Error("User not found");
    }

    return user.send({ ...message });
}

export default client;
