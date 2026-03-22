import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { type Server } from "http";
import { nanoid } from "nanoid";
import type { InlineConfig, ConfigEnv } from "vite";

// Get __dirname — works in both ESM (import.meta.url) and CJS (__dirname global)
const _currentDir = (() => {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return __dirname;
  }
})();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports - only load Vite in development mode
  const { createServer: createViteServer, createLogger } = await import("vite");

  type ViteConfigExport = InlineConfig | ((env: ConfigEnv) => InlineConfig | Promise<InlineConfig>);
  const viteConfigModule = (await import("../client/vite.config")) as {
    default: ViteConfigExport;
  };
  const resolvedViteConfig =
    typeof viteConfigModule.default === "function"
      ? await viteConfigModule.default({
          mode: process.env.NODE_ENV || "development",
          command: "serve",
        })
      : viteConfigModule.default;
  const viteLogger = createLogger();

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...resolvedViteConfig,
    root: path.resolve(_currentDir, "..", "client"),
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        _currentDir,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        /src="\/(?:src\/)?index\.tsx"/,
        `src="/src/index.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const candidatePaths = [
    path.resolve(_currentDir, "..", "dist", "public"),
    path.resolve(_currentDir, "..", "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];
  const distPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!distPath) {
    throw new Error(
      `Could not find the build directory. Tried: ${candidatePaths.join(", ")}`,
    );
  }

  console.log("Serving static files from:", distPath);

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
