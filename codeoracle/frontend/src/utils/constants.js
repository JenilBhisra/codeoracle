/**
 * CodeOracle Constants & UI Configurations
 */

export const MAX_SOURCE_LINES = 10000;

export const SUPPORTED_LANGUAGES = [
  { name: 'Python', ext: ['.py'], icon: 'Code2', color: '#38bdf8' },
  { name: 'JavaScript', ext: ['.js', '.jsx', '.mjs'], icon: 'FileCode', color: '#facc15' },
];

export const APP_STATES = {
  LANDING: 'LANDING',
  UPLOADING: 'UPLOADING',
  PROCESSING: 'PROCESSING',
  RESULTS: 'RESULTS',
  ERROR: 'ERROR',
};

export const PROCESSING_PHASES = [
  { id: 'queued', label: 'Queued', description: 'Waiting for available analysis slot' },
  { id: 'extracting', label: 'Extracting', description: 'Decompressing and validating codebase structure' },
  { id: 'parsing', label: 'Parsing AST', description: 'Parsing Python & JavaScript Abstract Syntax Trees' },
  { id: 'explaining', label: 'Explaining Architecture', description: 'Generating deep architectural & module insights' },
  { id: 'generating_tests', label: 'Synthesizing Tests', description: 'Generating comprehensive unit tests with coverage targets' },
  { id: 'refactoring', label: 'Modernizing Code', description: 'Proposing modernized code and detecting breaking changes' },
  { id: 'completed', label: 'Analysis Complete', description: 'Final report ready' },
];

export const RESULTS_TABS = {
  EXPLANATION: 'explanation',
  GRAPH: 'graph',
  TESTS: 'tests',
  REFACTOR: 'refactor',
};
