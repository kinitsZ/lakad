"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { issueDeviceLink, redeemDeviceLink } from "@/lib/device-links";
import { lanAddresses } from "@/lib/lan";
import { attachSession, ensureSession, requireMember } from "@/lib/session";

export async function createDeviceLink(tripId: string) {
  const member = await requireMember(tripId);
  const { token, expiresAt } = await issueDeviceLink(member.id);

  const h = await headers();
  let host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const [hostname, port] = host.split(":");
  const isLocal = hostname === "localhost" || hostname === "127.0.0.1";
  // A phone can't reach "localhost", so in development point the QR at this machine's Wi-Fi address.
  if (isLocal && process.env.NODE_ENV !== "production") {
    const lan = lanAddresses()[0];
    if (lan) host = port ? `${lan}:${port}` : lan;
  }
  const local = isLocal || /^(10|127|192\.168|172\.(1[6-9]|2\d|3[01]))\./.test(hostname);
  const protocol = h.get("x-forwarded-proto") ?? (local ? "http" : "https");
  const url = `${protocol}://${host}/link/${token}`;

  const svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });

  return {
    url,
    qr: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export async function redeemLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const claimed = await redeemDeviceLink(token);
  // Expired or already used: the link page renders that state itself.
  if (!claimed) redirect(`/link/${encodeURIComponent(token)}`);

  const session = await ensureSession();
  await attachSession(session, claimed.memberId, claimed.tripId);
  redirect(`/trip/${claimed.slug}`);
}
