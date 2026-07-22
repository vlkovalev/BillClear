import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import { PRIVACY_POLICY_TEXT, TERMS_TEXT } from "./src/data/legalText";
import { telusSampleBills } from "./src/data/telusSampleBills";
import { analyzeBill } from "./src/services/analyzeBill";
import { BillAnalysis, BillCharge, BillFinding, BillHistoryPoint, UploadedBill } from "./src/types";
import { BillDelta, compareSampleBills, getLargestIncrease } from "./src/utils/compareBills";
import { formatCurrency } from "./src/utils/currency";
import { createDisputeLetter } from "./src/utils/disputeLetter";
import { buildReportHtml } from "./src/utils/reportHtml";

const statusCopy: Record<BillCharge["status"], string> = {
  expected: "Expected",
  changed: "Changed",
  new: "New",
  questionable: "Questionable"
};

const findingIcons: Record<BillFinding["severity"], keyof typeof Ionicons.glyphMap> = {
  info: "information-circle",
  watch: "alert-circle",
  dispute: "flag"
};

// Free plan keeps the original one-previous-bill comparison. Pro unlocks
// unlimited previous bills (and the trend view that needs 2+), cloud AI
// fallback, and dispute letter drafting. isPro is in-memory only for now —
// no persistence and no real payment provider wired up yet. Wire a real
// entitlement check (e.g. RevenueCat, Stripe, or Expo In-App Purchases)
// before shipping this gate to real users.
//
// Pricing/UX principles, based on the most common complaints about
// comparable bill-negotiation/subscription apps (Rocket Money, Trim,
// Billshark): never charge without an explicit, itemized confirmation up
// front; make cancellation one tap with no retention flow; never require
// bank-account linking for any tier, free or Pro. Keep these true when real
// billing replaces the test toggle below.
const FREE_PREVIOUS_BILL_LIMIT = 1;

