import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import path from "node:path";


// Route imports
import { authRoutes } from "./routes/auth.routes";
import { userRoutes } from "./routes/user.routes";
import { projectRoutes } from "./routes/project.routes";
import { proposalRoutes } from "./routes/proposal.routes";
import { milestoneRoutes } from "./routes/milestone.routes";
import { disputeRoutes } from "./routes/dispute.routes";
import { reviewRoutes } from "./routes/review.routes";
import { categoryRoutes } from "./routes/category.routes";
import { adminRoutes } from "./routes/admin.routes";
import { notificationRoutes } from "./routes/notification.routes";
import { settingsRoutes } from "./routes/settings.routes";
import { connectionsRoutes } from "./routes/connections.routes";
import { messagesRoutes } from "./routes/messages.routes";
import { aiRoutes } from "./routes/ai.routes";
import { bountyRoutes } from "./routes/bounty.routes";
import { socialRoutes } from "./routes/social.routes";
import { nftRoutes } from "./routes/nft.routes";
import { refundRoutes } from "./routes/refund.routes";
import { referralRoutes } from "./routes/referral.routes";
import contactRoutes from "./routes/contact.routes";
import { twitterRoutes } from "./routes/twitter.routes";
import { verifiedTwitterUsersRoutes } from "./routes/verified-twitter-users.routes";

const app = express();

// Middleware
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: false, limit: "20mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

// CORS
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Expose-Headers", "WWW-Authenticate");
  res.header("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Trust first proxy (Hostinger LiteSpeed)
app.set("trust proxy", 1);

// Global rate limiting — applied to all write/sensitive endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'development' ? 1000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'GET', // GET requests are not rate limited globally
});
app.use("/api", globalLimiter);

// Set environment
app.set("env", process.env.NODE_ENV || "development");

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "...";
      }
      console.log(logLine);
    }
  });

  next();
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/milestones", milestoneRoutes);
app.use("/api/disputes", disputeRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/connections", connectionsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/bounties", bountyRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/nfts", nftRoutes);
app.use("/api/refunds", refundRoutes);
app.use("/api/referrals", referralRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/auth/twitter", twitterRoutes);
app.use("/api/twitter-verified", verifiedTwitterUsersRoutes);

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

(async () => {
  const server = createServer(app);

  // One-time cleanup: disputes are per-milestone now, project status should never be "disputed"
  try {
    const { db } = await import("./db");
    const { projects } = await import("../shared/schema");
    const { eq } = await import("drizzle-orm");
    const fixed = await db.update(projects).set({ status: "active" }).where(eq(projects.status, "disputed"));
    if (fixed[0]?.affectedRows) {
      console.log(`[startup] Restored ${fixed[0].affectedRows} legacy "disputed" projects to "active"`);
    }
  } catch (e) {
    console.error("[startup] Failed to clean up disputed projects:", e);
  }

  // Setup Vite in development for frontend serving
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    const { serveStatic } = await import("./vite");
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5001", 10);
  server.listen(port, "0.0.0.0", () => {
    console.log(`serving on port ${port}`);
  });
})();
