import dotenv from "dotenv";

dotenv.config();

const config = {
    EMAIL_USERNAME:
        process.env.EMAIL_USERNAME ??
        (() => {
            throw new Error("EMAIL_USERNAME is not set");
        })(),
    EMAIL_PASSWORD:
        process.env.EMAIL_PASSWORD ??
        (() => {
            throw new Error("EMAIL_PASSWORD is not set");
        })(),
    EMAIL_HOST: process.env.EMAIL_HOST ?? "imap.gmail.com",
    OLLAMA_HOST: process.env.OLLAMA_HOST ?? "http://localhost:11434",
    OLLAMA_API_KEY:
        process.env.OLLAMA_API_KEY ??
        (() => {
            console.log("OLLAMA_API_KEY is not set", "warn");
        })(),
    DISCORD_TOKEN:
        process.env.DISCORD_TOKEN ??
        (() => {
            throw new Error("DISCORD_TOKEN is not set");
        })(),
    DISCORD_USER_ID:
        process.env.DISCORD_USER_ID ??
        (() => {
            throw new Error("DISCORD_USER_ID is not set");
        })(),
    MONGODB_URI:
        process.env.MONGODB_URI ??
        (() => {
            throw new Error("MONGODB_URI is not set");
        })(),
};
export default config;
