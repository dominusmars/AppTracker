import { jobCollection } from "./collections";
import { JobUpdate } from "../job/jobUpdate";

export async function getJobUpdates(page = 0, pageSize = 10) {
  const jobUpdates = await jobCollection
    .find({})
    .skip(page * pageSize)
    .limit(pageSize)
    .toArray();
  const jobUpdateList: JobUpdate[] = [];
  for (const job of jobUpdates) {
    const jobUpdate = await JobUpdate.fromDocument(job);
    jobUpdateList.push(jobUpdate);
  }
  return jobUpdateList;
}
export async function getAmountOfJobUpdates() {
  return jobCollection.countDocuments();
}
export async function getLatestJobUpdate() {
  const jobUpdate = await jobCollection
    .find({})
    .sort({ lastUpdated: -1 })
    .limit(1)
    .toArray();
  if (jobUpdate.length === 0) {
    return null;
  }
  return JobUpdate.fromDocument(jobUpdate[0]);
}