export default function App() {
  const [uploadedBill, setUploadedBill] = useState<UploadedBill | null>(null);
  const [previousBills, setPreviousBills] = useState<UploadedBill[]>([]);
  const [analysis, setAnalysis] = useState<BillAnalysis | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedLetterCharge, setSelectedLetterCharge] = useState<BillCharge | null>(null);
  const [showSampleComparison, setShowSampleComparison] = useState(true);
  const [allowCloudAi, setAllowCloudAi] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | "upgrade" | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const canAddMorePreviousBills = isPro || previousBills.length < FREE_PREVIOUS_BILL_LIMIT;

  const billDelta = useMemo(() => {
    if (!analysis?.previousTotal) {
      return null;
    }

    return analysis.totalDue - analysis.previousTotal;
  }, [analysis]);

  const chargeGroups = useMemo(() => {
    if (!analysis) {
      return { needsAttention: [] as BillCharge[], expected: [] as BillCharge[] };
    }

    return {
      needsAttention: analysis.charges.filter((charge) => charge.status !== "expected"),
      expected: analysis.charges.filter((charge) => charge.status === "expected")
    };
  }, [analysis]);

  // Recomputed only when a new analysis lands, so the "generated" timestamp
  // reflects when the scan finished rather than re-rendering on every tick.
  const reportGeneratedAt = useMemo(() => {
    if (!analysis) {
      return null;
    }

    return new Date().toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" });
  }, [analysis]);

  const sampleComparison = useMemo(() => {
    const previous = telusSampleBills.find((bill) => bill.billDate === "May 17, 2026");
    const current = telusSampleBills.find((bill) => bill.billDate === "June 17, 2026");

    if (!previous || !current) {
      return null;
    }

    const deltas = compareSampleBills(previous, current);

    return {
      previous,
      current,
      deltas,
      largestIncrease: getLargestIncrease(deltas)
    };
  }, []);

  async function runAnalysis(nextBill: UploadedBill, comparisonBills = previousBills) {
    setUploadedBill(nextBill);
    setAnalysis(null);
    setScanError(null);
    setSelectedLetterCharge(null);
    setIsScanning(true);

    try {
      const nextAnalysis = await analyzeBill(nextBill, comparisonBills, allowCloudAi);
      setAnalysis(nextAnalysis);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "BillClear could not analyze this bill yet. Please try another file.";
      setScanError(message);
    } finally {
      setIsScanning(false);
    }
  }

  function clearScan() {
    setUploadedBill(null);
    setPreviousBills([]);
    setAnalysis(null);
    setScanError(null);
    setSelectedLetterCharge(null);
  }

  function removePreviousBill(uri: string) {
    const nextPreviousBills = previousBills.filter((bill) => bill.uri !== uri);
    setPreviousBills(nextPreviousBills);

    if (uploadedBill) {
      runAnalysis(uploadedBill, nextPreviousBills);
    }
  }

  async function exportReportPdf() {
    if (!analysis) {
      return;
    }
    if (!isPro) {
      setActiveModal("upgrade");
      return;
    }

    setIsExportingPdf(true);
    try {
      const html = buildReportHtml(analysis);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();

      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `BillClear report — ${analysis.carrier} ${analysis.billingPeriod}`
        });
      } else {
        Alert.alert("Report ready", `Your PDF report was saved, but sharing isn't available on this device.\n\n${uri}`);
      }
    } catch (error) {
      Alert.alert(
        "Export failed",
        error instanceof Error ? error.message : "BillClear could not generate the PDF report."
      );
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function pickCurrentPdf() {
    if (!termsAccepted) {
      Alert.alert("Consent required", "Please read and accept the Privacy Policy and Terms of Service before scanning a bill.");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0];
    await runAnalysis({
      name: file.name,
      type: "pdf",
      uri: file.uri,
      size: file.size
    });
  }

  async function pickPreviousPdf() {
    if (!termsAccepted) {
      Alert.alert("Consent required", "Please read and accept the Privacy Policy and Terms of Service before scanning a bill.");
      return;
    }
    if (!uploadedBill) {
      Alert.alert(
        "Add your current bill first",
        'Tap "Current PDF" or "Pick Photo" above to upload the bill you want a report for — that generates the report automatically. Previous bills are only used to compare against it.'
      );
      return;
    }
    if (!canAddMorePreviousBills) {
      setActiveModal("upgrade");
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({
      type: "application/pdf",
      copyToCacheDirectory: true,
      multiple: false
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0];
    const nextPreviousBill: UploadedBill = {
      name: file.name,
      type: "pdf",
      uri: file.uri,
      size: file.size
    };

    const nextPreviousBills = [...previousBills, nextPreviousBill];
    setPreviousBills(nextPreviousBills);

    if (uploadedBill) {
      await runAnalysis(uploadedBill, nextPreviousBills);
    }
  }

  async function pickImage() {
    if (!termsAccepted) {
      Alert.alert("Consent required", "Please read and accept the Privacy Policy and Terms of Service before scanning a bill.");
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Allow photo access to scan a bill image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });

    if (result.canceled) {
      return;
    }

    const image = result.assets[0];
    await runAnalysis({
      name: image.fileName ?? "Bill photo",
      type: "image",
      uri: image.uri,
      size: image.fileSize
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.page}>
        <View style={styles.header}>
          <View style={styles.logoMark}>
            <Ionicons name="receipt" size={27} color="#14332e" />
          </View>
          <View>
            <Text style={styles.brand}>BillClear</Text>
            <Text style={styles.tagline}>Canadian telecom bills, translated.</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Scan your Canadian telecom bills before you pay them.</Text>
          <Text style={styles.heroCopy}>
            Upload a PDF or photo and get a plain-English breakdown of hidden fees, price increases, and
            dispute-worthy changes.
          </Text>
        </View>

        <View style={styles.uploadPanel}>
          <View style={styles.uploadPanelHeaderRow}>
            <Text style={styles.sectionTitle}>Start a bill scan</Text>
            <Pressable
              accessibilityLabel={isPro ? "Manage BillClear Pro" : "Upgrade to BillClear Pro"}
              style={({ pressed }) => [styles.proRow, pressed && styles.pressed]}
              onPress={() => setActiveModal("upgrade")}
            >
              <Ionicons name={isPro ? "star" : "star-outline"} size={14} color="#7a5614" />
              <Text style={styles.proRowText}>{isPro ? "Pro" : "Upgrade"}</Text>
            </Pressable>
          </View>
          <View style={styles.privacyNotice}>
            <Ionicons name="lock-closed" size={18} color="#14332e" />
            <Text style={styles.privacyText}>
              Private mode runs carrier parsers first. Bill files are not stored by BillClear.
            </Text>
          </View>
          <Pressable
            style={styles.consentRow}
            onPress={() => setTermsAccepted((accepted) => !accepted)}
          >
            <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
              {termsAccepted && <Ionicons name="checkmark" size={12} color="#f8f3e9" />}
            </View>
            <Text style={styles.consentText}>
              I accept the{" "}
              <Text style={styles.legalLink} onPress={() => setActiveModal("privacy")}>
                Privacy Policy
              </Text>{" "}
              and{" "}
              <Text style={styles.legalLink} onPress={() => setActiveModal("terms")}>
                Terms of Service
              </Text>
              .
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: allowCloudAi }}
            style={({ pressed }) => [
              styles.cloudToggle,
              allowCloudAi && styles.cloudToggleActive,
              !termsAccepted && styles.disabledToggle,
              pressed && styles.pressed
            ]}
            onPress={() => {
              if (!termsAccepted) {
                Alert.alert("Consent required", "Please read and accept the Privacy Policy and Terms of Service first.");
                return;
              }
              if (!isPro) {
                setActiveModal("upgrade");
                return;
              }
              setAllowCloudAi((enabled) => !enabled);
            }}
          >
            <View style={[styles.toggleKnob, allowCloudAi && styles.toggleKnobActive, !termsAccepted && styles.disabledToggleKnob]}>
              <Ionicons
                name={!isPro ? "lock-closed" : allowCloudAi ? "cloud-done" : "phone-portrait"}
                size={16}
                color={termsAccepted ? "#14332e" : "#888888"}
              />
            </View>
            <View style={styles.cloudToggleTextWrap}>
              <Text style={[styles.cloudToggleTitle, !termsAccepted && styles.disabledText]}>
                {allowCloudAi ? "AI fallback allowed" : "Private parser first"}
              </Text>
              <Text style={[styles.cloudToggleText, !termsAccepted && styles.disabledText]}>
                {!isPro
                  ? "Upgrade to Pro to allow cloud AI fallback."
                  : allowCloudAi
                    ? "If local parsing fails, extracted bill data may be sent to the configured AI provider."
                    : "No cloud AI call unless you turn this on."}
              </Text>
            </View>
          </Pressable>
          <Text style={styles.stepLabel}>1. Upload the bill you want explained — your report appears automatically.</Text>
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [
                styles.actionButton,
                !termsAccepted && styles.disabledButton,
                pressed && styles.pressed
              ]}
              onPress={pickCurrentPdf}
            >
              <Ionicons name="document-text" size={22} color={termsAccepted ? "#f8f3e9" : "#a1b1ac"} />
              <Text style={[styles.actionText, !termsAccepted && styles.disabledTextLight]}>Current PDF</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                !termsAccepted && styles.disabledButton,
                pressed && styles.pressed
              ]}
              onPress={pickImage}
            >
              <Ionicons name="image" size={22} color={termsAccepted ? "#14332e" : "#888888"} />
              <Text style={[styles.secondaryText, !termsAccepted && styles.disabledText]}>Pick Photo</Text>
            </Pressable>
          </View>
          <Text style={styles.stepLabel}>2. Optional — add a previous bill to compare against the one above.</Text>
          <Pressable
            style={({ pressed }) => [
              styles.previousButton,
              !termsAccepted && styles.disabledButton,
              pressed && styles.pressed
            ]}
            onPress={pickPreviousPdf}
          >
            <Ionicons
              name={canAddMorePreviousBills ? "git-compare" : "lock-closed"}
              size={20}
              color={termsAccepted ? "#14332e" : "#888888"}
            />
            <Text style={[styles.previousText, !termsAccepted && styles.disabledText]}>
              {previousBills.length === 0
                ? "Add previous bill for comparison"
                : canAddMorePreviousBills
                  ? "Add another previous bill"
                  : "Add another previous bill (Pro)"}
            </Text>
          </Pressable>

          {uploadedBill ? (
            <View style={styles.fileRow}>
              <Ionicons name={uploadedBill.type === "pdf" ? "document" : "camera"} size={18} color="#36524b" />
              <Text style={styles.fileName} numberOfLines={1}>
                {uploadedBill.name}
              </Text>
            </View>
          ) : null}
          {previousBills.map((bill) => (
            <View key={bill.uri} style={styles.fileRow}>
              <Ionicons name="time" size={18} color="#36524b" />
              <Text style={styles.fileName} numberOfLines={1}>
                Comparing against {bill.name}
              </Text>
              <Pressable
                accessibilityLabel={`Remove ${bill.name} from comparison`}
                style={({ pressed }) => [styles.removeFileButton, pressed && styles.pressed]}
                onPress={() => removePreviousBill(bill.uri)}
              >
                <Ionicons name="close" size={16} color="#5f6d68" />
              </Pressable>
            </View>
          ))}
          {scanError ? (
            <View style={styles.errorBox}>
              <Ionicons name="warning" size={20} color="#793915" />
              <View style={styles.errorContent}>
                <Text style={styles.errorTitle}>Scan failed</Text>
                <Text style={styles.errorText}>{scanError}</Text>
              </View>
              {uploadedBill ? (
                <Pressable
                  accessibilityLabel="Retry scan"
                  style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}
                  onPress={() => runAnalysis(uploadedBill)}
                >
                  <Text style={styles.retryText}>Retry</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </View>

        {showSampleComparison && sampleComparison ? (
          <View style={styles.comparisonPanel}>
            <View style={styles.comparisonHeader}>
              <View>
                <Text style={styles.kickerDark}>Real TELUS sample</Text>
                <Text style={styles.sectionTitle}>May to June changes</Text>
              </View>
              <Pressable
                accessibilityLabel="Hide sample comparison"
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={() => setShowSampleComparison(false)}
              >
                <Ionicons name="close" size={20} color="#14332e" />
              </Pressable>
            </View>
            <Text style={styles.summaryText}>
              June total new charges were {formatCurrency(sampleComparison.current.totalNewCharges)}, up{" "}
              {formatCurrency(sampleComparison.current.totalNewCharges - sampleComparison.previous.totalNewCharges)}
              from May. The biggest increase was{" "}
              {sampleComparison.largestIncrease
                ? `${sampleComparison.largestIncrease.label} at ${formatCurrency(sampleComparison.largestIncrease.delta)}`
                : "not material"}
              .
            </Text>
            <View style={styles.deltaList}>
              {sampleComparison.deltas.map((delta) => (
                <DeltaRow key={delta.key} delta={delta} />
              ))}
            </View>
          </View>
        ) : null}

        {isScanning ? (
          <View style={styles.loadingPanel}>
            <ActivityIndicator size="large" color="#14332e" />
            <Text style={styles.loadingTitle}>Reading your bill</Text>
            <Text style={styles.loadingCopy}>Checking line items, totals, and new charges.</Text>
          </View>
        ) : null}

        {analysis ? (
          <View style={styles.results}>
            <View style={styles.summaryPanel}>
              <View>
                <Text style={styles.kicker}>{analysis.carrier} bill</Text>
                <Text style={styles.total}>{formatCurrency(analysis.totalDue)}</Text>
                <Text style={styles.period}>{analysis.billingPeriod}</Text>
              </View>
              <View style={styles.deltaPill}>
                <Ionicons name={billDelta && billDelta > 0 ? "trending-up" : "remove"} size={16} color="#793915" />
                <Text style={styles.deltaText}>
                  {billDelta ? `${formatCurrency(Math.abs(billDelta))} higher` : "No prior bill"}
                </Text>
              </View>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text style={styles.metaValue}>{analysis.dueDate}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Flagged charges</Text>
                <Text style={styles.metaValue}>{chargeGroups.needsAttention.length}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Confidence</Text>
                <Text style={styles.metaValue}>{capitalizeWord(analysis.confidence ?? "medium")}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Generated</Text>
                <Text style={styles.metaValue} numberOfLines={1}>
                  {reportGeneratedAt}
                </Text>
              </View>
            </View>

            <Text style={styles.summaryText}>{analysis.plainEnglishSummary}</Text>

            <View style={styles.confidenceBox}>
              <Ionicons name="analytics" size={20} color="#14332e" />
              <Text style={styles.confidenceText}>
                Scan confidence: {analysis.confidence ?? "medium"}. Source: {providerLabel(analysis.provider)}. Verify the
                total due before sending a dispute.
              </Text>
            </View>

            <Pressable
              accessibilityLabel={isPro ? "Export PDF report" : "Export PDF report (Pro)"}
              style={({ pressed }) => [styles.exportButton, pressed && styles.pressed]}
              disabled={isExportingPdf}
              onPress={exportReportPdf}
            >
              {isExportingPdf ? (
                <ActivityIndicator size="small" color="#f8f3e9" />
              ) : (
                <Ionicons name={isPro ? "document-attach" : "lock-closed"} size={19} color="#f8f3e9" />
              )}
              <Text style={styles.exportButtonText}>
                {isExportingPdf
                  ? "Generating report…"
                  : isPro
                    ? "Export PDF report"
                    : "Export PDF report (Pro)"}
              </Text>
            </Pressable>

            {analysis.history && analysis.history.length > 1 ? (
              <View style={styles.historyPanel}>
                <Text style={styles.sectionTitle}>Total due over time</Text>
                {analysis.history.map((point, index) => (
                  <HistoryRow
                    key={`${point.billingPeriod}-${index}`}
                    point={point}
                    previousPoint={index > 0 ? analysis.history![index - 1] : null}
                    isCurrent={index === analysis.history!.length - 1}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.findingsGrid}>
              {analysis.findings.map((finding) => (
                <FindingCard key={finding.id} finding={finding} />
              ))}
            </View>

            {chargeGroups.needsAttention.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>
                  Needs your attention ({chargeGroups.needsAttention.length})
                </Text>
                {chargeGroups.needsAttention.map((charge) => (
                  <ChargeRow
                    key={charge.id}
                    charge={charge}
                    isPro={isPro}
                    onCreateLetter={() => {
                      if (!isPro) {
                        setActiveModal("upgrade");
                        return;
                      }
                      setSelectedLetterCharge(charge);
                    }}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.noAttentionBox}>
                <Ionicons name="checkmark-circle" size={20} color="#31594f" />
                <Text style={styles.noAttentionText}>
                  Nothing on this bill was flagged as new, changed, or questionable.
                </Text>
              </View>
            )}

            {chargeGroups.expected.length > 0 ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitleMuted}>
                  Expected charges ({chargeGroups.expected.length})
                </Text>
                {chargeGroups.expected.map((charge) => (
                  <ExpectedChargeRow key={charge.id} charge={charge} />
                ))}
              </View>
            ) : null}

            {selectedLetterCharge ? (
              <View style={styles.letterBox}>
                <View style={styles.letterHeader}>
                  <Text style={styles.rightsTitle}>Dispute letter draft</Text>
                  <Pressable
                    accessibilityLabel="Close dispute letter"
                    style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                    onPress={() => setSelectedLetterCharge(null)}
                  >
                    <Ionicons name="close" size={20} color="#14332e" />
                  </Pressable>
                </View>
                <Text style={styles.letterText}>{createDisputeLetter(analysis, selectedLetterCharge)}</Text>
              </View>
            ) : null}

            <View style={styles.rightsBox}>
              <Ionicons name="shield-checkmark" size={22} color="#14332e" />
              <View style={styles.rightsContent}>
                <Text style={styles.rightsTitle}>Dispute helper</Text>
                <Text style={styles.rightsText}>{analysis.rightsNote}</Text>
              </View>
            </View>
            <Pressable style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]} onPress={clearScan}>
              <Ionicons name="refresh" size={19} color="#14332e" />
              <Text style={styles.clearText}>Start over</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
      <Modal
        visible={activeModal === "privacy"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Privacy Policy</Text>
              <Pressable
                accessibilityLabel="Close privacy policy"
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={() => setActiveModal(null)}
              >
                <Ionicons name="close" size={20} color="#14332e" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalBodyText}>{PRIVACY_POLICY_TEXT}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === "terms"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms of Service</Text>
              <Pressable
                accessibilityLabel="Close terms of service"
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={() => setActiveModal(null)}
              >
                <Ionicons name="close" size={20} color="#14332e" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalBodyText}>{TERMS_TEXT}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={activeModal === "upgrade"}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>BillClear Pro</Text>
              <Pressable
                accessibilityLabel="Close upgrade screen"
                style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
                onPress={() => setActiveModal(null)}
              >
                <Ionicons name="close" size={20} color="#14332e" />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={styles.modalBodyText}>
                Pro unlocks comparisons against more than one previous bill (plus the "Total due over time" trend
                view), cloud AI fallback for bills the private parser can't read, dispute letter drafting for
                flagged charges, and a polished PDF report you can save or share. Pro never requires linking a bank
                account — same privacy-first design as the free plan, just more comparisons.
              </Text>
              <View style={styles.proFeatureList}>
                <ProFeatureRow icon="shield-checkmark" text="No bank account linking, on Free or Pro" />
                <ProFeatureRow icon="git-compare" text="Compare against unlimited previous bills" />
                <ProFeatureRow icon="trending-up" text='"Total due over time" trend view' />
                <ProFeatureRow icon="cloud-done" text="Cloud AI fallback for hard-to-read bills" />
                <ProFeatureRow icon="create" text="Dispute letter drafting for flagged charges" />
                <ProFeatureRow icon="document-attach" text="Exportable PDF report to save or share" />
              </View>
              <Text style={styles.modalBodyText}>
                {isPro
                  ? "You're currently on BillClear Pro."
                  : "Real payment processing isn't wired up yet. This test toggle is for trying the Pro experience while building — remove it before shipping to real users. When billing goes live: clear pricing shown before any charge, and cancellation in one tap with no retention flow."}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.proTestButton, pressed && styles.pressed]}
                onPress={() => setIsPro((value) => !value)}
              >
                <Text style={styles.proTestButtonText}>
                  {isPro ? "Turn off Pro (test mode)" : "Turn on Pro (test mode)"}
                </Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProFeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.proFeatureRow}>
      <Ionicons name={icon} size={18} color="#7a5614" />
      <Text style={styles.proFeatureText}>{text}</Text>
    </View>
  );
}

