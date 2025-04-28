import ollama, { ChatRequest, ChatResponse, Ollama, AbortableAsyncIterator, Message } from "ollama";

import config from "../utils/config";
import { log } from "../utils/debug";

export async function query(query: Message[], model: string = "llama3.2:3b", tempature: number | undefined = undefined) {
    try {
        let client = new Ollama({ host: config.OLLAMA_HOST });
        const request: ChatRequest & { stream: true } = {
            model: model,
            messages: [...query],
            stream: true,
            options: {
                temperature: tempature,
            },
        };
        const response: Promise<AbortableAsyncIterator<ChatResponse>> = client.chat(request);
        const result: ChatResponse[] = [];

        let waterfallStarted = false;
        for await (const message of await response) {
            if (!waterfallStarted) {
                log(`Ollama: Waterfall starting`, "debug");
                waterfallStarted = true;
            }
            result.push(message);
        }

        // for reach of the messages, check if it is a message and if it is, add it to the result
        let res_message = "";
        for (const message of result) {
            if (message.message) {
                res_message += message.message.content;
            }
        }

        log(`Ollama Result: ${res_message}`, "debug");
        return res_message;
    } catch (error) {
        log(`Error Querying Ollama, ${error}`, "error");
        return false;
    }
}
