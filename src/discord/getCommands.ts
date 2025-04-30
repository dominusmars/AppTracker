import path from "path";
import fs from "fs";
import { DiscordCommand } from "./command";
import { Collection } from "discord.js";

const slashCommands = [];
const commands: Collection<string, DiscordCommand> = new Collection();
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    // Grab all the command files from the commands directory you created earlier
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter((file: string) => file.endsWith(".ts") || file.endsWith(".js"));
    // Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command: DiscordCommand = require(filePath).default;
        if ("command" in command && "execute" in command) {
            slashCommands.push(command.command.toJSON());
            commands.set(command.command.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "command" or "execute" property.`);
        }
    }
}

export default { slashCommands, commands };
