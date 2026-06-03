import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Standard port is 3000
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
    });
  });

  // Verify server configuration has Vite and routes in development or production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FF14 Roster Server] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
