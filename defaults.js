/**
 * DATA QUALITY DOCUMENTER - DEFAULT EMBEDDED TEMPLATES & SAMPLE DOCUMENT
 * Ensures 100% functionality under file:// protocol without fetch CORS restrictions.
 */

(function() {
  function createDefaultLogoDataUrl() {
    if (typeof document !== 'undefined') {
      try {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext('2d');
        const grad = ctx.createLinearGradient(0, 0, 128, 128);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#0284c7');
        ctx.fillStyle = grad;
        const r = 26;
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(128 - r, 0);
        ctx.quadraticCurveTo(128, 0, 128, r);
        ctx.lineTo(128, 128 - r);
        ctx.quadraticCurveTo(128, 128, 128 - r, 128);
        ctx.lineTo(r, 128);
        ctx.quadraticCurveTo(0, 128, 0, 128 - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();
        ctx.fill();

        // Inner document sheet
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(36, 24);
        ctx.lineTo(76, 24);
        ctx.lineTo(92, 40);
        ctx.lineTo(92, 102);
        ctx.lineTo(36, 102);
        ctx.closePath();
        ctx.fill();

        // Fold corner
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(76, 24);
        ctx.lineTo(76, 40);
        ctx.lineTo(92, 40);
        ctx.closePath();
        ctx.fill();

        // Document text lines
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(46, 46, 26, 4.5);
        ctx.fillRect(46, 56, 38, 4.5);
        ctx.fillRect(46, 66, 38, 4.5);

        // Quality check badge
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(82, 86, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(75, 86);
        ctx.lineTo(80, 91);
        ctx.lineTo(89, 81);
        ctx.stroke();

        return c.toDataURL('image/png');
      } catch (e) {
        console.warn('Canvas default logo generation error:', e);
      }
    }
    return '';
  }
  window.DQD_DEFAULT_LOGO_BASE64 = createDefaultLogoDataUrl();
})();

window.DQD_DEFAULT_TEMPLATES = [];

window.DQD_DEFAULT_VOCABULARY = {
  "teams": [
    "Data Quality Engineering",
    "Data Engineering",
    "Analytics Engineering",
    "Data Modelling & Architecture",
    "Product & Growth Analytics",
    "Finance BI & Reporting",
    "Risk Analytics",
    "Governance Tribe",
    "Data Platform & Lakehouse"
  ],
  "usernames": [
    "alaam",
    "sarah.smith",
    "john.doe",
    "david.kim",
    "alex.miller"
  ],
  "domains": [
    "Core Banking / Customer Intelligence",
    "Finance & General Ledger",
    "Supply Chain & Inventory",
    "Marketing & Campaign Analytics",
    "Risk & Financial Analytics",
    "Data Lakehouse Platform",
    "Data Governance & Operations"
  ],
  "owners": [
    "Sarah Jenkins (Head of Data Governance)",
    "Michael Chang (Lead Data Engineer)",
    "Elena Rostova (Controller)",
    "David Kim (Senior Analytics Engineer)",
    "Marcus Vance",
    "Sita Patel",
    "Jessica Wong",
    "Liam O'Connor"
  ],
  "reviewers": [
    "Sarah Smith",
    "David Kim",
    "Michael Chang",
    "Elena Rostova"
  ],
  "frequencies": [
    "Daily (Post-ETL 04:00 UTC)",
    "Hourly Batch Sync",
    "Real-Time / Streaming",
    "Weekly (Sunday 02:00 UTC)",
    "Monthly Financial Close",
    "Ad-hoc / Manual Run"
  ],
  "systems": [
    "Trino Lakehouse",
    "Snowflake Enterprise DW",
    "PostgreSQL OLTP",
    "Kafka / Flink Streaming",
    "Databricks Delta",
    "BigQuery Analytics"
  ],
  "catalogs": [
    "iceberg_prod",
    "hive_warehouse",
    "hive_lakehouse",
    "EDW_PROD",
    "FINANCE_PROD"
  ],
  "schemas": [
    "analytics_marts",
    "analytics",
    "finance_marts",
    "BILLING",
    "CORE_DWH",
    "STAGING",
    "CUSTOMER"
  ],
  "tables": [
    "fct_customer_orders",
    "fact_daily_orders",
    "fct_daily_financial_ledger",
    "DIM_CUSTOMER",
    "FACT_CUSTOMER_EVENTS",
    "POSTING_ENTRIES",
    "FACT_GL_BALANCES"
  ],
  "dataTypes": [
    "VARCHAR",
    "VARCHAR(36)",
    "VARCHAR(100)",
    "VARCHAR(255)",
    "CHAR(2)",
    "BIGINT",
    "INTEGER",
    "SMALLINT",
    "TINYINT",
    "REAL",
    "DOUBLE",
    "DECIMAL(18,2)",
    "DECIMAL(18,4)",
    "DECIMAL(38,10)",
    "BOOLEAN",
    "DATE",
    "TIME",
    "TIMESTAMP",
    "TIMESTAMP(6) WITH TIME ZONE",
    "INTERVAL",
    "ARRAY(VARCHAR)",
    "ARRAY(BIGINT)",
    "MAP(VARCHAR, VARCHAR)",
    "ROW(id BIGINT, name VARCHAR)",
    "JSON",
    "VARBINARY",
    "UUID",
    "IPADDRESS"
  ],
  "transformRules": [
    "Direct 1:1 Mapping",
    "TRIM(SRC_COL)",
    "LOWER(TRIM(SRC_COL))",
    "UPPER(TRIM(SRC_COL))",
    "COALESCE(SRC_COL, 'UNKNOWN')",
    "Lookup against ISO-3166",
    "Currency conversion to USD at daily fixing rate",
    "UTC normalized timestamp",
    "Lookup against REF_STATUS_CODES"
  ],
  "dialects": [
    "Trino",
    "Snowflake",
    "PostgreSQL",
    "MySQL",
    "SQL Server",
    "ANSI SQL"
  ],
  "environments": [
    "PROD",
    "UAT",
    "QA",
    "DEV",
    "STAGING"
  ],
  "expectedResults": [
    "0 rows returned (Zero defect records)",
    "0 duplicates found",
    "Variance equal to $0.00 (tolerance < $0.01)",
    "0 invalid emails",
    "Lag minutes <= 120",
    "All validation rules pass with 0 defect records"
  ],
  "thresholds": [
    "0",
    "0.01",
    "0.05%",
    "0.1%",
    "10",
    "120",
    "24"
  ],
  "rootCauses": [
    "Upstream Schema Drift",
    "Network / Gateway Timeout",
    "Duplicate CDC Events",
    "Null Values in Primary Key",
    "Data Type Overflow",
    "Late-Arriving Partition"
  ]
};

window.DQD_DEFAULT_DOC = null;

window.DQD_DEFAULT_SEARCH_KEYWORDS = [
  {
    "id": "feat-dashboard",
    "title": "Executive Dashboard & KPI Analytics",
    "category": "System Features",
    "type": "feature",
    "view": "dashboard",
    "description": "High-level metrics, total documents, validation rule pass rates, open defect issues, and active team contributions.",
    "keywords": [
      "dashboard", "home", "analytics", "kpi", "metrics", "stats", "summary",
      "overview", "pass rate", "charts", "trends", "executives", "monitoring",
      "scorecard summary", "recent activity"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "dashboard",
      "label": "Open Dashboard"
    }
  },
  {
    "id": "feat-editor",
    "title": "Document Specification Authoring & Editor",
    "category": "System Features",
    "type": "feature",
    "view": "editor",
    "description": "Create, edit, and version technical data quality validation specifications with source mappings, screenshots, and SQL queries.",
    "keywords": [
      "new document", "create document", "document editor", "author", "specification",
      "source mappings", "table validation", "model validation", "edit", "authoring",
      "rules editor", "sql workbench", "screenshots", "metadata"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "editor",
      "label": "Open Editor"
    }
  },
  {
    "id": "feat-documents",
    "title": "Document Repository & Management",
    "category": "System Features",
    "type": "feature",
    "view": "documents",
    "description": "Browse, filter, clone, export, and manage all saved enterprise data quality specifications across teams and tribes.",
    "keywords": [
      "documents", "specifications", "doc list", "repository", "saved documents",
      "filter by team", "filter by user", "export dqpack", "clone document",
      "document catalog", "data contracts"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "documents",
      "label": "Browse Documents"
    }
  },
  {
    "id": "feat-templates",
    "title": "Standardized Technical Templates Catalog",
    "category": "System Features",
    "type": "feature",
    "view": "templates",
    "description": "13 enterprise-grade documentation templates spanning validation rules, reconciliations, incidents, RCA, and dbt models.",
    "filePath": "templates/templates_catalog.json",
    "fileType": "json",
    "keywords": [
      "templates", "template catalog", "document templates", "boilerplate",
      "standardized templates", "technical documentation", "preconfigured",
      "best practices", "catalog json"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "templates",
      "label": "Browse Templates"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "templates/templates_catalog.json",
      "filename": "templates_catalog.json",
      "label": "Download Catalog JSON"
    }
  },
  {
    "id": "feat-rules",
    "title": "Validation Rules Catalog",
    "category": "System Features",
    "type": "feature",
    "view": "rules",
    "description": "Enterprise catalog of validation rules categorized by dimensions (Completeness, Uniqueness, Validity, Consistency, Accuracy, Timeliness).",
    "filePath": "samples/sample_rules.csv",
    "fileType": "csv",
    "keywords": [
      "rules", "validation rules", "rule catalog", "completeness", "uniqueness",
      "validity", "consistency", "accuracy", "timeliness", "severity",
      "critical rules", "import rules", "export rules", "dimensions"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "rules",
      "label": "View Rules Catalog"
    },
    "downloadAction": {
      "type": "export_rules_csv",
      "filename": "dqd-rules-catalog.csv",
      "label": "Export Rules CSV"
    }
  },
  {
    "id": "feat-sql-library",
    "title": "SQL Assertion Library",
    "category": "System Features",
    "type": "feature",
    "view": "sql-library",
    "description": "Repository storing exact validation queries saved from document templates with Document Titles across Trino, Snowflake, and PostgreSQL.",
    "filePath": "sql_assertions.json",
    "fileType": "json",
    "keywords": [
      "sql", "sql library", "assertions", "sql assertion library", "queries",
      "workbench", "trino", "snowflake", "postgresql", "bigquery", "databricks",
      "sql queries", "stored queries", "sql assertions", "dialect"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "sql-library",
      "label": "Open SQL Library"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "sql_assertions.json",
      "filename": "sql_assertions.json",
      "label": "Download sql_assertions.json"
    }
  },
  {
    "id": "feat-executions",
    "title": "Test Execution Logs & Defect Measurements",
    "category": "System Features",
    "type": "feature",
    "view": "executions",
    "description": "Auditable log of executed automated test runs, passed/failed record volumes, defect percentages, and verification evidence.",
    "filePath": "samples/sample_executions.csv",
    "fileType": "csv",
    "keywords": [
      "executions", "test executions", "test runs", "logs", "defect rate",
      "failed records", "passed records", "evidence", "environment", "prod",
      "qa", "export executions", "audit log"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "executions",
      "label": "View Test Executions"
    },
    "downloadAction": {
      "type": "export_execs_csv",
      "filename": "dqd-executions.csv",
      "label": "Export Executions CSV"
    }
  },
  {
    "id": "feat-issues",
    "title": "Issues, Defect Triage & Remediation (CAPA)",
    "category": "System Features",
    "type": "feature",
    "view": "issues",
    "description": "Remediation issue tracker, incident tickets, corrective action plans (CAPA), root cause assignments, and resolution statuses.",
    "keywords": [
      "issues", "remediation", "incidents", "defects", "capa", "tickets",
      "jira", "servicenow", "sla", "action items", "unresolved issues",
      "corrective actions"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "issues",
      "label": "View Issues & Remediation"
    }
  },
  {
    "id": "feat-pdf-import",
    "title": "PDF Specification Import & Parser",
    "category": "System Features",
    "type": "feature",
    "view": "pdf-import",
    "description": "Upload and extract text, table schemas, and quality metadata from legacy PDF technical specifications directly in the browser.",
    "keywords": [
      "pdf", "pdf import", "import pdf", "pdf parser", "extract text",
      "document parser", "upload pdf", "legacy specifications"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "pdf-import",
      "label": "Open PDF Import"
    }
  },
  {
    "id": "feat-scorecards",
    "title": "Data Quality Scorecards & Health Index",
    "category": "System Features",
    "type": "feature",
    "view": "scorecards",
    "description": "Dimensional scorecards evaluating completeness, validity, uniqueness, and consistency with radar charts and compliance grades.",
    "keywords": [
      "scorecards", "quality scorecards", "health index", "radar chart",
      "maturity", "compliance score", "quality grade", "dimensions", "kpi"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "scorecards",
      "label": "View Scorecards"
    }
  },
  {
    "id": "feat-audit",
    "title": "Audit Trail & Governance Logs",
    "category": "System Features",
    "type": "feature",
    "view": "audit",
    "description": "Immutable security and governance event log tracking document creations, modifications, approvals, renames, and deletions.",
    "keywords": [
      "audit", "audit trail", "governance", "history", "security log",
      "activity", "who did what", "compliance log", "user events"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "audit",
      "label": "View Audit Trail"
    }
  },
  {
    "id": "feat-settings",
    "title": "Application Configuration & Branding",
    "category": "System Features",
    "type": "feature",
    "view": "settings",
    "description": "Manage application branding, company logo, color palette, required specification fields, and export/import config.env.",
    "filePath": "config.env.example",
    "fileType": "env",
    "keywords": [
      "settings", "configuration", "config", "branding", "theme", "colors",
      "logo", "required fields", "preferences", "config.env", "export settings"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "settings",
      "label": "Open Settings"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "config.env.example",
      "filename": "config.env.example",
      "label": "Download config.env"
    }
  },

  {
    "id": "tpl-validation-rules",
    "title": "Data Quality Validation Rules Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-validation-rules",
    "description": "Standard template for validating data completeness, uniqueness, and format adherence across critical data elements.",
    "keywords": [
      "validation rules", "customer intelligence", "dim_customer", "snowflake",
      "uniqueness", "email validity", "kyc", "customer master", "uuid"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-validation-rules",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-validation-rules",
      "filename": "template_validation_rules.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-reconciliation",
    "title": "Data Reconciliation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-reconciliation",
    "description": "Reconciles financial records, row counts, and monetary aggregates between Source OLTP and Target Reporting Data Mart.",
    "keywords": [
      "reconciliation", "financial ledger", "sox", "postgresql", "snowflake",
      "posting entries", "balance delta", "variance", "general ledger", "trial balance"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-reconciliation",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-reconciliation",
      "filename": "template_data_reconciliation.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-quality-assessment",
    "title": "Data Quality Assessments Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-quality-assessment",
    "description": "Holistic maturity scorecard and dimension review of an entire data product or enterprise table.",
    "keywords": [
      "quality assessment", "supply chain", "inventory", "databricks", "delta lake",
      "sap s/4hana", "warehouse", "freshness sla", "stock on hand"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-quality-assessment",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-quality-assessment",
      "filename": "template_quality_assessment.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-incident-report",
    "title": "Data Quality Incidents Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-incident-report",
    "description": "Documentation for production data outages, corrupted records, pipeline failures, or broken business metrics.",
    "keywords": [
      "data quality incident", "incident report", "outage", "blast radius", "sev-1",
      "marketing attribution", "bigquery", "google adwords", "conversions"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-incident-report",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-incident-report",
      "filename": "template_quality_incident.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-root-cause-analysis",
    "title": "Root Cause Analysis (RCA) Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-root-cause-analysis",
    "description": "5-Whys and Ishikawa investigation methodology for complex data quality breakdowns.",
    "keywords": [
      "root cause analysis", "rca", "5 whys", "ishikawa", "billing", "revenue",
      "stripe webhooks", "invoices", "schema drift", "post mortem"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-root-cause-analysis",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-root-cause-analysis",
      "filename": "template_root_cause_analysis.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-remediation-plans",
    "title": "Remediation Plans Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-remediation-plans",
    "description": "Actionable milestone-driven remediation roadmap for correcting systemic enterprise data flaws.",
    "keywords": [
      "remediation plan", "healthcare", "patient encounters", "hipaa", "mrn",
      "deduplication", "epic ehr", "chronology", "clinical data"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-remediation-plans",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-remediation-plans",
      "filename": "template_remediation_plan.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-test-execution-reports",
    "title": "Test Execution Reports Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-test-execution-reports",
    "description": "Formal test results documentation capturing batch automated DQ test runs across environments.",
    "keywords": [
      "test execution report", "basel iii", "regulatory reporting", "oracle exadata",
      "credit risk", "ead", "rwa", "capital adequacy", "automated assertions"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-test-execution-reports",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-test-execution-reports",
      "filename": "template_test_execution_report.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-dbt-documentation",
    "title": "dbt Model and Test Documentation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-dbt-documentation",
    "description": "Structured documentation aligning dbt models, generic tests, singular tests, and dbt manifest schema.",
    "keywords": [
      "dbt documentation", "ecommerce", "fct_orders", "dim_products", "snowflake",
      "unique test", "not null test", "schema.yml", "analytics marts"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-dbt-documentation",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-dbt-documentation",
      "filename": "template_dbt_documentation.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-generic-technical",
    "title": "Generic Technical Documentation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-generic-technical",
    "description": "Flexible documentation template for data pipelines, ETL specifications, data dictionaries, and architectural diagrams.",
    "keywords": [
      "generic technical", "streaming", "kafka", "flink", "telemetry", "clickstream",
      "avro schema", "confluent", "data platform", "pipeline specification"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-generic-technical",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-generic-technical",
      "filename": "template_generic_technical.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-dbt-model-validation",
    "title": "dbt Trino Model Validation Specification Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-dbt-model-validation",
    "description": "Comprehensive validation suite for dbt dimensional marts and analytical models running on Trino.",
    "keywords": [
      "dbt trino", "model validation", "fct_customer_orders", "dim_customer_segmentation",
      "grain uniqueness", "orphan keys", "referential integrity", "iceberg_prod"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-dbt-model-validation",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-dbt-model-validation",
      "filename": "template_dbt_trino_model_validation.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-lakehouse-table-validation",
    "title": "Lakehouse Physical Table Integrity Validation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-lakehouse-table-validation",
    "description": "Physical layer validation for Apache Iceberg and Hive tables on Trino Lakehouse: partitions, file sizes, and row counts.",
    "keywords": [
      "lakehouse table", "table validation", "apache iceberg", "hive", "parquet",
      "small files", "compaction", "partition layout", "daily orders"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-lakehouse-table-validation",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-lakehouse-table-validation",
      "filename": "template_lakehouse_table_validation.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-model-table-reconciliation",
    "title": "dbt Model & Iceberg Table Cross-Reconciliation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-model-table-reconciliation",
    "description": "End-to-end reconciliation between staging raw physical lakehouse tables and target published dbt semantic models.",
    "keywords": [
      "cross-reconciliation", "model and table", "incoming wires", "bank transfers",
      "ecb", "zero discrepancy", "hive_raw", "finance_marts", "balance parity"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-model-table-reconciliation",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-model-table-reconciliation",
      "filename": "template_model_table_reconciliation.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "tpl-issue-investigation-capa",
    "title": "Data Incident & Defect Root Cause (CAPA) Investigation Template",
    "category": "Document Templates",
    "type": "template",
    "templateId": "tpl-issue-investigation-capa",
    "description": "Structured investigation methodology for production data incidents: defect isolation, blast radius measurement, and CAPA remediation.",
    "keywords": [
      "capa investigation", "issue investigation", "late arriving data", "watermarking",
      "servicenow", "defect isolation", "audit pipeline", "root cause"
    ],
    "viewAction": {
      "type": "use_template",
      "target": "tpl-issue-investigation-capa",
      "label": "Use Template"
    },
    "downloadAction": {
      "type": "export_template_json",
      "target": "tpl-issue-investigation-capa",
      "filename": "template_issue_investigation_capa.json",
      "label": "Download Template JSON"
    }
  },
  {
    "id": "file-sample-rules-csv",
    "title": "Enterprise Validation Rules Catalog (CSV)",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/sample_rules.csv",
    "fileType": "csv",
    "description": "CSV dataset of 15 enterprise quality rules with IDs, dimensions, severity classifications, and SQL assertion statements.",
    "keywords": [
      "sample_rules.csv", "rules csv", "import rules", "rules spreadsheet",
      "rules catalog csv", "download csv", "sample rules"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/sample_rules.csv",
      "label": "Preview Rules CSV"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/sample_rules.csv",
      "filename": "sample_rules.csv",
      "label": "Download Rules CSV"
    }
  },
  {
    "id": "file-sample-execs-csv",
    "title": "Historical Test Execution Results (CSV)",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/sample_executions.csv",
    "fileType": "csv",
    "description": "CSV log of past quality test executions, passed/failed record totals, defect percentages, and execution run timestamps.",
    "keywords": [
      "sample_executions.csv", "executions csv", "test logs csv", "run results csv",
      "historical test runs", "download executions csv"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/sample_executions.csv",
      "label": "Preview Executions CSV"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/sample_executions.csv",
      "filename": "sample_executions.csv",
      "label": "Download Executions CSV"
    }
  },
  {
    "id": "file-dbt-manifest",
    "title": "Sample dbt manifest.json Artifact",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/dbt_manifest_sample.json",
    "fileType": "json",
    "description": "Compiled dbt manifest artifact with models, sources, seeds, tests, and DAG dependencies ready for browser parsing.",
    "keywords": [
      "dbt_manifest_sample.json", "manifest.json", "dbt artifact", "dbt models json",
      "compiled manifest", "dbt dag json"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/dbt_manifest_sample.json",
      "label": "Preview Manifest"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/dbt_manifest_sample.json",
      "filename": "dbt_manifest_sample.json",
      "label": "Download manifest.json"
    }
  },
  {
    "id": "file-dbt-run-results",
    "title": "Sample dbt run_results.json Artifact",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/dbt_run_results_sample.json",
    "fileType": "json",
    "description": "dbt run execution results artifact capturing test outcomes, execution times, status codes, and failure outputs.",
    "keywords": [
      "dbt_run_results_sample.json", "run_results.json", "test execution results",
      "dbt run output", "failures json"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/dbt_run_results_sample.json",
      "label": "Preview Run Results"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/dbt_run_results_sample.json",
      "filename": "dbt_run_results_sample.json",
      "label": "Download run_results.json"
    }
  },
  {
    "id": "file-dbt-catalog",
    "title": "Sample dbt catalog.json Artifact",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/dbt_catalog_sample.json",
    "fileType": "json",
    "description": "dbt schema catalog containing table names, schemas, column data types, and comments generated by dbt docs generate.",
    "keywords": [
      "dbt_catalog_sample.json", "catalog.json", "dbt catalog", "column metadata",
      "schema dictionary", "data types"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/dbt_catalog_sample.json",
      "label": "Preview Catalog"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/dbt_catalog_sample.json",
      "filename": "dbt_catalog_sample.json",
      "label": "Download catalog.json"
    }
  },
  {
    "id": "file-vocabulary-txt",
    "title": "Smart Autocomplete Vocabulary (TXT)",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "samples/autocomplete_vocabulary.txt",
    "fileType": "txt",
    "description": "Pre-built technical vocabulary dictionary containing hundreds of common SQL keywords, table names, teams, and data quality phrases.",
    "keywords": [
      "autocomplete_vocabulary.txt", "vocabulary", "dictionary", "wordlist",
      "autocomplete terms", "autocomplete txt"
    ],
    "viewAction": {
      "type": "preview_file",
      "target": "samples/autocomplete_vocabulary.txt",
      "label": "Preview Vocabulary"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "samples/autocomplete_vocabulary.txt",
      "filename": "autocomplete_vocabulary.txt",
      "label": "Download Vocabulary TXT"
    }
  },
  {
    "id": "file-sql-assertions-json",
    "title": "SQL Assertion Library Repository (JSON)",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "sql_assertions.json",
    "fileType": "json",
    "description": "The central JSON repository storing all user-added assertion queries with their Document Titles.",
    "keywords": [
      "sql_assertions.json", "stored queries json", "assertion library file",
      "assertions repository", "queries json"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "sql-library",
      "label": "Open SQL Library"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "sql_assertions.json",
      "filename": "sql_assertions.json",
      "label": "Download sql_assertions.json"
    }
  },
  {
    "id": "file-templates-catalog-json",
    "title": "Complete 13 Technical Templates Catalog (JSON)",
    "category": "Files & Datasets",
    "type": "file",
    "filePath": "templates/templates_catalog.json",
    "fileType": "json",
    "description": "Full JSON export of all 13 production data quality templates with complete source mappings, models, tables, and assertion queries.",
    "keywords": [
      "templates_catalog.json", "all templates json", "full catalog",
      "master templates json", "templates file"
    ],
    "viewAction": {
      "type": "navigate",
      "target": "templates",
      "label": "View Templates"
    },
    "downloadAction": {
      "type": "download_file",
      "url": "templates/templates_catalog.json",
      "filename": "templates_catalog.json",
      "label": "Download templates_catalog.json"
    }
  }
]
;
