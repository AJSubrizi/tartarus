#!/usr/bin/env node
/**
 * Long-running fake harness so smoke can test killJob.
 * Ignores prompt argv; sleeps ~20s unless killed.
 */
setTimeout(() => {
  console.log("sleeper-done");
  process.exit(0);
}, 20_000);
