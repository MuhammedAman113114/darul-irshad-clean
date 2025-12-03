// Server wrapper for Vercel deployment
import express from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./vite";
import cookieSession from "cookie-session";
import path from "path";
import fs from "fs";

let appInstance: any = null;

export default async function createApp() {
  if (appInstance) {
    return appInstance;
  }

  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Session configuration
  app.use(
    cookieSession({
      name: "session",
      keys: ["secret-key-123"],
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: true,
      sameSite: "lax"
    })
  );

  app.use((req, res, next) => {
    if (req.path.endsWith(".html")) {
      res.header("Cache-Control", "no-cache, no-store, must-revalidate");
      res.header("Pragma", "no-cache");
      res.header("Expires", "0");
    }
    next();
  });

  // Register routes
  await registerRoutes(app);

  // Serve static files
  const distPath = path.resolve(process.cwd(), "dist/public");
  if (fs.existsSync(distPath)) {
    console.log("Serving static files from:", distPath);
    serveStatic(app);
  }

  appInstance = app;
  return app;
}
