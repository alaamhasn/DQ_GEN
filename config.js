/**
 * Data Quality Documenter - Portable Windows Edition
 * Public Application Settings & Default Configuration
 *
 * NOTE: Editing this file modifies the default settings when index.html is loaded.
 * Users can also import a config.env or export/import configuration within the app Settings page.
 */
window.DQD_CONFIG = {
  appName: "Data Quality Documenter",

  branding: {
    logoPath: "./assets/logo.png",
    faviconPath: "./assets/logo.png",
    primaryColor: "#1F4E79",
    secondaryColor: "#4472C4",
    accentColor: "#00A6A6",
    backgroundColor: "#F5F7FA",
    textColor: "#1F2937",
    fontFamily: "Segoe UI, Arial, sans-serif",
    footerText: "Data Quality Documenter - Confidential & Internal Use",
    showLogo: true,
    showPageNumbers: true
  },

  pdf: {
    paperSize: "A4",
    orientation: "portrait",
    includeTableOfContents: true,
    includeMetadata: true,
    includeRevisionHistory: true,
    includeApprovals: true,
    includeCodeBlocks: true
  },

  requiredFields: [
    "rule_name",
    "rule_description",
    "validation_type",
    "data_source",
    "sql_query",
    "expected_result"
  ],

  optionalFields: [
    "business_domain",
    "owner",
    "priority",
    "execution_frequency",
    "actual_result",
    "remediation",
    "reviewer",
    "threshold",
    "severity",
    "environment"
  ],

  features: {
    templates: true,
    pdfImport: true,
    sqlEditor: true,
    filesystemSearch: true,
    excelImportExport: true,
    dbtImport: false,
    versioning: true,
    approvals: false,
    auditTrail: true,
    issueTracking: true,
    qualityScorecards: true
  },

  limits: {
    maxPdfSizeMB: 50,
    maxFileSizeMB: 25,
    maxSearchResults: 100
  }
};
