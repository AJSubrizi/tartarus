import { randomBytes } from "node:crypto";
export function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
}