function DeltaRow({ delta }: { delta: BillDelta }) {
  const isIncrease = delta.delta > 0;

  return (
    <View style={styles.deltaRow}>
      <View style={styles.deltaNameWrap}>
        <Text style={styles.deltaLabel}>{delta.label}</Text>
        <Text style={styles.deltaSubtext}>
          {formatCurrency(delta.previousAmount)} to {formatCurrency(delta.currentAmount)}
        </Text>
      </View>
      <Text style={[styles.deltaAmount, isIncrease ? styles.deltaIncrease : styles.deltaDecrease]}>
        {isIncrease ? "+" : ""}
        {formatCurrency(delta.delta)}
      </Text>
    </View>
  );
}

function HistoryRow({
  point,
  previousPoint,
  isCurrent
}: {
  point: BillHistoryPoint;
  previousPoint: BillHistoryPoint | null;
  isCurrent: boolean;
}) {
  const delta = previousPoint ? roundToCents(point.totalDue - previousPoint.totalDue) : null;
  const isIncrease = delta != null && delta > 0;

  return (
    <View style={[styles.historyRow, isCurrent && styles.historyRowCurrent]}>
      <View style={styles.historyPeriodWrap}>
        <Text style={styles.historyPeriod}>{point.billingPeriod}</Text>
        {isCurrent ? <Text style={styles.historyCurrentTag}>Current</Text> : null}
      </View>
      <View style={styles.historyAmountWrap}>
        <Text style={styles.historyAmount}>{formatCurrency(point.totalDue)}</Text>
        {delta != null && delta !== 0 ? (
          <Text style={[styles.historyDelta, isIncrease ? styles.deltaIncrease : styles.deltaDecrease]}>
            {isIncrease ? "+" : ""}
            {formatCurrency(delta)}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function roundToCents(value: number) {
  return Math.round(value * 100) / 100;
}

function capitalizeWord(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function FindingCard({ finding }: { finding: BillFinding }) {
  return (
    <View style={[styles.findingCard, findingStyleBySeverity[finding.severity]]}>
      <Ionicons name={findingIcons[finding.severity]} size={21} color="#14332e" />
      <Text style={styles.findingTitle}>{finding.title}</Text>
      <Text style={styles.findingText}>{finding.description}</Text>
    </View>
  );
}

function ChargeRow({
  charge,
  isPro,
  onCreateLetter
}: {
  charge: BillCharge;
  isPro: boolean;
  onCreateLetter: () => void;
}) {
  const canCreateLetter = charge.status === "new" || charge.status === "changed" || charge.status === "questionable";

  return (
    <View style={styles.chargeRow}>
      <View style={styles.chargeTopLine}>
        <View style={styles.chargeNameWrap}>
          <Text style={styles.chargeName}>{charge.name}</Text>
          <Text style={[styles.status, chargeStatusStyle[charge.status]]}>{statusCopy[charge.status]}</Text>
        </View>
        <Text style={styles.chargeAmount}>{formatCurrency(charge.amount)}</Text>
      </View>
      <Text style={styles.chargeExplanation}>{charge.explanation}</Text>
      {charge.action ? <Text style={styles.chargeAction}>{charge.action}</Text> : null}
      {canCreateLetter ? (
        <Pressable style={({ pressed }) => [styles.letterButton, pressed && styles.pressed]} onPress={onCreateLetter}>
          <Ionicons name={isPro ? "create" : "lock-closed"} size={17} color="#14332e" />
          <Text style={styles.letterButtonText}>{isPro ? "Draft dispute letter" : "Draft dispute letter (Pro)"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ExpectedChargeRow({ charge }: { charge: BillCharge }) {
  return (
    <View style={styles.expectedChargeRow}>
      <Text style={styles.expectedChargeName} numberOfLines={1}>
        {charge.name}
      </Text>
      <Text style={styles.expectedChargeAmount}>{formatCurrency(charge.amount)}</Text>
    </View>
  );
}

function providerLabel(provider: BillAnalysis["provider"]) {
  switch (provider) {
    case "local_parser":
      return "private parser";
    case "claude":
      return "cloud AI";
    case "mock":
      return "test mock";
    case "openai":
      return "OpenAI";
    case "gemini":
      return "Gemini";
    default:
      return "analysis engine";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7f5ef"
  },
  page: {
    padding: 20,
    paddingBottom: 40,
    gap: 18
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  logoMark: {
    alignItems: "center",
    backgroundColor: "#dcead5",
    borderRadius: 8,
    height: 48,
    justifyContent: "center",
    width: 48
  },
  brand: {
    color: "#14332e",
    fontSize: 25,
    fontWeight: "800",
    letterSpacing: 0
  },
  tagline: {
    color: "#5f6d68",
    fontSize: 14,
    marginTop: 2
  },
  hero: {
    gap: 10,
    paddingTop: 12
  },
  heroTitle: {
    color: "#14332e",
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: 0,
    lineHeight: 39
  },
  heroCopy: {
    color: "#4d5e59",
    fontSize: 17,
    lineHeight: 25
  },
  uploadPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  privacyNotice: {
    alignItems: "flex-start",
    backgroundColor: "#eef4f8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  privacyText: {
    color: "#36524b",
    flex: 1,
    fontSize: 13,
    lineHeight: 19
  },
  cloudToggle: {
    alignItems: "center",
    backgroundColor: "#f7f5ef",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 11
  },
  cloudToggleActive: {
    backgroundColor: "#fff2d8",
    borderColor: "#e5c47a"
  },
  toggleKnob: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d7d0c2",
    borderRadius: 8,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  toggleKnobActive: {
    backgroundColor: "#dcead5",
    borderColor: "#b7d0ad"
  },
  cloudToggleTextWrap: {
    flex: 1,
    gap: 3
  },
  cloudToggleTitle: {
    color: "#14332e",
    fontSize: 14,
    fontWeight: "900"
  },
  cloudToggleText: {
    color: "#5f6d68",
    fontSize: 12,
    lineHeight: 17
  },
  sectionTitle: {
    color: "#14332e",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: 0
  },
  actions: {
    flexDirection: "row",
    gap: 10
  },
  actionButton: {
    alignItems: "center",
    backgroundColor: "#14332e",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50
  },
  previousButton: {
    alignItems: "center",
    backgroundColor: "#fff2d8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 12
  },
  pressed: {
    opacity: 0.75
  },
  actionText: {
    color: "#f8f3e9",
    fontSize: 16,
    fontWeight: "800"
  },
  secondaryText: {
    color: "#14332e",
    fontSize: 16,
    fontWeight: "800"
  },
  previousText: {
    color: "#14332e",
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  fileRow: {
    alignItems: "center",
    backgroundColor: "#f7f5ef",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 10
  },
  fileName: {
    color: "#36524b",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  removeFileButton: {
    alignItems: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 6,
    height: 26,
    justifyContent: "center",
    width: 26
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: "#f7e2dc",
    borderColor: "#e4bcae",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    padding: 12
  },
  errorContent: {
    flex: 1,
    gap: 3
  },
  errorTitle: {
    color: "#793915",
    fontSize: 14,
    fontWeight: "900"
  },
  errorText: {
    color: "#793915",
    fontSize: 13,
    lineHeight: 18
  },
  retryButton: {
    backgroundColor: "#ffffff",
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  retryText: {
    color: "#793915",
    fontSize: 13,
    fontWeight: "900"
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 22
  },
  loadingTitle: {
    color: "#14332e",
    fontSize: 18,
    fontWeight: "800"
  },
  loadingCopy: {
    color: "#5f6d68",
    fontSize: 14
  },
  results: {
    gap: 16
  },
  comparisonPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    padding: 16
  },
  comparisonHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  kickerDark: {
    color: "#5f6d68",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 4,
    textTransform: "uppercase"
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  deltaList: {
    gap: 8
  },
  deltaRow: {
    alignItems: "center",
    backgroundColor: "#f7f5ef",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 11
  },
  deltaNameWrap: {
    flex: 1,
    gap: 3
  },
  deltaLabel: {
    color: "#14332e",
    fontSize: 14,
    fontWeight: "900"
  },
  deltaSubtext: {
    color: "#5f6d68",
    fontSize: 12
  },
  deltaAmount: {
    fontSize: 14,
    fontWeight: "900"
  },
  deltaIncrease: {
    color: "#793915"
  },
  deltaDecrease: {
    color: "#31594f"
  },
  summaryPanel: {
    alignItems: "flex-start",
    backgroundColor: "#14332e",
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18
  },
  kicker: {
    color: "#dcead5",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  total: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900",
    letterSpacing: 0,
    marginTop: 4
  },
  period: {
    color: "#c8d5cf",
    fontSize: 14,
    marginTop: 4
  },
  deltaPill: {
    alignItems: "center",
    backgroundColor: "#f1d2b6",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7
  },
  deltaText: {
    color: "#793915",
    fontSize: 13,
    fontWeight: "800"
  },
  summaryText: {
    color: "#2f423d",
    fontSize: 16,
    lineHeight: 24
  },
  confidenceBox: {
    alignItems: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    padding: 12
  },
  confidenceText: {
    color: "#36524b",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  historyPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 16
  },
  historyRow: {
    alignItems: "center",
    backgroundColor: "#f7f5ef",
    borderRadius: 8,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 11
  },
  historyRowCurrent: {
    backgroundColor: "#e8eee2"
  },
  historyPeriodWrap: {
    alignItems: "flex-start",
    flex: 1,
    gap: 4
  },
  historyPeriod: {
    color: "#14332e",
    fontSize: 14,
    fontWeight: "800"
  },
  historyCurrentTag: {
    backgroundColor: "#dcead5",
    borderRadius: 6,
    color: "#31594f",
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 2,
    textTransform: "uppercase"
  },
  historyAmountWrap: {
    alignItems: "flex-end",
    gap: 2
  },
  historyAmount: {
    color: "#14332e",
    fontSize: 15,
    fontWeight: "900"
  },
  historyDelta: {
    fontSize: 12,
    fontWeight: "800"
  },
  findingsGrid: {
    gap: 10
  },
  findingCard: {
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    padding: 14
  },
  finding_info: {
    backgroundColor: "#eef4f8"
  },
  finding_watch: {
    backgroundColor: "#fff2d8"
  },
  finding_dispute: {
    backgroundColor: "#f7e2dc"
  },
  findingTitle: {
    color: "#14332e",
    fontSize: 16,
    fontWeight: "800"
  },
  findingText: {
    color: "#455a54",
    fontSize: 14,
    lineHeight: 20
  },
  sectionBlock: {
    gap: 10
  },
  chargeRow: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 14
  },
  chargeTopLine: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  chargeNameWrap: {
    flex: 1,
    gap: 7
  },
  chargeName: {
    color: "#14332e",
    fontSize: 16,
    fontWeight: "800"
  },
  chargeAmount: {
    color: "#14332e",
    fontSize: 16,
    fontWeight: "900"
  },
  chargeExplanation: {
    color: "#4c5e58",
    fontSize: 14,
    lineHeight: 20
  },
  chargeAction: {
    color: "#793915",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20
  },
  letterButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#fff2d8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  letterButtonText: {
    color: "#14332e",
    fontSize: 13,
    fontWeight: "900"
  },
  status: {
    alignSelf: "flex-start",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  status_expected: {
    backgroundColor: "#e8eee2",
    color: "#31594f"
  },
  status_changed: {
    backgroundColor: "#fff2d8",
    color: "#7a5614"
  },
  status_new: {
    backgroundColor: "#f7e2dc",
    color: "#793915"
  },
  status_questionable: {
    backgroundColor: "#f1d7ee",
    color: "#63345e"
  },
  rightsBox: {
    alignItems: "flex-start",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    padding: 14
  },
  rightsContent: {
    flex: 1,
    gap: 4
  },
  rightsTitle: {
    color: "#14332e",
    fontSize: 16,
    fontWeight: "900"
  },
  rightsText: {
    color: "#36524b",
    fontSize: 14,
    lineHeight: 20
  },
  letterBox: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  letterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12
  },
  letterText: {
    color: "#2f423d",
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 19
  },
  clearButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 16
  },
  clearText: {
    color: "#14332e",
    fontSize: 15,
    fontWeight: "900"
  },
  consentRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 4,
    paddingHorizontal: 2
  },
  checkbox: {
    alignItems: "center",
    borderColor: "#14332e",
    borderRadius: 4,
    borderWidth: 1.5,
    height: 20,
    justifyContent: "center",
    width: 20
  },
  checkboxChecked: {
    backgroundColor: "#14332e"
  },
  consentText: {
    color: "#4c5e58",
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  legalLink: {
    color: "#31594f",
    fontWeight: "800",
    textDecorationLine: "underline"
  },
  disabledButton: {
    backgroundColor: "#e8eee2",
    borderColor: "#d7d0c2",
    opacity: 0.5
  },
  disabledToggle: {
    backgroundColor: "#e8eee2",
    borderColor: "#d7d0c2",
    opacity: 0.5
  },
  disabledToggleKnob: {
    backgroundColor: "#d7d0c2"
  },
  disabledText: {
    color: "#888888"
  },
  disabledTextLight: {
    color: "#a1b1ac"
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderColor: "#e6dfd1",
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    maxHeight: "80%",
    padding: 18,
    width: "100%"
  },
  modalHeader: {
    alignItems: "center",
    borderBottomColor: "#e6dfd1",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 10
  },
  modalTitle: {
    color: "#14332e",
    fontSize: 18,
    fontWeight: "900"
  },
  modalScroll: {
    paddingVertical: 8
  },
  modalBodyText: {
    color: "#36524b",
    fontSize: 14,
    lineHeight: 22
  },
  stepLabel: {
    color: "#5f6d68",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    marginTop: 2
  },
  uploadPanelHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  proRow: {
    alignItems: "center",
    backgroundColor: "#fff2d8",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5
  },
  proRowText: {
    color: "#7a5614",
    fontSize: 12,
    fontWeight: "900"
  },
  proFeatureList: {
    gap: 10,
    marginTop: 8
  },
  proFeatureRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  proFeatureText: {
    color: "#36524b",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  proTestButton: {
    alignItems: "center",
    backgroundColor: "#14332e",
    borderRadius: 8,
    marginTop: 14,
    minHeight: 48,
    justifyContent: "center"
  },
  proTestButtonText: {
    color: "#f8f3e9",
    fontSize: 15,
    fontWeight: "900"
  },
  exportButton: {
    alignItems: "center",
    backgroundColor: "#31594f",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 48
  },
  exportButtonText: {
    color: "#f8f3e9",
    fontSize: 15,
    fontWeight: "900"
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  metaItem: {
    backgroundColor: "#f7f5ef",
    borderRadius: 8,
    flexBasis: "47%",
    flexGrow: 1,
    padding: 10
  },
  metaLabel: {
    color: "#5f6d68",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  metaValue: {
    color: "#14332e",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3
  },
  sectionTitleMuted: {
    color: "#5f6d68",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0
  },
  noAttentionBox: {
    alignItems: "center",
    backgroundColor: "#e8eee2",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    padding: 14
  },
  noAttentionText: {
    color: "#31594f",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20
  },
  expectedChargeRow: {
    alignItems: "center",
    backgroundColor: "#f7f5ef",
    borderRadius: 8,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  expectedChargeName: {
    color: "#4c5e58",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  expectedChargeAmount: {
    color: "#4c5e58",
    fontSize: 14,
    fontWeight: "800"
  }
});

const findingStyleBySeverity = {
  info: styles.finding_info,
  watch: styles.finding_watch,
  dispute: styles.finding_dispute
};

const chargeStatusStyle = {
  expected: styles.status_expected,
  changed: styles.status_changed,
  new: styles.status_new,
  questionable: styles.status_questionable
};
