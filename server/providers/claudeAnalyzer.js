const Anthropic = require("@anthropic-ai/sdk");

const { SYSTEM_PROMPT } = require("../analyzeBillPrompt");
const { parseClaudeJson } = require("./json");

function createClaudeAnalyzer({ apiKey, model }) {
  if (!apiKey) {
    return null;
  }

  const anthropic = new Anthropic({ apiKey });

  return {
    async analyze({ currentBill, previousBill }) {
      const currentContentBlock = buildClaudeFileBlock(currentBill);
      const previousContentBlock = previousBill ? buildClaudeFileBlock(previousBill) : null;

      const message = await anthropic.messages.create({
        model,
        max_tokens: 2500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              ...(previousContentBlock
                ? [
                    {
                      type: "text",
                      text: `Previous bill${previousBill.fileName ? ` named "${previousBill.fileName}"` : ""}:`
                    },
                    previousContentBlock
                  ]
                : []),
              {
                type: "text",
                text: `Current bill${currentBill.fileName ? ` named "${currentBill.fileName}"` : ""}:`
              },
              currentContentBlock,
              {
                type: "text",
                text: previousContentBlock
                  ? "Analyze the current bill and compare it with the previous bill. Return only the JSON object."
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
