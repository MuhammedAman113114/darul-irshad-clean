import express, { type Request, type Response } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import cookieSession from "cookie-session";
import { insertDemoData } from "./demo-data";
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
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
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

// Initialize app for both Vercel and traditional hosting
let appInitialized = false;

async function initializeApp() {
  if (!appInitialized) {
    await registerRoutes(app);
    
    // Check if we're in production by looking for built files
    const distPath = path.resolve(import.meta.dirname, "public");
    const isProduction = fs.existsSync(distPath);
    
    if (isProduction) {
      console.log("Running in production mode with static files");
      serveStatic(app);
    }
    
    appInitialized = true;
  }
  return app;
}

// For Vercel - initialize immediately
if (process.env.VERCEL) {
  await initializeApp();
}

// For traditional hosting - start server
if (!process.env.VERCEL) {
  async function startServer() {
    try {
      console.log("Starting server...");
      const server = await registerRoutes(app);
      
      const port = parseInt(process.env.PORT || "5000", 10);
      server.listen(port, "0.0.0.0", () => {
        const formattedTime = new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });

        console.log(`${formattedTime} [express] serving on port ${port}`);
      });

      // Check if we're in production by looking for built files
      const distPath = path.resolve(import.meta.dirname, "public");
      const isProduction = fs.existsSync(distPath) && process.env.NODE_ENV === "production";
      
      if (isProduction) {
        console.log("Running in production mode with static files");
        serveStatic(app);
      } else {
        console.log("Running in development mode with Vite dev server");
        await setupVite(app, server);
      }
    } catch (error) {
      console.error("Failed to start server:", error);
      console.error("Error stack:", error.stack);
      process.exit(1);
    }
  }

  startServer().catch((error) => {
    console.error("Unhandled server startup error:", error);
    process.exit(1);
  });
}

// Export the app for Vercel
export default app;