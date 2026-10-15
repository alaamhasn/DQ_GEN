/**
 * Data Quality Documenter - Portable Windows Edition
 * Public Application Settings & Default Configuration
 *
 * NOTE: Editing this file modifies the default settings when index.html is loaded.
 * Users can also switch active teams interactively via the navbar dropdown or in Settings,
 * or import a config.env file.
 */
window.DQD_CONFIG = {
  appName: "Data Workspace Documenter",

  // Active Team Profile: 'data_quality' | 'data_analysis' | 'data_engineering' | 'data_modelling'
  activeTeamProfile: "data_analysis",

  // User / Author Attribution & Sign-Off Details (can be null or string; if set, displayed at end of documents)
  username: null,
  useremail: null,
  userphone: null,

  // Profile-specific definitions for each team
  teamProfiles: {
    data_quality: {
      key: "data_quality",
      name: "Data Quality",
      label: "Data Quality Engineering",
      roleTitle: "Data Quality Engineer",
      editionTag: "Data Quality Edition",
      subtitle: "Quality Metrics, Assertions & SLA Governance",
      branding: {
        primaryColor: "#1F4E79",
        secondaryColor: "#4472C4",
        accentColor: "#00A6A6",
        backgroundColor: "#F5F7FA",
        textColor: "#1F2937",
        fontFamily: "Segoe UI, Arial, sans-serif",
        footerText: "Data Quality Documenter - Quality Validation & Compliance Specification"
      },
      documentTypes: [
        "Data Quality Validation Rules",
        "Data Quality Assessment",
        "Reconciliation Report",
        "Incident & RCA Investigation",
        "Test Execution Summary"
      ],
      subtypes: [
        {
          id: "Model Validation",
          name: "Model Validation",
          icon: "🧩",
          desc: "dbt models, transformation lineage, logic & dependencies"
        },
        {
          id: "Table Validation",
          name: "Table Validation",
          icon: "🗄️",
          desc: "Physical tables, catalogs, schemas, partitions & constraints"
        },
        {
          id: "Model and Table Validation",
          name: "Model & Table Validation",
          icon: "🔄",
          desc: "Combined validation linking model logic to physical storage tables"
        },
        {
          id: "Issue Investigation",
          name: "Issue Investigation",
          icon: "🔍",
          desc: "Root Cause Analysis (RCA), incident triage, anomaly CAPA"
        }
      ],
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
        "severity"
      ],
      suggestedInputs: [
        "Target dbt Model Name",
        "Trino Catalog / Database",
        "Physical Table / View Name",
        "Expected Row Count & Volume",
        "Completeness Threshold (%)",
        "Uniqueness Constraint / Grain",
        "SLA Delivery Deadline",
        "Pipeline Dependency / Airflow DAG",
        "Corrective & Preventive Action (CAPA)",
        "Severity Classification & Impact"
      ],
      profileAttributes: [
        { key: "targetDbtModel", label: "Target dbt Model Name & Materialization", placeholder: "e.g. fct_orders (Incremental Table on Iceberg)", type: "text" },
        { key: "catalogSchema", label: "Trino / Snowflake Catalog & Schema", placeholder: "e.g. iceberg_prod.analytics", type: "text" },
        { key: "physicalTable", label: "Physical Storage Table / View Name", placeholder: "e.g. prod_dwh.fact_daily_orders", type: "text" },
        { key: "expectedVolume", label: "Expected Row Count & Volume Range", placeholder: "e.g. ~45,000,000 rows (daily delta +180k to +240k)", type: "text" },
        { key: "completenessThreshold", label: "Completeness Threshold (%)", placeholder: "e.g. 99.9% non-null customer_id and transaction_timestamp", type: "text" },
        { key: "uniquenessGrain", label: "Uniqueness Constraint / Primary Key Grain", placeholder: "e.g. Composite unique (transaction_id, tenant_id)", type: "text" },
        { key: "slaDelivery", label: "SLA Delivery Deadline & Freshness", placeholder: "e.g. Validated daily by 05:00 UTC before morning BI sync", type: "text" },
        { key: "pipelineDag", label: "Upstream Pipeline Dependency / Airflow DAG", placeholder: "e.g. dag_etl_sales_ingest_v2", type: "text" },
        { key: "remediationCapa", label: "Corrective & Preventive Action (CAPA) Runbook", placeholder: "e.g. Halt downstream BI sync; execute quarantine_reconcile.sql", type: "textarea", rows: 2 },
        { key: "severityLevel", label: "Severity Classification & Business Impact", placeholder: "e.g. Tier-1 Critical (Financial Reporting & Tax Compliance)", type: "text" }
      ]
    },

    data_analysis: {
      key: "data_analysis",
      name: "Data Analysis",
      label: "Analytics & Business Intelligence",
      roleTitle: "Data Analyst / Analytics Engineer",
      editionTag: "Analytics Edition",
      subtitle: "Metrics Catalog, Cohorts & Analytical Specifications",
      branding: {
        primaryColor: "#1F4E79",
        secondaryColor: "#4472C4",
        accentColor: "#00A6A6",
        backgroundColor: "#F5F7FA",
        textColor: "#1F2937",
        fontFamily: "Segoe UI, Arial, sans-serif",
        footerText: "Data Analytics Specification - Internal Business Intelligence Document"
      },
      documentTypes: [
        "Analysis Specification & Brief",
        "Metric & KPI Definition",
        "Cohort & Funnel Study",
        "A/B Test Experimentation Brief",
        "Executive Insights Report"
      ],
      subtypes: [
        {
          id: "Metric Definition",
          name: "Metric & KPI Definition",
          icon: "📈",
          desc: "Official business metrics, formulas, grains & dimension cuts"
        },
        {
          id: "Ad-Hoc Analysis",
          name: "Ad-Hoc Analysis Brief",
          icon: "📊",
          desc: "Exploratory data analysis, hypotheses, methods & executive takeaways"
        },
        {
          id: "Cohort & Funnel",
          name: "Cohort & Funnel Study",
          icon: "👥",
          desc: "User journeys, conversion drop-offs, retention curves & cohorts"
        },
        {
          id: "Experimentation / AB",
          name: "A/B Test Evaluation",
          icon: "🧪",
          desc: "Hypothesis testing, control vs variant, sample size & significance"
        }
      ],
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
        "reviewer"
      ],
      suggestedInputs: [
        "Metric Calculation Formula",
        "Target Stakeholder & Decision Maker",
        "Time Horizon & Date Granularity",
        "Dimension Slices & Segmentations",
        "BI Dashboard URL / Report ID",
        "Statistical Significance & P-Value",
        "Business Action / Recommendation",
        "Baseline Benchmark & Variance",
        "Data Freshness SLA & Latency",
        "Excluded Outlier Rules",
        "Cohort Inception Criteria & Window",
        "Funnel Milestone Steps & Sequence",
        "Primary Visualization & Chart Type",
        "Experiment Sample Allocation & Traffic Split",
        "North Star Metric & OKR Alignment",
        "Confidence Interval & Margin of Error",
        "Drilldown Dimensions & Hierarchy",
        "Data Biases, Caveats & Assumptions"
      ],
      profileAttributes: [
        { key: "metricFormula", label: "Metric Calculation Formula & Aggregation", placeholder: "e.g. SUM(net_revenue) / NULLIF(COUNT(DISTINCT active_users), 0)", type: "textarea", rows: 2 },
        { key: "targetStakeholder", label: "Target Stakeholder & Decision Owner", placeholder: "e.g. VP of Product, Chief Marketing Officer (CMO), Growth Tribe Lead", type: "text" },
        { key: "timeHorizon", label: "Time Horizon & Date Granularity", placeholder: "e.g. Trailing 12 Months (T12M), Daily / Weekly / Monthly Grain", type: "text" },
        { key: "dimensionSlices", label: "Dimension Slices & Segmentations", placeholder: "e.g. Country, Device Category, Plan Tier, Acquisition Channel", type: "text" },
        { key: "biDashboardUrl", label: "BI Dashboard URL / Report Deep-Link", placeholder: "e.g. https://bi.corp/views/executive_kpis/retention_deepdive", type: "text" },
        { key: "statisticalSignificance", label: "Statistical Significance & P-Value", placeholder: "e.g. p < 0.01 (99% Confidence Interval: [+2.4%, +5.1%])", type: "text" },
        { key: "businessAction", label: "Key Business Action & Recommendation", placeholder: "e.g. Allocate +15% ad-spend to Tier-1 organic mobile cohorts", type: "textarea", rows: 2 },
        { key: "baselineComparison", label: "Baseline Benchmark & Historical Variance", placeholder: "e.g. +14.2% MoM vs Q3 baseline (+3.1% over forecast)", type: "text" },
        { key: "dataFreshness", label: "Data Freshness SLA & Refresh Frequency", placeholder: "e.g. Daily refresh by 07:00 UTC (Max allowed data lag: 4 hours)", type: "text" },
        { key: "outlierRules", label: "Outlier Filtering & Exclusion Criteria", placeholder: "e.g. Filter internal QA accounts and single transactions > $50,000", type: "text" },
        { key: "cohortDefinition", label: "Cohort Inception Criteria & Window", placeholder: "e.g. Users with first verified purchase within 7 days of signup event", type: "text" },
        { key: "funnelSteps", label: "Funnel Milestone Steps & Sequence", placeholder: "e.g. Landing -> Signup -> Workspace Created -> Paid Checkout", type: "text" },
        { key: "visualChartType", label: "Primary Visualization & Chart Type", placeholder: "e.g. Stacked Cohort Bar, Funnel Sankey, Scatter Plot with 95% Confidence Band", type: "text" },
        { key: "experimentSampleAllocation", label: "Experiment Sample Allocation & Traffic Split", placeholder: "e.g. 50/50 Control vs Variant B (Minimum 25,000 unique users per arm)", type: "text" },
        { key: "businessObjectiveKpi", label: "North Star Metric & Strategic OKR Alignment", placeholder: "e.g. Increase 30-Day Subscriber Retention from 42% to 48% (Q4 Company OKR 2.1)", type: "text" },
        { key: "confidenceIntervalRange", label: "Confidence Interval & Margin of Error", placeholder: "e.g. 95% CI: [+1.8%, +3.2%] with Margin of Error ±0.35%", type: "text" },
        { key: "drilldownDimensions", label: "Drilldown Hierarchy & Sub-segment Filters", placeholder: "e.g. Region > Country > State > City, Platform > App Version > Device Tier", type: "text" },
        { key: "dataQualityCaveats", label: "Data Biases, Caveats & Analytical Assumptions", placeholder: "e.g. Excludes internal test transactions; iOS 14.5+ ATT opt-out modeled with heuristic", type: "textarea", rows: 2 }
      ]
    },

    data_engineering: {
      key: "data_engineering",
      name: "Data Engineering",
      label: "Data Engineering & Pipelines",
      roleTitle: "Data Engineer",
      editionTag: "DataOps Edition",
      subtitle: "Pipelines, CDC Feeds & Ingestion Architecture",
      branding: {
        primaryColor: "#1F4E79",
        secondaryColor: "#4472C4",
        accentColor: "#00A6A6",
        backgroundColor: "#F5F7FA",
        textColor: "#1F2937",
        fontFamily: "Segoe UI, Arial, sans-serif",
        footerText: "Data Engineering Specification - Pipeline Architecture & Runbook"
      },
      documentTypes: [
        "Pipeline & DAG Specification",
        "Data Ingestion / CDC Feed Spec",
        "Lakehouse Ingestion Runbook",
        "Stream Processing Job Spec",
        "Disaster Recovery & Backfill Plan"
      ],
      subtypes: [
        {
          id: "Batch Pipeline",
          name: "Batch ETL / ELT Pipeline",
          icon: "⚙️",
          desc: "Scheduled batch transformations, SQL models & orchestration DAGs"
        },
        {
          id: "CDC Ingestion",
          name: "CDC & Ingestion Feed",
          icon: "⚡",
          desc: "Continuous change data capture, Kafka connectors & landing stages"
        },
        {
          id: "Lakehouse Storage",
          name: "Lakehouse Table Architecture",
          icon: "🧊",
          desc: "Iceberg / Delta tables, partition evolution, compaction & retention"
        },
        {
          id: "Backfill & Recovery",
          name: "Backfill & Disaster Recovery",
          icon: "🛠️",
          desc: "Idempotency runs, historical backfill procedures & error mitigation"
        }
      ],
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
        "reviewer"
      ],
      suggestedInputs: [
        "Airflow DAG / Task ID",
        "Compute Engine (Spark/dbt/Trino)",
        "Schedule Trigger (Cron / Event)",
        "Delivery SLA & Max Latency",
        "Idempotency & Deduplication Strategy",
        "Dead-Letter Queue (DLQ) Path",
        "Cluster Worker Sizing (CPU, RAM)",
        "Alerting & PagerDuty Escalation",
        "Data Contract & Schema Mode",
        "CDC Source Connector & Topic",
        "Backfill Runbook & Partition Range",
        "Storage Format & Engine (Iceberg/Delta)",
        "Partitioning Scheme & Clustering Keys",
        "Streaming Checkpoint & State Store Location",
        "Failure Retry Limit & Backoff Strategy",
        "Cluster Resource Pool / Queue / Namespace",
        "Data Encryption & KMS Key Policy",
        "Lineage Sources & Downstream Consumers"
      ],
      profileAttributes: [
        { key: "dagTaskId", label: "Orchestration DAG ID & Task Identifier", placeholder: "e.g. dag_orders_silver_hourly.task_transform_iceberg", type: "text" },
        { key: "computeEngine", label: "Compute Engine & Execution Framework", placeholder: "e.g. Apache Spark 3.5 on EMR Serverless / Trino / dbt-core", type: "text" },
        { key: "scheduleCron", label: "Schedule Trigger & Cron Cadence", placeholder: "e.g. 0 */2 * * * (Every 2 hours UTC) / Event-driven SQS sensor", type: "text" },
        { key: "deliverySla", label: "Delivery SLA & Maximum Runtime", placeholder: "e.g. SLA 06:00 UTC (Max job duration: 45 minutes)", type: "text" },
        { key: "idempotencyStrategy", label: "Idempotency & Deduplication Strategy", placeholder: "e.g. MERGE INTO on (order_id, event_date) with write-audit-publish", type: "text" },
        { key: "deadLetterQueue", label: "Dead-Letter Queue (DLQ) & Quarantine Path", placeholder: "e.g. s3://prod-lakehouse-dlq/orders_ingestion/unparseable_json/", type: "text" },
        { key: "workerSizing", label: "Cluster Worker Sizing (CPU, RAM, Executors)", placeholder: "e.g. 8x c6g.2xlarge workers (64 vCPU, 128GB RAM total)", type: "text" },
        { key: "alertingChannel", label: "Alerting Channel & PagerDuty Escalation", placeholder: "e.g. Slack: #dataops-alerts, PagerDuty: Service-DataLake-Sev1", type: "text" },
        { key: "dataContract", label: "Data Contract & Schema Compatibility Mode", placeholder: "e.g. Schema v2.3 Strict (Forward & Backward compatible Protobuf)", type: "text" },
        { key: "cdcConnector", label: "CDC Source Connector & Streaming Topic", placeholder: "e.g. Debezium Postgres CDC -> Kafka topic 'cdc.orders.v1'", type: "text" },
        { key: "backfillRunbook", label: "Historical Backfill & Recovery Procedure", placeholder: "e.g. Run airflow backfill -s YYYY-MM-DD -e YYYY-MM-DD --reset-dagruns", type: "textarea", rows: 2 },
        { key: "storageFormat", label: "Storage Format & Table Engine", placeholder: "e.g. Apache Iceberg v2 with Z-Order clustering on customer_id", type: "text" },
        { key: "partitioningClustering", label: "Partitioning Scheme & Clustering / Sorting Keys", placeholder: "e.g. PARTITION BY date(event_timestamp), CLUSTER BY (tenant_id, event_category)", type: "text" },
        { key: "checkpointLocation", label: "Streaming Checkpoint & State Store Location", placeholder: "e.g. s3://prod-spark-checkpoints/lakehouse/orders_silver_v2/checkpoint/", type: "text" },
        { key: "maxRetriesBackoff", label: "Failure Retry Limit & Exponential Backoff Strategy", placeholder: "e.g. Max 3 retries, initial delay 30s, multiplier 2.0x, max wait 10m", type: "text" },
        { key: "resourceQueuePool", label: "Cluster Resource Pool / Queue / Namespace", placeholder: "e.g. yarn-prod-critical-pool (Guaranteed 60% cluster capacity)", type: "text" },
        { key: "dataEncryptionKms", label: "At-Rest & In-Transit Encryption / KMS Key Policy", placeholder: "e.g. TLS 1.3 in-transit; AWS KMS SSE-KMS arn:aws:kms:us-east-1:123456:key/dwh", type: "text" },
        { key: "lineageUpstreamDownstream", label: "Lineage Sources & Downstream Consumer Systems", placeholder: "e.g. Upstream: Kafka 'cdc.orders.v1' -> Downstream: Snowflake fct_sales, Trino OLAP", type: "textarea", rows: 2 }
      ]
    },

    data_modelling: {
      key: "data_modelling",
      name: "Data Modelling",
      label: "Data Architecture & Modelling",
      roleTitle: "Data Modeler / Architect",
      editionTag: "Modelling Edition",
      subtitle: "Dimensional Models, Data Vault & Schemas",
      branding: {
        primaryColor: "#1F4E79",
        secondaryColor: "#4472C4",
        accentColor: "#00A6A6",
        backgroundColor: "#F5F7FA",
        textColor: "#1F2937",
        fontFamily: "Segoe UI, Arial, sans-serif",
        footerText: "Enterprise Data Modelling Specification - Schema Architecture Document"
      },
      documentTypes: [
        "Dimensional Model Specification",
        "Logical & Conceptual Model Spec",
        "Entity-Relationship & Cardinality Spec",
        "Data Vault 2.0 (Hub/Link/Sat) Spec",
        "Enterprise Bus Matrix Specification"
      ],
      subtypes: [
        {
          id: "Dimensional Model",
          name: "Dimensional Star Schema",
          icon: "⭐",
          desc: "Kimball dimensional facts, dimensions, grains & conformed hierarchies"
        },
        {
          id: "Data Vault",
          name: "Data Vault 2.0 Architecture",
          icon: "🏛️",
          desc: "Hubs (Business Keys), Links (Transactions) & Satellites (Context)"
        },
        {
          id: "Logical ERD",
          name: "Logical & Relational (3NF)",
          icon: "📐",
          desc: "Normalized entities, primary/foreign keys, cardinality & domains"
        },
        {
          id: "Semantic Layer",
          name: "Semantic Layer & Bus Matrix",
          icon: "🌐",
          desc: "Cross-functional metric layers, business definitions & conformed dimensions"
        }
      ],
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
        "reviewer"
      ],
      suggestedInputs: [
        "Model Type (Star/Snowflake/Vault/3NF)",
        "Grain & Natural Business Keys",
        "Surrogate Key Strategy (Hash/UUID/Sequence)",
        "Slowly Changing Dimension (SCD Type 1/2/3/6)",
        "Fact Type (Transactional/Snapshot/Factless)",
        "Cardinality & Relationship (1:1, 1:N, M:N)",
        "Conformed Dimensions & Bus Matrix Placement",
        "Semantic Measures & Aggregation Rules",
        "Partitioning, Compaction & Archival Retention",
        "Normalization Level (3NF / BCNF / Denormalized)",
        "Upstream Entities & Lineage Catalogs",
        "Foreign Key Constraints & Orphan Handling",
        "Enterprise Bus Matrix Business Process Area",
        "Degenerate Dimensions (Keys without dimension tables)",
        "Junk Dimension Flags & Indicator Codes",
        "Role-Playing Dimension Aliases & Dates",
        "Null & Missing Foreign Key Handling",
        "Semantic Layer Certified Metrics & Grains"
      ],
      profileAttributes: [
        { key: "modelType", label: "Architecture Paradigm & Model Type", placeholder: "e.g. Kimball Dimensional Star Schema / Data Vault 2.0 / Relational 3NF", type: "text" },
        { key: "grain", label: "Primary Grain & Natural Business Keys", placeholder: "e.g. One row per transaction order line item (order_id, item_seq)", type: "text" },
        { key: "surrogateKeyStrategy", label: "Surrogate Key Strategy & Hash Formula", placeholder: "e.g. MD5(tenant_id || '-' || order_id || '-' || item_seq) AS line_item_sk", type: "text" },
        { key: "scdType", label: "Slowly Changing Dimension (SCD) Strategy", placeholder: "e.g. SCD Type 2 (dbt snapshot with valid_from, valid_to, is_current)", type: "text" },
        { key: "factType", label: "Fact / Entity Classification", placeholder: "e.g. Transactional Fact / Periodic Snapshot / Accumulating / Hub-Satellite", type: "text" },
        { key: "cardinality", label: "Relationship & Cardinality Constraints", placeholder: "e.g. 1:N (One Dim_Customer to Many Fact_Sales orders)", type: "text" },
        { key: "conformedDimensions", label: "Conformed Dimensions & Bus Matrix Placement", placeholder: "e.g. dim_date, dim_customer, dim_product, dim_store, dim_geography", type: "text" },
        { key: "semanticMeasures", label: "Semantic Measures & Aggregation Rules", placeholder: "e.g. Gross Revenue (additive), Inventory Balance (semi-additive)", type: "textarea", rows: 2 },
        { key: "retentionPolicy", label: "Partitioning, Compaction & Archival Retention", placeholder: "e.g. Partition by month(order_date); 7-year retention in Iceberg cold storage", type: "text" },
        { key: "normalizationLevel", label: "Normalization Level & Storage Optimization", placeholder: "e.g. Denormalized Analytical Star Schema (Optimized for Trino OLAP)", type: "text" },
        { key: "upstreamSources", label: "Upstream Raw Entities & Lineage Catalogs", placeholder: "e.g. raw_postgres.orders, raw_stripe.charges, crm_salesforce.accounts", type: "text" },
        { key: "referentialIntegrity", label: "Foreign Key Constraints & Orphan Handling", placeholder: "e.g. Unknown member row (-1) inserted for early arriving facts", type: "text" },
        { key: "enterpriseBusMatrixProcess", label: "Enterprise Bus Matrix Business Process Area", placeholder: "e.g. Core Commerce - Order Placement & Fulfillment Lifecycle", type: "text" },
        { key: "degenerateDimensions", label: "Degenerate Dimensions (Keys without dimension tables)", placeholder: "e.g. order_number, invoice_reference, tracking_number, transaction_uuid", type: "text" },
        { key: "junkDimensionAttributes", label: "Junk Dimension Flags & Low-Cardinality Indicators", placeholder: "e.g. dim_order_flags (is_gift_flag, is_tax_exempt_flag, payment_channel_code)", type: "text" },
        { key: "rolePlayingDimensions", label: "Role-Playing Dimension Aliases & Date References", placeholder: "e.g. order_date_key, ship_date_key, delivery_date_key -> dim_date.date_key", type: "text" },
        { key: "nullHandlingPolicy", label: "Null & Missing Foreign Key Handling Standard", placeholder: "e.g. Substitute NULL with -1 ('Unknown / Unspecified') or -2 ('Not Applicable')", type: "text" },
        { key: "semanticLayerMetrics", label: "Semantic Layer Certified Metrics & Calculation Grains", placeholder: "e.g. Gross Merchandise Value (GMV), Net Take Rate, Return Rate %", type: "textarea", rows: 2 }
      ]
    }
  },

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
