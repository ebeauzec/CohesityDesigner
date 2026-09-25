/**
 * Cohesity Architecture Wizard - Data Definitions
 * Contains product specifications, node types, workload presets, and integration configurations.
 */

const COHESITY_DATA = {
  // Context note for SE proposals: Cohesity completed its combination with Veritas'
  // enterprise data protection business (including NetBackup) on Dec 10, 2024, becoming
  // the world's largest data protection software provider by market share. This wizard
  // sizes the native Cohesity Data Cloud / DataProtect platform; legacy Veritas NetBackup
  // estates follow a separate migration/coexistence path and are out of scope here.
  companyContext: "Cohesity completed its combination with Veritas' enterprise data protection business (including NetBackup) in December 2024, forming the world's largest data protection software provider by market share. This proposal is scoped to the native Cohesity Data Cloud / DataProtect platform; legacy Veritas NetBackup estates follow a separate migration or coexistence path — engage your Cohesity account team for combined-portfolio scenarios.",

  products: [
    {
      id: "dataprotect",
      name: "Cohesity DataProtect",
      tagline: "Unified Backup and Recovery",
      description: "A high-performance, software-defined backup and recovery solution. Consolidates workloads across on-premises, cloud, and edge. Offers instant mass restore, immutable snapshots, and global search.",
      features: [
        "Instant Mass Restore at scale (hundreds of VMs restored simultaneously)",
        "Global variable-length deduplication and compression",
        "WORM (Write Once, Read Many) snapshot immutability via DataLock",
        "Agentless protection for hypervisors, databases, and physical systems"
      ],
      licensing: "Per TB Front-End Capacity or Per Node Subscription"
    },
    {
      id: "alta",
      name: "Cohesity Alta",
      tagline: "Cloud-Native SaaS Data Management Platform",
      description: "Cohesity's cloud-native, consumption-based platform delivering backup, cyber resilience, and data management as a service. Serves as the unified SaaS control plane spanning both native Cohesity and legacy Veritas NetBackup-protected estates following the December 2024 Cohesity-Veritas combination.",
      features: [
        "Infrastructure-free, consumption-based SaaS delivery (no on-prem node management)",
        "Unified control plane (Helios/Alta) spanning hybrid on-prem and cloud-native workloads",
        "Alta SaaS Protection for Microsoft 365, Salesforce, and cloud workloads",
        "Common policy and reporting layer across native Cohesity and NetBackup-protected estates"
      ],
      licensing: "Consumption-Based SaaS Subscription (Per TB or Per Workload)"
    },
    {
      id: "fortknox",
      name: "Cohesity FortKnox",
      tagline: "SaaS-Based Cyber Vaulting",
      description: "An isolated, virtually air-gapped cyber vault in the cloud. Protects critical data from ransomware by offering a secure, immutable storage tier that is completely isolated from production networks.",
      features: [
        "Virtually air-gapped storage on Cohesity-managed cloud (AWS/Azure)",
        "Multi-party authorization (MPA) for recovery and configuration actions",
        "Outbound-only connection architecture (no ingress connections allowed)",
        "Assisted recovery to original location or isolated cleanroom"
      ],
      licensing: "Per Sized Vaulted TB (includes cloud storage and egress fees)"
    },
    {
      id: "datahawk",
      name: "Cohesity DataHawk",
      tagline: "AI-Powered Data Security and Scanning",
      description: "Combines ML-driven threat detection, cyber vault scanning, and automated data classification. Helps detect active attacks, identifies sensitive data, and ensures malware-free recovery.",
      features: [
        "Continuous machine learning threat detection on backup streams",
        "Integrated antivirus and Yara-rule scanning for malware signatures",
        "Data classification for automated sensitive data discovery (PII, PCI, HIPAA)",
        "Clean recovery dashboard showing compromised vs. clean snapshots"
      ],
      licensing: "Per TB Protected Capacity Subscription"
    },
    {
      id: "smartfiles",
      name: "Cohesity SmartFiles",
      tagline: "Scale-Out File and Object Storage",
      description: "A software-defined, scale-out file and object solution that consolidates unstructured data. Ideal for file shares, application storage, and cold-data tiering.",
      features: [
        "Multiprotocol access (NFS, SMB, S3) on a single global namespace",
        "Auto-tiering of cold data from primary NAS (NetApp, Isilon, etc.)",
        "Integrated security scanning and search metadata indexing",
        "High storage efficiency with global deduplication"
      ],
      licensing: "Per Usable TB Subscription"
    },
    {
      id: "sitecontinuity",
      name: "Cohesity SiteContinuity",
      tagline: "Automated Disaster Recovery Orchestration",
      description: "Orchestrates application disaster recovery failover, failback, and non-disruptive testing. Integrates backup, replication, and orchestration into a single control plane.",
      features: [
        "Automated multi-tier application failover and failback orchestration",
        "Non-disruptive sandbox testing with detailed compliance audit reporting",
        "Near-zero RPOs with Continuous Data Protection (CDP) logging",
        "Flexible failover targets: physical nodes, cloud instances, or SaaS"
      ],
      licensing: "Per Protected VM / Application Instance"
    },
    {
      id: "gaia",
      name: "Cohesity Gaia",
      tagline: "Conversational AI on Enterprise Backup Data",
      description: "An AI-powered search and retrieval assistant (RAG) that operates over secondary data. Allows users to query indexing files, manuals, and databases inside backups in a conversational format.",
      features: [
        "Retrieval-Augmented Generation (RAG) using backup indexes",
        "Secure AI query pipeline keeping all LLM interactions within the corporate firewall",
        "Zero indexing overhead on production systems",
        "Advanced context grounding to prevent AI hallucinations",
        "Gaia Catalog: secure gateway exposing governed backup data to agentic AI/NVIDIA AI Enterprise pipelines without data duplication"
      ],
      licensing: "Per Sized Indexed TB Subscription"
    }
  ],

  nodeTypes: {
    // Usable capacities are SE planning estimates (~65-70% of raw, after erasure coding
    // overhead) - Cohesity does not publish official raw-to-usable ratios. Each family ships
    // multiple SKUs at different capacity points; one representative mid-tier SKU is used
    // per family below so the wizard can size against a single number. Always confirm exact
    // SKU and usable capacity with the Cohesity sizing tool / SE team before quoting.
    physical: [
      {
        id: "cx8000",
        model: "CX8000 Series (CX8305)",
        tier: "All-Flash Performance",
        capacityRawTB: 46.08,
        capacityUsableTB: 32,
        media: "All-NVMe (6 NVMe drives/node)",
        bestFor: "Fastest recovery SLAs, dev/test spin-up, database-heavy environments (SQL, Oracle, SAP HANA), demanding app ecosystems",
        minNodes: 4, // sold in 4-node blocks
        skuRange: "CX8205 (23.04TB) / CX8305 (46.08TB) / CX8405 (92.16TB) raw per node"
      },
      {
        id: "c6200",
        model: "C6200 Series (C6216S)",
        tier: "Hybrid Standard",
        capacityRawTB: 204.8,
        capacityUsableTB: 133,
        media: "HDD capacity tier + PCIe NVMe flash cache",
        bestFor: "Standard enterprise backups, backup target consolidation, file and object use cases",
        minNodes: 3,
        skuRange: "C6208S (96TB) / C6216S (192TB) / C6224 (288TB) raw HDD per node, plus 6.4-12.8TB PCIe flash cache"
      },
      {
        id: "c5200",
        model: "C5200 Series (C5224)",
        tier: "Entry-Level Hybrid",
        capacityRawTB: 75.2,
        capacityUsableTB: 49,
        media: "HDD capacity tier + PCIe flash cache",
        bestFor: "Smaller enterprise sites, ROBO/edge consolidation, test/dev, budget-constrained deployments",
        minNodes: 3,
        skuRange: "C5204 through C5224 (12-72TB raw HDD per node), plus 1.6-3.2TB PCIe flash cache"
      }
    ],
    virtual: [
      {
        model: "Virtual Edition (ROBO)",
        tier: "Virtual Appliance",
        capacityRawTB: 16,
        capacityUsableTB: 10,
        media: "Software-defined",
        bestFor: "Remote offices, branch offices, edge locations running on ESXi or Hyper-V",
        minNodes: 1
      }
    ],
    cloud: [
      {
        model: "Cloud Edition (IaaS)",
        tier: "Self-Managed Cloud Nodes",
        capacityRawTB: 64,
        capacityUsableTB: 40,
        media: "Cloud Volumes (EBS, Managed Disks)",
        bestFor: "Protecting cloud-native VMs (AWS EC2, Azure VMs, GCP Compute), replicating from on-prem",
        minNodes: 3
      },
      {
        model: "Cohesity Cloud Services (SaaS)",
        tier: "Fully-Managed SaaS",
        capacityRawTB: 0, // Paid per usable TB on demand
        capacityUsableTB: 1,
        media: "SaaS-Managed Cloud Storage",
        bestFor: "SaaS workloads (Microsoft 365, Salesforce, JIRA), lightweight cloud backup without infrastructure management",
        minNodes: 0
      }
    ]
  },

  workloadPresets: {
    vm: {
      name: "Virtual Machines (VMware/Hyper-V)",
      dedupeRatio: 2.5,
      dailyChangeRate: 3, // %
      annualGrowth: 10, // %
      retentionDays: 30,
      icon: "dns"
    },
    database: {
      name: "Enterprise Databases (Oracle/SQL/SAPHANA)",
      dedupeRatio: 3.0,
      dailyChangeRate: 5, // %
      annualGrowth: 15, // %
      retentionDays: 14,
      icon: "storage"
    },
    files: {
      name: "Unstructured Files/Object (NAS/SmartFiles)",
      dedupeRatio: 1.4,
      dailyChangeRate: 1, // %
      annualGrowth: 20, // %
      retentionDays: 90,
      icon: "folder"
    },
    saas: {
      name: "SaaS (Microsoft 365/Salesforce)",
      dedupeRatio: 2.0,
      dailyChangeRate: 1, // %
      annualGrowth: 12, // %
      retentionDays: 365,
      icon: "cloud_done"
    },
    k8s: {
      name: "Kubernetes (Container Volumes)",
      dedupeRatio: 2.0,
      dailyChangeRate: 4, // %
      annualGrowth: 15, // %
      retentionDays: 30,
      icon: "grid_view"
    }
  },

  complianceFrameworks: {
    gdpr: {
      name: "GDPR Compliance",
      links: [
        { text: "EUR-Lex Official GDPR Journal (EU 2016/679)", url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj" },
        { text: "Cohesity Data Protection & GDPR Compliance Solution", url: "https://www.cohesity.com/solutions/compliance/gdpr/" }
      ],
      requirements: [
        "Data Encryption at Rest & In Transit",
        "WORM Storage (DataLock) to prevent alteration of compliance records",
        "Cohesity DataHawk sensitive data scanning to locate PII (Right to be Forgotten)",
        "Zero Trust multi-party authorization to restrict privileged users"
      ],
      details: [
        { part: "Article 32 - Security of Processing", how: "Satisfied via AES-256 data encryption at rest and in transit, securing backup streams across all storage pools." },
        { part: "Article 17 - Right to Erasure ('Right to be Forgotten')", how: "Satisfied via Cohesity DataHawk ML-driven sensitive data classification, enabling search and indexation of PII across backup silos without database restores." },
        { part: "Article 32(1)(c) - Availability and Resilience", how: "Satisfied via DataLock WORM snapshot immutability and multi-party quorum gatekeepers (MPA), protecting snapshots from unauthorized deletion or ransomware alteration." }
      ]
    },
    hipaa: {
      name: "HIPAA Security Rule",
      links: [
        { text: "HHS Health Information Privacy Security Rule Guideline", url: "https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html" },
        { text: "Cohesity Healthcare Compliance & HIPAA Solution Brief", url: "https://www.cohesity.com/solutions/industry/healthcare/" }
      ],
      requirements: [
        "Unique user access credentials and strict audit logging of restores",
        "Automated encryption key rotation (KMS integration)",
        "Cohesity DataHawk threat intelligence to prevent malicious data exposure",
        "Virtually air-gapped off-site backups (FortKnox) for remote disaster recovery"
      ],
      details: [
        { part: "§ 164.312(a)(2)(iv) - Encryption & Decryption", how: "Satisfied via AES-256 data encryption with integration to external Key Management Systems (KMS) for key rotation." },
        { part: "§ 164.312(b) - Audit Controls", how: "Satisfied via Helios immutable, non-repudiable audit logging tracking all read/write/restore actions on health records." },
        { part: "§ 164.312(c)(1) - Data Integrity", how: "Satisfied via DataHawk behavioral anomaly analysis, flagging ransomware encryption indicators (entropy spikes) inside ePHI files." },
        { part: "§ 164.308(a)(7)(ii)(A) - Data Backup Plan", how: "Satisfied via offsite cyber vaulting (Cohesity FortKnox) providing a virtually air-gapped, read-only copy of electronic PHI in the cloud." }
      ]
    },
    pcidss: {
      name: "PCI-DSS v4.0 Requirements",
      links: [
        { text: "PCI Security Standards Council Portal", url: "https://www.pcisecuritystandards.org/" },
        { text: "Cohesity Financial Services Security Compliance Guide", url: "https://www.cohesity.com/solutions/compliance/" }
      ],
      requirements: [
        "Encrypted backup vaults restricting cardholder data environment",
        "Quorum-based Multi-Party Authorization (MPA) for target deletion",
        "Real-time threat scanning for cardholder databases inside snapshots",
        "Continuous compliance scanning and configuration validation audits"
      ],
      details: [
        { part: "Requirement 3 - Protect Stored Account Data", how: "Satisfied via full disk and storage pool AES-256 encryption, preventing raw drive extraction from cardholder data environments (CDE)." },
        { part: "Requirement 10 - Log & Monitor Access", how: "Satisfied via centralized audit logging in Helios, tracking all administrative events and restoring of payment databases." },
        { part: "Requirement 11 - Threat Diagnostics", how: "Satisfied via DataHawk ML signature and threat scanning, detecting Trojan or malware scripts inside card processing backups." },
        { part: "Requirement 12 - Quorum & Governance", how: "Satisfied via Multi-Party Authorization (MPA) requiring secondary validation before deleting card database backups." }
      ]
    },
    nis2: {
      name: "NIS2 Directives (Cyber Resilience)",
      links: [
        { text: "EU Official NIS2 Directive (EU 2022/2555) Text", url: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj" },
        { text: "Cohesity NIS2 Compliance Strategy Solution", url: "https://www.cohesity.com/solutions/compliance/nis2/" }
      ],
      requirements: [
        "Proactive threat detection & file behavior analytics (DataHawk)",
        "Automated recovery playbooks and DR testing sandbox (SiteContinuity)",
        "Isolated immutable cyber vaulting (FortKnox) to guarantee business continuity",
        "Cleanroom recovery testing environment (malware scanning before restore)"
      ],
      details: [
        { part: "Article 21 - Incident Handling & Diagnostics", how: "Satisfied via DataHawk real-time ransomware diagnostics, analyzing entropy rate anomalies in file streams." },
        { part: "Article 21(2) - Business Continuity", how: "Satisfied via SiteContinuity DR orchestration, coordinating multi-site failovers and sandbox disaster testing drills." },
        { part: "Article 21(2)(c) - Cyber Resilience", how: "Satisfied via FortKnox air-gapped SaaS cyber vaulting, guaranteeing an unalterable storage tier outside the primary network domain." }
      ]
    },
    dora: {
      name: "DORA Compliance",
      links: [
        { text: "EU Official DORA Regulation (EU 2022/2554) Text", url: "https://eur-lex.europa.eu/eli/reg/2022/2554/oj" },
        { text: "Cohesity Digital Operational Resilience Act (DORA) Solutions", url: "https://www.cohesity.com/solutions/compliance/dora/" }
      ],
      requirements: [
        "SiteContinuity DR orchestration for automated digital operational resilience testing",
        "Continuous Data Protection (CDP) journaling for near-zero data loss SLAs",
        "Isolated FortKnox SaaS vault to satisfy third-party data recovery isolation rules",
        "Semi-annual non-disruptive DR failover walkthrough audit logs"
      ],
      details: [
        { part: "Article 11 - Digital Resilience Testing", how: "Satisfied via SiteContinuity automation scripts, performing non-disruptive sandbox recovery testing drills and outputting audit logs." },
        { part: "Article 12 - Backup Policy & Recovery SLAs", how: "Satisfied via Continuous Data Protection (CDP) journaling, guaranteeing near-zero RPOs for high-frequency transactional data streams." },
        { part: "Article 26 - Third-Party Risk Control", how: "Satisfied via offloading secondary protection copies to the isolated FortKnox SaaS cloud, ensuring backup availability if the primary cloud provider crashes." }
      ]
    },
    fedramp: {
      name: "FedRAMP Hardening",
      links: [
        { text: "FedRAMP Official Marketplace & Governance Portal", url: "https://www.fedramp.gov/" },
        { text: "Cohesity Federal Government Data Protection Trust", url: "https://www.cohesity.com/solutions/industry/government/" }
      ],
      requirements: [
        "FIPS 140-3 validated data-at-rest encryption using external KMS key chains",
        "Cohesity FortKnox GovCloud vault storage for secure, air-gapped federal backups",
        "Multi-Party Authorization (MPA) quorum gatekeepers on all administrative changes",
        "Continuous DataHawk ML scanning for malware and indicators of compromise (IOCs)"
      ],
      details: [
        { part: "SC-28 - Protection of Information at Rest", how: "Satisfied via FIPS 140-3 validated encryption modules coupled with customer-managed cryptographic key chains (KMS). Note: FIPS 140-2 module validations moved to NIST's Historical list on Sept 21, 2026 — confirm any referenced module carries an Active FIPS 140-3 certificate for new federal procurements." },
        { part: "CP-9 - Information System Backup (GovCloud)", how: "Satisfied via FortKnox AWS GovCloud cloud storage, creating an isolated, air-gapped backup copy." },
        { part: "AC-3 - Access Control (Quorum Approval)", how: "Satisfied via Multi-Party Authorization (MPA), enforcing a multi-signature gatekeeper rule on federal records deletion." },
        { part: "Current Authorization Status", how: "Cohesity Cloud Services for Government holds FedRAMP Moderate Authorization (since May 2024). FedRAMP High authorization has not been publicly announced as of this proposal — verify current status on the FedRAMP Marketplace before committing to high-impact federal engagements." }
      ]
    },
    soc2: {
      name: "SOC 2 Type II Auditing",
      links: [
        { text: "AICPA Trust Services Criteria (SOC 2 Guide)", url: "https://www.aicpa-cima.com/resources/toolkit/soc-suite-of-services" },
        { text: "Cohesity Trust Center & Security Compliance", url: "https://www.cohesity.com/trust-center/" }
      ],
      requirements: [
        "Helios control plane Multi-Factor Authentication (MFA) enforcement",
        "Encrypted, immutable audit logs tracking all recoveries and administrative acts",
        "Immutable WORM DataLock configurations on backup storage pools",
        "Automated vulnerability and threat signature scanning via DataHawk"
      ],
      details: [
        { part: "CC6.1 - Access Control and Authentication", how: "Satisfied via Helios control plane Multi-Factor Authentication (MFA) enforcement across all administrator login pipelines." },
        { part: "CC6.5 - Audit and Log Integrity", how: "Satisfied via write-once, tamper-proof system audit logs tracking all recoveries and settings modifications." },
        { part: "CC6.3 - Data Transmission and Immutability", how: "Satisfied via DataLock WORM snapshot enforcement on local backup pools, preventing unauthorized deletion during retention SLAs." }
      ]
    },
    ccpa: {
      name: "CCPA / CPRA Privacy",
      links: [
        { text: "California Privacy Protection Agency (CPPA) CCPA Rule", url: "https://cppa.ca.gov/" },
        { text: "Cohesity Privacy & Regulatory Governance Portal", url: "https://www.cohesity.com/solutions/compliance/" }
      ],
      requirements: [
        "Cohesity DataHawk data classification queries to map California consumer PI",
        "Automated encryption for data in transit and storage tiers",
        "Quorum-based Multi-Party approvals (MPA) protecting backups from unauthorized wipeout",
        "Telemetry and system status logging to support compliance readiness audits"
      ],
      details: [
        { part: "Cal. Civ. Code § 1798.105 - Right to Delete", how: "Satisfied via DataHawk automated classification scanning, locating sensitive California consumer records (SSN, credit card, drivers license) inside historical backups." },
        { part: "Cal. Civ. Code § 1798.100 - General Duty of Security", how: "Satisfied via multi-party quorum approvals (MPA) preventing malicious deletion of databases containing private consumer statistics." }
      ]
    }
  },

  integrationSnippets: {
    splunk: {
      title: "SIEM Threat Feed Integration (Splunk HEC)",
      description: "Forward security anomalies, Ransomware alerts, and DataHawk threat logs detected by Cohesity to your central Splunk SIEM.",
      code: `// Cohesity Helios Webhook Web Event Payload
// Target: https://<SPLUNK_HEC_COLLECTOR_IP>:8088/services/collector/raw
{
  "event": {
    "source": "CohesityDataHawk",
    "sourcetype": "_json",
    "host": "<CUSTOMER_COHESITY_CLUSTER_FQDN>",
    "event_type": "DataHawkAnomalyAlert",
    "severity": "CRITICAL",
    "details": {
      "cluster_id": "<COHESITY_CLUSTER_ID_GUID>",
      "affected_entity": "<WORKLOAD_NAME_e.g_VM-SQL-01>",
      "anomaly_type": "HighEntropyRateDetect",
      "anomaly_score": "92.5",
      "detected_at": "2026-05-31T14:50:00Z",
      "entropy_change_rate": "+350%",
      "recommended_action": "Isolate VM; trigger FortKnox cleanroom integrity scan; lock snapshots."
    }
  }
}`,
      guide: `<strong>Where to Configure:</strong><br>
Configure inside the <strong>Cohesity Helios SaaS Management Portal</strong> under Webhook Notifications.<br><br>
<strong>How to Implement:</strong><br>
1. Log into Cohesity Helios (<a href="https://helios.cohesity.com" target="_blank" style="color:var(--accent-green)">helios.cohesity.com</a>).<br>
2. Navigate to <strong>Settings (Gear Icon) -> Webhooks -> Add Webhook</strong>.<br>
3. Enter Webhook Name: <code>Splunk-HEC-Collector</code>.<br>
4. Set URL to your Splunk HTTP Event Collector: <code>https://&lt;SPLUNK_COLLECTOR_IP&gt;:8088/services/collector</code>.<br>
5. Add custom headers: Set Key: <code>Authorization</code>, Value: <code>Splunk &lt;SPLUNK_HEC_TOKEN_GUID&gt;</code>.<br>
6. Check Event Type checkboxes: <code>Ransomware Anomaly Alerts</code> and <code>Threat Detection Events</code>.<br>
7. Click <strong>Test and Save</strong> to trigger a test payload.`
    },
    servicenow: {
      title: "ServiceNow Automation - Instant Recovery REST Script",
      description: "Trigger an automated instant recovery API request from ServiceNow flow designer when a recovery approval ticket is signed off.",
      code: `# Python 3 execution script designed for ServiceNow MID Server script actions
import requests
import json

COHESITY_HELIOS_URL = "https://helios.cohesity.com/api/v2"
# Helios API key record stored securely in ServiceNow
API_KEY = "Bearer <HELIOS_REST_API_KEY_TOKEN>"

def trigger_instant_restore(workload_name, target_host):
    headers = {
        "Authorization": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "restore_type": "InstantRecovery",
        "vm_workload_params": {
            "source_vm_name": workload_name,
            "target_hypervisor": target_host, # e.g. <TARGET_ESXI_HOST_OR_VCENTER>
            "power_on": True,
            "rename_suffix": "-Restored-ServiceNow"
        },
        "recovery_point": "latest_clean_snapshot" # Auto-selected malware-free recovery point
    }
    
    print(f"Triggering Cohesity Instant Restore for {workload_name}...")
    response = requests.post(
        f"{COHESITY_HELIOS_URL}/recoveries", 
        data=json.dumps(payload), 
        headers=headers
    )
    return response.json()

# Example Trigger execution
# trigger_instant_restore("<WORKLOAD_NAME_e.g_VM-SQL-01>", "<TARGET_ESXI_HOST>")`,
      guide: `<strong>Where to Configure:</strong><br>
Deploy inside <strong>ServiceNow Flow Designer</strong> as a custom Python Step script running on a ServiceNow MID Server.<br><br>
<strong>How to Implement:</strong><br>
1. In ServiceNow, navigate to <strong>Flow Designer -> New Action</strong>.<br>
2. Add input parameters: <code>workload_name</code>, <code>target_host</code>, and <code>ticket_id</code>.<br>
3. Add a <strong>REST Step</strong> to configure the Helios connection details, or add a <strong>Script Step</strong> (selecting Python) and paste the code.<br>
4. Bind variables: Map the inputs to script arguments.<br>
5. Set up triggers: Create a flow that launches when a Service Catalog Ticket (type: 'Restore Request') status transitions to 'Approved'.<br>
6. Link flow to execution: run the custom action passing ticket variables.`
    },
    sitecontinuity: {
      title: "SiteContinuity DR Runbook Blueprint (YAML)",
      description: "Declarative orchestration layout outlining application failover startup sequences, database boot priorities, and post-check ports validation.",
      code: `# Cohesity SiteContinuity Runbook YAML Template
# Mapped for: <CUSTOMER_PROJECT_NAME>
runbook_name: "CRM-Production-DR"
failover_trigger: Manual | Automated
network_mappings:
  - source_network_id: "<PRIMARY_VLAN_NETWORK_ID>"
    target_network_id: "<DR_VLAN_NETWORK_ID>"
    vcenter_source: "<PRIMARY_VCENTER_FQDN_OR_IP>"
    vcenter_target: "<DR_VCENTER_FQDN_OR_IP>"

failover_phases:
  - phase: 1
    name: "Database Ingestion Tier Start"
    workloads:
      - id: "<DATABASE_WORKLOAD_NAME_e.g_VM-SQL-01>"
        action: "PowerOn"
        recovery_type: "InstantRecovery"
    post_check:
      type: "TCPPortCheck"
      port: 1433
      timeout_seconds: 180
  
  - phase: 2
    name: "Application Virtual Tier Start"
    workloads:
      - id: "<VM_WORKLOAD_NAME_e.g_VM-App-01>"
        action: "PowerOn"
    post_check:
      type: "HTTPGetCheck"
      url: "http://localhost:8080/health"
      expected_status: 200
      timeout_seconds: 120`,
      guide: `<strong>Where to Configure:</strong><br>
Upload inside the <strong>Cohesity SiteContinuity DR Dashboard</strong> under Runbooks.<br><br>
<strong>How to Implement:</strong><br>
1. Log into Cohesity Helios, and select <strong>SiteContinuity (DR)</strong> from the service selector.<br>
2. Navigate to <strong>Runbooks -> Create / Import Runbook</strong>.<br>
3. Click <strong>Upload YAML Config</strong> and select this file.<br>
4. Replace placeholders: Map <code>&lt;PRIMARY_VLAN_NETWORK_ID&gt;</code> and <code>&lt;DR_VLAN_NETWORK_ID&gt;</code> to your target Cisco/VMware PortGroups.<br>
5. Match workload names to virtual machine nodes detected by DataProtect.<br>
6. Click <strong>Dry-Run Test</strong> to simulate a failover without interrupting production systems.`
    },
    ansible: {
      title: "Ansible Playbook - Cohesity Cluster Init & Protection",
      description: "Automate cluster administration tasks. Registers a new Cohesity cluster, connects Active Directory, and deploys standard protection policies.",
      code: `# Ansible Playbook for Cohesity Cluster Bootstrapping
---
- name: Initialize Cohesity Resilient Policies
  hosts: localhost
  gather_facts: false
  
  vars:
    cohesity_cluster: "<COHESITY_CLUSTER_IP_OR_FQDN>"
    cohesity_username: "<COHESITY_ADMIN_USER>"
    cohesity_password: "<COHESITY_ADMIN_PASSWORD>"
    ad_domain: "<AD_DOMAIN_FQDN_e.g_domain.local>"
    ad_username: "<AD_ADMIN_USER>"
    ad_password: "<AD_ADMIN_PASSWORD>"

  tasks:
    - name: Connect Active Directory Authentication Source
      cohesity.cohesity.cohesity_active_directory:
        cluster: "{{ cohesity_cluster }}"
        username: "{{ cohesity_username }}"
        password: "{{ cohesity_password }}"
        domain_name: "{{ ad_domain }}"
        ad_username: "{{ ad_username }}"
        ad_password: "{{ ad_password }}"
        state: present

    - name: Create Immutable Backup Protection Policy
      cohesity.cohesity.cohesity_policy:
        cluster: "{{ cohesity_cluster }}"
        username: "{{ cohesity_username }}"
        password: "{{ cohesity_password }}"
        name: "SLA-Resilient-Policy"
        days_to_keep: 30
        datalock_enforced: true # Immutable WORM Lock
        state: present`,
      guide: `<strong>Where to Configure:</strong><br>
Save as a playbook file on your <strong>Ansible Controller Node</strong> or load as a Template inside <strong>Ansible Automation Platform (Tower)</strong>.<br><br>
<strong>How to Implement:</strong><br>
1. On your control node, install the Cohesity Ansible collection: <code>ansible-galaxy collection install cohesity.cohesity</code>.<br>
2. Create a file named <code>cohesity_bootstrap.yml</code> and paste this code.<br>
3. Replace placeholders. It is strongly recommended to encrypt sensitive fields (like <code>cohesity_password</code>) using <code>ansible-vault</code>.<br>
4. Run the playbook in your terminal: <code>ansible-playbook cohesity_bootstrap.yml --ask-vault-pass</code>.<br>
5. Verify on Helios that the domain shows as registered and the immutable policy is active.`
    }
  }
};
