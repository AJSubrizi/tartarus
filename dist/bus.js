import { EventEmitter } from "node:events";
class TartarusBus extends EventEmitter {
    emitEvent(ev) {
        this.emit("event", ev);
    }
}
export const bus = new TartarusBus();
export function onBus(fn) {
    bus.on("event", fn);
    return () => bus.off("event", fn);
}
