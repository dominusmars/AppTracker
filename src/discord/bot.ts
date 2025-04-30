import {
    ActivityType,
    Client,
    Events,
    GatewayIntentBits,
    Message,
    MessageCreateOptions,
    MessagePayload,
    Partials,
    PresenceUpdateStatus,
    Status,
} from "discord.js";
import config from "../utils/config";
import { log } from "../utils/debug";
import commands from "./getCommands";

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.once(Events.ClientReady, () => {
    log("Discord bot is ready!", "info");
    client.user!.setStatus(PresenceUpdateStatus.Online);
    client.user!.setActivity("Job Updates", { type: ActivityType.Watching });
    if (!client.user) {
        log("Client user is undefined", "error");
        return;
    }
});

client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) {
        return;
    }
    const { commandName } = interaction;
    log(`Command received: ${commandName}`, "info");
    try {
        const command = commands.commands.get(commandName);
        if (!command) {
            log(`Command not found: ${commandName}`, "error");
            return;
        }
        await command.execute(interaction);
    } catch (error) {
        log(`Error executing command: ${error}`, "error");
        await interaction.reply({
            content: "There was an error while executing this command!",
            ephemeral: true,
        });
    }
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
