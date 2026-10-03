import "server-only";
import { randomInt } from "node:crypto";

/**
 * A fresh number for each page view, picked on the server and handed to
 * PuckRenderer, so anything shown in a random order (a Hero Slideshow set to
 * Random) comes out the same in the server's HTML and in the browser.
 */
export function pageSeed(): number {
  return randomInt(1, 2 ** 31);
}
