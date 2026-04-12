import { TwitterApi } from "twitter-api-v2";
import { type Request, type Response } from "express";
import { db } from "../db";
import { userSettings, users } from "@shared/schema";
import { eq } from "drizzle-orm";

const getClient = () =>
  new TwitterApi({
    clientId: process.env.TWITTER_CLIENT_ID!,
    clientSecret: process.env.TWITTER_CLIENT_SECRET!,
  });

const CALLBACK_URL = () => process.env.TWITTER_CALLBACK_URL!;

export const twitterController = {
  async initiateAuth(req: Request, res: Response) {
    if (!process.env.TWITTER_CLIENT_ID) {
      return res.redirect("/settings?twitter=error&msg=not_configured");
    }

    const client = getClient();
    const { url, codeVerifier, state } = client.generateOAuth2AuthLink(
      CALLBACK_URL(),
      {
        scope: ["users.read", "tweet.read"],
      }
    );

    // Store verifier + state in short-lived cookie
    res.cookie("_tw_oauth", JSON.stringify({ codeVerifier, state }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60 * 1000, // 10 minutes
      sameSite: "lax",
      path: "/",
    });

    return res.redirect(url);
  },

  async handleCallback(req: Request, res: Response) {
    const { code, state } = req.query as { code: string; state: string };
    const stored = req.cookies._tw_oauth;

    res.clearCookie("_tw_oauth", { path: "/" });

    if (!stored || !code || !state) {
      return res.redirect("/settings?twitter=error&msg=missing_params");
    }

    let parsed: { codeVerifier: string; state: string };
    try {
      parsed = JSON.parse(stored);
    } catch {
      return res.redirect("/settings?twitter=error&msg=bad_cookie");
    }

    if (parsed.state !== state) {
      return res.redirect("/settings?twitter=error&msg=state_mismatch");
    }

    try {
      const client = getClient();
      const { client: loggedClient } = await client.loginWithOAuth2({
        code,
        codeVerifier: parsed.codeVerifier,
        redirectUri: CALLBACK_URL(),
      });

      const twitterUser = await loggedClient.v2.me({
        "user.fields": ["verified"],
      });

      const isVerified = twitterUser.data.verified ?? false;
      const twitterId = twitterUser.data.id;
      const twitterUsername = twitterUser.data.username;

      if (!req.user) {
        return res.redirect("/settings?twitter=error&msg=not_logged_in");
      }

      // Update user settings with Twitter info
      await db
        .update(userSettings)
        .set({
          twitterHandle: twitterUsername,
          isTwitterConnected: true,
          twitterVerified: isVerified,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, req.user.id));

      return res.redirect(
        `/settings?twitter=connected&verified=${isVerified}`
      );
    } catch (err) {
      console.error("Twitter callback error:", err);
      return res.redirect("/settings?twitter=error&msg=oauth_failed");
    }
  },

  async disconnect(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      await db
        .update(userSettings)
        .set({
          twitterHandle: null,
          isTwitterConnected: false,
          twitterVerified: false,
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, req.user.id));

      return res.status(200).json({ message: "Twitter account disconnected" });
    } catch (err) {
      console.error("Twitter disconnect error:", err);
      return res.status(500).json({ message: "Failed to disconnect Twitter" });
    }
  },
};
