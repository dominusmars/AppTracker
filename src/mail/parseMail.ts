import { Message } from "ollama";
import { Mail } from "./mail";
import { query } from "../machinelearning/ollama";
import { log } from "../utils/debug";
import { normalizeJsons } from "../utils/jsonParser";
import { JobUpdate } from "../job/jobUpdate";
import config from "../utils/config";
const statuses = ["applied", "interview", "offer", "rejected", "hired"];
const successNumber = 6;
const errorNumber = 3;
const systemMessages: Message[] = [
  {
    role: "system",
    content: `Is this email a job update or job application? If it is, Provide the status, job title, company name and job id, if available. If it is not a job update or job application, Ignore it and return Not a Job Update or Job Application.`,
  },
  {
    role: "system",
    content: `Anwser the following json format:
    { "status": 'status of the job application',
        "job": 'job title',
        "company": 'company name',
        "link": 'posting link if available',
        "reason": 'reasoning if available',
        "jobId": 'job id' }
Provide the answer in json format only, no other text. Make sure status is one of the following: "${statuses.join(", ")}"`,
  },
];

export type AppStatuses =
  | "applied"
  | "interview"
  | "offer"
  | "rejected"
  | "hired";

export function isAppStatus(status: string): status is AppStatuses {
  return statuses.includes(status);
}

export type AppStatus = {
  status: AppStatuses;
  job: string;
  company: string;
  jobId: string;
  link: string;
};
export type AppStatusParsingError = {
  error: string;
};
export type AppStatusResult = JobUpdate | AppStatusParsingError;

const OllamaError = {
  error: "ollama query error",
};
const JsonParseError = {
  error: "Json parsing error",
};
const InvalidJsonKeysError = {
  error: "Invalid json keys",
};
const NotJobUpdateError = {
  error: "Not a Job Update or Job Application",
};
const StatusNotValidError = {
  error: "Status is not valid",
};

async function parseMailForAppStatus(
  mail: Mail,
  successResults: Array<AppStatus> = [],
  errorResults: Array<AppStatusParsingError> = [],
): Promise<AppStatusResult> {
  // Return if the successResults or errorResults is greater than the number of success or error results
  if (errorResults.length > errorNumber) {
    log(`Unable to parse for app status ${mail.toString()}`);
    log(`Error Results: ${errorResults.length}`, "debug");
    log(`Success Results: ${successResults.length}`, "debug");
    return normalizeJsons(errorResults);
  }
  if (successResults.length >= successNumber) {
    log(`Already parsed for app status ${mail.toString()}`);
    log(`Error Results: ${errorResults.length}`, "debug");
    log(`Success Results: ${successResults.length}`, "debug");
    const normizalized = normalizeJsons(successResults);
    return new JobUpdate(normizalized, mail);
  }

  function addError(error: AppStatusParsingError) {
    log(
      `Error parsing for app status ${mail.toString()} ${error.error}`,
      "debug",
    );
    errorResults.push(error);
  }

  const text = mail.forProcessing();
  log(`Parsing for app status ${text}`, "debug");

  const message: Message[] = [
    ...systemMessages,
    {
      content: text + "```json",
      role: "user",
    },
  ];

  let tempature = successResults.length === successNumber - 1 ? 0 : undefined;
  log(`Querying for app status ${mail.toString()}`, "debug");

  // Query the model
  // If the successResults is 5, set the temperature to 0, else set it to undefined
  const answer = await query(message, config.OLLAMA_MODEL, tempature);
  if (!answer) {
    addError(OllamaError);
    return parseMailForAppStatus(mail, successResults, errorResults);
  }

  // Parse the answers
  if (answer.includes("Not a Job Update or Job Application")) {
    addError(NotJobUpdateError);
    return parseMailForAppStatus(mail, successResults, errorResults);
  }

  try {
    const result = JSON.parse(answer);
    if (!(result.status && result.job && result.company)) {
      addError(InvalidJsonKeysError);
      return parseMailForAppStatus(mail, successResults, errorResults);
    }
    // check if status is vaild
    if (!statuses.includes(result.status)) {
      addError(StatusNotValidError);
      return parseMailForAppStatus(mail, successResults, errorResults);
    }

    return parseMailForAppStatus(
      mail,
      [...successResults, result],
      errorResults,
    );
  } catch (e) {
    // Error parsing json
    addError(JsonParseError);
    return parseMailForAppStatus(mail, successResults, errorResults);
  }
}

export { parseMailForAppStatus as parseForAppStatus };
