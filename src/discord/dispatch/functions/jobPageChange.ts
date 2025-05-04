import { CacheType, Interaction } from "discord.js";
import { log } from "../../../utils/debug";

async function jobPageChange(interaction: Interaction<CacheType>) {
  if (
    !interaction.isButton() ||
    !interaction.customId.startsWith("job_page_change")
  ) {
    log(`${interaction.id} is not a jobPageChange`);
    return;
  }
  await interaction.deferReply();

  const currentPage = interaction.message.nonce?.toString() || ;
}
