/**
 * Cohesity Architecture Wizard - Controller and Sizing Engine
 */

class CohesityArchitectWizard {
  constructor() {
    this.state = {
      currentStep: 1,
      project: {
        name: "Enterprise Resilient Infrastructure",
        industry: "Finance",
        compliance: ["gdpr", "nis2"]
      },
      workloads: {
        vm: { active: true, capacityTB: 50, growth: 10, dedupe: 2.5, retentionDays: 30, windowHours: 8 },
        database: { active: true, capacityTB: 20, growth: 15, dedupe: 3.0, retentionDays: 14, windowHours: 8 },
        files: { active: false, capacityTB: 100, growth: 20, dedupe: 1.4, retentionDays: 90, windowHours: 8 },
        saas: { active: false, capacityTB: 10, growth: 12, dedupe: 2.0, retentionDays: 365, windowHours: 8 },
        k8s: { active: false, capacityTB: 5, growth: 15, dedupe: 2.0, retentionDays: 30, windowHours: 8 }
      },
      bcdr: {
        rpo: "1hr",
        rto: "4hr",
        replication: "saas-vault", // 'none', 'second-site', 'cloud-edition', 'saas-vault'
        siteContinuity: true
      },
      security: {
        fortknox: true,
        datahawk: true,
        mfa: true,
        mpa: true,
        kms: "customer" // 'cohesity', 'customer'
      },
      deployment: {
        model: "hybrid", // 'onprem', 'saas', 'hybrid'
        nodePreference: "flash" // 'flash', 'hybrid'
      }
    };

    // DOM Elements Cache
    this.dom = {};
  }

  init() {
    this.cacheDomElements();
    this.bindEvents();
    this.loadWorkloadPresets();
    this.updateUI();
  }

  cacheDomElements() {
    // Nav elements
    this.dom.stepNodes = document.querySelectorAll(".step-node");
    this.dom.progressFill = document.querySelector(".steps-progress-fill");
    
    // Buttons
    this.dom.btnPrev = document.getElementById("btn-prev");
    this.dom.btnNext = document.getElementById("btn-next");
    this.dom.btnPrint = document.getElementById("btn-print");
    
    // Step wrappers
    this.dom.steps = document.querySelectorAll(".wizard-step");
    
    // Dynamic recommendation panels
    this.dom.statFrontEnd = document.getElementById("rec-frontend-tb");
    this.dom.statUsable = document.getElementById("rec-usable-tb");
    this.dom.statNodes = document.getElementById("rec-node-config");
    this.dom.statRpo = document.getElementById("rec-rpo-sla");
    this.dom.statRto = document.getElementById("rec-rto-sla");
    this.dom.complianceScore = document.getElementById("compliance-score-val");
    this.dom.complianceOffset = document.getElementById("compliance-stroke");
    this.dom.complianceClass = document.getElementById("compliance-rating");
    this.dom.recProductList = document.getElementById("rec-product-list");
    this.dom.checklist = document.getElementById("security-checklist");
    
    // Playbook tabs
    this.dom.tabBtns = document.querySelectorAll(".tab-btn");
    this.dom.playbookGuide = document.getElementById("playbook-guide-content");
    this.dom.codePre = document.getElementById("code-display");
    this.dom.copyBtn = document.getElementById("copy-btn");
    
    // SVG Canvas
    this.dom.svgContainer = document.getElementById("topology-svg-container");
    this.dom.hotspotOverlay = document.getElementById("hotspot-overlay");

    // Proposal Step Elements
    this.dom.btnCopyProposal = document.getElementById("btn-copy-proposal");
    this.dom.btnExportPdf = document.getElementById("btn-export-pdf");
    this.dom.proposalSummary = document.getElementById("proposal-exec-summary");
    this.dom.proposalBOMTable = document.getElementById("proposal-bom-table");
    this.dom.proposalRoadmap = document.getElementById("proposal-roadmap-timeline");
    this.dom.proposalComplianceSection = document.getElementById("proposal-compliance-section");
    this.dom.proposalComplianceMapping = document.getElementById("proposal-compliance-mapping");
  }

