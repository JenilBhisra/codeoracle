export const PROCESSING_STEPS = [
  { key: "validating", label: "Validating source", statuses: ["queued"] },
  { key: "extracting", label: "Extracting files", statuses: ["extracting"] },
  { key: "parsing", label: "Parsing code", statuses: ["parsing"] },
  { key: "mapping", label: "Mapping dependencies", statuses: [] },
  { key: "explaining", label: "Generating explanations", statuses: ["explaining"] },
  { key: "tests", label: "Generating tests", statuses: ["generating_tests"] },
  { key: "refactors", label: "Proposing refactors", statuses: ["refactoring"] },
  { key: "results", label: "Preparing results", statuses: ["completed"] },
];

const STATUS_TO_INDEX = {
  queued: 0,
  extracting: 1,
  parsing: 2,
  mapping: 3,
  explaining: 4,
  generating_tests: 5,
  refactoring: 6,
  completed: 7,
  failed: 7,
};

export function stepIndexForStatus(status) {
  return STATUS_TO_INDEX[status] ?? 0;
}

export const TERMINAL_STATUSES = ["completed", "failed"];
