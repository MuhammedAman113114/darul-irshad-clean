import express from "express";
import { registerRoutes } from "../server/routes";
import { serveStatic } from "../server/vite";
import cookieSession from "cookie-session";
import path from "path";
import fs from "fs";

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

// Initialize routes
let initialized = false;

async function initializeApp() {
  if (!initialized) {
    await registerRoutes(app);
    
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), "dist/public");
    if (fs.existsSync(distPath)) {
      serveStatic(app);
    }
    
    initialized = true;
  }
}

// Vercel serverless function handler
export default async function handler(req: any, res: any) {
  await initializeApp();
  return app(req, res);
}
