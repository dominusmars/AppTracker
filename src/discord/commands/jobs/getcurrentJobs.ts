import { SlashCommandBuilder } from "discord.js";
import { DiscordCommand } from "../../command";

const getCurrentJobs: DiscordCommand = {
  command: new SlashCommandBuilder()
    .setName("getcurrentjobs")
    .setDescription("Get the current jobs from the job board"),
  execute: async (interaction) => {
    await interaction.deferReply();
    
    await get()
    
  },
};

export default getCurrentJobs;
