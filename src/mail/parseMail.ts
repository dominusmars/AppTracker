import { Message } from "ollama";
import { Mail } from "./email";
import { query } from "../machinelearning/ollama";
import { log } from "../utils/debug";
import { normalizeJsons } from "../utils/jsonParser";
import { JobUpdate } from "../job/jobUpdate";
const statuses = ["applied", "interview", "offer", "rejected", "hired"];
const successNumber = 6;
const errorNumber = 3;
const systemMessages: Message[] = [
    {
        role: "system",
        content: `Is this document a job update or job application? If it is, please provide the status, job title, company name and job id, if available. If it is not a job update or job application, please ignore it and return Not a Job Update or Job Application.`,
    },
    {
        role: "system",
        content: ` Please anwser the following json format:
    { "status": 'status of the job application',
        "job": 'job title',
        "company": 'company name',
        "link": 'posting link if available',
        "jobId": 'job id' }
Provide the answer in json format only, no other text. Please make sure status is one of the following: "${statuses.join(", ")}"`,
    },
];

export type AppStatuses = "applied" | "interview" | "offer" | "rejected" | "hired";

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

async function parseForAppStatus(
    mail: Mail,
    successResults: Array<AppStatus> = [],
    errorResults: Array<AppStatusParsingError> = []
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
        log(`Error Results: ${errorResults}`, "debug");
        log(`Success Results: ${successResults}`, "debug");
        const normizalized = normalizeJsons(successResults);
        return new JobUpdate(normizalized, mail);
    }

    const text = mail.forProcessing();
    log(`Parsing for app status ${text}`, "debug");

    const message: Message[] = [
        ...systemMessages,
        {
            content: text,
            role: "user",
        },
    ];

    let tempature = successResults.length === successNumber - 1 ? 0 : undefined;
    log(`Querying for app status ${mail.toString()}`, "debug");

    // Query the model
    // If the successResults is 5, set the temperature to 0, else set it to undefined
    const answer = await query(message, "llama3.2:latest", tempature);
    if (!answer) {
        errorResults.push(OllamaError);
        return parseForAppStatus(mail, successResults, errorResults);
    }

    // Parse the answers
    if (answer.includes("Not a Job Update or Job Application")) {
        errorResults.push(NotJobUpdateError);

        return parseForAppStatus(mail, successResults, errorResults);
    }

    try {
        const result = JSON.parse(answer);
        if (!(result.status && result.job && result.company)) {
            errorResults.push(InvalidJsonKeysError);
            log(`Invalid Json Keys ${answer}`, "debug");
            return parseForAppStatus(mail, successResults, errorResults);
        }
        // check if status is vaild
        if (!statuses.includes(result.status)) {
            errorResults.push(StatusNotValidError);
            log(`Invalid Json Keys ${answer}`, "debug");
            return parseForAppStatus(mail, successResults, errorResults);
        }

        return parseForAppStatus(mail, [...successResults, result], errorResults);
    } catch (e) {
        // Error parsing json
        log(`Error Parsing Json ${e} ${answer}`, "debug");
        errorResults.push(JsonParseError);
        return parseForAppStatus(mail, successResults, errorResults);
    }
}

export { parseForAppStatus };
