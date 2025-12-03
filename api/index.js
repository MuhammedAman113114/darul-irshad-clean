// Vercel Serverless Function - Entry Point
import express from "express";
import cookieSession from "cookie-session";
import { registerRoutes } from "../server/routes.js";
import { serveStatic } from "../server/vite.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Initialize routes once
let initialized = false;

async function initializeApp() {
  if (!initialized) {
    console.log("Initializing app for Vercel...");
    await registerRoutes(app);
    
    // Serve static files
    const distPath = path.resolve(__dirname, "../dist/public");
    if (fs.existsSync(distPath)) {
      console.log("Serving static files from:", distPath);
      serveStatic(app);
    }
    
    initialized = true;
    console.log("App initialized successfully");
  }
}

// Initialize on first import
await initializeApp();

// Export handler
export default function handler(req, res) {
  return app(req, res);
}
