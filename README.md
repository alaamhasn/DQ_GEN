# Data Workspace Documenter - Portable Windows Edition

An offline, zero-dependency, portable technical documentation and validation rule management suite built for Data Analysts, Analytics Engineers, Data Stewards, and Governance Teams on Windows PCs.

---

## 🚀 Quick Start (No Installation Required)

1. Extract the `Data-Quality-Documenter` folder (or ZIP archive) anywhere on your Windows PC (e.g. `C:\Users\<Name>\Documents\` or a USB drive).
2. Double-click `index.html` to open it in **Microsoft Edge**, **Google Chrome**, or any modern browser.
3. That's it! You are ready to create documents, catalog validation rules, and export professional PDF audit reports.

> **Zero installation overhead**: No Node.js, Python, PHP, web server, database server, build commands, or internet connection are required.

---

## 📋 Key Capabilities & Features

1. **Multi-Discipline Engineering Profiles**:
   - **Data Analysis**: Focused on analytical metric definitions, business objectives, and BI query verification.
   - **Data Engineering**: Focused on pipeline SLA, upstream/downstream lineage, and ingestion verification.
   - **Data Modelling**: Focused on entity relationships, schema validations, grain, and DDL specifications.
2. **Standardized `.dldoc` File Format**:
   - Native single-file export and import format: `.dldoc` (Data Lineage & Workspace Document).
   - Full backward compatibility with legacy `.dqdoc` and `.json` documents.
3. **Flexible Document Lifecycle & Publication**:
   - Support for both **Draft** and **Published** modes.
   - Documents can be published directly even with incomplete/draft records with non-blocking guidance, allowing rapid prototyping without administrative lockouts.
4. **Interactive Lineage & Column Mapping**:
   - Document source systems, catalogs, schemas, tables/views, and interactive Source-to-Target column transformations.
5. **SQL Assertion Workbench**:
   - Preserves queries with line numbering, dialect tags (Snowflake, Trino, PostgreSQL, MySQL, SQL Server, ANSI SQL), query copying, query search, and dedicated audit notes.
6. **Validation Rules Catalog**:
   - Catalog assertions across 12 dimensions (Completeness, Uniqueness, Validity, Accuracy, Consistency, Timeliness, Referential Integrity, Reconciliation, Schema Validation, Business Rules, Duplicate Detection, Freshness).
7. **Automated Test Run Tracking**:
   - Log execution history across environments (PROD, UAT, QA, DEV), capturing timestamps, pass/fail status, defect counts, defect percentages, and verification evidence.
8. **Issue & Remediation Runbook (CAPA)**:
   - Root cause investigation tracking (5-Whys), corrective and preventive actions (CAPA), target SLAs, and assigned remediation owners.
9. **Interactive Quality Scorecards**:
   - Live dashboard charts powered by locally bundled Chart.js visualizing pass rates and dimension breakdowns.
10. **Executive-Ready PDF Reports**:
    - High-resolution, multi-page PDF generation featuring generous section margins, anti-orphan headers, table pagination, embedded off-screen defect trend charts, formal digital sign-off blocks, and author contact cards.
11. **PDF Import & Heuristic Field Mapping**:
    - Bundled PDF.js extracts text from legacy PDF specifications and maps fields automatically.
12. **Instant Search & Windows Filesystem Search**:
    - Instant live search across all documents, rules, and queries, plus local directory file search via the Windows File System Access API.
13. **Excel and CSV Import/Export**:
    - Powered by bundled SheetJS (`xlsx.full.min.js`), with automatic CSV formula injection sanitization (`=`, `+`, `-`, `@` cell prefixing).
14. **dbt Artifacts Local Parser**:
    - Drop `manifest.json`, `run_results.json`, or `catalog.json` to automatically synthesize model lineage and tests into certified documentation.
15. **Smart Autocomplete & Dictionary (.txt)**:
    - Auto-learns unique terms (domains, systems, schemas, owners, transformation rules) and persists them to an editable dictionary (`autocomplete_vocabulary.txt`).
16. **100% Offline & Completely Private**:
    - Zero external network requests, zero telemetry, and zero third-party cloud dependencies.

---

## ⚙️ Configuration & Portability Guide

### 1. `config.js` vs. `.env` Import

- **`config.js`**: Contains the baseline application defaults when `index.html` loads. Modifying `config.js` sets default branding and features across all fresh browser profiles.
- **Import Configuration (`.env` or `config.json`)**: Accessible inside **Settings**. Allows loading custom settings without modifying source files.
- **Settings Export**: Export active settings as either a `.env` file or `config.json` at any time.

### 2. Moving Documents and Settings to Another PC

Because browsers isolate local storage (`IndexedDB` / `localStorage`) per machine profile:

1. On PC #1: Open **Settings** (or click **Backup** in the top bar) and click **"Download Backup"**.
2. Save the resulting file: `dqd-full-backup-YYYY-MM-DD.json` (or individual `.dldoc` files).
3. Copy the `Data-Quality-Documenter/` folder and your backup file to PC #2.
4. On PC #2: Open `index.html`, navigate to **Settings**, and click **"Restore Backup"** (or use **Import .dldoc** on the Documents page).

---

## 📂 Project Directory Structure

```text
Data-Quality-Documenter/
├── index.html               # Main application single-page interface
├── styles.css               # Design system & responsive styles
├── app.js                   # Application controller & PDF report engine
├── config.js                # Baseline configuration & profile defaults
├── config.env.example       # Example .env configuration template
├── README.md                # Project documentation & user guide
├── LICENSE                  # MIT License notice
├── LICENSES.md              # Third-party open source licenses
├── assets/
│   └── logo.png             # Application brand logo
├── lib/                     # 100% locally bundled offline libraries
│   ├── chart.umd.min.js     # Chart.js 4.4.1 (Scorecards & Trend Charts)
│   ├── jspdf.umd.min.js     # jsPDF 2.5.1 (PDF Document Generation)
│   ├── jspdf.plugin.autotable.min.js # jsPDF-AutoTable 3.8.2
│   ├── pdf.min.js           # PDF.js 3.11.174 (PDF Text Extraction)
│   ├── pdf.worker.min.js    # PDF.js Worker
│   └── xlsx.full.min.js     # SheetJS 0.18.5 (Excel / CSV Processing)
├── defaults.js              # Bundled default data (CORS-free for file://)
├── search_keywords.json     # Pre-indexed search terms & keywords
├── sql_assertions.json      # Standard SQL assertion query templates
├── templates/
│   └── templates_catalog.json # 9 Standard documentation templates
└── samples/
    ├── autocomplete_vocabulary.txt # Smart autocomplete dictionary (.txt)
    ├── sample_document.json # Sample customer quality document
    ├── sample_rules.csv     # Sample validation rules catalog
    ├── sample_executions.csv# Sample test execution logs
    ├── dbt_manifest_sample.json # Sample dbt manifest
    ├── dbt_run_results_sample.json # Sample dbt run results
    └── dbt_catalog_sample.json # Sample dbt catalog
```

---

## 📄 Standard `.dldoc` File Format

Documents are exported as `.dldoc` (Data Lineage & Workspace Document) files. This format encapsulates:
- Document metadata, business domains, and target SLAs
- Source system catalogs, schemas, tables, and column mapping rules
- SQL assertion queries, dialects, and technical notes
- Validation rules, dimensions, and thresholds
- Execution audit histories, defect percentages, and verification logs
- Remediation runbooks, issues, and CAPA actions
- Revision histories and governance approval states

> `.dldoc` files can be shared across teams or stored in Git repositories for formal version control.

---

## 🔒 Security & Offline Integrity

1. **No Outbound Network Calls**: The app runs exclusively on client-side JavaScript. No documents, SQL queries, or audit records leave your device.
2. **CSV Formula Injection Sanitization**: All CSV and Excel exports sanitize fields starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prefixing a single apostrophe (`'`).
3. **Safe Local File Access**: The Windows File System Access API operates under strict explicit user approval prompts without administrative privilege elevation.

---

## ⚖️ License

Distributed under the MIT License. Copyright (c) 2026 Alaa Hassan. See [`LICENSE`](LICENSE) and [`LICENSES.md`](LICENSES.md) for full notices.
