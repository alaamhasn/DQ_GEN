# Data Quality Documenter - Portable Windows Edition

An offline, zero-dependency, portable technical documentation and validation rule management suite built for Data Quality Engineers, Data Stewards, and Analytics Teams on Windows PCs.

---

## 🚀 Quick Start (No Installation Required)

1. Extract the `Data-Quality-Documenter` folder (or ZIP archive) anywhere on your Windows PC (e.g. `C:\Users\<Name>\Documents\` or a USB drive).
2. Double-click `index.html` to open it in **Microsoft Edge** or **Google Chrome**.
3. That's it! You are ready to create documents, catalog validation rules, and export professional PDF audit reports.

> **No Node.js, Python, PHP, web server, database server, build commands, or internet connection are required.**

---

## 📋 Key Capabilities & Features

1. **Document Templates**: 9 built-in enterprise templates (Validation Rules, Data Quality Assessments, Reconciliation, Incidents, Root Cause Analysis, Remediation Plans, Test Execution Reports, dbt Documentation, Technical Specs).
2. **Data Source Documentation**: System, Catalog, Schema, Tables/Views, and interactive Source-to-Target Column Mapping matrices.
3. **Exact SQL Editor & Workbench**: Line numbers, indentation, dialect selection (Snowflake, Trino, PostgreSQL, MySQL, SQL Server, ANSI SQL), Copy SQL, Find in Query, SQL Comments, and separate explanatory notes. Preserves user queries exactly without executing or altering formatting.
4. **Validation Rules Catalog**: Reusable rules across 12 dimensions (Completeness, Uniqueness, Validity, Accuracy, Consistency, Timeliness, Referential Integrity, Reconciliation, Schema Validation, Business Rules, Duplicate Detection, Freshness).
5. **Test Result Tracking**: Log runs with timestamps, environment (PROD, UAT, QA, DEV), status (PASSED, FAILED, WARNING, ERROR), record counts, and query ID evidence.
6. **Document Cloning**: Clone documents with customizable component checklists (metadata, SQL, sources, excluding executions or approvals).
7. **Version History & Diff Snapshots**: Version tracking (v1.0, v1.1...), author notes, and field change summaries.
8. **Issue & Remediation Tracker**: 5-Whys Root Cause investigations, Corrective and Preventive Actions (CAPA), deadlines, and owners.
9. **Quality Scorecards**: Interactive charts (powered by locally bundled Chart.js) showing aggregate pass rates and dimensions breakdown.
10. **PDF Import & Heuristic Field Mapping**: Locally bundled PDF.js extracts text from legacy PDFs and auto-maps fields with confidence indicators.
11. **Document and Filesystem Search**: Instant internal search across documents/rules/SQL, plus local Windows folder/file search with snippet highlighting.
12. **Configurable Required Fields**: Enforces mandatory fields dynamically in Draft, Review, and Final governance modes.
13. **Excel and CSV Import/Export**: Powered by locally bundled SheetJS (`xlsx.full.min.js`), with formula injection protection (prefixing sensitive leading characters with `'`).
14. **dbt Artifacts Local Parser**: Drop `manifest.json`, `run_results.json`, or `catalog.json` to convert models and tests into documentation and validation rules.
15. **Approvals & Local Audit Trail**: Track review sign-offs (Approved, Changes Requested, Rejected) and local event logs. Modifying SQL on approved documents automatically flags them for re-approval.
16. **Configurable Branding**: Live UI & PDF customization for primary, secondary, and accent colors, app name, and header/footer text.
17. **Professional PDF Reports**: Generates searchable, high-resolution A4/Letter PDF reports with headers, footers, pagination ("Page X of Y"), and clean table wrapping.
18. **100% Offline & Private**: Zero external network calls, zero telemetry, zero cloud dependencies.

---

## ⚙️ Configuration & Portability Guide

### 1. `config.js` vs. `.env` Import

- **`config.js`**: Contains the baseline application defaults when `index.html` loads. Editing `config.js` in a text editor sets new defaults for any fresh browser profile opening the application.
- **Import Configuration (`.env` or `config.json`)**: Accessible inside the **Settings** view. Allows users to import settings files without modifying JavaScript files directly. Settings are stored locally in the browser profile.
- **Settings Export**: You can export your active settings as either a `.env` file or `config.json` file.

### 2. Moving Documents and Settings to Another Windows PC

Because web browsers isolate local storage (`IndexedDB` / `localStorage`) per machine profile:

1. On PC #1: Open **Settings** (or click **Backup** in the top bar) and click **"Download Backup"**.
2. Save the resulting file: `dqd-full-backup-YYYY-MM-DD.json`.
3. Copy the `Data-Quality-Documenter/` folder and your backup JSON to PC #2.
4. On PC #2: Open `index.html`, go to **Settings**, and click **"Restore Backup"**. All your documents, rules, executions, and settings will appear immediately.

---

## 📂 Project Directory Structure

```text
Data-Quality-Documenter/
├── index.html               # Main application entry point
├── styles.css               # Design system & responsive styles
├── app.js                   # Pure Vanilla JS application logic
├── config.js                # Public application defaults
├── config.env.example       # Example .env configuration file
├── README.md                # Documentation & instructions
├── LICENSES.md              # Open source license notices
├── assets/
│   └── logo.png             # Application logo
├── lib/                     # Locally bundled third-party libraries (Offline)
│   ├── chart.umd.min.js     # Chart.js 4.4.1 (Scorecards)
│   ├── jspdf.umd.min.js     # jsPDF 2.5.1 (PDF Generation)
│   ├── jspdf.plugin.autotable.min.js # jsPDF-AutoTable 3.8.2
│   ├── pdf.min.js           # PDF.js 3.11.174 (PDF Text Extraction)
│   ├── pdf.worker.min.js    # PDF.js Worker
│   └── xlsx.full.min.js     # SheetJS 0.18.5 (Excel / CSV)
├── defaults.js              # Bundled default data & initial vocabulary (CORS-free for file://)
├── templates/
│   └── templates_catalog.json # 9 Standard documentation templates
└── samples/
    ├── autocomplete_vocabulary.txt # Smart autocomplete dictionary file (editable .txt)
    ├── sample_document.json # Sample customer data quality document
    ├── sample_rules.csv     # Sample validation rules catalog
    ├── sample_executions.csv# Sample test execution logs
    ├── dbt_manifest_sample.json # Sample dbt manifest
    ├── dbt_run_results_sample.json # Sample dbt run results
    └── dbt_catalog_sample.json # Sample dbt catalog
```

---

## 🧠 Smart Autocomplete & Memory Dictionary (.txt)

The application includes an offline auto-learning dictionary that speeds up repetitive data entry:
- **Instant Suggestions**: Native HTML5 `<datalist>` auto-completion is attached to key fields (Domains, Owners, Reviewers, Frequency, Source Systems, Catalogs, Schemas, Tables, Data Types, Transformation Rules, Expected Results, Thresholds).
- **Auto-Learning**: Whenever you save a document, any new unique value typed into any of these fields is automatically remembered and added to the dictionary.
- **Portable .txt Support**: Go to **Settings > Smart Autocomplete & Unique Input Memory (.txt)** to export your learned dictionary into `autocomplete_vocabulary.txt` or import a team-wide vocabulary file.

---

## 🔒 Security & Known Browser Limitations

1. **File System Access API (`file://` Protocol)**:
   - Modern Chromium browsers (Edge and Chrome) support `window.showDirectoryPicker()` when granted user permission. If running under restrictive policies, the app provides a standard folder file picker fallback (`<input webkitdirectory>`).
2. **Formula Injection Sanitization**:
   - All CSV exports sanitize cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prefixing a single apostrophe (`'`) to protect spreadsheet users.
3. **No External Network Calls**:
   - The application does not send data, SQL queries, or document contents to any external endpoint or cloud service.
4. **Local Audit Trail**:
   - The audit log is stored in the browser profile for personal and local compliance tracking; it is not a centralized tamper-proof server audit log.

---

## 🧪 Testing Verification

To verify the installation:
1. Double-click `index.html` in Microsoft Edge or Google Chrome.
2. Confirm the **Dashboard** opens with metrics and sample data.
3. Navigate to **Documents** and click **"PDF"** on `Customer Dimension Integrity` to verify offline PDF generation.
4. Navigate to **PDF Import** and drop a sample PDF to verify text extraction.
5. Navigate to **Validation Rules** and export CSV to verify formula sanitization.
6. Navigate to **Settings** and modify the Primary Color to test live CSS property updates.
