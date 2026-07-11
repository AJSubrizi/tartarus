import { EventEmitter } from "node:events";
export type BusEvent = {
    type: "job";
    jobId: string;
    status: string;
} | {
    type: "log";
    jobId: string;
    bytes: number;
} | {
    type: "harness";
    harnessId: string;
    status: string;
};
declare class TartarusBus extends EventEmitter {
    emitEvent(ev: BusEvent): void;
}
export declare const bus: TartarusBus;
export declare function onBus(fn: (ev: BusEvent) => void): () => void;
export {};
