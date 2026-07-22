import * as FileSystem from "expo-file-system/legacy";

import { API_BASE_URL } from "../config";
import { AnalyzeBillOptions, BillAnalysis, UploadedBill } from "../types";

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

const EXTENSION_MEDIA_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  webp: "image/webp"
};

function guessMediaType(uploadedBill: UploadedBill): string {
  const extension = uploadedBill.uri.split(".").pop()?.toLowerCase().split("?")[0];
  if (extension && EXTENSION_MEDIA_TYPES[extension]) {
    return EXTENSION_MEDIA_TYPES[extension];
  }
  return uploadedBill.type === "pdf" ? "application/pdf" : "image/jpeg";
}

async function readBillPayload(uploadedBill: UploadedBill) {
  if (uploadedBill.size && uploadedBill.size > MAX_UPLOAD_BYTES) {
    throw new Error("This bill is too large to scan on the beta backend. Please upload a smaller PDF or image under 4 MB.");
  }

  let fileBase64: string;
  try {
    fileBase64 = await FileSystem.readAsStringAsync(uploadedBill.uri, {
      encoding: FileSystem.EncodingType.Base64
    });
  } catch (cause) {
    throw new Error("Could not read the selected file. Please try picking it again.", { cause });
  }

  return {
    fileBase64,
    mediaType: guessMediaType(uploadedBill),
    fileType: uploadedBill.type,
    fileName: uploadedBill.name
  };
}

/**
 * Reads the user's selected bill (PDF or photo), sends it to the BillClear
 * backend proxy, and returns Claude's structured analysis.
 *
 * The Anthropic API key never touches this app. It lives only on the
 * backend in /server. See the project README for how to run that backend
 * and point this app at it via EXPO_PUBLIC_API_URL.
 */
export async function analyzeBill(
  uploadedBill: UploadedBill,
  previousBills: UploadedBill[] = [],
  allowCloudAi = false
): Promise<BillAnalysis> {
  const currentPayload = await readBillPayload(uploadedBill);
  const previousPayloads = await Promise.all(previousBills.map((bill) => readBillPayload(bill)));

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/analyze-bill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...currentPayload,
        previousBills: previousPayloads,
        allowCloudAi
      })
    });
  } catch (cause) {
    throw new Error(
      `Couldn't reach the BillClear server at ${API_BASE_URL}. Make sure the backend is running and EXPO_PUBLIC_API_URL points at your computer's address (see README.md).`,
      { cause }
    );
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`BillClear server returned an error (${response.status}). ${body}`.trim());
  }

  const payload = await response.json();

  if (!payload || typeof payload !== "object" || !Array.isArray(payload.charges)) {
    throw new Error("The analysis came back in an unexpected format.");
  }

  return payload as BillAnalysis;
}
