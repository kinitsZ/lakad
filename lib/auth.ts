import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import { authAccount, authSession, authUser, authVerification } from "@/db/schema";
import { FACEBOOK_SIGN_IN } from "@/lib/features";

/** Placeholder addresses for sign-ins that came without an email (see Facebook below). */
export const NO_EMAIL_DOMAIN = "users.lakad.invalid";

/** True for real addresses; false for the placeholders above. */
export const hasRealEmail = (email: string) => !email.endsWith(`@${NO_EMAIL_DOMAIN}`);

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
    // Only offered once the Meta app is published (lib/features.ts).
    ...(FACEBOOK_SIGN_IN
      ? {
          facebook: {
            clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
            // Phone-only Facebook accounts have no email. Give them a unique placeholder on
            // the reserved .invalid domain: never delivered, never shown, never linked.
            mapProfileToUser: (profile) =>
              profile.email
                ? {}
                : {
                    email: `fb-${"id" in profile ? profile.id : profile.sub}@${NO_EMAIL_DOMAIN}`,
                    emailVerified: false,
                  },
          },
        }
      : {}),
  },
  account: {
    // Google verifies addresses, so a Google sign-in may join an existing account
    // with the same email. Facebook doesn't say whether an address is verified, so a
    // Facebook sign-in with an email that already has an account is refused
    // ("account_not_linked") rather than silently merged.
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // Connecting another sign-in from the account page is a deliberate choice made
      // while signed in, so its email doesn't have to match.
      allowDifferentEmails: true,
    },
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
