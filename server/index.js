const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const { createClaudeAnalyzer } = require("./providers/claudeAnalyzer");
const { analyzeLocally } = require("./providers/localAnalyzer");
const { buildMockBillAnalysis } = require("./providers/mockAnalyzer");

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const scanLimit = process.env.SCAN_RATE_LIMIT ?? "30";
const model = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const claudeAnalyzer = createClaudeAnalyzer({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model
});

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin not allowed by BillClear CORS policy."));
    }
  })
);
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT ?? "6mb" }));

function redactSensitiveData(input) {
  if (typeof input !== "string") {
    return input;
  }
  return input
    .replace(/\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g, "[REDACTED_PHONE]")
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[REDACTED_EMAIL]")
    .replace(/\b[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d\b/g, "[REDACTED_POSTAL_CODE]")
    .replace(/\b\d{10,16}\b/g, "[REDACTED_ACCOUNT_ID]");
}

// Simple request logging middleware with redaction
app.use((req, res, next) => {
  const url = redactSensitiveData(req.url);
  console.log(`[Request] ${req.method} ${url} - IP: ${req.ip}`);
  next();
});

const scanRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(scanLimit),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many scan requests. Please wait a few minutes and try again." }
});

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "billclear-api",
    providers: {
      localParser: true,
      claude: Boolean(claudeAnalyzer),
      mock: true
    }
  });
});

app.post("/api/analyze-bill", scanRateLimiter, async (req, res) => {
  const { fileBase64, fileName, fileType, mediaType, previousBills, previousBill, allowCloudAi = false } =
    req.body ?? {};
  res.setHeader("Cache-Control", "no-store");

  if (!fileBase64 || !mediaType || !fileType) {
    res.status(400).json({ error: "fileBase64, mediaType, and fileType are required." });
    return;
  }

  if (!["pdf", "image"].includes(fileType)) {
    res.status(400).json({ error: "fileType must be either 'pdf' or 'image'." });
    return;
  }

  const currentBill = { fileBase64, fileName, fileType, mediaType };
  // Accept the older single `previousBill` shape too, so any in-flight app
  // build that hasn't picked up the multi-bill update yet keeps working.
  const normalizedPreviousBills = Array.isArray(previousBills)
    ? previousBills.filter(Boolean)
    : previousBill
      ? [previousBill]
      : [];

  try {
    const localAnalysis = await analyzeLocally({ currentBill, previousBills: normalizedPreviousBills });
    if (localAnalysis) {
      validateAnalysis(localAnalysis);
      res.json(localAnalysis);
      return;
    }

    if (allowCloudAi && claudeAnalyzer) {
      const cloudAnalysis = await claudeAnalyzer.analyze({ currentBill, previousBills: normalizedPreviousBills });
      validateAnalysis(cloudAnalysis);
      res.json(cloudAnalysis);
      return;
    }

    if (process.env.ALLOW_MOCK_ANALYSIS === "false") {
      res.status(422).json({
        error:
          "BillClear could not parse this bill privately. Enable cloud AI fallback or try another supported carrier bill."
      });
      return;
    }

    const fallback = buildMockBillAnalysis(fileType);
    validateAnalysis(fallback);
    res.json({
      ...fallback,
      provider: "mock",
      findings: [
        {
          id: "cloud-disabled",
          severity: "watch",
          title: "Private parser could not read this bill",
          description: allowCloudAi
            ? "Cloud AI is unavailable, so BillClear returned a mock result for testing."
            : "Cloud AI was not enabled for this scan, so BillClear returned a mock result for testing."
        },
        ...fallback.findings
      ]
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown analysis error.";
    res.status(500).json({ error: message });
  }
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`BillClear API listening on http://localhost:${port}`);
  });
}

function validateAnalysis(analysis) {
  if (!analysis || typeof analysis !== "object") {
    throw new Error("Analysis was not a JSON object.");
  }

  if (!Array.isArray(analysis.charges) || !Array.isArray(analysis.findings)) {
    throw new Error("Analysis JSON is missing charges or findings arrays.");
  }
}

module.exports = app;
