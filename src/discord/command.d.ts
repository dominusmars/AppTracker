import {
  ChatInputCommandInteraction,
  Client,
  Message,
  SlashCommandBuilder,
} from "discord.js";

interface DiscordCommand {
  command: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
