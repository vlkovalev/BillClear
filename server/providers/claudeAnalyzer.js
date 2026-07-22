const Anthropic = require("@anthropic-ai/sdk");

const { SYSTEM_PROMPT } = require("../analyzeBillPrompt");
const { parseClaudeJson } = require("./json");

function createClaudeAnalyzer({ apiKey, model }) {
  if (!apiKey) {
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  return {
    async analyze({ currentBill, previousBills = [] }) {
      const currentContentBlock = buildClaudeFileBlock(currentBill);
      const previousBlocks = previousBills.map((bill, index) => ({
        bill,
        index,
        block: buildClaudeFileBlock(bill)
      }));

      const message = await anthropic.messages.create({
        model,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...previousBlocks.flatMap(({ bill, index, block }) => [
                {
                  type: "text",
                  text: `Previous bill ${index + 1} of ${previousBlocks.length}${
                    bill.fileName ? ` named "${bill.fileName}"` : ""
                  } (order as uploaded, not necessarily chronological — read the date on each bill):`
                },
                block
              ]),
              {
                type: "text",
                text: `Current bill${currentBill.fileName ? ` named "${currentBill.fileName}"` : ""}:`
              },
              currentContentBlock,
              {
                type: "text",
                text:
                  previousBlocks.length > 0
                    ? `Analyze the current bill and compare it with the ${previousBlocks.length} previous bill(s) provided. If there is more than one previous bill, identify the trend across all of them (e.g. is the total climbing, and which charges are driving it), in addition to the usual current-vs-most-recent-previous comparison. Return only the JSON object.`
                    : "Analyze this Canadian telecom bill. Return only the JSON object."
              }
            ]
          }
        ]
      });

      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("")
        .trim();

      return {
        category: "telecom",
        ...parseClaudeJson(text),
        provider: "claude"
      };
    }
  };
}

function buildClaudeFileBlock({ fileBase64, fileType, mediaType }) {
  return fileType === "pdf"
    ? {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: fileBase64
        }
      }
    : {
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType,
          data: fileBase64
        }
      };
}

module.exports = { createClaudeAnalyzer };
