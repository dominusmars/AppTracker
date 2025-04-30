import { CacheType, Client, Interaction, Message, SlashCommandBuilder } from "discord.js";

interface DiscordCommand {
    command: SlashCommandBuilder;
    execute: (interaction: Interaction<CacheType>) => Promise<void>;
}
