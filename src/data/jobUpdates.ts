import { jobCollection } from "./collections";
import { log } from "../utils/debug";
import { JobUpdate } from "../job/jobUpdate";
import { AppStatus } from "../mail/parseMail";

export async function getJobUpdates() {
  const jobUpdates = await jobCollection.find({}).toArray();
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

export async function getJobStatus() {
  const jobsInTheLastWeek = await jobCollection
    .find({
      lastUpdated: {
        $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
    })
    .toArray();
}
