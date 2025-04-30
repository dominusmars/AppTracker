import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import { log } from "../utils/debug";
import config from "../utils/config";
import commands from "./getCommands";

const rest = new REST().setToken(config.DISCORD_TOKEN);

(async () => {
    try {
        log("Started refreshing application (/) commands.", "info");

        // The put method is used to fully refresh all commands in the guild with the current set
        console.log("Commands: ", commands.slashCommands);
        const data = (await rest.put(Routes.applicationCommands(config.DISCORD_CLIENT_ID), {
            body: commands.slashCommands,
        })) as Array<any>;
        if (data.length) {
            log(`Successfully reloaded ${data.length} application (/) commands.`, "info");
        }
    } catch (error) {
        log(`Error reloading application (/) commands: ${error}`, "error");
    }
})();
