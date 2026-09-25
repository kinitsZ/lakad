import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { authAccount, authSession, authUser, authVerification } from "@/db/schema";

/**
 * Optional accounts. Joining a trip still needs only a name; signing in ties a
 * person's spots across trips and devices (see lib/accounts.ts for claiming).
 */
export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: authUser,
      session: authSession,
      account: authAccount,
      verification: authVerification,
    },
  }),
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  account: {
    // Google verifies addresses, so a Google sign-in may join an existing account
    // with the same email. Other providers will need that address verified first.
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    // A signed, short-lived copy of the session in a cookie, so most requests
    // don't need a database round trip to know who's signed in.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  advanced: {
    cookiePrefix: "lakad",
  },
  plugins: [nextCookies()],
});

export type AuthUser = typeof auth.$Infer.Session.user;