  bindEvents() {
    // Wizard Navigation
    this.dom.btnPrev.addEventListener("click", () => this.navigateStep(-1));
    this.dom.btnNext.addEventListener("click", () => {
      if (this.state.currentStep === 6) {
        this.goToStep(1); // Restart
      } else {
        this.navigateStep(1);
      }
    });
    this.dom.btnPrint.addEventListener("click", () => this.generateReportAndPrint());

    // Proposal step event bindings
    this.dom.btnCopyProposal.addEventListener("click", () => this.copyProposalToClipboard());
    this.dom.btnExportPdf.addEventListener("click", () => this.generateReportAndPrint());

    // Step Nav Clicks
    this.dom.stepNodes.forEach((node, idx) => {
      node.addEventListener("click", () => {
        this.goToStep(idx + 1);
      });
    });

    // Step 1: Project Details Inputs
    document.getElementById("proj-name").addEventListener("input", (e) => {
      this.state.project.name = e.target.value || "Cohesity Solution Design";
      this.updateSidebarStats();
    });
    
    document.getElementById("proj-industry").addEventListener("change", (e) => {
      this.state.project.industry = e.target.value;
      this.updateSidebarStats();
    });

    document.querySelectorAll(".compliance-chk").forEach(chk => {
      chk.addEventListener("change", (e) => {
        const card = chk.closest(".selectable-item");
        if (chk.checked) {
          card.classList.add("selected");
        } else {
          card.classList.remove("selected");
        }
        this.state.project.compliance = Array.from(
          document.querySelectorAll(".compliance-chk:checked")
        ).map(el => el.value);
        
        // Auto-apply recommended configuration targets
        this.applyComplianceDefaults();
        
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });
    });

    // Step 2: Workloads Setup (Checkboxes & Sliders)
    const workloadTypes = ["vm", "database", "files", "saas", "k8s"];
    workloadTypes.forEach(type => {
      const card = document.getElementById(`wl-card-${type}`);
      const chk = document.getElementById(`wl-chk-${type}`);
      const range = document.getElementById(`wl-range-${type}`);
      const num = document.getElementById(`wl-num-${type}`);
      const growthRange = document.getElementById(`wl-growth-${type}`);

      // Selection Toggle
      card.addEventListener("click", (e) => {
        if (e.target.closest('.switch') || e.target === chk) {
          return; // Let browser handle it
        }
        chk.checked = !chk.checked;
        chk.dispatchEvent(new Event("change"));
      });

      chk.addEventListener("change", (e) => {
        this.state.workloads[type].active = e.target.checked;
        if (e.target.checked) {
          card.classList.add("selected");
          document.getElementById(`wl-controls-${type}`).style.display = "block";
        } else {
          card.classList.remove("selected");
          document.getElementById(`wl-controls-${type}`).style.display = "none";
        }
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });

      // Synchronize Slider & Number Inputs
      range.addEventListener("input", (e) => {
        num.value = e.target.value;
        this.state.workloads[type].capacityTB = parseFloat(e.target.value);
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });

      num.addEventListener("change", (e) => {
        let val = parseFloat(e.target.value) || 0;
        if (val < range.min) val = range.min;
        if (val > range.max) val = range.max;
        range.value = val;
        num.value = val;
        this.state.workloads[type].capacityTB = val;
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });

      growthRange.addEventListener("input", (e) => {
        document.getElementById(`wl-growth-val-${type}`).textContent = `${e.target.value}%`;
        this.state.workloads[type].growth = parseInt(e.target.value);
        this.updateSidebarStats();
      });

      const windowRange = document.getElementById(`wl-window-${type}`);
      if (windowRange) {
        windowRange.addEventListener("input", (e) => {
          document.getElementById(`wl-window-val-${type}`).textContent = `${e.target.value} hrs`;
          this.state.workloads[type].windowHours = parseInt(e.target.value);
          this.updateSidebarStats();
          this.renderTopologyDiagram();
        });
      }
    });

    // Step 3: BCDR Configs
    document.getElementById("rpo-select").addEventListener("change", (e) => {
      this.state.bcdr.rpo = e.target.value;
      this.updateSidebarStats();
    });

    document.getElementById("rto-select").addEventListener("change", (e) => {
      this.state.bcdr.rto = e.target.value;
      this.updateSidebarStats();
    });

    document.getElementById("bcdr-repl-select").addEventListener("change", (e) => {
      this.state.bcdr.replication = e.target.value;
      this.updateSidebarStats();
      this.renderTopologyDiagram();
    });

    document.getElementById("chk-sitecontinuity").addEventListener("change", (e) => {
      this.state.bcdr.siteContinuity = e.target.checked;
      this.updateSidebarStats();
    });

    // Step 4: Security & Resiliency
    document.getElementById("chk-fortknox").addEventListener("change", (e) => {
      this.state.security.fortknox = e.target.checked;
      this.updateSidebarStats();
      this.renderTopologyDiagram();
    });

    document.getElementById("chk-datahawk").addEventListener("change", (e) => {
      this.state.security.datahawk = e.target.checked;
      this.updateSidebarStats();
      this.renderTopologyDiagram();
    });

    document.getElementById("chk-mfa").addEventListener("change", (e) => {
      this.state.security.mfa = e.target.checked;
      this.updateSidebarStats();
    });

    document.getElementById("chk-mpa").addEventListener("change", (e) => {
      this.state.security.mpa = e.target.checked;
      this.updateSidebarStats();
    });

    document.getElementById("sec-kms").addEventListener("change", (e) => {
      this.state.security.kms = e.target.value;
      this.updateSidebarStats();
    });

    // Step 5: Deployment Scenarios
    document.querySelectorAll("input[name='deploy-model']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        this.state.deployment.model = e.target.value;
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });
    });

    document.querySelectorAll("input[name='node-perf']").forEach(radio => {
      radio.addEventListener("change", (e) => {
        this.state.deployment.nodePreference = e.target.value;
        this.updateSidebarStats();
      });
    });

    // Integration tabs
    this.dom.tabBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const targetTab = btn.getAttribute("data-tab");
        
        this.dom.tabBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        
        this.updateIntegrationCode(targetTab);
      });
    });

    this.dom.copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this.dom.codePre.textContent);
      this.dom.copyBtn.textContent = "Copied!";
      setTimeout(() => {
        this.dom.copyBtn.textContent = "Copy";
      }, 2000);
    });
  }

  applyComplianceDefaults() {
    const comps = this.state.project.compliance;
    
    if (comps.includes("dora")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setCheckboxState("chk-sitecontinuity", true, 'bcdr', 'siteContinuity');
    }
    
    if (comps.includes("fedramp")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setCheckboxState("chk-datahawk", true, 'security', 'datahawk');
      this.setCheckboxState("chk-mpa", true, 'security', 'mpa');
      
      const kmsSel = document.getElementById("sec-kms");
      if (kmsSel) {
        kmsSel.value = "customer";
        this.state.security.kms = "customer";
      }
    }
    
    if (comps.includes("gdpr") || comps.includes("ccpa")) {
      this.setCheckboxState("chk-datahawk", true, 'security', 'datahawk');
    }
    
    if (comps.includes("soc2")) {
      this.setCheckboxState("chk-mfa", true, 'security', 'mfa');
      this.setCheckboxState("chk-mpa", true, 'security', 'mpa');
    }
    
    if (comps.includes("nis2")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setCheckboxState("chk-datahawk", true, 'security', 'datahawk');
      this.setCheckboxState("chk-sitecontinuity", true, 'bcdr', 'siteContinuity');
    }
  }

  setCheckboxState(elemId, value, stateCategory, stateKey) {
    const el = document.getElementById(elemId);
    if (el) {
      el.checked = value;
      this.state[stateCategory][stateKey] = value;
    }
  }

  loadWorkloadPresets() {
    // Set initial values from state into range inputs
    Object.keys(this.state.workloads).forEach(type => {
      const data = this.state.workloads[type];
      const chk = document.getElementById(`wl-chk-${type}`);
      const range = document.getElementById(`wl-range-${type}`);
      const num = document.getElementById(`wl-num-${type}`);
      const growthRange = document.getElementById(`wl-growth-${type}`);

      chk.checked = data.active;
      if (data.active) {
        document.getElementById(`wl-card-${type}`).classList.add("selected");
        document.getElementById(`wl-controls-${type}`).style.display = "block";
      }

      range.value = data.capacityTB;
      num.value = data.capacityTB;
      growthRange.value = data.growth;
      document.getElementById(`wl-growth-val-${type}`).textContent = `${data.growth}%`;

      const windowRange = document.getElementById(`wl-window-${type}`);
      if (windowRange) {
        windowRange.value = data.windowHours;
        document.getElementById(`wl-window-val-${type}`).textContent = `${data.windowHours} hrs`;
      }
    });
  }

  navigateStep(direction) {
    const nextStep = this.state.currentStep + direction;
    if (nextStep >= 1 && nextStep <= 6) {
      this.goToStep(nextStep);
    }
  }

  goToStep(stepNumber) {
    this.state.currentStep = stepNumber;
    
    // Update step visibility
    this.dom.steps.forEach((step, idx) => {
      if (idx + 1 === stepNumber) {
        step.classList.add("active");
      } else {
        step.classList.remove("active");
      }
    });

    // Update steps progress bar UI
    this.dom.stepNodes.forEach((node, idx) => {
      const num = idx + 1;
      node.classList.remove("active", "completed");
      if (num === stepNumber) {
        node.classList.add("active");
      } else if (num < stepNumber) {
        node.classList.add("completed");
      }
    });

    const percent = ((stepNumber - 1) / 5) * 100;
    this.dom.progressFill.style.width = `${percent}%`;

    // Manage Buttons State
    this.dom.btnPrev.disabled = (stepNumber === 1);
    if (stepNumber === 6) {
      this.dom.btnNext.innerHTML = `Restart Wizard <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">refresh</span>`;
    } else if (stepNumber === 5) {
      this.dom.btnNext.innerHTML = `Generate Proposal <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">assignment_turned_in</span>`;
    } else {
      this.dom.btnNext.innerHTML = `Next Step <span class="material-symbols-outlined" style="font-size:16px; vertical-align:middle;">arrow_forward</span>`;
    }

    this.updateUI();
  }

  calculateSizing() {
    let totalFrontEndTB = 0;
    let totalUsableNeededTB = 0;
    let activeWorkloadsCount = 0;

    // Standard Grandfather-Father-Son retention formula overhead factor
    // Let's calculate base multiplier:
    // Daily retention multiplier: (Days / 30) * 0.15
    // GFS retention overhead factors:
    // VMs: 1.3, DB: 1.15, Files: 1.4, SaaS: 1.8, Kubernetes: 1.25

    Object.keys(this.state.workloads).forEach(type => {
      const wl = this.state.workloads[type];
      if (wl.active) {
        activeWorkloadsCount++;
        totalFrontEndTB += wl.capacityTB;

        // Apply growth compounded over 3 years: F = P * (1 + r)^3
        const compoundedCapacity = wl.capacityTB * Math.pow(1 + (wl.growth / 100), 3);
        
        // Apply Deduplication & Compression ratio reduction
        const deduplicatedCapacity = compoundedCapacity / wl.dedupe;

        // Apply retention policy multiplier based on workload properties
        let retentionMultiplier = 1.1; // Baseline
        if (type === "vm") retentionMultiplier = 1.35; // Standard VMs with snapshots
        if (type === "database") retentionMultiplier = 1.15; // Database logs, short retention
        if (type === "files") retentionMultiplier = 1.45; // SmartFiles data, longer archives
        if (type === "saas") retentionMultiplier = 1.85; // SaaS archives, long legal hold (365d)
        if (type === "k8s") retentionMultiplier = 1.25; // Dev/K8s backups

        totalUsableNeededTB += (deduplicatedCapacity * retentionMultiplier);
      }
    });

    // If replica is on secondary site or cloud edition self-managed, double the capacity requirements
    let replicationMultiplier = 1.0;
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      replicationMultiplier = 2.0; // Needs 1:1 replica copy
    } else if (this.state.bcdr.replication === "saas-vault" && this.state.security.fortknox) {
      // FortKnox represents a vaulted SaaS storage, does not add to local primary nodes sizing
      replicationMultiplier = 1.0; 
    }

    const calculatedUsableLocalTB = totalUsableNeededTB;
    const totalSystemUsableTB = totalUsableNeededTB * replicationMultiplier;

    // Node recommendations: Physical cluster sizing (Starts at 3 nodes min)
    let nodeRecommendation = "";
    let localNodeCount = 0;
    let cloudNodeCount = 0;
    let fortKnoxVaultTB = 0;
    let nodeModelName = "";

    if (this.state.deployment.model === "saas") {
      nodeRecommendation = "Cohesity Cloud Services (SaaS Pricing model)";
      nodeModelName = "SaaS Storage Subscription";
    } else {
      // Determine physical nodes layout based on user preferences and Database volumes
      const isDatabaseHeavy = (this.state.workloads.database.active && 
                               (this.state.workloads.database.capacityTB / (totalFrontEndTB || 1) > 0.35));
      const performanceTier = (this.state.deployment.nodePreference === "flash" || isDatabaseHeavy);

      if (performanceTier) {
        nodeModelName = "C6200 NVMe All-Flash";
        const nodeUsableTB = 64; // Model usable size
        // N+1 cluster configuration: needs min 3 nodes, sized to tolerate losing 1 node.
        localNodeCount = Math.max(3, Math.ceil(calculatedUsableLocalTB / nodeUsableTB) + 1);
        nodeRecommendation = `${localNodeCount}x Cohesity ${nodeModelName} Nodes (${(localNodeCount * nodeUsableTB).toFixed(0)}TB usable, N+1 Config)`;
      } else {
        nodeModelName = "C5000 Hybrid (SSD+HDD)";
        const nodeUsableTB = 96; // Model usable size
        localNodeCount = Math.max(3, Math.ceil(calculatedUsableLocalTB / nodeUsableTB) + 1);
        nodeRecommendation = `${localNodeCount}x Cohesity ${nodeModelName} Nodes (${(localNodeCount * nodeUsableTB).toFixed(0)}TB usable, N+1 Config)`;
      }
    }

    // Cloud Node Replication sizing
    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudNodeUsableTB = 40;
      cloudNodeCount = Math.max(3, Math.ceil(calculatedUsableLocalTB / cloudNodeUsableTB) + 1);
    }

    // FortKnox vault sizing
    if (this.state.security.fortknox) {
      // Vault sizes: Usually front-end capacity + ~15% for compression/retention.
      fortKnoxVaultTB = Math.ceil(totalFrontEndTB * 0.9);
    }

    return {
      frontEndTB: totalFrontEndTB.toFixed(1),
      usableLocalTB: calculatedUsableLocalTB.toFixed(1),
      totalSystemUsableTB: totalSystemUsableTB.toFixed(1),
      localNodeCount,
      cloudNodeCount,
      fortKnoxVaultTB,
      nodeRecommendation,
      nodeModelName,
      activeWorkloadsCount
    };
  }

  calculateBandwidth() {
    let dailyChangeRawTB = 0;
    let dailyChangeDedupeTB = 0;
    let totalIngestRawMbps = 0;
    let totalIngestDedupeMbps = 0;

    Object.keys(this.state.workloads).forEach(type => {
      const wl = this.state.workloads[type];
      if (wl.active) {
        const preset = COHESITY_DATA.workloadPresets[type];
        const changeRate = preset ? preset.dailyChangeRate : 3; // %
        const rawChange = wl.capacityTB * (changeRate / 100);
        const dedupeChange = rawChange / wl.dedupe;
        
        dailyChangeRawTB += rawChange;
        dailyChangeDedupeTB += dedupeChange;

        const windowHours = wl.windowHours || 8;
        const wlRawMbps = (rawChange * 8000000) / (windowHours * 3600);
        const wlDedupeMbps = (dedupeChange * 8000000) / (windowHours * 3600);

        totalIngestRawMbps += wlRawMbps;
        totalIngestDedupeMbps += wlDedupeMbps;
      }
    });

    let ingestHours = 8;
    if (totalIngestDedupeMbps > 0) {
      ingestHours = (dailyChangeDedupeTB * 8000000) / (totalIngestDedupeMbps * 3600);
    }

    const ingestRawMbps = totalIngestRawMbps;
    const ingestDedupeMbps = totalIngestDedupeMbps;

    const replHours = 4;
    const replMbps = (dailyChangeDedupeTB * 8000000) / (replHours * 3600);

    const vaultHours = 4;
    const vaultMbps = (dailyChangeDedupeTB * 8000000) / (vaultHours * 3600);

    return {
      dailyChangeRawTB: dailyChangeRawTB.toFixed(2),
      dailyChangeDedupeTB: dailyChangeDedupeTB.toFixed(2),
      ingestRawMbps: Math.ceil(ingestRawMbps),
      ingestDedupeMbps: Math.ceil(ingestDedupeMbps),
      replMbps: Math.ceil(replMbps),
      vaultMbps: Math.ceil(vaultMbps),
      ingestHours,
      replHours,
      vaultHours
    };
  }

  updateBandwidthUI() {
    const bw = this.calculateBandwidth();
    
    // Sidebar update
    const dailyChangeEl = document.getElementById("bw-daily-change");
    const ingestEl = document.getElementById("bw-local-ingest");
    const ingestRawEl = document.getElementById("bw-local-raw");
    const replContainer = document.getElementById("bw-repl-container");
    const replVal = document.getElementById("bw-repl-val");
    const replLabel = document.getElementById("bw-repl-label");
    const vaultContainer = document.getElementById("bw-vault-container");
    const vaultVal = document.getElementById("bw-vault-val");

    if (dailyChangeEl) dailyChangeEl.textContent = `${bw.dailyChangeRawTB} TB/day`;
    if (ingestEl) ingestEl.textContent = `${bw.ingestDedupeMbps} Mbps`;
    
    const bwSidebarHint = document.getElementById("bw-sidebar-hint");
    if (bwSidebarHint) {
      bwSidebarHint.innerHTML = `Sized for a ${bw.ingestHours.toFixed(1)}h backup window (Raw ingest requires <span id="bw-local-raw" style="font-weight:700">${bw.ingestRawMbps} Mbps</span>). Source-side deduplication reduces local WAN transfer bandwidth.`;
    } else {
      if (ingestRawEl) ingestRawEl.textContent = `${bw.ingestRawMbps} Mbps`;
    }

    // Secondary replication
    if (replContainer && replVal) {
      if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
        replContainer.style.display = "flex";
        replVal.textContent = `${bw.replMbps} Mbps`;
        if (replLabel) {
          replLabel.textContent = this.state.bcdr.replication === "cloud-edition" 
            ? "Cloud Replication (4h):" 
            : "Site-to-Site Replication (4h):";
        }
      } else {
        replContainer.style.display = "none";
      }
    }

    // FortKnox Vaulting
    if (vaultContainer && vaultVal) {
      if (this.state.security.fortknox) {
        vaultContainer.style.display = "flex";
        vaultVal.textContent = `${bw.vaultMbps} Mbps`;
      } else {
        vaultContainer.style.display = "none";
      }
    }

    // Step 3 layout elements update
    const step3Change = document.getElementById("step3-daily-change");
    const step3Dedupe = document.getElementById("step3-daily-dedupe");
    const step3Ingest = document.getElementById("step3-ingest-bw");
    const step3IngestRaw = document.getElementById("step3-ingest-raw");
    const step3ReplContainer = document.getElementById("step3-bw-repl");
    const step3ReplLabel = document.getElementById("step3-repl-label");
    const step3ReplVal = document.getElementById("step3-repl-val");
    const step3VaultContainer = document.getElementById("step3-bw-vault");
    const step3VaultVal = document.getElementById("step3-vault-val");

    if (step3Change) step3Change.textContent = `${bw.dailyChangeRawTB} TB/day`;
    if (step3Dedupe) step3Dedupe.textContent = `${bw.dailyChangeDedupeTB} TB/day`;
    if (step3Ingest) step3Ingest.textContent = `${bw.ingestDedupeMbps} Mbps`;
    if (step3IngestRaw) step3IngestRaw.textContent = `${bw.ingestRawMbps} Mbps`;

    const step3IngestTitle = document.getElementById("step3-ingest-title");
    if (step3IngestTitle) {
      step3IngestTitle.textContent = `Ingest Bandwidth (${bw.ingestHours.toFixed(1)}h)`;
    }

    if (step3ReplContainer && step3ReplVal) {
      if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
        step3ReplContainer.style.display = "flex";
        step3ReplVal.textContent = `${bw.replMbps} Mbps`;
        if (step3ReplLabel) {
          step3ReplLabel.textContent = this.state.bcdr.replication === "cloud-edition" 
            ? "Cloud replication WAN link (4h SLA):" 
            : "Site-to-Site replication link (4h SLA):";
        }
      } else {
        step3ReplContainer.style.display = "none";
      }
    }

    if (step3VaultContainer && step3VaultVal) {
      if (this.state.security.fortknox) {
        step3VaultContainer.style.display = "flex";
        step3VaultVal.textContent = `${bw.vaultMbps} Mbps`;
      } else {
        step3VaultContainer.style.display = "none";
      }
    }
  }

  calculateComplianceScore() {
    let score = 100;
    let deductList = [];

    // BCDR Checks
    if (this.state.bcdr.rpo === "15min" && !this.state.bcdr.siteContinuity) {
      score -= 10;
      deductList.push("SiteContinuity required for 15-min CDP workloads");
    }
    if (this.state.bcdr.replication === "none") {
      score -= 20;
      deductList.push("No off-site replication configured");
    }

    // Security Checks
    if (!this.state.security.fortknox) {
      score -= 25;
      deductList.push("No isolated cyber vault (FortKnox) to prevent ransomware propagation");
    }
    if (!this.state.security.datahawk) {
      score -= 20;
      deductList.push("No active AI/ML threat detection scanning (DataHawk)");
    }
    if (!this.state.security.mfa) {
      score -= 15;
      deductList.push("Multi-Factor Authentication disabled on Cluster Helios control plane");
    }
    if (!this.state.security.mpa) {
      score -= 15;
      deductList.push("Multi-Party Authorization quorum approvals not enforced");
    }
    if (this.state.security.kms === "cohesity") {
      score -= 10;
      deductList.push("Standard encryption used (External KMS recommended)");
    }

    // Workload check
    let activeWl = false;
    Object.keys(this.state.workloads).forEach(type => {
      if (this.state.workloads[type].active) activeWl = true;
    });
    if (!activeWl) {
      score = 0;
      deductList = ["No workloads selected for protection"];
    }

    score = Math.max(10, score);
    return { score, deductList };
  }

  updateSidebarStats() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();

    // Render basic text elements
    this.dom.statFrontEnd.textContent = `${sizing.frontEndTB} TB`;
    this.dom.statUsable.textContent = `${sizing.usableLocalTB} TB`;
    this.dom.statNodes.textContent = sizing.nodeRecommendation;
    
    // RPO / RTO UI outputs
    this.dom.statRpo.textContent = this.state.bcdr.rpo;
    this.dom.statRto.textContent = this.state.bcdr.rto;

    // Render Compliance Radial progress ring
    this.dom.complianceScore.textContent = compliance.score;
    // Circular path length is 201px. Let's calculate percentage offset:
    const offset = 201 - (201 * (compliance.score / 100));
    this.dom.complianceOffset.style.strokeDashoffset = offset;

    // Dynamic color matching compliance
    let complianceColor = "var(--accent-green)";
    let ratingName = "Exemplary Resiliency";
    
    if (compliance.score < 50) {
      complianceColor = "var(--accent-red)";
      ratingName = "Critical Resiliency Risk";
    } else if (compliance.score < 80) {
      complianceColor = "var(--accent-orange)";
      ratingName = "Vulnerable Cyber Defense";
    }

    this.dom.complianceOffset.style.stroke = complianceColor;
    this.dom.complianceScore.style.color = complianceColor;
    this.dom.complianceClass.textContent = ratingName;
    this.dom.complianceClass.style.color = complianceColor;

    // Render Recommended Products List in sidebar
    this.updateProductList(sizing);

    // Render Hardening checklist items
    this.updateChecklist(compliance);
  }

  updateProductList(sizing) {
    let listHTML = "";
    
    // Check which products are actively selected
    const activeProducts = {
      dataprotect: true, // Always required for backup
      fortknox: this.state.security.fortknox,
      datahawk: this.state.security.datahawk,
      smartfiles: this.state.workloads.files.active,
      sitecontinuity: this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none",
      gaia: this.state.workloads.vm.active || this.state.workloads.files.active // Suggested for indexed search
    };

    COHESITY_DATA.products.forEach(prod => {
      const isActive = activeProducts[prod.id];
      const activeClass = isActive ? "active" : "";
      const bulletText = isActive ? "Active" : "Optional";
      listHTML += `
        <div class="rec-product-item ${activeClass}">
          <div class="rec-product-bullet"></div>
          <span class="rec-product-name">${prod.name}</span>
          <span class="rec-product-tag">${bulletText}</span>
        </div>
      `;
    });

    this.dom.recProductList.innerHTML = listHTML;
  }

  updateChecklist(compliance) {
    let checklistHTML = "";

    // Security Hardening Checklist Rules
    const securityChecks = [
      { label: "DataLock snapshot immutability enforced (WORM)", pass: true },
      { label: "Helios Control Plane Multi-Factor Auth (MFA)", pass: this.state.security.mfa },
      { label: "Helios Multi-Party Approval (MPA) Quorum active", pass: this.state.security.mpa },
      { label: "Isolated off-site air-gapped recovery (FortKnox)", pass: this.state.security.fortknox },
      { label: "Real-time AI malware anomaly scanning (DataHawk)", pass: this.state.security.datahawk },
      { label: "Enterprise Key Management integration (KMS)", pass: this.state.security.kms === "customer" }
    ];

    securityChecks.forEach(check => {
      const icon = check.pass 
        ? `<i class="material-icons-round check-icon" style="color:var(--accent-green)">check_circle</i>`
        : `<i class="material-icons-round cross-icon" style="color:var(--accent-red)">cancel</i>`;
      
      checklistHTML += `
        <div class="checklist-item">
          ${icon}
          <span>${check.label}</span>
        </div>
      `;
    });

    this.dom.checklist.innerHTML = checklistHTML;
  }

  updateIntegrationCode(tabId) {
    const snippet = COHESITY_DATA.integrationSnippets[tabId];
    if (snippet) {
      document.getElementById("code-title").textContent = snippet.title;
      document.getElementById("code-desc").textContent = snippet.description;

      let codeText = snippet.code;

      // Calculate active customer values for replacements based on user choices
      const projectName = this.state.project.name || "Enterprise Resilient Infrastructure";
      const slugName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "cohesity-cluster";
      const domainName = `${slugName}.local`;
      const clusterFqdn = `cluster.${domainName}`;
      const splunkIp = "192.168.10.88";
      const tokenSplunk = "3A1F49BE-F658-E978-1563-22950731A54F";
      const apiKeyHelios = "Helios_API_Key_eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

      // Workload dynamic names based on actual inputs
      let dbName = "VM-Prod-SQL01";
      let vmName = "VM-Prod-App01";
      if (this.state.workloads.database.active) {
        dbName = `db-${slugName}-01`;
      }
      if (this.state.workloads.vm.active) {
        vmName = `vm-${slugName}-app-01`;
      }

      // Target network mappings
      const primaryVlan = "vlan-100-prod";
      const drVlan = "vlan-200-dr";
      const primaryVcenter = "vcenter-prod.local";
      const drVcenter = "vcenter-dr.local";

      // Replace placeholders in the code
      codeText = codeText
        .replace(/<CUSTOMER_PROJECT_NAME>/g, projectName)
        .replace(/<CUSTOMER_COHESITY_CLUSTER_FQDN>/g, clusterFqdn)
        .replace(/<COHESITY_CLUSTER_IP_OR_FQDN>/g, clusterFqdn)
        .replace(/<COHESITY_CLUSTER_ID_GUID>/g, "12485906325-10492-9582")
        .replace(/<SPLUNK_HEC_COLLECTOR_IP>/g, splunkIp)
        .replace(/<SPLUNK_COLLECTOR_IP>/g, splunkIp)
        .replace(/<SPLUNK_HEC_TOKEN_GUID>/g, tokenSplunk)
        .replace(/<HELIOS_REST_API_KEY_TOKEN>/g, apiKeyHelios)
        .replace(/<TARGET_ESXI_HOST_OR_VCENTER>/g, "esxi-host-01.local")
        .replace(/<TARGET_ESXI_HOST>/g, "esxi-host-01.local")
        .replace(/<PRIMARY_VLAN_NETWORK_ID>/g, primaryVlan)
        .replace(/<DR_VLAN_NETWORK_ID>/g, drVlan)
        .replace(/<PRIMARY_VCENTER_FQDN_OR_IP>/g, primaryVcenter)
        .replace(/<DR_VCENTER_FQDN_OR_IP>/g, drVcenter)
        .replace(/<DATABASE_WORKLOAD_NAME_e.g_VM-SQL-01>/g, dbName)
        .replace(/<VM_WORKLOAD_NAME_e.g_VM-App-01>/g, vmName)
        .replace(/<COHESITY_ADMIN_USER>/g, "cohesity_admin")
        .replace(/<COHESITY_ADMIN_PASSWORD>/g, "••••••••••••••••")
        .replace(/<AD_DOMAIN_FQDN_e.g_domain.local>/g, domainName)
        .replace(/<AD_ADMIN_USER>/g, "ad_admin")
        .replace(/<AD_ADMIN_PASSWORD>/g, "••••••••••••••••");

      this.dom.codePre.textContent = codeText;

      // Update guide content with dynamically resolved IP addresses and values
      if (this.dom.playbookGuide) {
        let guideText = snippet.guide;
        guideText = guideText
          .replace(/&lt;PRIMARY_VLAN_NETWORK_ID&gt;/g, primaryVlan)
          .replace(/&lt;DR_VLAN_NETWORK_ID&gt;/g, drVlan)
          .replace(/&lt;SPLUNK_COLLECTOR_IP&gt;/g, splunkIp)
          .replace(/&lt;SPLUNK_HEC_TOKEN_GUID&gt;/g, tokenSplunk);

        this.dom.playbookGuide.innerHTML = guideText;
      }
    }
  }

  updateUI() {
    this.updateSidebarStats();
    this.renderTopologyDiagram();
    this.updateBandwidthUI();
    
    // Initialise code panel default to active tab
    const activeTab = document.querySelector(".tab-btn.active").getAttribute("data-tab");
    this.updateIntegrationCode(activeTab);

    // If on proposal step, regenerate proposal & BOM details
    if (this.state.currentStep === 6) {
      this.updateProposalAndBOM();
    }
  }

  updateProposalAndBOM() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();

    // 1. Generate Executive Summary text
    const activeWls = Object.keys(this.state.workloads)
      .filter(w => this.state.workloads[w].active)
      .map(w => COHESITY_DATA.workloadPresets[w].name.split(" (")[0]);
      
    const complianceNames = this.state.project.compliance
      .map(c => COHESITY_DATA.complianceFrameworks[c] ? COHESITY_DATA.complianceFrameworks[c].name.split(" ")[0] : c.toUpperCase());
      
    let summaryText = `This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster sized for <strong>${this.state.project.name}</strong> (Industry: <strong>${this.state.project.industry}</strong>). <br><br>`;
    summaryText += `To protect your front-end workload footprint of <strong>${sizing.frontEndTB} TB</strong> (consisting of ${activeWls.join(", ")}), the system establishes an integrated hyperconverged scale-out storage mesh. Compounded over a 3-year growth forecast and adjusted for GFS snapshot retention targets, the calculated usable storage requirement stands at <strong>${sizing.usableLocalTB} TB</strong>.<br><br>`;
    
    if (this.state.deployment.model === "saas") {
      summaryText += `Based on the selected <strong>SaaS-First Deployment Scenario</strong>, workloads will backup directly to Cohesity Cloud Services SaaS storage pools, removing the need for local hardware node management. `;
    } else {
      summaryText += `To support this requirement locally, Cohesity recommends deploying a <strong>${sizing.nodeRecommendation}</strong>. `;
    }
    
    if (this.state.security.fortknox) {
      summaryText += `To guarantee survivability against active ransomware threats, Cohesity FortKnox cyber vaulting is incorporated, isolating an immutable copy of <strong>${sizing.fortKnoxVaultTB} TB</strong> in a virtually air-gapped SaaS cloud vault. `;
    }
    
    if (this.state.security.datahawk) {
      summaryText += `DataHawk is active to perform machine learning anomaly scanning, Yara threat intelligence signature checks, and automated sensitive data classification. `;
    }
    
    if (complianceNames.length > 0) {
      summaryText += `<br><br>This architecture incorporates structural configurations designed to assist with your regulatory compliance targets for <strong>${complianceNames.join(", ")}</strong>.`;
    }
    
    const bandwidths = this.calculateBandwidth();
    summaryText += `<br><br><strong>Network & Bandwidth Estimates:</strong><br>`;
    summaryText += `• Raw daily backup change volume: <strong>${bandwidths.dailyChangeRawTB} TB/day</strong> (Deduplicated transfer footprint: <strong>${bandwidths.dailyChangeDedupeTB} TB/day</strong>).<br>`;
    summaryText += `• Ingest network link consumption (${bandwidths.ingestHours.toFixed(1)}-hour average backup window): <strong>${bandwidths.ingestDedupeMbps} Mbps</strong> (requires ~<strong>${bandwidths.ingestRawMbps} Mbps</strong> without source-side deduplication).<br>`;
    
    if (this.state.security.fortknox) {
      summaryText += `• Cloud vaulting bandwidth (FortKnox 4-hour sync window): <strong>${bandwidths.vaultMbps} Mbps</strong>.<br>`;
    }
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      summaryText += `• Off-site replication link requirements (4-hour replication window): <strong>${bandwidths.replMbps} Mbps</strong>.<br>`;
    }
    
    this.dom.proposalSummary.innerHTML = summaryText;

    // 2. Generate BOM Table
    let tableHTML = `
      <thead>
        <tr style="border-bottom: 2px solid var(--border-color); background: rgba(255,255,255,0.02);">
          <th style="padding: 12px; font-weight: 600;">Product / Subscription</th>
          <th style="padding: 12px; font-weight: 600; text-align: center;">Qty</th>
          <th style="padding: 12px; font-weight: 600;">Sizing / Configuration Details</th>
          <th style="padding: 12px; font-weight: 600; text-align: right;">Est. Annual Subscription</th>
        </tr>
      </thead>
      <tbody>
    `;
    
    let totalAnnualPrice = 0;
    
    // Line 1: Primary DataProtect Node or SaaS Capacity
    if (this.state.deployment.model === "saas") {
      const pricePerTB = 200; // Annual cost per SaaS TB
      const linePrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += linePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity DataProtect SaaS License</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Fully-managed cloud-to-cloud backup subscription ($200 / TB)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${linePrice.toLocaleString()}</td>
        </tr>
      `;
    } else {
      // Hardware Nodes
      const pricePerNode = 14500; // Annual subscription cost per node (includes support)
      const nodeLinePrice = sizing.localNodeCount * pricePerNode;
      
      // DataProtect capacity subscription
      const pricePerTB = 120; // Annual cost per front-end TB
      const dataProtectPrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += (nodeLinePrice + dataProtectPrice);
      
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity ${sizing.nodeModelName} Nodes</td>
          <td style="padding: 12px; text-align: center;">${sizing.localNodeCount} Nodes</td>
          <td style="padding: 12px; color: var(--text-secondary);">Physical hyperconverged storage nodes (C5000/C6200 hardware subscription)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${nodeLinePrice.toLocaleString()}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity DataProtect Software Suite</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Backup & Instant Recovery software capacity subscription ($120 / Front-End TB)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${dataProtectPrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 2: Cloud Edition Nodes if Cloud Replication Target is active
    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudNodePrice = 9800; // Cloud Virtual Node sub price
      const cloudLinePrice = sizing.cloudNodeCount * cloudNodePrice;
      totalAnnualPrice += cloudLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity Cloud Edition IaaS Virtual Nodes</td>
          <td style="padding: 12px; text-align: center;">${sizing.cloudNodeCount} Nodes</td>
          <td style="padding: 12px; color: var(--text-secondary);">Replication target running in AWS/Azure Virtual private clouds ($9,800 / Node)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${cloudLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 3: FortKnox Cyber Vault
    if (this.state.security.fortknox) {
      const pricePerVaultedTB = 240; // Annual cost per vaulted TB (includes cloud storage & egress)
      const fkLinePrice = sizing.fortKnoxVaultTB * pricePerVaultedTB;
      totalAnnualPrice += fkLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity FortKnox Cloud Cyber Vault</td>
          <td style="padding: 12px; text-align: center;">${sizing.fortKnoxVaultTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Isolated cloud vaulting with virtual air-gap and multi-party quorum control</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${fkLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 4: DataHawk Security
    if (this.state.security.datahawk) {
      const datahawkPricePerTB = 90; // Annual cost per TB
      const dhLinePrice = parseFloat(sizing.frontEndTB) * datahawkPricePerTB;
      totalAnnualPrice += dhLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity DataHawk Threat Scan / Classify</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">AI threat analysis, Yara-rule malware engine, and sensitive data discovery scanner</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${dhLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 5: SiteContinuity Disaster Recovery
    if (this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none") {
      const siteContPrice = 2400; // Flat base annual orchestrator sub
      totalAnnualPrice += siteContPrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity SiteContinuity DR Orchestrator</td>
          <td style="padding: 12px; text-align: center;">Active</td>
          <td style="padding: 12px; color: var(--text-secondary);">Disaster recovery playbook sequencing, network mapping, and failover/failback scripting</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${siteContPrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Total Summary Row
    tableHTML += `
      <tr style="background: rgba(0, 214, 143, 0.05); border-top: 2px solid var(--accent-green);">
        <td style="padding: 16px; font-weight: 700; font-size: 14px;" colspan="3">Estimated Total Cohesity Subscription (Annual Rate)</td>
        <td style="padding: 16px; text-align: right; font-family: var(--font-mono); font-weight: 800; font-size: 16px; color: var(--accent-green);">$${totalAnnualPrice.toLocaleString()}</td>
      </tr>
      </tbody>
    `;
    
    this.dom.proposalBOMTable.innerHTML = tableHTML;

    // 3. Generate Roadmap Timeline HTML
    let roadmapHTML = "";
    
    const roadmapPhases = [
      {
        phase: "Phase 1: Network & Topology Prep",
        desc: "Configure core network configurations. Establish dedicated VLAN interface mappings. Set up firewall rules allowing outbound HTTPS (port 443) telemetry links to Cohesity Helios SaaS portal and isolated SaaS vault endpoints (Cohesity FortKnox)."
      },
      {
        phase: "Phase 2: Cluster Setup & Control Plane Integration",
        desc: "Assemble physical rack nodes (or initialize virtual nodes), install Cohesity DataCloud operating environment, and bind nodes into a resilient scale-out cluster. Register cluster to Helios control plane, and immediately enable Multi-Factor Authentication (MFA) and Multi-Party Authorization (MPA) quorum settings."
      },
      {
        phase: "Phase 3: Workload Connection & SLA Enrollment",
        desc: "Register workload hypervisors (VMware vCenter) and enterprise database instances agentlessly. Configure SLA policy templates setting RPO backup frequencies and retention rules. Schedule backup ingestion tasks to run variable-length global deduplication."
      },
      {
        phase: "Phase 4: Resiliency Testing & Hardening Drills",
        desc: "Enable FortKnox cloud cyber vault replication tasks. Setup DataHawk automated Yara scanning schedules to inspect backups for ransomware indicators. Configure SiteContinuity runbooks matching application startup tiers, and perform non-disruptive disaster recovery sandbox tests."
      }
    ];

    roadmapPhases.forEach((p, idx) => {
      roadmapHTML += `
        <div style="display:flex; gap:12px; align-items:flex-start;">
          <div style="width:24px; height:24px; border-radius:50%; background:rgba(164, 83, 248, 0.15); border: 1.5px solid var(--accent-purple); color:var(--accent-purple); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0;">${idx+1}</div>
          <div>
            <strong style="font-size:13px; color:white; display:block; margin-bottom:3px;">${p.phase}</strong>
            <p style="font-size:11.5px; color:var(--text-secondary); line-height:1.4;">${p.desc}</p>
          </div>
        </div>
      `;
    });

    this.dom.proposalRoadmap.innerHTML = roadmapHTML;

    // 4. Generate Compliance mapping details
    if (this.dom.proposalComplianceSection && this.dom.proposalComplianceMapping) {
      const activeComplianceKeys = this.state.project.compliance || [];
      
      if (activeComplianceKeys.length > 0) {
        this.dom.proposalComplianceSection.style.display = "block";
        let complianceHTML = "";
        
        activeComplianceKeys.forEach(key => {
          const framework = COHESITY_DATA.complianceFrameworks[key];
          if (framework) {
            complianceHTML += `
              <div style="background: rgba(255, 255, 255, 0.01); border: 1px solid var(--border-color); padding: 14px; border-radius: 8px; margin-bottom: 12px;">
                <h4 style="font-size: 13.5px; color: var(--accent-green); margin-bottom: 8px; font-family: 'Outfit';">${framework.name}</h4>
                <div style="display:flex; flex-direction:column; gap:8px;">
            `;
            
            if (framework.details && framework.details.length > 0) {
              framework.details.forEach(item => {
                complianceHTML += `
                  <div style="font-size: 12px; line-height: 1.45;">
                    <strong style="color: white; display: inline-block; margin-right: 6px;">${item.part}:</strong>
                    <span style="color: var(--text-secondary);">${item.how}</span>
                  </div>
                `;
              });
            } else {
              framework.requirements.forEach(req => {
                complianceHTML += `
                  <div style="font-size: 12px; line-height: 1.45; display: flex; align-items: flex-start; gap: 6px;">
                    <span style="color: var(--accent-green);">✔</span>
                    <span style="color: var(--text-secondary);">${req}</span>
                  </div>
                `;
              });
            }
            
            complianceHTML += `
                </div>
              </div>
            `;
          }
        });
        
        this.dom.proposalComplianceMapping.innerHTML = complianceHTML;
      } else {
        this.dom.proposalComplianceSection.style.display = "none";
      }
    }
  }

  copyProposalToClipboard() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();
    
    const activeWls = Object.keys(this.state.workloads)
      .filter(w => this.state.workloads[w].active)
      .map(w => COHESITY_DATA.workloadPresets[w].name.split(" (")[0]);
      
    const complianceNames = this.state.project.compliance
      .map(c => COHESITY_DATA.complianceFrameworks[c] ? COHESITY_DATA.complianceFrameworks[c].name : c.toUpperCase());

    let text = `=========================================
COHESITY SOLUTION ARCHITECTURE PROPOSAL
=========================================
Project: ${this.state.project.name}
Sector: ${this.state.project.industry}
Date: 2026-05-31

1. EXECUTIVE SUMMARY
---------------------
This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster. Sized to meet a front-end workload footprint of ${sizing.frontEndTB} TB (consisting of: ${activeWls.join(", ")}), the system establishes an integrated hyperconverged scale-out storage mesh. Compounded over a 3-year growth forecast and adjusted for GFS snapshot retention targets, the calculated usable storage requirement stands at ${sizing.usableLocalTB} TB.

Deployment model: ${this.state.deployment.model.toUpperCase()} Cloud Scenario.
Recommended primary cluster configuration: ${sizing.nodeRecommendation}.
`;

    if (this.state.security.fortknox) {
      text += `Cohesity FortKnox cloud cyber vaulting is incorporated, isolating an immutable copy of ${sizing.fortKnoxVaultTB} TB in a virtually air-gapped SaaS cloud vault.\n`;
    }
    if (this.state.security.datahawk) {
      text += `DataHawk is active to perform machine learning anomaly scanning, Yara threat intelligence signature checks, and automated sensitive data classification.\n`;
    }
    if (complianceNames.length > 0) {
      text += `\nRegulatory Compliance Alignment Targets: ${complianceNames.join(", ")}.\n`;
    }
 
    const bandwidths = this.calculateBandwidth();
    text += `\nNetwork & Bandwidth Sizing:\n`;
    text += `- Daily Backup Change Rate (Raw): ${bandwidths.dailyChangeRawTB} TB/day\n`;
    text += `- Daily Backup Change Rate (Deduplicated): ${bandwidths.dailyChangeDedupeTB} TB/day\n`;
    text += `- Recommended Ingest Connection (${bandwidths.ingestHours.toFixed(1)}h average backup window): ${bandwidths.ingestDedupeMbps} Mbps (requires ~${bandwidths.ingestRawMbps} Mbps raw link)\n`;
    
    if (this.state.security.fortknox) {
      text += `- FortKnox SaaS Vault Replication (4h SLA): ${bandwidths.vaultMbps} Mbps\n`;
    }
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      text += `- Secondary Replication Link (4h SLA): ${bandwidths.replMbps} Mbps\n`;
    }

    text += `
2. BILL OF MATERIALS (BOM) & PRICING
-------------------------------------
Estimated Annual Subscription Details:
- Front-End Sized Data: ${sizing.frontEndTB} TB
- Local Sized Usable Target: ${sizing.usableLocalTB} TB
`;

    let totalAnnualPrice = 0;
    if (this.state.deployment.model === "saas") {
      const linePrice = parseFloat(sizing.frontEndTB) * 200;
      totalAnnualPrice += linePrice;
      text += `- Cohesity DataProtect SaaS subscription: $${linePrice.toLocaleString()}/yr\n`;
    } else {
      const nodePrice = sizing.localNodeCount * 14500;
      const protectPrice = parseFloat(sizing.frontEndTB) * 120;
      totalAnnualPrice += (nodePrice + protectPrice);
      text += `- Cohesity physical nodes (${sizing.nodeModelName}): $${nodePrice.toLocaleString()}/yr\n`;
      text += `- Cohesity DataProtect capacity license: $${protectPrice.toLocaleString()}/yr\n`;
    }

    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudPrice = sizing.cloudNodeCount * 9800;
      totalAnnualPrice += cloudPrice;
      text += `- Cohesity Cloud Edition virtual nodes: $${cloudPrice.toLocaleString()}/yr\n`;
    }
    if (this.state.security.fortknox) {
      const fkPrice = sizing.fortKnoxVaultTB * 240;
      totalAnnualPrice += fkPrice;
      text += `- Cohesity FortKnox Cyber Vault capacity: $${fkPrice.toLocaleString()}/yr\n`;
    }
    if (this.state.security.datahawk) {
      const dhPrice = parseFloat(sizing.frontEndTB) * 90;
      totalAnnualPrice += dhPrice;
      text += `- Cohesity DataHawk ML scan & classification: $${dhPrice.toLocaleString()}/yr\n`;
    }
    if (this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none") {
      const scPrice = 2400;
      totalAnnualPrice += scPrice;
      text += `- Cohesity SiteContinuity DR flat subscription: $${scPrice.toLocaleString()}/yr\n`;
    }

    text += `\nEstimated Total Cohesity Subscription (Annual Rate): $${totalAnnualPrice.toLocaleString()}/yr\n`;

    text += `
3. ARCHITECTURAL DEPLOYMENT ROADMAP
------------------------------------
Phase 1: Configure core network configurations, establish VLAN interface mappings, set firewall outbound rules (port 443) to Helios and FortKnox.
Phase 2: Assemble hardware nodes, install Cohesity DataCloud, register cluster on Helios, and enable MFA and MPA quorum.
Phase 3: Register hypervisors (VMware vCenter) and database instances. Apply SLA policies mapping workloads to RPO/RTO goals.
Phase 4: Enable FortKnox vaulting tasks, activate DataHawk scanner routines, configure SiteContinuity runbooks, and perform non-disruptive DR tests.

4. COMPLIANCE & CYBER DEFENSE HARDENING INDEX
----------------------------------------------
Overall Cyber Resilience Index: ${compliance.score}/100
Rating Level: ${compliance.score >= 80 ? 'EXEMPLARY' : compliance.score >= 50 ? 'VULNERABLE' : 'CRITICAL RISK'}

Security checks log:
`;

    const securityChecks = [
      { label: "DataLock snapshot immutability enforced (WORM)", pass: true },
      { label: "Helios Control Plane Multi-Factor Auth (MFA)", pass: this.state.security.mfa },
      { label: "Helios Multi-Party Approval (MPA) Quorum active", pass: this.state.security.mpa },
      { label: "Isolated off-site air-gapped recovery (FortKnox)", pass: this.state.security.fortknox },
      { label: "Real-time AI malware anomaly scanning (DataHawk)", pass: this.state.security.datahawk },
      { label: "Enterprise Key Management integration (KMS)", pass: this.state.security.kms === "customer" }
    ];

    securityChecks.forEach(check => {
      text += `- ${check.label}: [${check.pass ? 'PASS' : 'FAIL'}]\n`;
    });

    const activeComplianceKeys = this.state.project.compliance || [];
    if (activeComplianceKeys.length > 0) {
      text += `\n5. DATA GOVERNANCE & REGULATORY COMPLIANCE MAPPING\n`;
      text += `--------------------------------------------------\n`;
      
      activeComplianceKeys.forEach(key => {
        const framework = COHESITY_DATA.complianceFrameworks[key];
        if (framework) {
          text += `\n* ${framework.name} *\n`;
          if (framework.details && framework.details.length > 0) {
            framework.details.forEach(item => {
              text += `- [${item.part}] ${item.how}\n`;
            });
          } else {
            framework.requirements.forEach(req => {
              text += `- ${req}\n`;
            });
          }
        }
      });
    }
 
    navigator.clipboard.writeText(text);
    
    // Visual button feedback
    const originalText = this.dom.btnCopyProposal.innerHTML;
    this.dom.btnCopyProposal.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle;">check</span> Proposal Copied!`;
    setTimeout(() => {
      this.dom.btnCopyProposal.innerHTML = originalText;
    }, 2000);
  }

  renderTopologyDiagram() {
    const sizing = this.calculateSizing();
    const bandwidths = this.calculateBandwidth();
    const isFortKnox = this.state.security.fortknox;
    const isDataHawk = this.state.security.datahawk;
    const replMode = this.state.bcdr.replication;
    
    let svgContent = `
      <svg viewBox="0 0 800 380" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="greenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00ffb7" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#00d68f" stop-opacity="0.6"/>
          </linearGradient>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#00d2ff" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#0084ff" stop-opacity="0.6"/>
          </linearGradient>
          <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#cc80ff" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#a453f8" stop-opacity="0.6"/>
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
 
        <!-- GRID BACKGROUND -->
        <g stroke="#ffffff" stroke-opacity="0.02" stroke-width="1">
          <line x1="0" y1="50" x2="800" y2="50" />
          <line x1="0" y1="100" x2="800" y2="100" />
          <line x1="0" y1="150" x2="800" y2="150" />
          <line x1="0" y1="200" x2="800" y2="200" />
          <line x1="0" y1="250" x2="800" y2="250" />
          <line x1="0" y1="300" x2="800" y2="300" />
          <line x1="100" y1="0" x2="100" y2="380" />
          <line x1="200" y1="0" x2="200" y2="380" />
          <line x1="300" y1="0" x2="300" y2="380" />
          <line x1="400" y1="0" x2="400" y2="380" />
          <line x1="500" y1="0" x2="500" y2="380" />
          <line x1="600" y1="0" x2="600" y2="380" />
          <line x1="700" y1="0" x2="700" y2="380" />
        </g>
    `;
 
    // 1. WORKLOADS (Left column)
    const activeWls = Object.keys(this.state.workloads).filter(k => this.state.workloads[k].active);
    let wlStartY = 80;
    const wlSpacing = 50;
 
    activeWls.forEach((wlKey, idx) => {
      const wl = this.state.workloads[wlKey];
      const yPos = wlStartY + (idx * wlSpacing);
      const iconChar = wlKey === "vm" ? "🖥️" : wlKey === "database" ? "🛢️" : wlKey === "files" ? "📁" : wlKey === "saas" ? "☁️" : "☸️";
      
      const wlPreset = COHESITY_DATA.workloadPresets[wlKey];
      const dailyRate = wlPreset ? wlPreset.dailyChangeRate : 3;
      const rawChange = wl.capacityTB * (dailyRate / 100);
      const dedupeChange = rawChange / wl.dedupe;
      const wlIngestMbps = Math.ceil((dedupeChange * 8000000) / ((wl.windowHours || 8) * 3600));
 
      svgContent += `
        <!-- Workload Link to Cluster -->
        <path d="M 170 ${yPos} Q 250 ${yPos}, 330 190" fill="none" stroke="var(--accent-blue)" stroke-opacity="0.3" stroke-width="2" />
        <path d="M 170 ${yPos} Q 250 ${yPos}, 330 190" class="flow-line" fill="none" stroke="var(--accent-blue)" stroke-opacity="0.8" stroke-width="2" />
        
        <!-- Workload Bubble -->
        <g class="svg-hotspot" cursor="pointer" onclick="app.showHotspot('wl-${wlKey}')">
          <circle cx="100" cy="${yPos}" r="22" fill="#121a2f" stroke="var(--accent-blue)" stroke-width="1.5" />
          <text x="100" y="${yPos + 5}" font-size="16" text-anchor="middle">${iconChar}</text>
          <text x="135" y="${yPos - 2}" font-size="11" font-family="Inter" font-weight="700" fill="white">${wlKey.toUpperCase()}</text>
          <text x="135" y="${yPos + 10}" font-size="9" font-family="JetBrains Mono" fill="var(--text-secondary)">${wl.capacityTB} TB (~${wlIngestMbps} Mbps)</text>
        </g>
      `;
    });

    if (activeWls.length === 0) {
      svgContent += `
        <text x="100" y="190" font-family="Inter" font-size="12" fill="var(--accent-red)" text-anchor="middle" font-weight="600">❌ No Workloads Active</text>
      `;
    }

    // 2. PRIMARY COHESITY CLUSTER (Center)
    const clusterX = 380;
    const clusterY = 190;

    svgContent += `
      <!-- CLUSTER CONTAINER -->
      <g class="svg-hotspot" cursor="pointer" onclick="app.showHotspot('cluster')">
        <!-- DataHawk Scan rays behind cluster -->
        ${isDataHawk ? `
          <circle cx="${clusterX}" cy="${clusterY}" r="95" fill="none" stroke="var(--accent-purple)" stroke-width="1" stroke-dasharray="4,6" opacity="0.4" />
          <circle cx="${clusterX}" cy="${clusterY}" r="75" class="pulse-circle" fill="none" stroke="var(--accent-purple)" stroke-width="1" opacity="0.5" />
        ` : ''}

        <rect x="${clusterX - 55}" y="${clusterY - 60}" width="110" height="120" rx="10" fill="#0d1424" stroke="var(--accent-green)" stroke-width="2" filter="url(#glow)" />
        
        <!-- Inside Cluster representation: Hardware nodes -->
        <rect x="${clusterX - 45}" y="${clusterY - 45}" width="90" height="20" rx="4" fill="#18233c" stroke="var(--border-color)" />
        <circle cx="${clusterX - 35}" cy="${clusterY - 35}" r="3" fill="var(--accent-green)" />
        <line x1="${clusterX - 25}" y1="${clusterY - 35}" x2="${clusterX + 35}" y2="${clusterY - 35}" stroke="hsla(0,0%,100%,0.2)" stroke-width="4" stroke-dasharray="2,3" />

        <rect x="${clusterX - 45}" y="${clusterY - 18}" width="90" height="20" rx="4" fill="#18233c" stroke="var(--border-color)" />
        <circle cx="${clusterX - 35}" cy="${clusterY - 8}" r="3" fill="var(--accent-green)" />
        <line x1="${clusterX - 25}" y1="${clusterY - 8}" x2="${clusterX + 35}" y2="${clusterY - 8}" stroke="hsla(0,0%,100%,0.2)" stroke-width="4" stroke-dasharray="2,3" />

        <rect x="${clusterX - 45}" y="${clusterY + 10}" width="90" height="20" rx="4" fill="#18233c" stroke="var(--border-color)" />
        <circle cx="${clusterX - 35}" cy="${clusterY + 20}" r="3" fill="var(--accent-green)" />
        <line x1="${clusterX - 25}" y1="${clusterY + 20}" x2="${clusterX + 35}" y2="${clusterY + 20}" stroke="hsla(0,0%,100%,0.2)" stroke-width="4" stroke-dasharray="2,3" />

        <text x="${clusterX}" y="${clusterY + 45}" font-family="Inter" font-size="9" fill="white" font-weight="600" text-anchor="middle">COHESITY CLUSTER</text>
        <text x="${clusterX}" y="${clusterY + 54}" font-family="JetBrains Mono" font-size="8" fill="var(--accent-green)" text-anchor="middle" font-weight="700">
          ${sizing.localNodeCount > 0 ? `${sizing.localNodeCount}x Nodes` : 'SaaS Pool'}
        </text>

        <!-- DataHawk scanner tag -->
        ${isDataHawk ? `
          <g transform="translate(${clusterX - 15}, ${clusterY - 80})">
            <rect x="-35" y="-12" width="100" height="18" rx="4" fill="#a453f8" />
            <text x="15" y="0" font-family="Inter" font-size="8" font-weight="700" fill="white" text-anchor="middle">🦅 DATAHAWK SCAN</text>
          </g>
        ` : ''}
      </g>
    `;

    // 3. TARGET REPLICATIONS (Right Column)

    // SaaS Cyber Vault (FortKnox) - Right Top
    if (isFortKnox) {
      const fkX = 630;
      const fkY = 100;
      
      svgContent += `
        <!-- Replication Link: Cluster to FortKnox -->
        <path d="M ${clusterX + 55} ${clusterY - 30} Q 500 100, ${fkX - 60} ${fkY}" fill="none" stroke="var(--accent-purple)" stroke-width="1.5" stroke-dasharray="4,4" />
        <path d="M ${clusterX + 55} ${clusterY - 30} Q 500 100, ${fkX - 60} ${fkY}" class="flow-line" fill="none" stroke="var(--accent-purple)" stroke-opacity="0.8" stroke-width="1.5" />
 
        <!-- FortKnox Replication Bandwidth Badge -->
        <g transform="translate(490, 115)">
          <rect x="-30" y="-8" width="60" height="15" rx="3" fill="#121a2f" stroke="var(--accent-purple)" stroke-width="1" />
          <text x="0" y="3" font-family="JetBrains Mono" font-size="8" font-weight="700" fill="var(--accent-purple)" text-anchor="middle">${bandwidths.vaultMbps} Mbps</text>
        </g>

        <!-- FortKnox Node Group -->
        <g class="svg-hotspot" cursor="pointer" onclick="app.showHotspot('fortknox')">
          <circle cx="${fkX}" cy="${fkY}" r="38" fill="none" stroke="var(--accent-purple)" stroke-width="1.5" stroke-dasharray="4,4" />
          <circle cx="${fkX}" cy="${fkY}" r="30" fill="#0d1424" stroke="var(--accent-purple)" stroke-width="2" filter="url(#glow)" />
          
          <!-- Padlock Drawing -->
          <path d="M ${fkX - 6} ${fkY - 4} L ${fkX - 6} ${fkY + 10} L ${fkX + 6} ${fkY + 10} L ${fkX + 6} ${fkY - 4} Z" fill="none" stroke="var(--accent-purple)" stroke-width="1.5"/>
          <path d="M ${fkX - 4} ${fkY - 4} A 4 4 0 0 1 ${fkX + 4} ${fkY - 4}" fill="none" stroke="var(--accent-purple)" stroke-width="1.5"/>
          <circle cx="${fkX}" cy="${fkY + 2}" r="1.5" fill="var(--accent-purple)"/>
 
          <text x="${fkX}" y="${fkY + 54}" font-family="Inter" font-size="10" font-weight="700" fill="white" text-anchor="middle">FortKnox SaaS</text>
          <text x="${fkX}" y="${fkY + 65}" font-family="JetBrains Mono" font-size="9" fill="var(--accent-purple)" text-anchor="middle" font-weight="700">Vault: ${sizing.fortKnoxVaultTB} TB</text>
        </g>
      `;
    }
 
    // Secondary Site or Public Cloud Edition - Right Bottom
    if (replMode !== "none") {
      const repX = 630;
      const repY = 270;
      let label = "Secondary Node";
      let icon = "🏢";
      let detail = `${sizing.usableLocalTB} TB Usable`;
      let replColor = "var(--accent-blue)";
      let flowColor = "var(--accent-blue)";
      let hotspotId = "repl-second-site";
 
      if (replMode === "cloud-edition") {
        label = "Cloud Edition";
        icon = "☁️ AWS/Azure";
        detail = `${sizing.cloudNodeCount}x Virtual Nodes`;
        replColor = "var(--accent-blue)";
        flowColor = "var(--accent-blue)";
        hotspotId = "repl-cloud-edition";
      } else if (replMode === "saas-vault" && !isFortKnox) {
        // Vault is configured but FortKnox check is off? (Sync issue). Make it SaaS storage pool.
        label = "SaaS Storage";
        icon = "📦";
        detail = "Standard Cloud Storage";
        replColor = "var(--text-secondary)";
        flowColor = "hsla(0,0%,100%,0.2)";
        hotspotId = "repl-saas";
      }
 
      svgContent += `
        <!-- Replication Path to Secondary -->
        <path d="M ${clusterX + 55} ${clusterY + 30} Q 500 270, ${repX - 50} ${repY}" fill="none" stroke="${flowColor}" stroke-opacity="0.3" stroke-width="1.5" />
        <path d="M ${clusterX + 55} ${clusterY + 30} Q 500 270, ${repX - 50} ${repY}" class="flow-line" fill="none" stroke="${flowColor}" stroke-opacity="0.8" stroke-width="1.5" />
 
        <!-- Secondary Replication Bandwidth Badge -->
        <g transform="translate(500, 240)">
          <rect x="-30" y="-8" width="60" height="15" rx="3" fill="#121a2f" stroke="${replColor}" stroke-width="1" />
          <text x="0" y="3" font-family="JetBrains Mono" font-size="8" font-weight="700" fill="${replColor}" text-anchor="middle">${bandwidths.replMbps} Mbps</text>
        </g>

        <g class="svg-hotspot" cursor="pointer" onclick="app.showHotspot('${hotspotId}')">
          <rect x="${repX - 45}" y="${repY - 35}" width="90" height="70" rx="8" fill="#0d1424" stroke="${replColor}" stroke-width="1.5" />
          <text x="${repX}" y="${repY - 8}" font-size="16" text-anchor="middle">${icon}</text>
          <text x="${repX}" y="${repY + 12}" font-family="Inter" font-size="10" font-weight="700" fill="white" text-anchor="middle">${label}</text>
          <text x="${repX}" y="${repY + 23}" font-family="JetBrains Mono" font-size="8" fill="${replColor}" text-anchor="middle" font-weight="600">${detail}</text>
        </g>
      `;
    }

    svgContent += `
      </svg>
    `;

    this.dom.svgContainer.innerHTML = svgContent;
  }

  showHotspot(id) {
    const details = {
      "wl-vm": {
        title: "VMware / Hyper-V Workloads",
        content: `Sized Capacity: <strong>${this.state.workloads.vm.capacityTB} TB</strong><br>
                  Expected Compound Growth: <strong>${this.state.workloads.vm.growth}% / year</strong><br>
                  Target Deduplication Rate: <strong>${this.state.workloads.vm.dedupe}:1</strong><br>
                  Backup Window SLA: <strong>${this.state.workloads.vm.windowHours || 8} hrs</strong><br>
                  Recommended Policy: Cohesity DataProtect dynamic VM policies, leveraging vSphere Storage APIs (VADP) with CBT tracking for near-zero backup windows.`
      },
      "wl-database": {
        title: "Database Tier Sizing",
        content: `Sized Capacity: <strong>${this.state.workloads.database.capacityTB} TB</strong><br>
                  Dedupe Factor: <strong>${this.state.workloads.database.dedupe}:1</strong><br>
                  Backup Window SLA: <strong>${this.state.workloads.database.windowHours || 8} hrs</strong><br>
                  Database change rate is set to 5% daily. To facilitate instant recovery, Cohesity maps backups directly to its custom POSIX-compliant file system (SpanFS), mounting the SQL/Oracle datastore directly on the backup node for instantaneous spin-up.`
      },
      "wl-files": {
        title: "Unstructured File Data (SmartFiles)",
        content: `Capacity: <strong>${this.state.workloads.files.capacityTB} TB</strong><br>
                  Backup Window SLA: <strong>${this.state.workloads.files.windowHours || 8} hrs</strong><br>
                  SmartFiles leverages global deduplication to tier cold objects. By integrating direct file protocol hooks (NFS/SMB), Cohesity acts as a scale-out NAS, offering rapid retrieval without consuming expensive primary SSD storage.`
      },
      "wl-saas": {
        title: "SaaS App Protection",
        content: `Capacity: <strong>${this.state.workloads.saas.capacityTB} TB</strong><br>
                  Backup Window SLA: <strong>${this.state.workloads.saas.windowHours || 8} hrs</strong><br>
                  Fully manages backup tasks for Microsoft 365 (Exchange, OneDrive, SharePoint, Teams) and Salesforce data. Runs completely agentless inside the Cohesity Cloud Services SaaS control plane.`
      },
      "wl-k8s": {
        title: "Kubernetes Workloads",
        content: `Capacity: <strong>${this.state.workloads.k8s.capacityTB} TB</strong><br>
                  Backup Window SLA: <strong>${this.state.workloads.k8s.windowHours || 8} hrs</strong><br>
                  Integrates with CSI drivers to snapshot and store stateful Kubernetes volumes along with full application manifests (Helm, namespaces, deployment configurations) to accelerate microservice failover.`
      },
      "cluster": {
        title: "Primary Cohesity Cluster",
        content: `Calculated Local Node Count: <strong>${this.calculateSizing().localNodeCount} Nodes</strong><br>
                  Model Type: <strong>${this.calculateSizing().nodeModelName}</strong><br>
                  This scale-out hyperconverged cluster forms the core of your architectural design. It features global, variable-length deduplication, hardware compression, and built-in N+1 node survivability.`
      },
      "fortknox": {
        title: "Cohesity FortKnox Cyber Vault",
        content: `Sized Vault Storage: <strong>${this.calculateSizing().fortKnoxVaultTB} TB</strong><br>
                  Ransomware Resilience: <strong>Immutability & Virtual Air-Gap</strong><br>
                  Configures an outbound-only connection mapping backups directly into a secure, Cohesity-managed AWS cloud vault. Features strict compliance locks and multi-party quorum triggers preventing deletion actions during active attacks.`
      },
      "repl-second-site": {
        title: "Disaster Recovery (Secondary Site)",
        content: `Provides an identical physical node cluster mapped to a disaster recovery location. Mapped via Cohesity SiteContinuity for automated replication, runbook failover sequencing, and continuous DR readiness audits.`
      },
      "repl-cloud-edition": {
        title: "Cloud Edition (Replication Target)",
        content: `Calculated Target Virtual Nodes: <strong>${this.calculateSizing().cloudNodeCount} Nodes</strong><br>
                  Runs directly inside public cloud VPC (AWS EC2 / Azure VMs) providing a replica backup pool. Supports instant recovery directly into AWS EC2 instances during primary site failure.`
      }
    };

    const info = details[id];
    if (info) {
      this.dom.hotspotOverlay.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
          <strong style="color:var(--accent-green); font-size:12px;">${info.title}</strong>
          <span style="cursor:pointer; color:var(--text-muted);" onclick="app.closeHotspot()">✕</span>
        </div>
        <div>${info.content}</div>
      `;
      this.dom.hotspotOverlay.style.display = "block";
    }
  }

  closeHotspot() {
    this.dom.hotspotOverlay.style.display = "none";
  }

  generateReportAndPrint() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();

    // Renders structural data inside the print section
    let workloadsHTML = "";
    Object.keys(this.state.workloads).forEach(type => {
      const wl = this.state.workloads[type];
      if (wl.active) {
        workloadsHTML += `
          <tr>
            <td>${COHESITY_DATA.workloadPresets[type].name}</td>
            <td>${wl.capacityTB} TB</td>
            <td>${wl.growth}%</td>
            <td>${wl.dedupe}:1</td>
            <td>${wl.retentionDays} Days</td>
          </tr>
        `;
      }
    });

    let checklistHTML = "";
    compliance.deductList.forEach(item => {
      checklistHTML += `
        <div style="margin-bottom: 6px; font-size: 10pt; color: #a83232;">
          ⚠️ ${item}
        </div>
      `;
    });
    if (compliance.deductList.length === 0) {
      checklistHTML = `<div style="color: #2b701d; font-weight: bold;">✅ Exemplary Cyber Security: All primary hardening checks are passing!</div>`;
    }

    let printComplianceHTML = "";
    const activeComplianceKeys = this.state.project.compliance || [];
    if (activeComplianceKeys.length > 0) {
      printComplianceHTML += `
        <div class="print-page" style="page-break-before: always;">
          <div class="print-header">
            <h1 style="font-size: 20pt; margin: 0; color: #111;">Cohesity Solution Design (Cont.)</h1>
            <p style="font-size: 9pt; color: #666; margin: 4px 0 0 0;">Project: ${this.state.project.name} | Governance Details</p>
          </div>
          <div class="print-section">
            <h2>6. Regulatory Compliance & Data Governance Mapping</h2>
            <p>The Cohesity DataCloud architecture is designed to map directly to strict regulatory framework requirements. Below is the mapping detail for the selected compliance frameworks:</p>
      `;

      activeComplianceKeys.forEach(key => {
        const framework = COHESITY_DATA.complianceFrameworks[key];
        if (framework) {
          printComplianceHTML += `
            <div style="margin-top: 14px; border: 1px solid #ddd; padding: 10px; border-radius: 6px; page-break-inside: avoid;">
              <h3 style="font-size: 11pt; color: #1e7e34; margin: 0 0 6px 0; border-bottom: 1.5px solid #eee; padding-bottom: 4px; font-weight: 700;">${framework.name}</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid #ccc; font-weight: bold; background: #fafafa;">
                    <th style="padding: 6px 4px; width: 30%;">Requirement / Clause</th>
                    <th style="padding: 6px 4px;">Architectural Compliance Resolution</th>
                  </tr>
                </thead>
                <tbody>
          `;

          if (framework.details && framework.details.length > 0) {
            framework.details.forEach(item => {
              printComplianceHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 4px; font-weight: bold; vertical-align: top; color: #333;">${item.part}</td>
                  <td style="padding: 6px 4px; vertical-align: top; color: #555; line-height: 1.3;">${item.how}</td>
                </tr>
              `;
            });
          } else {
            framework.requirements.forEach(req => {
              printComplianceHTML += `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 4px; font-weight: bold; vertical-align: top; color: #333;">General Requirement</td>
                  <td style="padding: 6px 4px; vertical-align: top; color: #555; line-height: 1.3;">${req}</td>
                </tr>
              `;
            });
          }

          printComplianceHTML += `
                </tbody>
              </table>
            </div>
          `;
        }
      });

      printComplianceHTML += `
          </div>
        </div>
      `;
    }

    const printWrapper = document.getElementById("printable-report-wrapper");
    printWrapper.innerHTML = `
      <div class="print-page">
        <div class="print-header">
          <div>
            <h1>Cohesity Solution Design</h1>
            <p style="font-size: 10pt; color: #666; margin-top: 4px;">Prepared for: ${this.state.project.name} | Sector: ${this.state.project.industry}</p>
          </div>
          <div style="text-align: right;">
            <div style="font-weight: bold; font-size: 12pt;">Cohesity Architect Toolkit</div>
            <div style="font-size: 8pt; color: #888;">Generated: 2026-05-30</div>
          </div>
        </div>

        <div class="print-section">
          <h2>1. Executive Summary</h2>
          <p>This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster. Sized to meet a front-end workload footprint of <strong>${sizing.frontEndTB} TB</strong>, the system consolidates backup datasets into an integrated, secure scale-out pool reducing storage overhead through deduplication and compression.</p>
          
          <div class="print-bom-summary">
            <div class="print-bom-col">
              <h3>Front-End Data</h3>
              <div class="print-bom-val">${sizing.frontEndTB} TB</div>
            </div>
            <div class="print-bom-col">
              <h3>Sized Usable Storage</h3>
              <div class="print-bom-val" style="color:var(--accent-blue)">${sizing.usableLocalTB} TB</div>
            </div>
            <div class="print-bom-col">
              <h3>Cyber Resiliency Score</h3>
              <div class="print-bom-val" style="color:#ff9900">${compliance.score}/100</div>
            </div>
          </div>
        </div>

        <div class="print-section">
          <h2>2. Recommended Hardware Configuration (BOM)</h2>
          <table class="print-table">
            <thead>
              <tr>
                <th>Component / License</th>
                <th>Quantity</th>
                <th>Sizing / Model Details</th>
                <th>Architectural Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Cohesity Nodes</strong></td>
                <td>${sizing.localNodeCount > 0 ? `${sizing.localNodeCount}x Nodes` : 'SaaS'}</td>
                <td>${sizing.nodeRecommendation}</td>
                <td>Primary backup ingestion, storage deduplication, and instant restores</td>
              </tr>
              <tr>
                <td><strong>Cohesity DataProtect Subscription</strong></td>
                <td>${sizing.frontEndTB} TB</td>
                <td>Front-End Capacity Licensing</td>
                <td>Agentless backup & rapid mass restore licenses for active workloads</td>
              </tr>
              ${this.state.security.fortknox ? `
                <tr>
                  <td><strong>Cohesity FortKnox Vault License</strong></td>
                  <td>${sizing.fortKnoxVaultTB} TB</td>
                  <td>SaaS-managed Cloud Vaulting (AWS Cold Storage)</td>
                  <td>Virtual air-gapped immutable copy providing protection against ransomware root-deletion</td>
                </tr>
              ` : ''}
              ${this.state.security.datahawk ? `
                <tr>
                  <td><strong>Cohesity DataHawk Subscription</strong></td>
                  <td>${sizing.frontEndTB} TB</td>
                  <td>AI Threat Detection & Classification</td>
                  <td>ML anomaly identification, Yara signature malware scans, and sensitive data PII indexing</td>
                </tr>
              ` : ''}
              ${this.state.bcdr.siteContinuity ? `
                <tr>
                  <td><strong>Cohesity SiteContinuity License</strong></td>
                  <td>Active</td>
                  <td>Disaster Recovery Orchestrator</td>
                  <td>Automates multi-tier app failover workflows and sandbox compliance reporting</td>
                </tr>
              ` : ''}
            </tbody>
          </table>
        </div>

        <div class="print-section">
          <h2>3. Protected Workloads Profile</h2>
          <table class="print-table">
            <thead>
              <tr>
                <th>Workload Category</th>
                <th>Sized Capacity</th>
                <th>Growth Rate (Annual)</th>
                <th>Deduplication Preset</th>
                <th>Retention SLA</th>
              </tr>
            </thead>
            <tbody>
              ${workloadsHTML}
            </tbody>
          </table>
        </div>
      </div>

      <div class="print-page" style="page-break-before: always;">
        <div class="print-header">
          <h1>Cohesity Solution Design (Cont.)</h1>
          <div style="font-size: 8pt; color: #888;">Project: ${this.state.project.name}</div>
        </div>

        <div class="print-section">
          <h2>4. Security Hardening & Cyber Resiliency Assessment</h2>
          <p style="margin-bottom: 12px;">Cohesity features a Zero Trust architecture. The table below represents the active hardening controls implemented within this proposed design layout:</p>
          <table class="print-table">
            <thead>
              <tr>
                <th>Security Control Item</th>
                <th>Implementation Status</th>
                <th>Value Proposition</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Helios Control Plane Access</td>
                <td><span class="print-badge" style="${this.state.security.mfa ? 'background:#e2fbe8;color:#1e7e34;' : 'background:#fce8e6;color:#a83232;'}">${this.state.security.mfa ? 'MFA ACTIVE' : 'DISABLED'}</span></td>
                <td>Restricts backup control access through multi-factor validation logs.</td>
              </tr>
              <tr>
                <td>Multi-Party Quorum Approval (MPA)</td>
                <td><span class="print-badge" style="${this.state.security.mpa ? 'background:#e2fbe8;color:#1e7e34;' : 'background:#fce8e6;color:#a83232;'}">${this.state.security.mpa ? 'MPA ENFORCED' : 'DISABLED'}</span></td>
                <td>Forces security team approvals before destructive actions or snapshot deletions occur.</td>
              </tr>
              <tr>
                <td>Data Immutability (DataLock)</td>
                <td><span class="print-badge" style="background:#e2fbe8;color:#1e7e34;">WORM ENFORCED</span></td>
                <td>Prevents alteration or administrative deletion of snapshots once captured.</td>
              </tr>
              <tr>
                <td>External Key Management System</td>
                <td><span class="print-badge">${this.state.security.kms === "customer" ? 'CUSTOMER KMS' : 'DEFAULT'}</span></td>
                <td>Encrypts all data at rest using isolated corporate encryption key chains.</td>
              </tr>
            </tbody>
          </table>

          <h3 style="font-size: 13px; margin: 16px 0 8px 0; color: #1a1a1a;">Resiliency Gap Analysis & Risks Identified:</h3>
          ${checklistHTML}
        </div>

        <div class="print-section">
          <h2>5. Integration Playbook Roadmap</h2>
          <p>Successful implementation coordinates Cohesity controls with standard enterprise workflows:</p>
          <div style="margin-top: 10px; border-left: 3px solid #00d68f; padding-left: 12px; font-size: 10pt;">
            <strong>Phase 1: Cluster Network Setup</strong><br>
            Provision VLAN networks with 10GbE / 25GbE connectivity. Direct outbound HTTPS firewall rules for Cohesity Helios SaaS telemetry and Cohesity FortKnox cloud endpoints.
          </div>
          <div style="margin-top: 10px; border-left: 3px solid #00d68f; padding-left: 12px; font-size: 10pt;">
            <strong>Phase 2: Snapshot Protection Setup</strong><br>
            Configure VMware VCenter credential bindings. Apply backup SLA policies mapping database workloads to RPO/RTO goals.
          </div>
          <div style="margin-top: 10px; border-left: 3px solid #00d68f; padding-left: 12px; font-size: 10pt;">
            <strong>Phase 3: Security & SIEM Connection</strong><br>
            Configure API webhooks connecting Cohesity DataHawk threat anomaly feeds into enterprise SIEM (Splunk, Microsoft Sentinel) for immediate security operations alerting.
          </div>
        </div>
      </div>
      ${printComplianceHTML}
    `;

    window.print();
  }
}

// Instantiate and initialize the app
const app = new CohesityArchitectWizard();
document.addEventListener("DOMContentLoaded", () => {
  app.init();
});
window.app = app;
