/**
 * Switches that are safe to read anywhere (client or server). NEXT_PUBLIC_ values
 * are baked in at build time, so changing one needs a redeploy.
 */

/** Facebook sign-in stays hidden (and disabled on the server) until the Meta app is published. */
export const FACEBOOK_SIGN_IN = process.env.NEXT_PUBLIC_FACEBOOK_SIGN_IN === "on";
