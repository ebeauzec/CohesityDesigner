/**
 * Cohesity Architecture Wizard - Data Definitions
 * Contains product specifications, node types, workload presets, and integration configurations.
 */

const COHESITY_DATA = {
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
        "Advanced context grounding to prevent AI hallucinations"
      ],
      licensing: "Per Sized Indexed TB Subscription"
    }
  ],

  nodeTypes: {
    physical: [
      {
        model: "C6200 Flash",
        tier: "All-Flash Performance",
        capacityRawTB: 96,
        capacityUsableTB: 64,
        media: "NVMe SSD",
        bestFor: "Fast recovery workloads, critical VMware environments, large databases (SQL, Oracle)",
        minNodes: 3
      },
      {
        model: "C5000 Hybrid",
        tier: "Hybrid Standard",
        capacityRawTB: 144,
        capacityUsableTB: 96,
        media: "SSD Tier + HDD Capacity",
        bestFor: "Standard enterprise backups, general file archiving, SmartFiles scale-out storage",
        minNodes: 3
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
      requirements: [
        "Data Encryption at Rest & In Transit",
        "WORM Storage (DataLock) to prevent alteration of compliance records",
        "Cohesity DataHawk sensitive data scanning to locate PII (Right to be Forgotten)",
        "Zero Trust multi-party authorization to restrict privileged users"
      ]
    },
    hipaa: {
      name: "HIPAA Security Rule",
      requirements: [
        "Unique user access credentials and strict audit logging of restores",
        "Automated encryption key rotation (KMS integration)",
        "Cohesity DataHawk threat intelligence to prevent malicious data exposure",
        "Virtually air-gapped off-site backups (FortKnox) for remote disaster recovery"
      ]
    },
    pcidss: {
      name: "PCI-DSS v4.0 Requirements",
      requirements: [
        "Encrypted backup vaults restricting cardholder data environment",
        "Quorum-based Multi-Party Authorization (MPA) for target deletion",
        "Real-time threat scanning for cardholder databases inside snapshots",
        "Continuous compliance scanning and configuration validation audits"
      ]
    },
    nis2: {
      name: "NIS2 Directives (Cyber Resilience)",
      requirements: [
        "Proactive threat detection & file behavior analytics (DataHawk)",
        "Automated recovery playbooks and DR testing sandbox (SiteContinuity)",
        "Isolated immutable cyber vaulting (FortKnox) to guarantee business continuity",
        "Cleanroom recovery testing environment (malware scanning before restore)"
      ]
    }
  },

  integrationSnippets: {
    splunk: {
      title: "SIEM Threat Feed Integration (Splunk Event Hub)",
      description: "Forward security events and anomalous behavior logs detected by Cohesity DataHawk to your centralized Splunk SIEM for real-time security alerts.",
      code: `// Cohesity API v2 REST Payload for Splunk Webhook Notification
// Target Endpoint: https://splunk-collector.domain.local:8088/services/collector
{
  "event": {
    "source": "CohesityDataHawk",
    "sourcetype": "_json",
    "host": "cohesity-cluster-01.domain.local",
    "event_type": "DataHawkAnomalyAlert",
    "severity": "CRITICAL",
    "details": {
      "cluster_id": "893740294719",
      "anomaly_type": "HighEntropyRateDetect",
      "affected_entity": "VM-Prod-SQL01",
      "anomaly_score": 92.5,
      "detected_at": "2026-05-30T07:40:00Z",
      "entropy_change_rate": "+350%",
      "recommended_action": "Isolate VM; trigger FortKnox cleanroom integrity scan; hold snaps."
    }
  }
}`
    },
    servicenow: {
      title: "ServiceNow Automation - Recovery Trigger API",
      description: "Trigger an automated orchestration workflow in ServiceNow to restore a system or file path when an IT service ticket is approved.",
      code: `# Python 3 code snippet for Sales Engineers to showcase ServiceNow webhook integrations
import requests
import json

COHESITY_HELIOS_URL = "https://helios.cohesity.com/api/v2"
API_KEY = "Bearer SE-TOKEN-XXXX-YYYY-ZZZZ"

def trigger_instant_restore(vm_name, target_host):
    headers = {
        "Authorization": API_KEY,
        "Content-Type": "application/json"
    }
    
    payload = {
        "restore_type": "InstantRecovery",
        "vm_workload_params": {
            "source_vm_name": vm_name,
            "target_hypervisor": target_host,
            "power_on": True,
            "rename_suffix": "-Restored-ServiceNow"
        },
        "recovery_point": "latest_clean_snapshot" # DataHawk selected malware-free snapshot
    }
    
    response = requests.post(
        f"{COHESITY_HELIOS_URL}/recoveries", 
        data=json.dumps(payload), 
        headers=headers
    )
    return response.json()`
    },
    sitecontinuity: {
      title: "DR Orchestration - SiteContinuity Runbook Configuration",
      description: "A declarative orchestration plan representation showing multi-tier application ordering (Web, App, DB) and dependency checking.",
      code: `# Cohesity SiteContinuity Runbook Blueprint
runbook_name: "CRM-Production-DR"
failover_trigger: Automated | Manual
failover_phases:
  - phase: 1
    name: "Database Tier Start"
    workloads:
      - id: "VM-Prod-SQL01"
        action: "PowerOn"
        recovery_type: "InstantRecovery"
    post_check:
      type: "TCPPortCheck"
      port: 1433
      timeout_seconds: 180
  
  - phase: 2
    name: "Application Tier Start"
    workloads:
      - id: "VM-Prod-App01"
        action: "PowerOn"
    post_check:
      type: "HTTPGetCheck"
      url: "http://localhost:8080/health"
      expected_status: 200
      timeout_seconds: 120`
    }
  }
};
