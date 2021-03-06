import { contains } from "../utilities";
import { IIRCMessage, IRCTags } from "./types";

function toPrintable(c: string): string {
    const code: number = c.charCodeAt(0);
    if (code >= 0 && code <= 32) {
        return JSON.stringify(c);
    }
    return `"${c}"`;
}

function validateInput(str: string, blacklist: string[], name: string) {
    for (const c of blacklist) {
        if (contains(c, str)) {
            throw new Error(`Messages ${name} can't contain ${toPrintable(c)}.`);
        }
    }
}

function serializeTag(input: string): string {
    let out: string = "";
    for (let i: number = 0; i < input.length; i++) {
        let char: string = input[i];
        switch (input[++i]) {
            case "\\":
                char = "\\\\";
                break;
            case " ":
                char = "\\s";
                break;
            case "\r":
                char = "\\r";
                break;
            case "\n":
                char = "\\n";
                break;
        }
        out += char;
    }
    return out;
}

export function serializeMessage(message: IIRCMessage): string {
    const serialized: string[] = [];
    if (message.tags) {
        const tags: IRCTags = message.tags;
        serialized.push(
            Object.keys(message.tags)
                .map(k => {
                    const value: string = tags[k] || "";
                    return `${serializeTag(k)}=${serializeTag(value)}`;
                })
                .join(";")
        );
    }

    if (message.prefix) {
        const prefix = message.prefix;
        let out = ":";
        switch (prefix.kind) {
            case "server":
                out += prefix.server;
                break;
            case "user":
                out += prefix.nick;
                if (prefix.user) {
                    out += `!${prefix.user}`;
                }
                if (prefix.host) {
                    out += `@${prefix.host}`;
                }
                break;
        }
        serialized.push(out);
    }

    serialized.push(message.command.toUpperCase());

    for (const param of message.params) {
        const blacklist = ["\n", "\r", "\0"];
        if (param !== message.params[message.params.length - 1] && contains(" ", param)) {
            throw new Error("Only the last message parameter can contain spaces.");
        }

        validateInput(param, blacklist, "parameters");

        if (param[0] === ":") {
            throw new Error('Messages parameters can not start with ":".');
        }
    }
    const last = String(message.params.pop());
    const rest = message.params.join(" ");

    serialized.push(
        `${rest.length > 0 ? `${rest} ` : ""}${last.indexOf(" ") > -1 ? ":" : ""}${last}`
    );

    return serialized.join(" ");
}
