import { log } from "./debug";

function removeHtml(text: string): string {
    // remove script tags
    text = text.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "");
    // remove other tags
    text = text.replace(/<style[^>]*>([\s\S]*?)<\/style>|(<[^>]*>)/gim, "");

    // remove doubled new lines
    text = text.replace(/(\r\n|\r|\n){2,}/g, "");

    // combine multiple new lines
    text = text.replace(/=\n*\W*/gm, "");

    // strip whitespace
    text = text.replace(/^\s+|\s+$/g, "");

    // remove html codes
    text = text.replace(/&[a-zA-Z0-9#]+;/g, "");
    text = text.replace(/&#[0-9]+;/g, "");

    return text.trim();
}
function removeLinksWithDomain(text: string): string {
    // remove links
    let matches = text.match(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gim);
    if (matches) {
        for (let match of matches) {
            try {
                let url = new URL(match);

                text = text.replace(match, ` ${url.hostname} `);
            } catch (e) {
                console.log("Error parsing URL", e);
            }
        }
    }
    return text.trim();
}
function removePersonalInfo(text: string): string {
    // remove personal info
    text = text.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gim, "[EMAIL]");
    text = text.replace(/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}$/gim, "[PHONE]");
    return text.trim();
}

function removeAll(text: string): string {
    text = removeHtml(text);
    text = removeLinksWithDomain(text);
    text = removePersonalInfo(text);

    return text.trim();
}

export { removeHtml, removeLinksWithDomain, removePersonalInfo, removeAll };
