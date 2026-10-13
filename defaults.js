/**
 * DATA QUALITY DOCUMENTER - DEFAULT EMBEDDED TEMPLATES & SAMPLE DOCUMENT
 * Ensures 100% functionality under file:// protocol without fetch CORS restrictions.
 */

window.DQD_DEFAULT_TEMPLATES = [
  {
    "id": "tpl-validation-rules",
    "name": "Data Quality Validation Rules",
    "category": "Validation",
    "description": "Standard enterprise template for validating data completeness, uniqueness, format adherence, and referential integrity across critical master data entities.",
    "documentType": "Data Quality Validation Rules",
    "validationType": "Table Validation",
    "team": "Customer Intelligence Squad",
    "usernames": [
      "alaam",
      "sarah.jenkins"
    ],
    "owner": "Sarah Jenkins (Head of Data Governance)",
    "reviewer": "Michael Chang (Lead Data Engineer)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Daily at 02:00 UTC",
    "businessDomain": "Core Banking / Customer Intelligence",
    "dataSource": {
      "system": "Snowflake Enterprise DW",
      "catalog": "EDW_PROD",
      "schema": "CUSTOMER",
      "tables": [
        "DIM_CUSTOMER",
        "FACT_CUSTOMER_EVENTS"
      ],
      "domain": "Customer Domain",
      "dataOwner": "Sarah Jenkins (Head of Data Governance)",
      "technicalOwner": "Michael Chang (Lead Data Engineer)",
      "dependencies": "CDC Pipeline from Oracle CRM -> Kafka -> Snowflake Landing",
      "mappings": [
        {
          "sourceCol": "SRC_CUST_ID",
          "targetCol": "CUSTOMER_ID",
          "dataType": "VARCHAR(36)",
          "rule": "Direct 1:1 Mapping",
          "nullable": "NO",
          "description": "Primary unique customer identifier (UUID format)"
        },
        {
          "sourceCol": "SRC_EMAIL_ADDR",
          "targetCol": "EMAIL_ADDRESS",
          "dataType": "VARCHAR(255)",
          "rule": "LOWER(TRIM(SRC_EMAIL_ADDR))",
          "nullable": "YES",
          "description": "Customer primary email, formatted and cleansed"
        },
        {
          "sourceCol": "SRC_STATUS_CD",
          "targetCol": "ACCOUNT_STATUS",
          "dataType": "VARCHAR(20)",
          "rule": "Lookup against REF_STATUS_CODES",
          "nullable": "NO",
          "description": "Current lifecycle status of customer profile"
        },
        {
          "sourceCol": "SRC_CREATED_TS",
          "targetCol": "PROFILE_CREATED_AT",
          "dataType": "TIMESTAMP_NTZ",
          "rule": "TO_TIMESTAMP_NTZ(SRC_CREATED_TS)",
          "nullable": "NO",
          "description": "Customer registration timestamp in UTC"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.dim_customer",
        "upstreamSources": "stg_crm.stg_customer_profiles, ref('stg_kyc_status')",
        "grain": "customer_id",
        "materialization": "Table",
        "notes": "Certified customer master dimension table"
      },
      {
        "id": "M-2",
        "modelName": "marts.fct_customer_events",
        "upstreamSources": "stg_kafka.stg_customer_clickstream",
        "grain": "event_id",
        "materialization": "Incremental",
        "notes": "Daily incremental customer interaction events"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "EDW_PROD.CUSTOMER.DIM_CUSTOMER",
        "schema": "EDW_PROD.CUSTOMER",
        "storageFormat": "Parquet",
        "partitionKeys": "cluster by (ACCOUNT_STATUS, CREATED_DATE)",
        "volume": "~2,500,000 active records",
        "notes": "Target enterprise dimension table"
      },
      {
        "id": "T-2",
        "tableName": "EDW_PROD.CUSTOMER.FACT_CUSTOMER_EVENTS",
        "schema": "EDW_PROD.CUSTOMER",
        "storageFormat": "Parquet",
        "partitionKeys": "cluster by (EVENT_DATE)",
        "volume": "~45,000,000 records",
        "notes": "High-volume customer interaction log"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Warehouse Cluster",
        "value": "COMPUTE_WH_XL"
      },
      {
        "id": "f-1",
        "label": "Freshness SLA",
        "value": "Daily 02:00 UTC (lag <= 2 hours)"
      },
      {
        "id": "f-2",
        "label": "Defect Escalation Tier",
        "value": "Tier-1 Governance Alert (Slack #data-alerts)"
      },
      {
        "id": "f-3",
        "label": "Compliance Standard",
        "value": "GDPR / CCPA & KYC Regulatory Compliance"
      }
    ],
    "dynamicFields": [
      {
        "key": "warehouse_cluster",
        "label": "Warehouse Cluster",
        "value": "COMPUTE_WH_XL"
      },
      {
        "key": "freshness_sla",
        "label": "Freshness SLA",
        "value": "Daily 02:00 UTC (lag <= 2 hours)"
      },
      {
        "key": "escalation_tier",
        "label": "Defect Escalation Tier",
        "value": "Tier-1 Governance Alert (Slack #data-alerts)"
      },
      {
        "key": "compliance_standard",
        "label": "Compliance Standard",
        "value": "GDPR / CCPA & KYC Regulatory Compliance"
      }
    ],
    "rules": [
      {
        "id": "RULE-CUST-001",
        "name": "Customer ID Uniqueness",
        "dimension": "Uniqueness",
        "severity": "Critical",
        "description": "Ensures no duplicate active customer IDs exist in DIM_CUSTOMER.",
        "sql": "SELECT CUSTOMER_ID, COUNT(*)\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE IS_ACTIVE = TRUE\nGROUP BY CUSTOMER_ID\nHAVING COUNT(*) > 1;",
        "expectedResult": "0 rows returned (Zero duplicates)",
        "threshold": "0",
        "dialect": "Snowflake"
      },
      {
        "id": "RULE-CUST-002",
        "name": "Customer Email Format Validity",
        "dimension": "Validity",
        "severity": "High",
        "description": "Validates email strings follow standard RFC 5322 regex pattern when present.",
        "sql": "SELECT CUSTOMER_ID, EMAIL_ADDRESS\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE EMAIL_ADDRESS IS NOT NULL\n  AND EMAIL_ADDRESS NOT RLIKE '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$';",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Snowflake"
      },
      {
        "id": "RULE-CUST-003",
        "name": "Mandatory Profile Status Adherence",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Ensures ACCOUNT_STATUS is never null and contains a valid active enumeration code.",
        "sql": "SELECT COUNT(*) AS null_status_cnt\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE ACCOUNT_STATUS IS NULL OR ACCOUNT_STATUS NOT IN ('ACTIVE', 'SUSPENDED', 'PENDING_KYC', 'CLOSED');",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Snowflake"
      }
    ],
    "sqlDialect": "Snowflake",
    "sqlQuery": "SELECT CUSTOMER_ID, COUNT(*)\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE IS_ACTIVE = TRUE\nGROUP BY CUSTOMER_ID\nHAVING COUNT(*) > 1;",
    "sqlNotes": "Primary duplicate assertion executed daily post-load. Query scans active partition records only.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Customer ID Uniqueness Assertion",
        "dialect": "Snowflake",
        "query": "SELECT \n  CUSTOMER_ID, \n  COUNT(*) AS duplicate_count\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE IS_ACTIVE = TRUE\nGROUP BY CUSTOMER_ID\nHAVING COUNT(*) > 1;",
        "notes": "Verifies zero primary key collisions in customer master dimension"
      },
      {
        "id": "Q-2",
        "title": "Email RFC-5322 Format Validity Assertion",
        "dialect": "Snowflake",
        "query": "SELECT \n  CUSTOMER_ID, \n  EMAIL_ADDRESS\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE EMAIL_ADDRESS IS NOT NULL\n  AND EMAIL_ADDRESS NOT RLIKE '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+$'\nLIMIT 100;",
        "notes": "Ensures emails match standard Internet email regex specifications"
      },
      {
        "id": "Q-3",
        "title": "Mandatory Lifecycle Status Integrity Check",
        "dialect": "Snowflake",
        "query": "SELECT \n  CUSTOMER_ID, \n  ACCOUNT_STATUS\nFROM EDW_PROD.CUSTOMER.DIM_CUSTOMER\nWHERE ACCOUNT_STATUS IS NULL \n   OR ACCOUNT_STATUS NOT IN ('ACTIVE', 'SUSPENDED', 'PENDING_KYC', 'CLOSED')\nLIMIT 50;",
        "notes": "Validates enumeration adherence against REF_STATUS_CODES"
      }
    ],
    "executiveSummary": "Formal data quality validation specification covering customer master dataset integrity prior to downstream analytical ingestion.",
    "businessObjective": "Maintain single version of customer truth and eliminate duplicate accounts for KYC compliance.",
    "expectedResult": "All validation rules pass with 0 defect records (100% pass rate).",
    "actualResult": "0 defects detected across 2,541,890 audited customer records.",
    "threshold": "0",
    "remediation": "Flag violating customer records in staging quarantine table and notify CRM Data Stewards for immediate reconciliation."
  },
  {
    "id": "tpl-reconciliation",
    "name": "Data Reconciliation",
    "category": "Reconciliation",
    "description": "Reconciles financial records, row counts, and monetary aggregates between Source OLTP and Target Reporting Data Mart.",
    "documentType": "Data Reconciliation",
    "validationType": "Model and Table Validation",
    "team": "Finance & General Ledger Tribe",
    "usernames": [
      "alaam",
      "elena.rostova"
    ],
    "owner": "Elena Rostova (Controller)",
    "reviewer": "David Kim (Senior Analytics Engineer)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Daily at 06:00 UTC (Post-Market Close)",
    "businessDomain": "Finance & General Ledger",
    "dataSource": {
      "system": "PostgreSQL OLTP vs Snowflake FinMart",
      "catalog": "FINANCE_PROD",
      "schema": "LEDGER",
      "tables": [
        "POSTING_ENTRIES",
        "FACT_GL_BALANCES"
      ],
      "domain": "Finance",
      "dataOwner": "Elena Rostova (Controller)",
      "technicalOwner": "David Kim (Senior Analytics Engineer)",
      "dependencies": "Daily Fivetran Sync -> DBT Financial Models",
      "mappings": [
        {
          "sourceCol": "SRC_TXN_AMT",
          "targetCol": "TRANSACTION_AMOUNT",
          "dataType": "NUMERIC(18,4)",
          "rule": "Currency conversion to USD at daily fixing rate",
          "nullable": "NO",
          "description": "Reconciled ledger posting amount"
        },
        {
          "sourceCol": "SRC_POSTING_DT",
          "targetCol": "POSTING_DATE",
          "dataType": "DATE",
          "rule": "CAST(SRC_POSTING_DT AS DATE)",
          "nullable": "NO",
          "description": "Accounting calendar posting date"
        },
        {
          "sourceCol": "SRC_ACCT_CD",
          "targetCol": "GL_ACCOUNT_CODE",
          "dataType": "VARCHAR(20)",
          "rule": "Direct mapping against Chart of Accounts",
          "nullable": "NO",
          "description": "General ledger account hierarchy identifier"
        },
        {
          "sourceCol": "SRC_CURR",
          "targetCol": "CURRENCY_CODE",
          "dataType": "CHAR(3)",
          "rule": "UPPER(TRIM(SRC_CURR))",
          "nullable": "NO",
          "description": "ISO 4217 three-letter currency code"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "fin_mart.fact_gl_balances",
        "upstreamSources": "stg_ledger.posting_entries, ref('dim_chart_of_accounts')",
        "grain": "gl_account_code, balance_date",
        "materialization": "Table",
        "notes": "Certified general ledger trial balance model"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "raw_ledger.posting_entries",
        "schema": "raw_ledger",
        "storageFormat": "PostgreSQL Table",
        "partitionKeys": "posting_date",
        "volume": "~1,850,000 daily postings",
        "notes": "Operational transactional journal source"
      },
      {
        "id": "T-2",
        "tableName": "fin_mart.fact_gl_balances",
        "schema": "fin_mart",
        "storageFormat": "Parquet",
        "partitionKeys": "cluster by (balance_date)",
        "volume": "~340,000 account summaries",
        "notes": "Reporting data mart balance snapshot"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Reconciliation Window",
        "value": "Prior Trading Day (T-1)"
      },
      {
        "id": "f-1",
        "label": "Acceptable Variance Tolerance",
        "value": "$0.00 (Zero Cent Tolerance)"
      },
      {
        "id": "f-2",
        "label": "SOX Compliance Control ID",
        "value": "SOX-ITGC-FIN-04"
      },
      {
        "id": "f-3",
        "label": "Escalation Officer",
        "value": "Elena Rostova (Controller)"
      }
    ],
    "dynamicFields": [
      {
        "key": "recon_window",
        "label": "Reconciliation Window",
        "value": "Prior Trading Day (T-1)"
      },
      {
        "key": "dollar_tolerance",
        "label": "Acceptable Variance Tolerance",
        "value": "$0.00 (Zero Cent Tolerance)"
      },
      {
        "key": "sox_control_id",
        "label": "SOX Compliance Control ID",
        "value": "SOX-ITGC-FIN-04"
      }
    ],
    "rules": [
      {
        "id": "RULE-REC-001",
        "name": "Daily Balance Delta Reconciliation",
        "dimension": "Reconciliation",
        "severity": "Critical",
        "description": "Net difference between Source Posting Entries and Target GL Balances must be $0.00.",
        "sql": "WITH src AS (\n  SELECT SUM(SRC_TXN_AMT) AS src_total\n  FROM raw_ledger.posting_entries\n  WHERE posting_date = CURRENT_DATE - INTERVAL '1 day'\n),\ntgt AS (\n  SELECT SUM(TRANSACTION_AMOUNT) AS tgt_total\n  FROM fin_mart.fact_gl_balances\n  WHERE balance_date = CURRENT_DATE - INTERVAL '1 day'\n)\nSELECT \n  src.src_total,\n  tgt.tgt_total,\n  (src.src_total - tgt.tgt_total) AS variance\nFROM src CROSS JOIN tgt\nWHERE ABS(src.src_total - tgt.tgt_total) > 0.01;",
        "expectedResult": "Variance equal to $0.00 (tolerance < $0.01)",
        "threshold": "0.01",
        "dialect": "PostgreSQL"
      },
      {
        "id": "RULE-REC-002",
        "name": "Record Count Parity Audit",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Transaction count parity between OLTP journal and analytical warehouse.",
        "sql": "SELECT \n  (SELECT COUNT(*) FROM raw_ledger.posting_entries WHERE posting_date = CURRENT_DATE - INTERVAL '1 day') AS oltp_count,\n  (SELECT COUNT(*) FROM fin_mart.fact_gl_postings WHERE posting_date = CURRENT_DATE - INTERVAL '1 day') AS dwh_count\nHAVING (SELECT COUNT(*) FROM raw_ledger.posting_entries WHERE posting_date = CURRENT_DATE - INTERVAL '1 day') != (SELECT COUNT(*) FROM fin_mart.fact_gl_postings WHERE posting_date = CURRENT_DATE - INTERVAL '1 day');",
        "expectedResult": "0 rows returned (Count delta = 0)",
        "threshold": "0",
        "dialect": "PostgreSQL"
      }
    ],
    "sqlDialect": "PostgreSQL",
    "sqlQuery": "WITH src AS (\n  SELECT SUM(SRC_TXN_AMT) AS src_total\n  FROM raw_ledger.posting_entries\n  WHERE posting_date = CURRENT_DATE - INTERVAL '1 day'\n),\ntgt AS (\n  SELECT SUM(TRANSACTION_AMOUNT) AS tgt_total\n  FROM fin_mart.fact_gl_balances\n  WHERE balance_date = CURRENT_DATE - INTERVAL '1 day'\n)\nSELECT \n  src.src_total,\n  tgt.tgt_total,\n  (src.src_total - tgt.tgt_total) AS variance\nFROM src CROSS JOIN tgt\nWHERE ABS(src.src_total - tgt.tgt_total) > 0.01;",
    "sqlNotes": "Run immediately following 05:00 UTC GL rollup run. Triggers SOX exception alert if variance > $0.01.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Daily Balance Delta Cross-System Reconciliation",
        "dialect": "PostgreSQL",
        "query": "WITH src AS (\n  SELECT SUM(SRC_TXN_AMT) AS src_total\n  FROM raw_ledger.posting_entries\n  WHERE posting_date = CURRENT_DATE - INTERVAL '1 day'\n),\ntgt AS (\n  SELECT SUM(TRANSACTION_AMOUNT) AS tgt_total\n  FROM fin_mart.fact_gl_balances\n  WHERE balance_date = CURRENT_DATE - INTERVAL '1 day'\n)\nSELECT \n  src.src_total,\n  tgt.tgt_total,\n  (src.src_total - tgt.tgt_total) AS variance\nFROM src CROSS JOIN tgt\nWHERE ABS(src.src_total - tgt.tgt_total) > 0.01;",
        "notes": "Direct monetary variance calculation between transactional raw journal and reporting balances"
      },
      {
        "id": "Q-2",
        "title": "Record Count Parity Audit Query",
        "dialect": "PostgreSQL",
        "query": "SELECT \n  src.cnt AS src_journal_count,\n  tgt.cnt AS dwh_mart_count,\n  (src.cnt - tgt.cnt) AS count_delta\nFROM (\n  SELECT COUNT(*) AS cnt FROM raw_ledger.posting_entries WHERE posting_date = CURRENT_DATE - INTERVAL '1 day'\n) src\nCROSS JOIN (\n  SELECT COUNT(*) AS cnt FROM fin_mart.fact_gl_postings WHERE posting_date = CURRENT_DATE - INTERVAL '1 day'\n) tgt\nWHERE src.cnt <> tgt.cnt;",
        "notes": "Verifies zero dropped records between source OLTP sync and dbt models"
      }
    ],
    "executiveSummary": "End-of-day financial ledger reconciliation audit verifying zero balance discrepancy between operational transactions and GL reports.",
    "businessObjective": "Ensure financial statement accuracy and SOX Section 404 IT control compliance.",
    "expectedResult": "Complete mathematical balance with 0 variance across all currency ledgers.",
    "actualResult": "$0.00 variance detected across 1,842,900 verified daily postings.",
    "threshold": "0.01",
    "remediation": "Halt morning reporting snapshot, execute backfill reconciliation script, and notify financial auditor."
  },
  {
    "id": "tpl-quality-assessment",
    "name": "Data Quality Assessments",
    "category": "Assessment",
    "description": "Holistic maturity scorecard and dimension review of an entire data product or enterprise table.",
    "documentType": "Data Quality Assessment",
    "validationType": "Table Validation",
    "team": "Supply Chain & Logistics Tribe",
    "usernames": [
      "alaam",
      "marcus.vance"
    ],
    "owner": "Marcus Vance (Director of Supply Chain Data)",
    "reviewer": "Sita Patel (Lead Data Architect)",
    "status": "Draft",
    "priority": "High",
    "executionFrequency": "Weekly on Sundays at 22:00 UTC",
    "businessDomain": "Supply Chain & Inventory",
    "dataSource": {
      "system": "SAP S/4HANA via Databricks Delta",
      "catalog": "CORP_DATABRICKS",
      "schema": "SUPPLY_CHAIN",
      "tables": [
        "FACT_INVENTORY_SNAPSHOTS",
        "DIM_WAREHOUSE_LOCATIONS"
      ],
      "domain": "Logistics",
      "dataOwner": "Marcus Vance (Director of Supply Chain Data)",
      "technicalOwner": "Sita Patel (Lead Data Architect)",
      "dependencies": "Hourly CDC Delta Lake pipelines from SAP S/4HANA",
      "mappings": [
        {
          "sourceCol": "MATNR",
          "targetCol": "SKU_ID",
          "dataType": "VARCHAR(40)",
          "rule": "TRIM(MATNR)",
          "nullable": "NO",
          "description": "Unique material / product SKU identifier"
        },
        {
          "sourceCol": "WERKS",
          "targetCol": "WAREHOUSE_CODE",
          "dataType": "VARCHAR(10)",
          "rule": "Direct mapping to distribution center code",
          "nullable": "NO",
          "description": "Physical warehouse plant identifier"
        },
        {
          "sourceCol": "LABST",
          "targetCol": "STOCK_ON_HAND",
          "dataType": "DECIMAL(15,3)",
          "rule": "CAST(LABST AS DECIMAL(15,3))",
          "nullable": "NO",
          "description": "Unrestricted physical inventory count"
        },
        {
          "sourceCol": "AEDAT",
          "targetCol": "LAST_AUDIT_TIMESTAMP",
          "dataType": "TIMESTAMP",
          "rule": "TO_TIMESTAMP(AEDAT)",
          "nullable": "NO",
          "description": "Last cycle count audit timestamp"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.inventory_turnover",
        "upstreamSources": "supply_chain.fact_inventory_snapshots, ref('dim_products')",
        "grain": "sku_id, warehouse_code",
        "materialization": "Table",
        "notes": "Supply chain replenishment planning model"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "CORP_DATABRICKS.SUPPLY_CHAIN.FACT_INVENTORY_SNAPSHOTS",
        "schema": "CORP_DATABRICKS.SUPPLY_CHAIN",
        "storageFormat": "Delta Lake",
        "partitionKeys": "snapshot_date",
        "volume": "~14,200,000 monthly snapshot records",
        "notes": "Primary inventory position lakehouse table"
      },
      {
        "id": "T-2",
        "tableName": "CORP_DATABRICKS.SUPPLY_CHAIN.DIM_WAREHOUSE_LOCATIONS",
        "schema": "CORP_DATABRICKS.SUPPLY_CHAIN",
        "storageFormat": "Delta Lake",
        "partitionKeys": "region",
        "volume": "~180 physical distribution hubs",
        "notes": "Warehouse facilities dimension master"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Data Product Maturity Level",
        "value": "Level 4 (Managed & Quantitatively Measured)"
      },
      {
        "id": "f-1",
        "label": "Overall Quality Health Target",
        "value": ">= 99.5% Conformance Score"
      },
      {
        "id": "f-2",
        "label": "Warehouse Freshness SLA",
        "value": "< 4 Hours Lag"
      },
      {
        "id": "f-3",
        "label": "Primary Consumers",
        "value": "ERP Automated Replenishment & Fulfillment Portals"
      }
    ],
    "dynamicFields": [
      {
        "key": "maturity_level",
        "label": "Data Product Maturity Level",
        "value": "Level 4 (Managed & Quantitatively Measured)"
      },
      {
        "key": "quality_target",
        "label": "Overall Quality Health Target",
        "value": ">= 99.5% Conformance Score"
      }
    ],
    "rules": [
      {
        "id": "RULE-SC-001",
        "name": "Warehouse Stock Freshness SLA",
        "dimension": "Timeliness",
        "severity": "High",
        "description": "Ensures snapshot timestamp is within 4 hours across all distribution centers.",
        "sql": "SELECT warehouse_code, MAX(snapshot_time) AS latest_snapshot\nFROM supply_chain.fact_inventory_snapshots\nGROUP BY warehouse_code\nHAVING MAX(snapshot_time) < CURRENT_TIMESTAMP() - INTERVAL 4 HOURS;",
        "expectedResult": "0 lagging warehouses returned",
        "threshold": "0",
        "dialect": "Databricks SQL"
      },
      {
        "id": "RULE-SC-002",
        "name": "Negative Stock Balance Anomaly Check",
        "dimension": "Validity",
        "severity": "Critical",
        "description": "Stock on hand must never be negative in published inventory snapshots.",
        "sql": "SELECT sku_id, warehouse_code, stock_on_hand\nFROM supply_chain.fact_inventory_snapshots\nWHERE stock_on_hand < 0.000;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Databricks SQL"
      }
    ],
    "sqlDialect": "Databricks SQL",
    "sqlQuery": "SELECT warehouse_code, MAX(snapshot_time) AS latest_snapshot\nFROM supply_chain.fact_inventory_snapshots\nGROUP BY warehouse_code\nHAVING MAX(snapshot_time) < CURRENT_TIMESTAMP() - INTERVAL 4 HOURS;",
    "sqlNotes": "Monitors warehouse streaming sync freshness and anomalous negative quantities across 180 hubs.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Warehouse Stock Freshness SLA Assertion",
        "dialect": "Databricks SQL",
        "query": "SELECT \n  warehouse_code, \n  MAX(snapshot_time) AS latest_snapshot,\n  ROUND((UNIX_TIMESTAMP(CURRENT_TIMESTAMP()) - UNIX_TIMESTAMP(MAX(snapshot_time))) / 3600, 2) AS lag_hours\nFROM supply_chain.fact_inventory_snapshots\nGROUP BY warehouse_code\nHAVING MAX(snapshot_time) < CURRENT_TIMESTAMP() - INTERVAL 4 HOURS;",
        "notes": "Identifies any distribution center that has not synced within the 4-hour SLA"
      },
      {
        "id": "Q-2",
        "title": "Non-Negative Physical Inventory Position Assertion",
        "dialect": "Databricks SQL",
        "query": "SELECT \n  sku_id, \n  warehouse_code, \n  stock_on_hand\nFROM supply_chain.fact_inventory_snapshots\nWHERE stock_on_hand < 0.000\nLIMIT 50;",
        "notes": "Detects phantom negative inventory balances indicative of unsynced goods receipts"
      }
    ],
    "executiveSummary": "Comprehensive quality assessment evaluating completeness, timeliness, and validity across enterprise distribution center inventory positions.",
    "businessObjective": "Prevent stockouts and inaccurate safety stock projections in ERP automated purchasing engines.",
    "expectedResult": "100% of warehouses meet the 4-hour freshness SLA with zero negative stock records.",
    "actualResult": "100% SLA compliance; 0 negative inventory positions detected across 14M rows.",
    "threshold": "0",
    "remediation": "Trigger SAP Delta sync retry for lagging warehouse nodes and dispatch automated ticket to warehouse IT operations."
  },
  {
    "id": "tpl-incident-report",
    "name": "Data Quality Incidents",
    "category": "Incident",
    "description": "Documentation for production data outages, corrupted records, pipeline failures, or broken business metrics.",
    "documentType": "Data Quality Incident",
    "validationType": "Issue Investigation",
    "team": "Marketing & Growth Analytics",
    "usernames": [
      "alaam",
      "chloe.dupont"
    ],
    "owner": "Chloe Dupont (Marketing Analytics Lead)",
    "reviewer": "Tariq Mansour (Data Platform Incident Commander)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Ad-hoc / Continuous Incident Monitoring",
    "businessDomain": "Marketing & Campaign Analytics",
    "dataSource": {
      "system": "BigQuery Analytics",
      "catalog": "marketing_prod",
      "schema": "attribution",
      "tables": [
        "fct_campaign_conversions",
        "stg_adwords_clicks"
      ],
      "domain": "Marketing Attribution",
      "dataOwner": "Chloe Dupont (Marketing Analytics Lead)",
      "technicalOwner": "Tariq Mansour (Data Platform Lead)",
      "dependencies": "Airflow DAG: ingest_google_adwords_api -> dbt marts.attribution",
      "mappings": [
        {
          "sourceCol": "click_id",
          "targetCol": "ad_click_uuid",
          "dataType": "STRING",
          "rule": "Direct mapping from Google GCLID",
          "nullable": "NO",
          "description": "Unique ad click tracking identifier"
        },
        {
          "sourceCol": "conversion_id",
          "targetCol": "conversion_uuid",
          "dataType": "STRING",
          "rule": "Direct 1:1 mapping",
          "nullable": "NO",
          "description": "Downstream checkout conversion transaction ID"
        },
        {
          "sourceCol": "revenue_usd",
          "targetCol": "attributed_revenue",
          "dataType": "NUMERIC",
          "rule": "CAST(revenue_usd AS NUMERIC)",
          "nullable": "NO",
          "description": "Monetary conversion value attributed to campaign"
        },
        {
          "sourceCol": "conversion_time",
          "targetCol": "conversion_timestamp",
          "dataType": "TIMESTAMP",
          "rule": "PARSE_TIMESTAMP('%Y-%m-%d %H:%M:%S', conversion_time)",
          "nullable": "NO",
          "description": "Exact UTC conversion timestamp"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.fct_campaign_attribution",
        "upstreamSources": "stg_adwords.clicks, ref('fct_orders')",
        "grain": "ad_click_uuid, conversion_uuid",
        "materialization": "Incremental",
        "notes": "Executive ROAS calculation table"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "marketing_prod.attribution.fct_campaign_conversions",
        "schema": "marketing_prod.attribution",
        "storageFormat": "BigQuery Table",
        "partitionKeys": "PARTITION BY DATE(conversion_timestamp)",
        "volume": "~8,900,000 seasonal conversion records",
        "notes": "Downstream reporting table for CMO dashboard"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Incident Severity Level",
        "value": "SEV-1 (High Impact Business Outage)"
      },
      {
        "id": "f-1",
        "label": "Outage Blast Radius",
        "value": "54,200 missing conversion attribution events ($1.2M impacted)"
      },
      {
        "id": "f-2",
        "label": "Downstream Impacted Dashboards",
        "value": "Executive CMO Dashboard, Google Ads Automated Bidding Engine"
      },
      {
        "id": "f-3",
        "label": "MTTR Target",
        "value": "< 2 Hours to Production Mitigation"
      }
    ],
    "dynamicFields": [
      {
        "key": "incident_sev",
        "label": "Incident Severity Level",
        "value": "SEV-1 (High Impact Business Outage)"
      },
      {
        "key": "blast_radius",
        "label": "Outage Blast Radius",
        "value": "54,200 missing conversion attribution events ($1.2M impacted)"
      }
    ],
    "rules": [
      {
        "id": "RULE-INC-001",
        "name": "Zero Conversion Anomaly Detector",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Detects days where total conversions unexpectedly drop to zero during active spend.",
        "sql": "SELECT DATE(conversion_timestamp) AS conv_date, COUNT(*) AS count_conversions\nFROM `marketing_prod.attribution.fct_campaign_conversions`\nWHERE conversion_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)\nGROUP BY 1\nHAVING count_conversions = 0;",
        "expectedResult": "0 days with 0 conversions",
        "threshold": "0",
        "dialect": "BigQuery"
      },
      {
        "id": "RULE-INC-002",
        "name": "Duplicate Click Attribution Anomaly Check",
        "dimension": "Uniqueness",
        "severity": "Critical",
        "description": "Ensures no double-attribution of conversion revenue to identical click identifiers.",
        "sql": "SELECT ad_click_uuid, COUNT(*) AS attribution_count\nFROM `marketing_prod.attribution.fct_campaign_conversions`\nWHERE conversion_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)\nGROUP BY ad_click_uuid\nHAVING COUNT(*) > 1;",
        "expectedResult": "0 duplicate attributions",
        "threshold": "0",
        "dialect": "BigQuery"
      }
    ],
    "sqlDialect": "BigQuery",
    "sqlQuery": "SELECT DATE(conversion_timestamp) AS conv_date, COUNT(*) AS count_conversions\nFROM `marketing_prod.attribution.fct_campaign_conversions`\nWHERE conversion_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)\nGROUP BY 1\nHAVING count_conversions = 0;",
    "sqlNotes": "Investigates conversion blackout period across Google Ads and affiliate network attribution channels.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Attribution Ingestion Zero-Count Blackout Detection",
        "dialect": "BigQuery",
        "query": "SELECT \n  DATE(conversion_timestamp) AS conv_date, \n  COUNT(*) AS total_conversions,\n  SUM(attributed_revenue) AS total_revenue\nFROM `marketing_prod.attribution.fct_campaign_conversions`\nWHERE conversion_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)\nGROUP BY 1\nHAVING total_conversions = 0;",
        "notes": "Flags complete data pipeline drop-offs where active spend produced 0 recorded conversions"
      },
      {
        "id": "Q-2",
        "title": "Duplicate Attribution Revenue Collision Check",
        "dialect": "BigQuery",
        "query": "SELECT \n  ad_click_uuid, \n  COUNT(*) AS attribution_count,\n  SUM(attributed_revenue) AS inflated_revenue\nFROM `marketing_prod.attribution.fct_campaign_conversions`\nWHERE conversion_timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)\nGROUP BY ad_click_uuid\nHAVING COUNT(*) > 1;",
        "notes": "Detects multi-firing pixels creating inflated ROAS reporting"
      }
    ],
    "executiveSummary": "Documentation for production data outages, corrupted records, pipeline failures, or broken business metrics.",
    "businessObjective": "Rapidly triage attribution reporting drop-offs and prevent automated over-bidding on corrupted campaign ROAS metrics.",
    "expectedResult": "Zero days with zero conversion count; zero duplicate click attribution IDs.",
    "actualResult": "SEV-1 anomaly confirmed on 2026-10-10: 0 conversions recorded due to expired OAuth refresh token.",
    "threshold": "0",
    "remediation": "Refresh expired Google Ads API credentials, trigger Airflow backfill DAG for affected date range, and invalidate Looker cache."
  },
  {
    "id": "tpl-root-cause-analysis",
    "name": "Root Cause Analysis",
    "category": "Analysis",
    "description": "5-Whys and Ishikawa investigation methodology for complex data quality breakdowns and upstream ingestion regressions.",
    "documentType": "Root Cause Analysis",
    "validationType": "Issue Investigation",
    "team": "Billing & Revenue Recognition Tribe",
    "usernames": [
      "alaam",
      "devon.adams"
    ],
    "owner": "Devon Adams (Principal Billing Engineer)",
    "reviewer": "Nadia Chernova (Lead SRE)",
    "status": "Draft",
    "priority": "High",
    "executionFrequency": "Post-Incident Review (PIR) Cadence",
    "businessDomain": "Billing & Revenue Recognition",
    "dataSource": {
      "system": "Stripe Webhooks -> PostgreSQL -> Snowflake",
      "catalog": "REVENUE_OPS",
      "schema": "BILLING",
      "tables": [
        "SUBSCRIPTION_INVOICES",
        "INVOICE_LINE_ITEMS"
      ],
      "domain": "Revenue Operations",
      "dataOwner": "Devon Adams (Principal Billing Engineer)",
      "technicalOwner": "Nadia Chernova (Lead SRE)",
      "dependencies": "AWS Lambda Stripe Webhook Consumer -> Kinesis -> Snowflake Snowpipe",
      "mappings": [
        {
          "sourceCol": "in_id",
          "targetCol": "INVOICE_ID",
          "dataType": "VARCHAR(50)",
          "rule": "Direct mapping from Stripe invoice prefix (in_*)",
          "nullable": "NO",
          "description": "Stripe unique invoice identifier"
        },
        {
          "sourceCol": "cus_id",
          "targetCol": "CUSTOMER_ID",
          "dataType": "VARCHAR(50)",
          "rule": "Direct mapping from Stripe customer prefix (cus_*)",
          "nullable": "NO",
          "description": "Stripe customer reference ID"
        },
        {
          "sourceCol": "amt_cents",
          "targetCol": "AMOUNT_PAID_USD",
          "dataType": "DECIMAL(18,2)",
          "rule": "amt_cents / 100.0",
          "nullable": "NO",
          "description": "Settled payment amount converted to USD"
        },
        {
          "sourceCol": "inv_status",
          "targetCol": "STATUS",
          "dataType": "VARCHAR(25)",
          "rule": "UPPER(TRIM(inv_status))",
          "nullable": "NO",
          "description": "Invoice payment settlement status"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.fct_mrr_movements",
        "upstreamSources": "stg_stripe.invoices, ref('dim_subscriptions')",
        "grain": "subscription_id, month_key",
        "materialization": "Table",
        "notes": "Monthly Recurring Revenue GAAP compliance model"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES",
        "schema": "REVENUE_OPS.BILLING",
        "storageFormat": "Parquet",
        "partitionKeys": "cluster by (DATE(INVOICE_DATE))",
        "volume": "~3,400,000 historical recurring invoices",
        "notes": "Core billing settlement repository"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "RCA Investigation Method",
        "value": "5-Whys Root Cause Analysis & Ishikawa Diagram"
      },
      {
        "id": "f-1",
        "label": "Root Cause Classification",
        "value": "Upstream API Webhook Schema Drift (Nested JSON array)"
      },
      {
        "id": "f-2",
        "label": "Preventive Control",
        "value": "Enforce strict JSON schema validation contract at Lambda gate"
      },
      {
        "id": "f-3",
        "label": "Audit Trail Reference",
        "value": "JIRA-INFRA-8921 / Post-Mortem Doc #402"
      }
    ],
    "dynamicFields": [
      {
        "key": "rca_method",
        "label": "RCA Investigation Method",
        "value": "5-Whys Root Cause Analysis & Ishikawa Diagram"
      },
      {
        "key": "root_cause_type",
        "label": "Root Cause Classification",
        "value": "Upstream API Webhook Schema Drift (Nested JSON array)"
      }
    ],
    "rules": [
      {
        "id": "RULE-RCA-001",
        "name": "Missing Webhook Invoice Ingestion Check",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Verifies zero dropped invoices between raw webhook landing and billing warehouse.",
        "sql": "SELECT s.invoice_id\nFROM raw_stripe.webhook_invoices s\nLEFT JOIN REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES d\n  ON s.invoice_id = d.invoice_id\nWHERE d.invoice_id IS NULL\n  AND s.created_at >= CURRENT_DATE - 3;",
        "expectedResult": "0 missing invoices returned",
        "threshold": "0",
        "dialect": "Snowflake"
      },
      {
        "id": "RULE-RCA-002",
        "name": "Zero-Dollar Paid Invoice Anomaly Check",
        "dimension": "Accuracy",
        "severity": "High",
        "description": "Invoices marked PAID on paid tiers must never contain 0 amount.",
        "sql": "SELECT invoice_id, customer_id, AMOUNT_PAID_USD\nFROM REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES\nWHERE STATUS = 'PAID' AND AMOUNT_PAID_USD <= 0.00;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Snowflake"
      }
    ],
    "sqlDialect": "Snowflake",
    "sqlQuery": "SELECT s.invoice_id\nFROM raw_stripe.webhook_invoices s\nLEFT JOIN REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES d\n  ON s.invoice_id = d.invoice_id\nWHERE d.invoice_id IS NULL\n  AND s.created_at >= CURRENT_DATE - 3;",
    "sqlNotes": "5-Whys query tracing missing webhook deliveries across raw ingestion and warehouse landing.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Unmatched Stripe Webhook Invoices Ingestion Trace",
        "dialect": "Snowflake",
        "query": "SELECT \n  s.invoice_id,\n  s.customer_id,\n  s.created_at AS webhook_received_time,\n  s.payload:error:message::string AS parse_error\nFROM raw_stripe.webhook_invoices s\nLEFT JOIN REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES d\n  ON s.invoice_id = d.invoice_id\nWHERE d.invoice_id IS NULL\n  AND s.created_at >= CURRENT_DATE - 3\nORDER BY s.created_at DESC;",
        "notes": "Identifies invoices present in webhook log but missing from final billing marts"
      },
      {
        "id": "Q-2",
        "title": "Settled Paid Invoices with Zero Amount Anomaly Assertion",
        "dialect": "Snowflake",
        "query": "SELECT \n  invoice_id, \n  customer_id, \n  AMOUNT_PAID_USD,\n  STATUS\nFROM REVENUE_OPS.BILLING.SUBSCRIPTION_INVOICES\nWHERE STATUS = 'PAID' \n  AND AMOUNT_PAID_USD <= 0.00\nLIMIT 50;",
        "notes": "Confirms whether parsing failures led to truncated zero-dollar settlements"
      }
    ],
    "executiveSummary": "Root cause analysis detailing upstream JSON schema drift on webhook event payloads causing dropped billing records.",
    "businessObjective": "Establish permanent schema validation controls to prevent revenue under-reporting and customer billing discrepancies.",
    "expectedResult": "0 missing webhook invoices; 0 non-free invoices marked paid with zero amount.",
    "actualResult": "Root cause identified: 124 webhook events failed JSON parser due to new nested metadata array.",
    "threshold": "0",
    "remediation": "Deploy patch v2.4.1 to webhook consumer Lambda, re-drive dead letter queue, and add automated integration contract test."
  },
  {
    "id": "tpl-remediation-plans",
    "name": "Remediation Plans",
    "category": "Remediation",
    "description": "Actionable milestone-driven remediation roadmap for correcting systemic enterprise data flaws.",
    "documentType": "Remediation Plan",
    "validationType": "Issue Investigation",
    "team": "Clinical Informatics & Health Data Tribe",
    "usernames": [
      "alaam",
      "dr.alan.grant"
    ],
    "owner": "Dr. Alan Grant (Chief Medical Information Officer)",
    "reviewer": "Samantha Brooks (HIPAA Data Compliance Officer)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Continuous Monitoring (Every 15 mins)",
    "businessDomain": "Healthcare / Patient Records",
    "dataSource": {
      "system": "Epic EHR Integration",
      "catalog": "CLINICAL_DW",
      "schema": "PATIENTS",
      "tables": [
        "PATIENT_ENCOUNTERS",
        "DIM_PATIENTS"
      ],
      "domain": "Clinical Health Data",
      "dataOwner": "Dr. Alan Grant (CMIO)",
      "technicalOwner": "Samantha Brooks (HIPAA Officer)",
      "dependencies": "HL7 FHIR Real-Time Stream -> Kafka -> PostgreSQL Lakehouse",
      "mappings": [
        {
          "sourceCol": "enc_id",
          "targetCol": "ENCOUNTER_ID",
          "dataType": "VARCHAR(50)",
          "rule": "Direct mapping of Epic encounter ID",
          "nullable": "NO",
          "description": "Unique clinical encounter visit identifier"
        },
        {
          "sourceCol": "mrn_no",
          "targetCol": "PATIENT_MRN",
          "dataType": "VARCHAR(30)",
          "rule": "UPPER(TRIM(mrn_no))",
          "nullable": "NO",
          "description": "Master Medical Record Number"
        },
        {
          "sourceCol": "admit_dt",
          "targetCol": "ADMIT_TIMESTAMP",
          "dataType": "TIMESTAMP",
          "rule": "CAST(admit_dt AS TIMESTAMP)",
          "nullable": "NO",
          "description": "Hospital admission or check-in timestamp"
        },
        {
          "sourceCol": "disch_dt",
          "targetCol": "DISCHARGE_TIMESTAMP",
          "dataType": "TIMESTAMP",
          "rule": "CAST(disch_dt AS TIMESTAMP)",
          "nullable": "YES",
          "description": "Discharge timestamp (null if patient still admitted)"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.fct_clinical_encounters",
        "upstreamSources": "stg_ehr.encounters, ref('dim_patients')",
        "grain": "encounter_id",
        "materialization": "Incremental",
        "notes": "Clinical analytics encounter mart"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "CLINICAL_DW.PATIENTS.PATIENT_ENCOUNTERS",
        "schema": "CLINICAL_DW.PATIENTS",
        "storageFormat": "PostgreSQL Table",
        "partitionKeys": "admit_timestamp",
        "volume": "~1,200,000 patient encounter visits",
        "notes": "Core hospital clinical encounter store"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Compliance Mandate",
        "value": "HIPAA Security Rule & HL7 FHIR Standards"
      },
      {
        "id": "f-1",
        "label": "Remediation Phase Target",
        "value": "Phase 1: Real-time MRN Deduplication & Ingestion Gate"
      },
      {
        "id": "f-2",
        "label": "Target Defect Tolerance",
        "value": "0 duplicate patient master records (Zero Tolerance)"
      },
      {
        "id": "f-3",
        "label": "Clinical Safety Lead",
        "value": "Dr. Alan Grant (CMIO)"
      }
    ],
    "dynamicFields": [
      {
        "key": "compliance_mandate",
        "label": "Compliance Mandate",
        "value": "HIPAA Security Rule & HL7 FHIR Standards"
      },
      {
        "key": "remediation_phase",
        "label": "Remediation Phase Target",
        "value": "Phase 1: Real-time MRN Deduplication & Ingestion Gate"
      }
    ],
    "rules": [
      {
        "id": "RULE-REM-001",
        "name": "Patient Chronology Inversion Assertion",
        "dimension": "Consistency",
        "severity": "Critical",
        "description": "Ensures discharge timestamp does not precede admission timestamp.",
        "sql": "SELECT encounter_id, patient_mrn, admit_timestamp, discharge_timestamp\nFROM clinical_dw.patients.patient_encounters\nWHERE discharge_timestamp < admit_timestamp;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "PostgreSQL"
      },
      {
        "id": "RULE-REM-002",
        "name": "Master Patient MRN Collision Check",
        "dimension": "Uniqueness",
        "severity": "Critical",
        "description": "Zero duplicate patient master demographic records per MRN.",
        "sql": "SELECT patient_mrn, COUNT(DISTINCT patient_uuid) AS collision_cnt\nFROM clinical_dw.patients.dim_patients\nGROUP BY patient_mrn\nHAVING COUNT(DISTINCT patient_uuid) > 1;",
        "expectedResult": "0 duplicate MRN records",
        "threshold": "0",
        "dialect": "PostgreSQL"
      }
    ],
    "sqlDialect": "PostgreSQL",
    "sqlQuery": "SELECT encounter_id, patient_mrn, admit_timestamp, discharge_timestamp\nFROM clinical_dw.patients.patient_encounters\nWHERE discharge_timestamp < admit_timestamp;",
    "sqlNotes": "Clinical chronology assertion running continuously across live admission and discharge feeds.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Overlapping Patient Encounter Chronology Assertion",
        "dialect": "PostgreSQL",
        "query": "SELECT \n  encounter_id, \n  patient_mrn, \n  admit_timestamp, \n  discharge_timestamp,\n  (admit_timestamp - discharge_timestamp) AS inverted_interval\nFROM clinical_dw.patients.patient_encounters\nWHERE discharge_timestamp < admit_timestamp\nORDER BY admit_timestamp DESC;",
        "notes": "Flags impossible medical chronology where patient discharge predates hospital admission"
      },
      {
        "id": "Q-2",
        "title": "Duplicate Medical Record Number (MRN) Collision Detection",
        "dialect": "PostgreSQL",
        "query": "SELECT \n  patient_mrn, \n  COUNT(DISTINCT patient_uuid) AS distinct_patient_uuids,\n  STRING_AGG(patient_uuid::text, ', ') AS collided_ids\nFROM clinical_dw.patients.dim_patients\nGROUP BY patient_mrn\nHAVING COUNT(DISTINCT patient_uuid) > 1;",
        "notes": "Detects hazardous duplicate patient profiles sharing identical MRN"
      }
    ],
    "executiveSummary": "Remediation plan roadmap outlining technical milestones to cleanse inverted clinical timestamps and eliminate MRN duplication.",
    "businessObjective": "Safeguard patient safety, clinical efficacy, and achieve 100% HIPAA audit compliance.",
    "expectedResult": "0 encounters where discharge precedes admission; 0 MRN collisions across patient master.",
    "actualResult": "Phase 1 completed: 0 chronology defects detected across 850,000 active patient encounters.",
    "threshold": "0",
    "remediation": "Block encounter ingest if timestamps violate chronological causality; trigger immediate Master Patient Index (MPI) deduplication workflow."
  },
  {
    "id": "tpl-test-execution-reports",
    "name": "Test Execution Reports",
    "category": "Testing",
    "description": "Formal test results documentation capturing batch automated DQ test runs across environments.",
    "documentType": "Test Execution Report",
    "validationType": "Table Validation",
    "team": "Risk Modeling & Regulatory Tribe",
    "usernames": [
      "alaam",
      "richard.hendricks"
    ],
    "owner": "Richard Hendricks (Lead Risk Analytics Engineer)",
    "reviewer": "Victoria Chen (Managing Director, Credit Risk)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Daily at 01:00 UTC (Pre-EOD Reporting)",
    "businessDomain": "Risk Management & Regulatory",
    "dataSource": {
      "system": "Oracle Exadata -> Trino Lakehouse",
      "catalog": "RISK_PROD",
      "schema": "BASEL_III",
      "tables": [
        "CREDIT_RISK_EXPOSURES",
        "COUNTERPARTY_LIMITS"
      ],
      "domain": "Risk Analytics",
      "dataOwner": "Richard Hendricks (Lead Risk Engineer)",
      "technicalOwner": "Victoria Chen (Managing Director)",
      "dependencies": "Exadata Goldengate Sync -> Iceberg Landing -> Trino Daily Aggregation",
      "mappings": [
        {
          "sourceCol": "EXP_ID",
          "targetCol": "EXPOSURE_ID",
          "dataType": "VARCHAR(50)",
          "rule": "Direct mapping of counterparty exposure UUID",
          "nullable": "NO",
          "description": "Primary key for credit exposure record"
        },
        {
          "sourceCol": "CP_ID",
          "targetCol": "COUNTERPARTY_ID",
          "dataType": "VARCHAR(30)",
          "rule": "Direct mapping to counterparty master ID",
          "nullable": "NO",
          "description": "Legal entity counterparty identifier"
        },
        {
          "sourceCol": "EAD_EUR",
          "targetCol": "EAD_AMOUNT_EUR",
          "dataType": "DECIMAL(18,2)",
          "rule": "CAST(EAD_EUR AS DECIMAL(18,2))",
          "nullable": "NO",
          "description": "Exposure at Default denominated in EUR"
        },
        {
          "sourceCol": "RWA_EUR",
          "targetCol": "RWA_CALCULATED",
          "dataType": "DECIMAL(18,2)",
          "rule": "Calculated via internal ratings based (IRB) approach",
          "nullable": "NO",
          "description": "Risk-Weighted Assets for regulatory capital computation"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.basel_capital_adequacy",
        "upstreamSources": "risk_prod.basel_iii.credit_risk_exposures, ref('dim_counterparties')",
        "grain": "exposure_id, calculation_date",
        "materialization": "Table",
        "notes": "Regulatory Pillar 1 capital adequacy mart"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "RISK_PROD.BASEL_III.CREDIT_RISK_EXPOSURES",
        "schema": "RISK_PROD.BASEL_III",
        "storageFormat": "Iceberg",
        "partitionKeys": "calculation_date",
        "volume": "~4,800,000 regulatory credit exposure positions",
        "notes": "Pillar 1 calculation dataset"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Regulatory Framework",
        "value": "Basel III / CRR II Regulatory Capital Framework"
      },
      {
        "id": "f-1",
        "label": "Total Automated Test Cases",
        "value": "42 Automated Assertions Executed"
      },
      {
        "id": "f-2",
        "label": "Execution Pass Percentage",
        "value": "100.0% Pass Rate (0 Defects)"
      },
      {
        "id": "f-3",
        "label": "Audit Sign-off Authority",
        "value": "Chief Risk Officer (CRO) Review Board"
      }
    ],
    "dynamicFields": [
      {
        "key": "framework",
        "label": "Regulatory Framework",
        "value": "Basel III / CRR II Regulatory Capital Framework"
      },
      {
        "key": "pass_rate",
        "label": "Execution Pass Percentage",
        "value": "100.0% Pass Rate (0 Defects)"
      }
    ],
    "rules": [
      {
        "id": "RULE-TEST-001",
        "name": "Exposure At Default (EAD) Upper Bound Constraint",
        "dimension": "Validity",
        "severity": "Critical",
        "description": "EAD amounts must be non-negative and strictly below 10 Billion EUR per facility.",
        "sql": "SELECT exposure_id, counterparty_id, ead_amount_eur\nFROM risk_prod.basel_iii.credit_risk_exposures\nWHERE ead_amount_eur < 0.00 OR ead_amount_eur > 10000000000.00;",
        "expectedResult": "0 out-of-bounds exposure records",
        "threshold": "0",
        "dialect": "Trino"
      },
      {
        "id": "RULE-TEST-002",
        "name": "RWA Mathematical Sanity Assertion",
        "dimension": "Consistency",
        "severity": "Critical",
        "description": "RWA must never mathematically exceed 1250% of Exposure at Default.",
        "sql": "SELECT exposure_id, ead_amount_eur, rwa_calculated\nFROM risk_prod.basel_iii.credit_risk_exposures\nWHERE rwa_calculated > (ead_amount_eur * 12.5);",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Trino"
      }
    ],
    "sqlDialect": "Trino",
    "sqlQuery": "SELECT exposure_id, counterparty_id, ead_amount_eur\nFROM risk_prod.basel_iii.credit_risk_exposures\nWHERE ead_amount_eur < 0.00 OR ead_amount_eur > 10000000000.00;",
    "sqlNotes": "Comprehensive Basel III test suite execution validating risk exposures prior to central bank submission.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Exposure At Default (EAD) Range & Boundary Assertion",
        "dialect": "Trino",
        "query": "SELECT \n  exposure_id, \n  counterparty_id, \n  ead_amount_eur\nFROM risk_prod.basel_iii.credit_risk_exposures\nWHERE ead_amount_eur < 0.00 \n   OR ead_amount_eur > 10000000000.00;",
        "notes": "Asserts no negative exposures or abnormal positions exceeding bank single-counterparty ceiling"
      },
      {
        "id": "Q-2",
        "title": "Risk-Weighted Asset (RWA) Mathematical Ceiling Assertion",
        "dialect": "Trino",
        "query": "SELECT \n  exposure_id, \n  ead_amount_eur, \n  rwa_calculated,\n  ROUND(rwa_calculated / NULLIF(ead_amount_eur, 0), 4) AS risk_weight_ratio\nFROM risk_prod.basel_iii.credit_risk_exposures\nWHERE rwa_calculated > (ead_amount_eur * 12.5)\nLIMIT 50;",
        "notes": "Validates capital weighting ratio adheres to Basel regulatory risk boundaries"
      }
    ],
    "executiveSummary": "Formal automated test execution report certifying credit risk metrics for regulatory reporting compliance.",
    "businessObjective": "Provide auditable proof of mathematical consistency and data integrity for central bank submissions.",
    "expectedResult": "All 42 Basel III credit exposure test assertions pass with 0 defects.",
    "actualResult": "42 of 42 assertions passed (100% pass rate); 0 defect records detected across 4.8M rows.",
    "threshold": "0",
    "remediation": "Alert Capital Adequacy SRE on duty and lock regulatory reporting pipeline until exposure re-calculation completes."
  },
  {
    "id": "tpl-dbt-documentation",
    "name": "dbt Model and Test Documentation",
    "category": "dbt",
    "description": "Structured documentation aligning dbt models, generic tests, singular tests, and dbt manifest schema.",
    "documentType": "dbt Documentation",
    "validationType": "Model Validation",
    "team": "E-Commerce Analytics Tribe",
    "usernames": [
      "alaam",
      "claire.beauchamp"
    ],
    "owner": "Claire Beauchamp (Staff Analytics Engineer)",
    "reviewer": "Lucas Silva (Data Platform Lead)",
    "status": "Draft",
    "priority": "High",
    "executionFrequency": "Continuous Integration (CI / dbt build)",
    "businessDomain": "E-Commerce Analytics",
    "dataSource": {
      "system": "dbt Core / dbt Cloud on Snowflake",
      "catalog": "ANALYTICS",
      "schema": "MARTS",
      "tables": [
        "fct_orders",
        "dim_products"
      ],
      "domain": "Sales & Merchandising",
      "dataOwner": "Claire Beauchamp (Staff Analytics Engineer)",
      "technicalOwner": "Lucas Silva (Data Platform Lead)",
      "dependencies": "dbt build --select marts.orders+ on Snowflake COMPUTE_WH",
      "mappings": [
        {
          "sourceCol": "order_id",
          "targetCol": "order_id",
          "dataType": "VARCHAR(36)",
          "rule": "Direct surrogate hash from stg_orders",
          "nullable": "NO",
          "description": "Primary key of order transaction"
        },
        {
          "sourceCol": "prod_id",
          "targetCol": "product_id",
          "dataType": "BIGINT",
          "rule": "Lookup against dim_products",
          "nullable": "NO",
          "description": "Foreign key to product catalog"
        },
        {
          "sourceCol": "qty",
          "targetCol": "quantity_ordered",
          "dataType": "INTEGER",
          "rule": "CAST(qty AS INTEGER)",
          "nullable": "NO",
          "description": "Item units ordered in transaction"
        },
        {
          "sourceCol": "unit_price",
          "targetCol": "unit_price_usd",
          "dataType": "DECIMAL(12,2)",
          "rule": "ROUND(unit_price, 2)",
          "nullable": "NO",
          "description": "Item gross sales price in USD"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.fct_orders",
        "upstreamSources": "stg_ecommerce.orders, stg_ecommerce.order_items",
        "grain": "order_id",
        "materialization": "Incremental",
        "notes": "Primary analytical orders mart model"
      },
      {
        "id": "M-2",
        "modelName": "marts.dim_products",
        "upstreamSources": "stg_pim.products",
        "grain": "product_id",
        "materialization": "Table",
        "notes": "Product dimension catalog"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "ANALYTICS.MARTS.FCT_ORDERS",
        "schema": "ANALYTICS.MARTS",
        "storageFormat": "Parquet",
        "partitionKeys": "cluster by (DATE(order_date))",
        "volume": "~3,420,000 orders",
        "notes": "Production sales reporting table"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "dbt Core Version",
        "value": "v1.8.2"
      },
      {
        "id": "f-1",
        "label": "dbt Test Command",
        "value": "dbt test --select marts.orders+ --store-failures"
      },
      {
        "id": "f-2",
        "label": "CI/CD Pipeline Status",
        "value": "GitHub Actions dbt-ci Workflow #451 (PASSED)"
      },
      {
        "id": "f-3",
        "label": "Documentation Catalog",
        "value": "https://dbt.internal.corp/docs"
      }
    ],
    "dynamicFields": [
      {
        "key": "dbt_version",
        "label": "dbt Core Version",
        "value": "v1.8.2"
      },
      {
        "key": "test_cmd",
        "label": "dbt Test Command",
        "value": "dbt test --select marts.orders+ --store-failures"
      }
    ],
    "rules": [
      {
        "id": "RULE-DBT-001",
        "name": "dbt Generic Test: unique(fct_orders.order_id)",
        "dimension": "Uniqueness",
        "severity": "Critical",
        "description": "Primary key order_id uniqueness test compiled from schema.yml.",
        "sql": "SELECT order_id, COUNT(*) AS n_records\nFROM ANALYTICS.MARTS.FCT_ORDERS\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
        "expectedResult": "0 duplicate rows",
        "threshold": "0",
        "dialect": "Snowflake"
      },
      {
        "id": "RULE-DBT-002",
        "name": "dbt Generic Test: not_null(fct_orders.product_id)",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Ensures foreign key product_id is never null.",
        "sql": "SELECT COUNT(*) AS null_product_count\nFROM ANALYTICS.MARTS.FCT_ORDERS\nWHERE product_id IS NULL;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Snowflake"
      }
    ],
    "sqlDialect": "Snowflake",
    "sqlQuery": "SELECT order_id, COUNT(*) AS n_records\nFROM ANALYTICS.MARTS.FCT_ORDERS\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
    "sqlNotes": "Compiled dbt tests corresponding to schema.yml assertions for marts.fct_orders.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "dbt Generic Test: unique(fct_orders.order_id)",
        "dialect": "Snowflake",
        "query": "SELECT \n  order_id, \n  COUNT(*) AS duplicate_count\nFROM ANALYTICS.MARTS.FCT_ORDERS\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
        "notes": "Compiled schema yml test validating surrogate grain uniqueness"
      },
      {
        "id": "Q-2",
        "title": "dbt Generic Test: not_null(fct_orders.product_id)",
        "dialect": "Snowflake",
        "query": "SELECT \n  order_id, \n  product_id\nFROM ANALYTICS.MARTS.FCT_ORDERS\nWHERE product_id IS NULL\nLIMIT 50;",
        "notes": "Validates foreign key integrity to dim_products catalog"
      }
    ],
    "executiveSummary": "Automated dbt artifact lineage documentation bridging schema yml assertions and business definitions.",
    "businessObjective": "Catalog all dbt model transformations and test coverage for downstream self-service data consumers.",
    "expectedResult": "All unique and not_null generic tests pass on every dbt run.",
    "actualResult": "dbt test passed: 0 failures across 3,420,000 order rows.",
    "threshold": "0",
    "remediation": "Add schema contract constraints to prevent breaking upstream schema changes."
  },
  {
    "id": "tpl-generic-technical",
    "name": "Generic Technical Documentation",
    "category": "Technical",
    "description": "Flexible documentation template for data pipelines, ETL specifications, data dictionaries, and architectural diagrams.",
    "documentType": "Technical Documentation",
    "validationType": "Model and Table Validation",
    "team": "Data Platform Core Tribe",
    "usernames": [
      "alaam",
      "vikram.seth"
    ],
    "owner": "Alexandre Dumas (Lead Data Architect)",
    "reviewer": "Vikram Seth (Principal Platform Engineer)",
    "status": "Draft",
    "priority": "Medium",
    "executionFrequency": "Continuous Streaming SLA Monitor",
    "businessDomain": "Enterprise Data Platform",
    "dataSource": {
      "system": "Kafka / Flink Streaming -> S3 Data Lake",
      "catalog": "STREAMING_HUB",
      "schema": "EVENTS",
      "tables": [
        "CLICKSTREAM_RAW",
        "TELEMETRY_PARQUET"
      ],
      "domain": "Platform Engineering",
      "dataOwner": "Alexandre Dumas (Lead Data Architect)",
      "technicalOwner": "Vikram Seth (Principal Platform Engineer)",
      "dependencies": "Kubernetes Flink streaming jobs -> S3 Data Lake -> Trino Catalog",
      "mappings": [
        {
          "sourceCol": "evt_id",
          "targetCol": "event_uuid",
          "dataType": "VARCHAR(36)",
          "rule": "UUID string validation",
          "nullable": "NO",
          "description": "Global event telemetry identifier"
        },
        {
          "sourceCol": "sess_id",
          "targetCol": "session_id",
          "dataType": "VARCHAR(64)",
          "rule": "Direct mapping of client session ID",
          "nullable": "NO",
          "description": "Client tracking session token"
        },
        {
          "sourceCol": "type_cd",
          "targetCol": "event_type",
          "dataType": "VARCHAR(50)",
          "rule": "UPPER(TRIM(type_cd))",
          "nullable": "NO",
          "description": "Standardized event taxonomy classification"
        },
        {
          "sourceCol": "epoch_ms",
          "targetCol": "event_epoch_ms",
          "dataType": "BIGINT",
          "rule": "Unix millisecond timestamp",
          "nullable": "NO",
          "description": "Event generation timestamp from edge devices"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "streaming_hub.fct_streaming_sessions",
        "upstreamSources": "streaming_hub.events.telemetry_parquet",
        "grain": "session_id",
        "materialization": "Table",
        "notes": "Real-time user session aggregation table"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "STREAMING_HUB.EVENTS.TELEMETRY_PARQUET",
        "schema": "STREAMING_HUB.EVENTS",
        "storageFormat": "Parquet",
        "partitionKeys": "dt, hour",
        "volume": "~120,000,000 daily events",
        "notes": "Real-time edge telemetry store"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Schema Registry Version",
        "value": "v3.1.0 (Confluent Avro Schema Registry)"
      },
      {
        "id": "f-1",
        "label": "Pipeline Ingestion Latency SLA",
        "value": "< 60 seconds end-to-end"
      },
      {
        "id": "f-2",
        "label": "Peak Ingestion Throughput",
        "value": "125,000 events/second"
      },
      {
        "id": "f-3",
        "label": "Data Retention Policy",
        "value": "90 days raw S3 / 365 days aggregated"
      }
    ],
    "dynamicFields": [
      {
        "key": "schema_reg",
        "label": "Schema Registry Version",
        "value": "v3.1.0 (Confluent Avro Schema Registry)"
      },
      {
        "key": "latency_sla",
        "label": "Pipeline Ingestion Latency SLA",
        "value": "< 60 seconds end-to-end"
      }
    ],
    "rules": [
      {
        "id": "RULE-GEN-001",
        "name": "Streaming Ingestion Lag SLA Assertion",
        "dimension": "Timeliness",
        "severity": "High",
        "description": "Ensures streaming latency from event generation to S3 landing remains below 60 seconds.",
        "sql": "SELECT event_type, MAX(CURRENT_TIMESTAMP - event_time) AS max_lag_seconds\nFROM streaming_hub.events.telemetry_parquet\nGROUP BY event_type\nHAVING MAX(CURRENT_TIMESTAMP - event_time) > INTERVAL '60' SECOND;",
        "expectedResult": "0 lagging event partitions",
        "threshold": "0",
        "dialect": "ANSI SQL"
      },
      {
        "id": "RULE-GEN-002",
        "name": "Malformed JSON Schema Payload Check",
        "dimension": "Conformity",
        "severity": "Critical",
        "description": "Zero malformed event payloads that violate registered Avro schema specifications.",
        "sql": "SELECT COUNT(*) AS malformed_count\nFROM streaming_hub.events.clickstream_raw\nWHERE is_valid_json(payload) = FALSE OR event_uuid IS NULL;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "ANSI SQL"
      }
    ],
    "sqlDialect": "ANSI SQL",
    "sqlQuery": "SELECT event_type, MAX(CURRENT_TIMESTAMP - event_time) AS max_lag_seconds\nFROM streaming_hub.events.telemetry_parquet\nGROUP BY event_type\nHAVING MAX(CURRENT_TIMESTAMP - event_time) > INTERVAL '60' SECOND;",
    "sqlNotes": "Monitors end-to-end streaming latency across Kafka topics, Flink aggregators, and S3 Parquet landing.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Streaming Ingestion Lag SLA Assertion",
        "dialect": "ANSI SQL",
        "query": "SELECT \n  event_type, \n  COUNT(*) AS event_volume,\n  MAX(CURRENT_TIMESTAMP - event_time) AS max_lag_seconds\nFROM streaming_hub.events.telemetry_parquet\nGROUP BY event_type\nHAVING MAX(CURRENT_TIMESTAMP - event_time) > INTERVAL '60' SECOND;",
        "notes": "Flags backpressured Kafka consumer partitions exceeding 60-second latency SLA"
      },
      {
        "id": "Q-2",
        "title": "Payload Schema Conformance & Dead Letter Audit",
        "dialect": "ANSI SQL",
        "query": "SELECT \n  event_uuid, \n  session_id, \n  event_type\nFROM streaming_hub.events.clickstream_raw\nWHERE is_valid_json(payload) = FALSE \n   OR event_uuid IS NULL\nLIMIT 50;",
        "notes": "Identifies unparseable raw payloads destined for dead letter queue inspection"
      }
    ],
    "executiveSummary": "Standard technical specifications and interface agreement for data consumers.",
    "businessObjective": "Define contract and schema agreements between upstream producers and analytical consumers.",
    "expectedResult": "Adherence to semantic versioning and schema registry guarantees.",
    "actualResult": "Average ingestion lag 14.2 seconds; 0 schema violations recorded across 120M events.",
    "threshold": "0",
    "remediation": "Reject malformed schema events to dead letter queue (DLQ) and auto-scale Flink worker task managers."
  },
  {
    "id": "tpl-dbt-model-validation",
    "name": "dbt Trino Model Validation Specification",
    "category": "Model Validation",
    "description": "Comprehensive validation suite for dbt dimensional marts and analytical models running on Trino, including row count stability, grain uniqueness, and column assertions.",
    "documentType": "Data Quality Validation Rules",
    "validationType": "Model Validation",
    "team": "Analytics Engineering",
    "usernames": [
      "alaam",
      "sarah.smith"
    ],
    "owner": "Sarah Smith (Lead Analytics Engineer)",
    "reviewer": "alaam (Staff Data Quality Engineer)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Daily at 04:00 UTC",
    "businessDomain": "Customer & Revenue Intelligence",
    "dataSource": {
      "system": "Trino Lakehouse",
      "catalog": "iceberg_prod",
      "schema": "analytics_marts",
      "tables": [
        "fct_customer_orders",
        "dim_customer_segmentation"
      ],
      "domain": "Analytics Engineering",
      "dataOwner": "Sarah Smith (Lead Analytics Engineer)",
      "technicalOwner": "alaam (Staff Data Quality Engineer)",
      "dependencies": "dbt build --select marts.fct_customer_orders+ on Trino cluster",
      "mappings": [
        {
          "sourceCol": "order_uuid",
          "targetCol": "order_id",
          "dataType": "VARCHAR(36)",
          "rule": "Direct 1:1 Mapping",
          "nullable": "NO",
          "description": "Primary key surrogate hash"
        },
        {
          "sourceCol": "customer_ext_id",
          "targetCol": "customer_id",
          "dataType": "BIGINT",
          "rule": "Lookup customer dimension",
          "nullable": "NO",
          "description": "Foreign key to dim_customer"
        },
        {
          "sourceCol": "total_amount_cents",
          "targetCol": "order_total_usd",
          "dataType": "DECIMAL(18,2)",
          "rule": "total_amount_cents / 100.0",
          "nullable": "NO",
          "description": "Order gross value in USD"
        },
        {
          "sourceCol": "order_status_raw",
          "targetCol": "order_status",
          "dataType": "VARCHAR(30)",
          "rule": "UPPER(TRIM(order_status_raw))",
          "nullable": "NO",
          "description": "Standardized lifecycle status"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "marts.fct_customer_orders",
        "upstreamSources": "stg_ecommerce.stg_orders, stg_billing.stg_invoices",
        "grain": "order_id",
        "materialization": "Incremental",
        "notes": "Core customer order revenue mart"
      },
      {
        "id": "M-2",
        "modelName": "marts.dim_customer_segmentation",
        "upstreamSources": "stg_crm.customers",
        "grain": "customer_id",
        "materialization": "Table",
        "notes": "Customer behavioral tier dimension"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "iceberg_prod.analytics_marts.fct_customer_orders",
        "schema": "iceberg_prod.analytics_marts",
        "storageFormat": "Iceberg",
        "partitionKeys": "order_date",
        "volume": "~5,100,000 records",
        "notes": "Target analytical model table"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Target dbt Model Name",
        "value": "fct_customer_orders"
      },
      {
        "id": "f-1",
        "label": "Materialization Strategy",
        "value": "Incremental (merge on order_id)"
      },
      {
        "id": "f-2",
        "label": "Lineage & Upstream Models",
        "value": "stg_ecommerce.stg_orders, stg_billing.stg_invoices"
      },
      {
        "id": "f-3",
        "label": "Freshness SLA",
        "value": "Daily 04:00 UTC (lag <= 2 hours)"
      }
    ],
    "dynamicFields": [
      {
        "key": "dbt_model_name",
        "label": "Target dbt Model Name",
        "value": "fct_customer_orders"
      },
      {
        "key": "materialization_strategy",
        "label": "Materialization Strategy",
        "value": "Incremental (merge on order_id)"
      },
      {
        "key": "lineage_upstream",
        "label": "Lineage & Upstream Models",
        "value": "stg_ecommerce.stg_orders, stg_billing.stg_invoices"
      },
      {
        "key": "freshness_sla",
        "label": "Freshness SLA",
        "value": "Daily 04:00 UTC (lag <= 2 hours)"
      }
    ],
    "rules": [
      {
        "id": "RULE-MOD-001",
        "name": "Model Primary Key Grain Uniqueness",
        "dimension": "Uniqueness",
        "severity": "Critical",
        "description": "Verify 0 duplicate order_id records in incremental model fct_customer_orders.",
        "sql": "SELECT order_id, COUNT(*) AS dup_cnt FROM iceberg_prod.analytics_marts.fct_customer_orders GROUP BY order_id HAVING COUNT(*) > 1;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Trino"
      },
      {
        "id": "RULE-MOD-002",
        "name": "Order Gross Value Non-Negative Assertion",
        "dimension": "Validity",
        "severity": "High",
        "description": "Order total amounts must never be negative in published marts.",
        "sql": "SELECT order_id, order_total_usd FROM iceberg_prod.analytics_marts.fct_customer_orders WHERE order_total_usd < 0.00;",
        "expectedResult": "0 rows returned",
        "threshold": "0",
        "dialect": "Trino"
      }
    ],
    "sqlDialect": "Trino",
    "sqlQuery": "SELECT \n  order_id, \n  COUNT(*) AS duplicate_count\nFROM iceberg_prod.analytics_marts.fct_customer_orders\nWHERE order_date >= CURRENT_DATE - INTERVAL '30' DAY\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
    "sqlNotes": "Grain verification over active 30-day rolling partition window.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Primary Key Uniqueness Assertion",
        "dialect": "Trino",
        "query": "SELECT \n  order_id, \n  COUNT(*) AS duplicate_count\nFROM iceberg_prod.analytics_marts.fct_customer_orders\nWHERE order_date >= CURRENT_DATE - INTERVAL '30' DAY\nGROUP BY order_id\nHAVING COUNT(*) > 1;",
        "notes": "Grain verification over active 30-day rolling partition window"
      },
      {
        "id": "Q-2",
        "title": "Referential Integrity & Orphan Key Check",
        "dialect": "Trino",
        "query": "SELECT \n  f.order_id, \n  f.customer_id\nFROM iceberg_prod.analytics_marts.fct_customer_orders f\nLEFT JOIN iceberg_prod.analytics_marts.dim_customer_segmentation c\n  ON f.customer_id = c.customer_id\nWHERE c.customer_id IS NULL\nLIMIT 100;",
        "notes": "Verifies 100% of customer foreign keys resolve to dim_customer_segmentation"
      }
    ],
    "executiveSummary": "Automated dbt Trino model validation covering grain uniqueness, numeric invariants, and dimensional referential integrity for fct_customer_orders.",
    "businessObjective": "Ensure executive revenue dashboards ingest only certified, deduplicated order records with zero dimensional orphan keys.",
    "expectedResult": "All Trino model validation assertions pass with 0 defect records.",
    "actualResult": "0 defects detected; 100% pass across 5,100,000 order records.",
    "threshold": "0",
    "remediation": "Quarantine failed incremental run, inspect upstream staging models, and run full-refresh backfill for affected dates."
  },
  {
    "id": "tpl-lakehouse-table-validation",
    "name": "Lakehouse Physical Table Integrity Validation",
    "category": "Table Validation",
    "description": "Physical layer validation for Apache Iceberg and Hive tables on Trino Lakehouse: partition layout, file compaction, schema evolution, and row counts.",
    "documentType": "Data Quality Validation Rules",
    "validationType": "Table Validation",
    "team": "Data Engineering",
    "usernames": [
      "alaam",
      "data.engineer",
      "david.kim"
    ],
    "owner": "David Kim (Lead Data Engineer)",
    "reviewer": "alaam (Lakehouse Architect)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Hourly (Partition Level)",
    "businessDomain": "Data Lakehouse Platform",
    "dataSource": {
      "system": "Trino / Apache Iceberg on MinIO / S3",
      "catalog": "iceberg_prod",
      "schema": "analytics",
      "tables": [
        "fact_daily_orders",
        "landing_customer_events"
      ],
      "domain": "Lakehouse Storage",
      "dataOwner": "David Kim (Lead Data Engineer)",
      "technicalOwner": "alaam (Lakehouse Architect)",
      "dependencies": "Apache Spark Streaming Compactor -> Iceberg Catalog Commits",
      "mappings": [
        {
          "sourceCol": "order_id",
          "targetCol": "order_id",
          "dataType": "VARCHAR(36)",
          "rule": "Direct mapping",
          "nullable": "NO",
          "description": "Physical partition order key"
        },
        {
          "sourceCol": "order_date",
          "targetCol": "order_date",
          "dataType": "DATE",
          "rule": "CAST(order_date AS DATE)",
          "nullable": "NO",
          "description": "Iceberg day identity partition column"
        },
        {
          "sourceCol": "file_path",
          "targetCol": "file_path",
          "dataType": "VARCHAR(255)",
          "rule": "$path system metadata column",
          "nullable": "NO",
          "description": "Physical Parquet data file location"
        }
      ]
    },
    "validatedModels": [],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "iceberg_prod.analytics.fact_daily_orders",
        "schema": "iceberg_prod.analytics",
        "storageFormat": "Iceberg",
        "partitionKeys": "day(order_date)",
        "volume": "~45,000,000 rows across 1,200 partitions",
        "notes": "Apache Iceberg table backed by Parquet storage"
      },
      {
        "id": "T-2",
        "tableName": "hive_lakehouse.raw.landing_customer_events",
        "schema": "hive_lakehouse.raw",
        "storageFormat": "Parquet",
        "partitionKeys": "dt, hour",
        "volume": "~150,000,000 records",
        "notes": "Raw incoming clickstream landing bucket"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Physical Table Name",
        "value": "iceberg_prod.analytics.fact_daily_orders"
      },
      {
        "id": "f-1",
        "label": "Storage Format",
        "value": "Apache Iceberg (Parquet)"
      },
      {
        "id": "f-2",
        "label": "Partition Strategy",
        "value": "day(order_date) with hidden partitioning"
      },
      {
        "id": "f-3",
        "label": "Average File Size Target",
        "value": "128MB - 256MB Optimized Compaction"
      }
    ],
    "dynamicFields": [
      {
        "key": "physical_table_name",
        "label": "Physical Table Name",
        "value": "iceberg_prod.analytics.fact_daily_orders"
      },
      {
        "key": "storage_format",
        "label": "Storage Format",
        "value": "Apache Iceberg (Parquet)"
      },
      {
        "key": "partition_strategy",
        "label": "Partition Strategy",
        "value": "day(order_date) with hidden partitioning"
      },
      {
        "key": "compaction_status",
        "label": "Compaction Status",
        "value": "128MB Optimized Compaction Target"
      }
    ],
    "rules": [
      {
        "id": "RULE-TBL-001",
        "name": "Empty Partition Anomaly Assertion",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Ensures no empty partitions committed for active business days.",
        "sql": "SELECT order_date, COUNT(*) AS row_cnt FROM iceberg_prod.analytics.fact_daily_orders WHERE order_date >= CURRENT_DATE - INTERVAL '7' DAY GROUP BY order_date HAVING COUNT(*) = 0;",
        "expectedResult": "0 empty partitions",
        "threshold": "0",
        "dialect": "Trino"
      }
    ],
    "sqlDialect": "Trino",
    "sqlQuery": "SELECT \n  \"$path\" AS data_file_path,\n  COUNT(*) AS records_per_file\nFROM iceberg_prod.analytics.fact_daily_orders\nWHERE order_date = CURRENT_DATE - INTERVAL '1' DAY\nGROUP BY \"$path\"\nHAVING COUNT(*) < 1000\nLIMIT 50;",
    "sqlNotes": "Small file detection query identifying uncompacted tiny Parquet data files in Iceberg snapshot.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Iceberg Small-File Anti-Pattern Detector",
        "dialect": "Trino",
        "query": "SELECT \n  \"$path\" AS data_file_path,\n  COUNT(*) AS records_per_file\nFROM iceberg_prod.analytics.fact_daily_orders\nWHERE order_date = CURRENT_DATE - INTERVAL '1' DAY\nGROUP BY \"$path\"\nHAVING COUNT(*) < 1000\nLIMIT 50;",
        "notes": "Detects tiny Parquet data files causing metadata degradation in Iceberg"
      },
      {
        "id": "Q-2",
        "title": "Daily Partition Row Count Stability Check",
        "dialect": "Trino",
        "query": "SELECT \n  order_date,\n  COUNT(*) AS daily_record_count,\n  LAG(COUNT(*)) OVER (ORDER BY order_date) AS prev_day_count,\n  ROUND((COUNT(*) - LAG(COUNT(*)) OVER (ORDER BY order_date)) * 100.0 / NULLIF(LAG(COUNT(*)) OVER (ORDER BY order_date), 0), 2) AS pct_change\nFROM iceberg_prod.analytics.fact_daily_orders\nWHERE order_date >= CURRENT_DATE - INTERVAL '14' DAY\nGROUP BY order_date\nORDER BY order_date DESC;",
        "notes": "Evaluates day-over-day volumetric stability to detect sudden data drop-offs"
      }
    ],
    "executiveSummary": "Physical lakehouse storage validation examining partition layout, Parquet file size distribution, and commit metadata stability on Trino.",
    "businessObjective": "Avoid query latency regression caused by the small files problem and ensure zero dropped daily partition slices.",
    "expectedResult": "All partitions populated with average file size > 64MB and 0 orphan manifests.",
    "actualResult": "Average file size 184MB; zero small files (<1000 rows) detected in latest snapshot.",
    "threshold": "0",
    "remediation": "Execute Iceberg maintenance procedure: system.rewrite_data_files with target_file_size_bytes=268435456."
  },
  {
    "id": "tpl-model-table-reconciliation",
    "name": "dbt Model & Iceberg Table Cross-Reconciliation",
    "category": "Model and Table Validation",
    "description": "End-to-end reconciliation between staging raw physical lakehouse tables and target published dbt semantic models, ensuring 100% financial balance and record parity.",
    "documentType": "Data Reconciliation",
    "validationType": "Model and Table Validation",
    "team": "Risk & Financial Analytics",
    "usernames": [
      "alaam",
      "alex.miller"
    ],
    "owner": "Alex Miller (Senior Quantitative Analytics Engineer)",
    "reviewer": "alaam (Lead DQ Architect)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Daily at 05:30 UTC",
    "businessDomain": "Risk & Financial Analytics",
    "dataSource": {
      "system": "Trino Lakehouse (Cross-Catalog)",
      "catalog": "iceberg_prod & hive_raw",
      "schema": "finance & raw_transfers",
      "tables": [
        "raw_transfers.incoming_wires",
        "finance_marts.fct_reconciled_transfers"
      ],
      "domain": "Payment Operations",
      "dataOwner": "Alex Miller (Senior Quantitative Analytics Engineer)",
      "technicalOwner": "alaam (Lead DQ Architect)",
      "dependencies": "Kafka Ingest -> raw_transfers.incoming_wires -> dbt marts -> Trino",
      "mappings": [
        {
          "sourceCol": "wire_ref_no",
          "targetCol": "transfer_id",
          "dataType": "VARCHAR(40)",
          "rule": "TRIM(wire_ref_no)",
          "nullable": "NO",
          "description": "Unique bank wire transaction reference"
        },
        {
          "sourceCol": "amount_eur",
          "targetCol": "settled_amount_eur",
          "dataType": "DECIMAL(18,2)",
          "rule": "Direct mapping",
          "nullable": "NO",
          "description": "Settled transaction amount in EUR"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "finance_marts.fct_reconciled_transfers",
        "upstreamSources": "hive_raw.raw_transfers.incoming_wires",
        "grain": "transfer_id",
        "materialization": "Table",
        "notes": "Certified analytical transfer ledger mart"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "hive_raw.raw_transfers.incoming_wires",
        "schema": "hive_raw.raw_transfers",
        "storageFormat": "Parquet",
        "partitionKeys": "ingest_date",
        "volume": "~2,400,000 raw wire records",
        "notes": "Operational staging wire transfer journal"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "Reconciliation Mode",
        "value": "Full Cross-System Set-Difference Reconciliation"
      },
      {
        "id": "f-1",
        "label": "Variance Tolerance",
        "value": "0.00 EUR (Strict Zero Discrepancy)"
      },
      {
        "id": "f-2",
        "label": "Audit Mandate",
        "value": "European Central Bank (ECB) Wire Settlement Standard"
      },
      {
        "id": "f-3",
        "label": "Reconciliation Window",
        "value": "Prior Business Day Settlement"
      }
    ],
    "dynamicFields": [
      {
        "key": "recon_mode",
        "label": "Reconciliation Mode",
        "value": "Full Cross-System Set-Difference Reconciliation"
      },
      {
        "key": "variance_threshold",
        "label": "Variance Tolerance",
        "value": "0.00 EUR (Strict Zero Discrepancy)"
      },
      {
        "key": "audit_mandate",
        "label": "Audit Mandate",
        "value": "European Central Bank (ECB) Wire Settlement Standard"
      }
    ],
    "rules": [
      {
        "id": "RULE-XREC-001",
        "name": "Raw Table vs dbt Mart Sum Balance Parity",
        "dimension": "Reconciliation",
        "severity": "Critical",
        "description": "Monetary aggregate delta between staging table and final model must be exactly 0.00.",
        "sql": "WITH raw_sum AS (SELECT SUM(amount_eur) AS s FROM hive_raw.raw_transfers.incoming_wires WHERE ingest_date = CURRENT_DATE - INTERVAL '1' DAY), mart_sum AS (SELECT SUM(settled_amount_eur) AS s FROM iceberg_prod.finance_marts.fct_reconciled_transfers WHERE transfer_date = CURRENT_DATE - INTERVAL '1' DAY) SELECT (raw_sum.s - mart_sum.s) AS diff FROM raw_sum, mart_sum WHERE ABS(raw_sum.s - mart_sum.s) > 0.001;",
        "expectedResult": "0 rows returned (diff = 0)",
        "threshold": "0",
        "dialect": "Trino"
      }
    ],
    "sqlDialect": "Trino",
    "sqlQuery": "WITH raw_sum AS (\n  SELECT \n    COUNT(*) AS raw_count,\n    SUM(amount_eur) AS raw_total\n  FROM hive_raw.raw_transfers.incoming_wires\n  WHERE ingest_date = CURRENT_DATE - INTERVAL '1' DAY\n),\nmart_sum AS (\n  SELECT \n    COUNT(*) AS mart_count,\n    SUM(settled_amount_eur) AS mart_total\n  FROM iceberg_prod.finance_marts.fct_reconciled_transfers\n  WHERE transfer_date = CURRENT_DATE - INTERVAL '1' DAY\n)\nSELECT \n  raw_sum.raw_count,\n  mart_sum.mart_count,\n  (raw_sum.raw_count - mart_sum.mart_count) AS count_diff,\n  raw_sum.raw_total,\n  mart_sum.mart_total,\n  (raw_sum.raw_total - mart_sum.mart_total) AS balance_diff\nFROM raw_sum, mart_sum\nWHERE raw_sum.raw_count != mart_sum.mart_count \n   OR ABS(raw_sum.raw_total - mart_sum.mart_total) > 0.01;",
    "sqlNotes": "Complete mathematical reconciliation bridging raw storage partition and dbt dimensional mart.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Model & Lakehouse Table Sum Reconciliation",
        "dialect": "Trino",
        "query": "WITH raw_sum AS (\n  SELECT \n    COUNT(*) AS raw_count,\n    SUM(amount_eur) AS raw_total\n  FROM hive_raw.raw_transfers.incoming_wires\n  WHERE ingest_date = CURRENT_DATE - INTERVAL '1' DAY\n),\nmart_sum AS (\n  SELECT \n    COUNT(*) AS mart_count,\n    SUM(settled_amount_eur) AS mart_total\n  FROM iceberg_prod.finance_marts.fct_reconciled_transfers\n  WHERE transfer_date = CURRENT_DATE - INTERVAL '1' DAY\n)\nSELECT \n  raw_sum.raw_count,\n  mart_sum.mart_count,\n  (raw_sum.raw_count - mart_sum.mart_count) AS count_diff,\n  raw_sum.raw_total,\n  mart_sum.mart_total,\n  (raw_sum.raw_total - mart_sum.mart_total) AS balance_diff\nFROM raw_sum, mart_sum\nWHERE raw_sum.raw_count != mart_sum.mart_count \n   OR ABS(raw_sum.raw_total - mart_sum.mart_total) > 0.01;",
        "notes": "Validates 0 record drop and 0.00 EUR balance variance between physical lakehouse and dbt mart"
      },
      {
        "id": "Q-2",
        "title": "Missing Transaction Record Discrepancy Extraction",
        "dialect": "Trino",
        "query": "SELECT \n  r.wire_ref_no,\n  r.amount_eur,\n  r.ingest_date\nFROM hive_raw.raw_transfers.incoming_wires r\nLEFT JOIN iceberg_prod.finance_marts.fct_reconciled_transfers m\n  ON r.wire_ref_no = m.transfer_id\nWHERE m.transfer_id IS NULL\n  AND r.ingest_date = CURRENT_DATE - INTERVAL '1' DAY\nLIMIT 50;",
        "notes": "Extracts sample defect records present in raw partition but missing in final mart"
      }
    ],
    "executiveSummary": "Daily financial settlement reconciliation comparing raw incoming bank wire partitions with published dbt dimensional marts.",
    "businessObjective": "Comply with regulatory liquidity requirements and verify zero transactional leakage in Lakehouse ETL pipeline.",
    "expectedResult": "Count difference = 0 and financial balance difference = 0.00 EUR.",
    "actualResult": "Count difference = 0; balance difference = 0.00 EUR across 2,410,500 daily wires.",
    "threshold": "0",
    "remediation": "Locate dropped transaction keys, verify dbt filter conditions in staging models, and run incremental partition re-computation."
  },
  {
    "id": "tpl-issue-investigation-capa",
    "name": "Data Incident & Defect Root Cause (CAPA) Investigation",
    "category": "Issue Investigation",
    "description": "Structured investigation methodology for production data incidents: defect isolation, blast radius measurement, root cause identification, and CAPA remediation.",
    "documentType": "Root Cause Analysis",
    "validationType": "Issue Investigation",
    "team": "Data Governance & Quality",
    "usernames": [
      "alaam",
      "sarah.smith"
    ],
    "owner": "Sarah Smith (Head of Data Governance)",
    "reviewer": "alaam (Lead DQ Operations)",
    "status": "Draft",
    "priority": "Critical",
    "executionFrequency": "Ad-hoc / Corrective Action (CAPA)",
    "businessDomain": "Data Governance & Operations",
    "dataSource": {
      "system": "Trino Federated Query Engine",
      "catalog": "iceberg_prod & edw_snowflake",
      "schema": "operations & audit",
      "tables": [
        "edw_snowflake.audit.pipeline_execution_log",
        "iceberg_prod.analytics.fact_orders"
      ],
      "domain": "Platform Reliability",
      "dataOwner": "Sarah Smith (Head of Data Governance)",
      "technicalOwner": "alaam (Lead DQ Operations)",
      "dependencies": "Airflow Task Logs -> S3 Audit Store -> Trino",
      "mappings": [
        {
          "sourceCol": "err_id",
          "targetCol": "incident_ticket_id",
          "dataType": "VARCHAR(40)",
          "rule": "Direct mapping to ServiceNow INC",
          "nullable": "NO",
          "description": "Enterprise incident management ticket"
        },
        {
          "sourceCol": "affected_records",
          "targetCol": "defect_record_count",
          "dataType": "BIGINT",
          "rule": "Calculated defect volume",
          "nullable": "NO",
          "description": "Quantified record blast radius"
        }
      ]
    },
    "validatedModels": [
      {
        "id": "M-1",
        "modelName": "iceberg_prod.analytics.fact_orders",
        "upstreamSources": "edw_snowflake.raw.orders",
        "grain": "order_id",
        "materialization": "Incremental",
        "notes": "Incident investigation target model"
      }
    ],
    "validatedTables": [
      {
        "id": "T-1",
        "tableName": "iceberg_prod.analytics.fact_orders",
        "schema": "iceberg_prod.analytics",
        "storageFormat": "Iceberg",
        "partitionKeys": "order_date",
        "volume": "~18,000,000 orders",
        "notes": "Impacted production table"
      }
    ],
    "dynamicInputs": [
      {
        "id": "f-0",
        "label": "CAPA Tracking Identifier",
        "value": "CAPA-2026-DQ-0042"
      },
      {
        "id": "f-1",
        "label": "Root Cause Classification",
        "value": "Late-Arriving Data with Incomplete Incremental Window Lookback"
      },
      {
        "id": "f-2",
        "label": "Quantified Impact Scope",
        "value": "14,200 orders silently skipped between 2026-10-01 and 2026-10-05"
      },
      {
        "id": "f-3",
        "label": "Preventive Control SLA",
        "value": "Expand incremental lookback from 1 day to 3 days + automated watermarking"
      }
    ],
    "dynamicFields": [
      {
        "key": "capa_id",
        "label": "CAPA Tracking Identifier",
        "value": "CAPA-2026-DQ-0042"
      },
      {
        "key": "root_cause_type",
        "label": "Root Cause Classification",
        "value": "Late-Arriving Data with Incomplete Incremental Window Lookback"
      },
      {
        "key": "impact_scope",
        "label": "Quantified Impact Scope",
        "value": "14,200 orders silently skipped between 2026-10-01 and 2026-10-05"
      },
      {
        "key": "preventive_action",
        "label": "Preventive Control SLA",
        "value": "Expand incremental lookback from 1 day to 3 days + automated watermarking"
      }
    ],
    "rules": [
      {
        "id": "RULE-CAPA-001",
        "name": "Late-Arriving Records Completeness Verification",
        "dimension": "Completeness",
        "severity": "Critical",
        "description": "Verify that all source orders with updated_at timestamps in prior 5 days exist in published mart.",
        "sql": "SELECT s.order_id, s.updated_at FROM raw_orders s LEFT JOIN fact_orders t ON s.order_id = t.order_id WHERE t.order_id IS NULL AND s.updated_at >= CURRENT_DATE - INTERVAL '5' DAY;",
        "expectedResult": "0 missing orders returned",
        "threshold": "0",
        "dialect": "Trino"
      }
    ],
    "sqlDialect": "Trino",
    "sqlQuery": "SELECT \n  s.order_id, \n  s.updated_at AS source_update_time,\n  t.order_id AS mart_order_id\nFROM edw_snowflake.raw.orders s\nLEFT JOIN iceberg_prod.analytics.fact_orders t\n  ON s.order_id = t.order_id\nWHERE t.order_id IS NULL\n  AND s.updated_at BETWEEN TIMESTAMP '2026-10-01' AND TIMESTAMP '2026-10-06'\nLIMIT 100;",
    "sqlNotes": "Isolates omitted late-arriving orders skipped during incremental merge execution.",
    "sqlQueries": [
      {
        "id": "Q-1",
        "title": "Late-Arriving Order Defect Extraction",
        "dialect": "Trino",
        "query": "SELECT \n  s.order_id, \n  s.customer_id,\n  s.updated_at AS source_update_time,\n  t.order_id AS mart_order_id\nFROM edw_snowflake.raw.orders s\nLEFT JOIN iceberg_prod.analytics.fact_orders t\n  ON s.order_id = t.order_id\nWHERE t.order_id IS NULL\n  AND s.updated_at BETWEEN TIMESTAMP '2026-10-01' AND TIMESTAMP '2026-10-06'\nLIMIT 100;",
        "notes": "Pinpoints exactly which order records were dropped due to narrow incremental filter"
      },
      {
        "id": "Q-2",
        "title": "Defect Blast Radius Aggregation by Country & Channel",
        "dialect": "Trino",
        "query": "SELECT \n  s.channel,\n  s.country_code,\n  COUNT(*) AS omitted_orders_count,\n  SUM(s.order_total_usd) AS omitted_revenue_usd\nFROM edw_snowflake.raw.orders s\nLEFT JOIN iceberg_prod.analytics.fact_orders t\n  ON s.order_id = t.order_id\nWHERE t.order_id IS NULL\n  AND s.updated_at >= CURRENT_DATE - INTERVAL '5' DAY\nGROUP BY s.channel, s.country_code\nORDER BY omitted_revenue_usd DESC;",
        "notes": "Quantifies financial blast radius and affected business channels for executive briefing"
      }
    ],
    "executiveSummary": "Structured CAPA root cause investigation measuring omitted late-arriving records and deploying permanent pipeline watermarking controls.",
    "businessObjective": "Eliminate silent record omissions in incremental data transformations and restore executive report accuracy.",
    "expectedResult": "0 dropped late-arriving orders across 5-day lookback window.",
    "actualResult": "CAPA mitigation verified: 14,200 orders backfilled; 0 discrepancies remaining.",
    "threshold": "0",
    "remediation": "Deploy updated dbt incremental logic with 3-day watermarking window, backfill missing partition range, and establish daily reconciliation alert."
  }
];

window.DQD_DEFAULT_VOCABULARY = {
  "teams": [
    "Data Engineering",
    "Analytics Engineering",
    "Risk Analytics",
    "Governance Tribe",
    "Finance BI"
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
