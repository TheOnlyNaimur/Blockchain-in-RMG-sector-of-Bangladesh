require("dotenv").config();

const express = require("express");
const cors = require("cors");
const routes = require("./routes/index");
const errorHandler = require("./middleware/errorHandler");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    contractAddress: process.env.CONTRACT_ADDRESS,
    rpcUrl: process.env.RPC_URL,
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
app.use("/api", routes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start: connect MongoDB first, then listen ────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n🚀 RMG Blockchain API  →  http://localhost:${PORT}`);
      console.log(`   Contract  : ${process.env.CONTRACT_ADDRESS}`);
      console.log(`   RPC       : ${process.env.RPC_URL}`);
      console.log(`\nBlockchain + MongoDB endpoints ready.\n`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
