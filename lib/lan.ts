import { networkInterfaces } from "node:os";

/** This machine's private IPv4 addresses, e.g. 192.168.1.3 — how a phone on the same Wi-Fi reaches the dev server. */
export function lanAddresses(): string[] {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === "IPv4" && !net.internal)
    .map((net) => net!.address);
}
