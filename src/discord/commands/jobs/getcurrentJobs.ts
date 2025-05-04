import {
  ActionRow,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} from "discord.js";
import { DiscordCommand } from "../../command";
import { getJobUpdates } from "../../../data/jobUpdates";
import { createJobUpdatesListEmbed } from "../../embeds";

const getCurrentJobs: DiscordCommand = {
  command: new SlashCommandBuilder()
    .setName("getcurrentjobs")
    .setDescription("Get the current jobs from the job board"),
  execute: async (interaction) => {
    if (!interaction.isCommand()) {
      throw new Error("Interaction is not a command");
    }
    await interaction.deferReply();

    const jobUpdates = await getJobUpdates();
    if (jobUpdates.length === 0) {
      await interaction.editReply("No current jobs found.");
      return;
    }
    const amountOfJobUpdates = jobUpdates.length;

    const embed = createJobUpdatesListEmbed(jobUpdates);

    const nextPage = new ButtonBuilder()
      .setCustomId("current_jobs_1")
      .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(nextPage);

    await interaction.editReply({
      embeds: [createJobUpdatesListEmbed(jobUpdates)],
      content: `Total: ${amountOfJobUpdates}`,
    });
  },
};

export default getCurrentJobs;
