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
    },
    dora: {
      name: "DORA Compliance",
      requirements: [
        "SiteContinuity DR orchestration for automated digital operational resilience testing",
        "Continuous Data Protection (CDP) journaling for near-zero data loss SLAs",
        "Isolated FortKnox SaaS vault to satisfy third-party data recovery isolation rules",
        "Semi-annual non-disruptive DR failover walkthrough audit logs"
      ]
    },
    fedramp: {
      name: "FedRAMP Hardening",
      requirements: [
        "FIPS 140-2 certified data-at-rest encryption using external KMS key chains",
        "Cohesity FortKnox GovCloud vault storage for secure, air-gapped federal backups",
        "Multi-Party Authorization (MPA) quorum gatekeepers on all administrative changes",
        "Continuous DataHawk ML scanning for malware and indicators of compromise (IOCs)"
      ]
    },
    soc2: {
      name: "SOC 2 Type II Auditing",
      requirements: [
        "Helios control plane Multi-Factor Authentication (MFA) enforcement",
        "Encrypted, immutable audit logs tracking all recoveries and administrative acts",
        "Immutable WORM DataLock configurations on backup storage pools",
        "Automated vulnerability and threat signature scanning via DataHawk"
      ]
    },
    ccpa: {
      name: "CCPA / CPRA Privacy",
      requirements: [
        "Cohesity DataHawk data classification queries to map California consumer PI",
        "Automated encryption for data in transit and storage tiers",
        "Quorum-based Multi-Party approvals (MPA) protecting backups from unauthorized wipeout",
        "Telemetry and system status logging to support compliance readiness audits"
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
