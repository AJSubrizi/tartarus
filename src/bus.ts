import { EventEmitter } from "node:events";

export type BusEvent =
  | { type: "job"; jobId: string; status: string }
  | { type: "log"; jobId: string; bytes: number }
  | { type: "harness"; harnessId: string; status: string };

class TartarusBus extends EventEmitter {
  emitEvent(ev: BusEvent): void {
    this.emit("event", ev);
  }
}

export const bus = new TartarusBus();

export function onBus(fn: (ev: BusEvent) => void): () => void {
  bus.on("event", fn);
  return () => bus.off("event", fn);
}
