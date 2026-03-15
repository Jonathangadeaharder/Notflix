export const PIPELINE_STEPS = [
  { key: "UPLOADING", label: "Uploading" },
  { key: "QUEUED", label: "Queued" },
  { key: "TRANSCRIBING", label: "Transcribing" },
  { key: "ANALYZING", label: "Analyzing" },
  { key: "TRANSLATING", label: "Translating" },
  { key: "READY", label: "Ready" },
] as const;

const IDLE_STAGE_ORDER = -1;

export const STAGE_ORDER: Record<string, number> = {
  IDLE: IDLE_STAGE_ORDER,
  UPLOADING: 0,
  QUEUED: 1,
  STARTING: 1,
  THUMBNAIL_GENERATION: 1,
  TRANSCRIBING: 2,
  ANALYZING: 3,
  TRANSLATING: 4,
  READY: 5,
  COMPLETED: 5,
  FAILED: 4,
};

export function getUploadStepState(
  stepKey: (typeof PIPELINE_STEPS)[number]["key"],
  currentStage: string,
  processingStatus: string,
  isSubmitting: boolean,
): "complete" | "active" | "error" | "pending" {
  const activeStage = isSubmitting ? "UPLOADING" : currentStage;
  const currentIndex = STAGE_ORDER[activeStage] ?? IDLE_STAGE_ORDER;
  const stepIndex = STAGE_ORDER[stepKey];

  if (processingStatus === "ERROR") {
    return stepIndex <= currentIndex ? "error" : "pending";
  }

  if (stepIndex < currentIndex) {
    return "complete";
  }

  if (stepIndex === currentIndex) {
    return "active";
  }

  return "pending";
}
