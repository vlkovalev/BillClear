const fs = require("fs");
const path = require("path");
const { analyzeLocally } = require("./providers/localAnalyzer");

const sampleDirs = [
  path.resolve(__dirname, "..", "samples", "telus_bills"),
  path.resolve(__dirname, "..", "samples", "virgin_bills")
];

function listSamplePdfs() {
  return sampleDirs.flatMap((dir) => {
    if (!fs.existsSync(dir)) {
      return [];
    }

    return fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".pdf"))
      .map((file) => path.join(dir, file));
  });
}

async function main() {
  const files = listSamplePdfs();

  if (files.length === 0) {
    console.log("No private sample PDFs found under samples/telus_bills or samples/virgin_bills.");
    return;
  }

  for (const fullPath of files.sort()) {
    const file = path.basename(fullPath);
    const fileBase64 = fs.readFileSync(fullPath).toString("base64");
    const currentBill = { fileBase64, fileName: file, fileType: "pdf", mediaType: "application/pdf" };

    try {
      const result = await analyzeLocally({ currentBill, previousBills: [] });
      if (!result) {
        console.log(`\n=== ${file} ===\nNO MATCH (local parser returned null; would fall back to mock/cloud)`);
        continue;
      }

      console.log(`\n=== ${file} ===`);
      console.log(`Carrier: ${result.carrier}`);
      console.log(`Billing period: ${result.billingPeriod}`);
      console.log(`Due date: ${result.dueDate}`);
      console.log(`Total due: ${result.totalDue}`);
      console.log("Charges:");
      result.charges.forEach((charge) => console.log(`  - ${charge.name}: ${charge.amount}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.log(`\n=== ${file} ===\nERROR: ${message}`);
    }
  }
}

main();
