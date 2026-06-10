/**
 * Function registry: every terminal screen the command line can launch.
 */

import { HELP, DES, QM, GP, GIP, TOP, N } from "./functions-core.js";
import { WEI, FXC, EQS, MOST, W, ECO, CRYP } from "./functions-monitors.js";

const FUNCTIONS = [HELP, DES, QM, GP, GIP, TOP, N, WEI, FXC, EQS, MOST, W, ECO, CRYP];

const byName = new Map();
for (const fn of FUNCTIONS) {
  byName.set(fn.name, fn);
  for (const a of fn.aliases || []) byName.set(a, fn);
}

export const registry = {
  list() {
    return FUNCTIONS;
  },
  find(token) {
    return byName.get(String(token).toUpperCase()) || null;
  },
};
