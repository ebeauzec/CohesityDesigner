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
      sites: [
        {
          id: "site-primary",
          name: "Primary Data Center",
          workloads: {
            vm: { active: true, capacityTB: 50, growth: 10, dedupe: 2.5, retentionDays: 30, windowHours: 8 },
            database: { active: true, capacityTB: 20, growth: 15, dedupe: 3.0, retentionDays: 14, windowHours: 8 },
            files: { active: false, capacityTB: 100, growth: 20, dedupe: 1.4, retentionDays: 90, windowHours: 8 },
            saas: { active: false, capacityTB: 10, growth: 12, dedupe: 2.0, retentionDays: 365, windowHours: 8 },
            k8s: { active: false, capacityTB: 5, growth: 15, dedupe: 2.0, retentionDays: 30, windowHours: 8 }
          }
        }
      ],
      activeSiteId: "site-primary",
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
        nodePreference: "flash", // 'flash', 'hybrid', 'entry'
        edition: "enterprise" // 'core', 'enterprise' - driven by the DataHawk/Threat Defense toggle
      },
      pricing: {
        saasTB: 200,
        physicalNode: 14500,
        dataprotectTB: 120,
        cloudNode: 9800,
        fortknoxTB: 240,
        enterpriseUpliftTB: 45,
        sitecontinuityFlat: 2400,
        primaryStorageCostPerTB: 600 // illustrative legacy primary-storage $/TB, used only for the TCO estimate
      }
    };

    Object.defineProperty(this.state, 'workloads', {
      get: () => this.getActiveSite().workloads,
      configurable: true,
      enumerable: true
    });

    // DOM Elements Cache
    this.dom = {};
  }

  getActiveSite() {
    return this.state.sites.find(s => s.id === this.state.activeSiteId) || this.state.sites[0];
  }

  getFormattedDate() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  getNetworkPorts() {
    const isVmActive = this.state.sites.some(site => site.workloads.vm.active);
    const isDbActive = this.state.sites.some(site => site.workloads.database.active);
    const isFilesActive = this.state.sites.some(site => site.workloads.files.active);
    const isSaasActive = this.state.sites.some(site => site.workloads.saas.active);
    const isK8sActive = this.state.sites.some(site => site.workloads.k8s.active);
    
    const isReplicationActive = this.state.bcdr.replication !== "none";
    const isFortKnoxActive = this.state.security.fortknox;

    return [
      { port: "443", proto: "TCP (HTTPS)", src: "vCenter Server", dest: "Cohesity Cluster", desc: "VMware registration and vCenter SDK control session calls", active: isVmActive },
      { port: "902", proto: "TCP", src: "ESXi Hosts", dest: "Cohesity Cluster", desc: "VMware backup raw NBD data path stream ingestion", active: isVmActive },
      { port: "50051", proto: "TCP", src: "Physical Servers", dest: "Cohesity Cluster", desc: "Cohesity Backup Agent control and data block channel", active: isDbActive || isK8sActive },
      { port: "1433", proto: "TCP", src: "Cohesity Cluster", dest: "SQL Instances", desc: "SQL Server database backup metadata enumeration queries", active: isDbActive },
      { port: "445", proto: "TCP", src: "SMB File Shares", dest: "Cohesity Cluster", desc: "NAS / SmartFiles SMB protocol protection backup reads", active: isFilesActive },
      { port: "111 / 2049", proto: "TCP", src: "NFS File Shares", dest: "Cohesity Cluster", desc: "NAS / SmartFiles NFS protocol protection backup mount reads", active: isFilesActive },
      { port: "443", proto: "TCP (HTTPS)", src: "Cohesity Cluster", dest: "Helios Cloud Portal", desc: "Outbound management telemetry, remote alerts & Helios API", active: true },
      { port: "443", proto: "TCP (HTTPS)", src: "Cohesity Cluster", dest: "FortKnox Cloud Vault", desc: "Outbound HTTPS SaaS air-gapped sync replication data stream", active: isFortKnoxActive },
      { port: "50051", proto: "TCP", src: "Primary Cluster", dest: "Replication Cluster", desc: "Inter-cluster snapshot synchronization replication data path", active: isReplicationActive }
    ];
  }

  togglePricingAdjuster() {
    const inputsDiv = document.getElementById("pricing-adjuster-inputs");
    const toggleIcon = document.getElementById("pricing-toggle-icon");
    if (inputsDiv) {
      const isHidden = inputsDiv.style.display === "none";
      inputsDiv.style.display = isHidden ? "grid" : "none";
      if (toggleIcon) {
        toggleIcon.textContent = isHidden ? "expand_less" : "expand_more";
      }
    }
  }

  renderPricingAdjuster() {
    if (!this.dom.pricingInputs) return;
    this.dom.pricingInputs.innerHTML = "";

    const adjusters = [
      { key: "saasTB", label: "DataProtect SaaS ($/TB/yr)" },
      { key: "physicalNode", label: "Physical Storage Node ($/node/yr)" },
      { key: "dataprotectTB", label: "DataProtect Soft. ($/TB/yr)" },
      { key: "cloudNode", label: "Cloud Virtual Node ($/node/yr)" },
      { key: "fortknoxTB", label: "FortKnox Cloud Vault ($/TB/yr)" },
      { key: "enterpriseUpliftTB", label: "Enterprise Edition Uplift ($/TB/yr)" },
      { key: "sitecontinuityFlat", label: "SiteContinuity Flat ($/yr)" },
      { key: "primaryStorageCostPerTB", label: "Legacy Primary Storage ($/TB, for TCO)" }
    ];

    adjusters.forEach(adj => {
      const field = document.createElement("div");
      field.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
      
      const label = document.createElement("label");
      label.className = "form-label";
      label.style.fontSize = "10px";
      label.style.marginBottom = "0";
      label.textContent = adj.label;
      
      const input = document.createElement("input");
      input.type = "number";
      input.className = "number-override-input";
      input.style.cssText = "text-align: left; padding: 6px 10px; font-size: 11.5px; border-radius: 6px; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); color: white; width: 100%; box-sizing: border-box;";
      input.value = this.state.pricing[adj.key];
      
      input.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value) || 0;
        this.state.pricing[adj.key] = val;
        this.updateProposalAndBOM();
      });

      field.appendChild(label);
      field.appendChild(input);
      this.dom.pricingInputs.appendChild(field);
    });
  }

  renderSitesManagerUI() {
    const container = document.getElementById("sites-tabs-container");
    if (!container) return;

    container.innerHTML = "";
    this.state.sites.forEach((site, index) => {
      const tab = document.createElement("div");
      tab.className = `selectable-item ${site.id === this.state.activeSiteId ? "selected" : ""}`;
      tab.style.cssText = "display: flex; align-items: center; gap: 8px; padding: 6px 12px; font-size: 11.5px; border-radius: 6px; cursor: pointer; border: 1px solid var(--border-color); background: rgba(255,255,255,0.02); transition: all 0.2s;";
      
      if (site.id === this.state.activeSiteId) {
        tab.style.borderColor = "var(--accent-blue)";
        tab.style.background = "rgba(0,145,255,0.08)";
      }

      // Site Name Text
      const nameSpan = document.createElement("span");
      nameSpan.textContent = site.name;
      nameSpan.style.fontWeight = "600";
      tab.appendChild(nameSpan);

      // Sizing info on tab
      let siteFE = 0;
      Object.keys(site.workloads).forEach(type => {
        if (site.workloads[type].active) {
          siteFE += site.workloads[type].capacityTB;
        }
      });
      const sizeSpan = document.createElement("span");
      sizeSpan.textContent = `(${siteFE} TB)`;
      sizeSpan.style.cssText = "font-size: 9.5px; color: var(--text-secondary); font-family: 'JetBrains Mono';";
      tab.appendChild(sizeSpan);

      // Delete Button (only if not primary site and more than 1 site exists)
      if (site.id !== "site-primary" && this.state.sites.length > 1) {
        const deleteBtn = document.createElement("span");
        deleteBtn.className = "material-symbols-outlined";
        deleteBtn.textContent = "close";
        deleteBtn.style.cssText = "font-size: 12px; color: var(--text-muted); cursor: pointer; margin-left: 4px; transition: color 0.2s;";
        deleteBtn.addEventListener("mouseover", () => { deleteBtn.style.color = "var(--accent-red)"; });
        deleteBtn.addEventListener("mouseout", () => { deleteBtn.style.color = "var(--text-muted)"; });
        deleteBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          this.deleteSite(site.id);
        });
        tab.appendChild(deleteBtn);
      }

      // Tab Selection Click
      tab.addEventListener("click", () => {
        this.selectSite(site.id);
      });

      container.appendChild(tab);
    });

    // Sync Rename Input Field
    const activeSite = this.getActiveSite();
    const renameInput = document.getElementById("active-site-name-input");
    if (renameInput) {
      renameInput.value = activeSite.name;
    }
  }

  selectSite(siteId) {
    this.state.activeSiteId = siteId;
    this.renderSitesManagerUI();
    this.loadWorkloadPresets(); // Re-loads currently active workloads into inputs
    this.updateSidebarStats();
    this.renderTopologyDiagram();
  }

  deleteSite(siteId) {
    const index = this.state.sites.findIndex(s => s.id === siteId);
    if (index !== -1) {
      this.state.sites.splice(index, 1);
      if (this.state.activeSiteId === siteId) {
        this.state.activeSiteId = this.state.sites[0].id;
      }
      this.renderSitesManagerUI();
      this.loadWorkloadPresets();
      this.updateSidebarStats();
      this.renderTopologyDiagram();
    }
  }

  addNewSite() {
    const id = `site-${Date.now()}`;
    const name = `Remote Site ${this.state.sites.length + 1}`;
    
    // Copy defaults from workloadPreset defaults
    const workloads = {
      vm: { active: true, capacityTB: 50, growth: 10, dedupe: 2.5, retentionDays: 30, windowHours: 8 },
      database: { active: false, capacityTB: 20, growth: 15, dedupe: 3.0, retentionDays: 14, windowHours: 8 },
      files: { active: false, capacityTB: 100, growth: 20, dedupe: 1.4, retentionDays: 90, windowHours: 8 },
      saas: { active: false, capacityTB: 10, growth: 12, dedupe: 2.0, retentionDays: 365, windowHours: 8 },
      k8s: { active: false, capacityTB: 5, growth: 15, dedupe: 2.0, retentionDays: 30, windowHours: 8 }
    };

    this.state.sites.push({ id, name, workloads });
    this.selectSite(id);
  }

  init() {
    this.cacheDomElements();
    this.bindEvents();
    this.renderSitesManagerUI();
    this.loadWorkloadPresets();
    
    // Download live pricing list
    fetch('pricing.json')
      .then(r => r.json())
      .then(data => {
        this.state.pricing = { ...this.state.pricing, ...data };
        console.log("Loaded default estimation rates from pricing.json (illustrative only — adjust to your negotiated pricing):", this.state.pricing);
        this.renderPricingAdjuster();
        this.updateUI();
      })
      .catch(err => {
        console.warn("Failed to load pricing.json, using built-in default estimates:", err);
        this.renderPricingAdjuster();
        this.updateUI();
      });
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
    this.dom.statEdition = document.getElementById("rec-edition-badge");
    this.dom.statGrowthPlan = document.getElementById("rec-growth-plan");
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
    this.dom.pricingInputs = document.getElementById("pricing-adjuster-inputs");

    // v3 additions: TCO, competitive positioning, as-built export, save/load scenario, SVG export
    this.dom.proposalTCO = document.getElementById("proposal-tco-section");
    this.dom.proposalRecovery = document.getElementById("proposal-recovery-section");
    this.dom.proposalCompetitive = document.getElementById("proposal-competitive-section");
    this.dom.btnSaveScenario = document.getElementById("btn-save-scenario");
    this.dom.btnLoadScenario = document.getElementById("btn-load-scenario");
    this.dom.loadScenarioInput = document.getElementById("load-scenario-input");
    this.dom.btnAsBuilt = document.getElementById("btn-as-built");
    this.dom.btnDownloadSvg = document.getElementById("btn-download-svg");
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

    // Step 2 Sites Management Events
    const addSiteBtn = document.getElementById("btn-add-site");
    if (addSiteBtn) {
      addSiteBtn.addEventListener("click", () => this.addNewSite());
    }

    const renameInput = document.getElementById("active-site-name-input");
    if (renameInput) {
      renameInput.addEventListener("input", (e) => {
        const activeSite = this.getActiveSite();
        activeSite.name = e.target.value || "Data Center";
        this.renderSitesManagerUI(); // Redraw tabs to update name
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });
    }

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
        this.renderSitesManagerUI();
        this.updateSidebarStats();
        this.renderTopologyDiagram();
      });

      // Synchronize Slider & Number Inputs
      range.addEventListener("input", (e) => {
        num.value = e.target.value;
        this.state.workloads[type].capacityTB = parseFloat(e.target.value);
        this.renderSitesManagerUI();
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
        this.renderSitesManagerUI();
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
      this.setDataHawkState(e.target.checked);
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
      navigator.clipboard.writeText(this.dom.codePre.textContent).then(() => {
        this.dom.copyBtn.textContent = "Copied!";
      }).catch(() => {
        this.dom.copyBtn.textContent = "Copy failed — select & copy manually";
      }).finally(() => {
        setTimeout(() => {
          this.dom.copyBtn.textContent = "Copy";
        }, 2000);
      });
    });

    // v3 additions: save/load scenario, as-built export, topology SVG export
    if (this.dom.btnSaveScenario) {
      this.dom.btnSaveScenario.addEventListener("click", () => this.exportScenario());
    }
    if (this.dom.btnLoadScenario && this.dom.loadScenarioInput) {
      this.dom.btnLoadScenario.addEventListener("click", () => this.dom.loadScenarioInput.click());
      this.dom.loadScenarioInput.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => this.importScenario(reader.result);
        reader.readAsText(file);
        e.target.value = ""; // allow re-selecting the same file later
      });
    }
    if (this.dom.btnAsBuilt) {
      this.dom.btnAsBuilt.addEventListener("click", () => {
        const doc = this.generateAsBuiltDocument();
        this.downloadBlob(`${this.slugify(this.state.project.name, "cohesity-project")}-as-built.txt`, doc, "text/plain");
      });
    }
    if (this.dom.btnDownloadSvg) {
      this.dom.btnDownloadSvg.addEventListener("click", () => this.downloadTopologySVG());
    }
  }

  applyComplianceDefaults() {
    const comps = this.state.project.compliance;
    
    if (comps.includes("dora")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setCheckboxState("chk-sitecontinuity", true, 'bcdr', 'siteContinuity');
    }
    
    if (comps.includes("fedramp")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setDataHawkState(true);
      this.setCheckboxState("chk-mpa", true, 'security', 'mpa');

      const kmsSel = document.getElementById("sec-kms");
      if (kmsSel) {
        kmsSel.value = "customer";
        this.state.security.kms = "customer";
      }
    }

    if (comps.includes("gdpr") || comps.includes("ccpa")) {
      this.setDataHawkState(true);
    }

    if (comps.includes("soc2")) {
      this.setCheckboxState("chk-mfa", true, 'security', 'mfa');
      this.setCheckboxState("chk-mpa", true, 'security', 'mpa');
    }

    if (comps.includes("nis2")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setDataHawkState(true);
      this.setCheckboxState("chk-sitecontinuity", true, 'bcdr', 'siteContinuity');
    }

    if (comps.includes("uaepdpl") || comps.includes("ksapdpl")) {
      this.setDataHawkState(true);
    }

    if (comps.includes("ksapdpl")) {
      // Data residency / cross-border transfer controls - keep keys under customer control.
      const kmsSel = document.getElementById("sec-kms");
      if (kmsSel) {
        kmsSel.value = "customer";
        this.state.security.kms = "customer";
      }
    }

    if (comps.includes("ncaecc")) {
      this.setCheckboxState("chk-fortknox", true, 'security', 'fortknox');
      this.setCheckboxState("chk-sitecontinuity", true, 'bcdr', 'siteContinuity');
      this.setCheckboxState("chk-mpa", true, 'security', 'mpa');
    }
  }

  setCheckboxState(elemId, value, stateCategory, stateKey) {
    const el = document.getElementById(elemId);
    if (el) {
      el.checked = value;
      this.state[stateCategory][stateKey] = value;
    }
  }

  // Threat Defense & Data Classification (data.js id "datahawk") is now an Enterprise
  // Edition feature, not a standalone SKU - toggling it drives which Cohesity Data Cloud
  // edition the BOM prices against (see calculateSizing()/updateProposalAndBOM()).
  setDataHawkState(value) {
    this.state.security.datahawk = value;
    this.state.deployment.edition = value ? "enterprise" : "core";
    const el = document.getElementById("chk-datahawk");
    if (el) el.checked = value;
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
      } else {
        document.getElementById(`wl-card-${type}`).classList.remove("selected");
        document.getElementById(`wl-controls-${type}`).style.display = "none";
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

  // Sizes a node count against a target usable TB using Cohesity's real resiliency model:
  // RF2 (~50% usable) below the EC threshold, Erasure Coding (~80% usable) at 6+ nodes - see
  // COHESITY_DATA.resiliencyModel. Also applies an operational utilization headroom (don't
  // size a cluster to run 100% full) and enforces N+1 (must still meet the target after
  // losing one node) and the family's real minimum cluster size.
  sizeNodesForCapacity(nodeType, neededUsableTB) {
    const model = COHESITY_DATA.resiliencyModel;
    const target = neededUsableTB / model.utilizationHeadroom;
    let n = nodeType.minNodes;

    for (let guard = 0; guard < 500; guard++) {
      const useEC = n >= model.erasureCoding.minNodes;
      const usableRatio = useEC ? model.erasureCoding.usableRatio : model.rf2.usableRatio;
      const usablePerNode = nodeType.capacityRawTB * usableRatio;
      const survivingUsable = (n - 1) * usablePerNode; // N+1: must still meet target after losing 1 node
      if (survivingUsable >= target || n > 500) {
        return {
          nodeCount: n,
          usableRatio,
          resiliencyMode: useEC ? model.erasureCoding.name : model.rf2.name,
          usablePerNode,
          deployedUsableTB: n * usablePerNode
        };
      }
      n++;
    }
    // Fallback (should not realistically be reached)
    const usableRatio = model.erasureCoding.usableRatio;
    const usablePerNode = nodeType.capacityRawTB * usableRatio;
    return { nodeCount: n, usableRatio, resiliencyMode: model.erasureCoding.name, usablePerNode, deployedUsableTB: n * usablePerNode };
  }

  calculateSizing() {
    let totalFrontEndTB = 0;
    let totalUsableNeededTB = 0;
    let totalUsableNeeded1yrTB = 0;
    let totalRawUndupedTB = 0; // same as usable, but without the dedupe division - used for the TCO estimate
    let activeWorkloadsCount = 0;
    let dbActive = false;
    let dbCapacity = 0;

    // Standard Grandfather-Father-Son retention formula overhead factor
    // Let's calculate base multiplier:
    // Daily retention multiplier: (Days / 30) * 0.15
    // GFS retention overhead factors:
    // VMs: 1.3, DB: 1.15, Files: 1.4, SaaS: 1.8, Kubernetes: 1.25

    this.state.sites.forEach(site => {
      Object.keys(site.workloads).forEach(type => {
        const wl = site.workloads[type];
        if (wl.active) {
          activeWorkloadsCount++;
          totalFrontEndTB += wl.capacityTB;

          if (type === "database") {
            dbActive = true;
            dbCapacity += wl.capacityTB;
          }

          // Apply growth compounded over 3 years: F = P * (1 + r)^3 (and ^1 for a Year-1 checkpoint)
          const compoundedCapacity = wl.capacityTB * Math.pow(1 + (wl.growth / 100), 3);
          const compoundedCapacity1yr = wl.capacityTB * (1 + (wl.growth / 100));

          // Apply Deduplication & Compression ratio reduction
          const deduplicatedCapacity = compoundedCapacity / wl.dedupe;
          const deduplicatedCapacity1yr = compoundedCapacity1yr / wl.dedupe;

          // Apply retention policy multiplier based on workload properties
          let retentionMultiplier = 1.1; // Baseline
          if (type === "vm") retentionMultiplier = 1.35; // Standard VMs with snapshots
          if (type === "database") retentionMultiplier = 1.15; // Database logs, short retention
          if (type === "files") retentionMultiplier = 1.45; // SmartFiles data, longer archives
          if (type === "saas") retentionMultiplier = 1.85; // SaaS archives, long legal hold (365d)
          if (type === "k8s") retentionMultiplier = 1.25; // Dev/K8s backups

          totalUsableNeededTB += (deduplicatedCapacity * retentionMultiplier);
          totalUsableNeeded1yrTB += (deduplicatedCapacity1yr * retentionMultiplier);
          totalRawUndupedTB += (compoundedCapacity * retentionMultiplier);
        }
      });
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

    // Node recommendations: Physical cluster sizing (real RF2/EC resiliency model + N+1 + headroom)
    let nodeRecommendation = "";
    let localNodeCount = 0;
    let cloudNodeCount = 0;
    let fortKnoxVaultTB = 0;
    let nodeModelName = "";
    let resiliencyMode = "";
    let deployedUsableTB = 0;
    let throughputBound = false;
    let year1NodeCount = 0;

    let nodeType = null;
    if (this.state.deployment.model === "saas") {
      nodeRecommendation = "Cohesity Cloud Services (SaaS Pricing model)";
      nodeModelName = "SaaS Storage Subscription";
    } else {
      // Determine physical node family from user preference and Database volumes.
      // Single source of truth for hardware specs is COHESITY_DATA.nodeTypes.physical.
      const isDatabaseHeavy = (dbActive && (dbCapacity / (totalFrontEndTB || 1) > 0.35));
      const nodePrefToId = { flash: "cx8000", hybrid: "c6200", entry: "c5200" };
      const nodeTypeId = isDatabaseHeavy ? "cx8000" : (nodePrefToId[this.state.deployment.nodePreference] || "c6200");

      nodeType = COHESITY_DATA.nodeTypes.physical.find(n => n.id === nodeTypeId)
        || COHESITY_DATA.nodeTypes.physical.find(n => n.id === "c6200")
        || COHESITY_DATA.nodeTypes.physical[0];

      const sized = this.sizeNodesForCapacity(nodeType, calculatedUsableLocalTB);
      localNodeCount = sized.nodeCount;
      resiliencyMode = sized.resiliencyMode;
      deployedUsableTB = sized.deployedUsableTB;

      // Throughput check: capacity-driven node count may not carry enough aggregate ingest
      // bandwidth. Bump node count (keeping N+1) until per-node throughput covers the
      // required raw ingest rate. estThroughputMBps is an SE planning estimate (see data.js).
      const bw = this.calculateBandwidth();
      const requiredMBps = bw.ingestRawMbps / 8;
      if (nodeType.estThroughputMBps) {
        while ((localNodeCount - 1) * nodeType.estThroughputMBps < requiredMBps) {
          localNodeCount++;
          throughputBound = true;
        }
        if (throughputBound) {
          const useEC = localNodeCount >= COHESITY_DATA.resiliencyModel.erasureCoding.minNodes;
          const usableRatio = useEC ? COHESITY_DATA.resiliencyModel.erasureCoding.usableRatio : COHESITY_DATA.resiliencyModel.rf2.usableRatio;
          resiliencyMode = useEC ? COHESITY_DATA.resiliencyModel.erasureCoding.name : COHESITY_DATA.resiliencyModel.rf2.name;
          deployedUsableTB = localNodeCount * nodeType.capacityRawTB * usableRatio;
        }
      }

      // Year-1 phased-expansion checkpoint, sized against the same node family.
      year1NodeCount = this.sizeNodesForCapacity(nodeType, totalUsableNeeded1yrTB).nodeCount;

      nodeModelName = `${nodeType.model} (${nodeType.tier})`;
      nodeRecommendation = `${localNodeCount}x Cohesity ${nodeModelName} Nodes (${deployedUsableTB.toFixed(0)}TB usable @ ${resiliencyMode}, N+1, ${(COHESITY_DATA.resiliencyModel.utilizationHeadroom * 100).toFixed(0)}% util. headroom)${throughputBound ? ' — sized for ingest throughput' : ''}`;
    }

    // Cloud Node Replication sizing
    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudNodeUsableTB = 40;
      cloudNodeCount = Math.max(3, Math.ceil(calculatedUsableLocalTB / cloudNodeUsableTB) + 1);
    }

    // FortKnox vault sizing: FortKnox stores an already-deduplicated, immutable copy,
    // so it's sized off the local usable footprint (dedup + retention adjusted), plus a
    // 15% buffer for the vault's typically longer/extended immutable retention window.
    if (this.state.security.fortknox) {
      fortKnoxVaultTB = Math.ceil(calculatedUsableLocalTB * 1.15);
    }

    return {
      frontEndTB: totalFrontEndTB.toFixed(1),
      usableLocalTB: calculatedUsableLocalTB.toFixed(1),
      usableLocalTBRaw: calculatedUsableLocalTB,
      usableNeeded1yrTB: totalUsableNeeded1yrTB.toFixed(1),
      rawUndupedTBRaw: totalRawUndupedTB,
      totalSystemUsableTB: totalSystemUsableTB.toFixed(1),
      localNodeCount,
      year1NodeCount,
      cloudNodeCount,
      fortKnoxVaultTB,
      nodeRecommendation,
      nodeModelName,
      resiliencyMode,
      deployedUsableTB,
      throughputBound,
      activeWorkloadsCount,
      nodeType
    };
  }

  calculateBandwidth() {
    let dailyChangeRawTB = 0;
    let dailyChangeDedupeTB = 0;
    let totalIngestRawMbps = 0;
    let totalIngestDedupeMbps = 0;

    this.state.sites.forEach(site => {
      Object.keys(site.workloads).forEach(type => {
        const wl = site.workloads[type];
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

    const formatMBs = (mbps) => (mbps / 8).toFixed(1).replace(/\.0$/, "");

    return {
      dailyChangeRawTB: dailyChangeRawTB.toFixed(2),
      dailyChangeDedupeTB: dailyChangeDedupeTB.toFixed(2),
      ingestRawMbps: Math.ceil(ingestRawMbps),
      ingestRawMBs: formatMBs(Math.ceil(ingestRawMbps)),
      ingestDedupeMbps: Math.ceil(ingestDedupeMbps),
      ingestDedupeMBs: formatMBs(Math.ceil(ingestDedupeMbps)),
      replMbps: Math.ceil(replMbps),
      replMBs: formatMBs(Math.ceil(replMbps)),
      vaultMbps: Math.ceil(vaultMbps),
      vaultMBs: formatMBs(Math.ceil(vaultMbps)),
      ingestHours,
      replHours,
      vaultHours
    };
  }

  // Answers the three questions customers actually ask in a recovery conversation:
  // how long will it take, what point-in-time copy do I get back, and what does the
  // environment look like afterward. All figures are SE planning estimates derived from
  // the same throughput/bandwidth assumptions used elsewhere in the sizing engine - not
  // a guaranteed SLA. See sizeNodesForCapacity()/calculateBandwidth() for the underlying
  // per-node throughput and link-bandwidth assumptions.
  formatDuration(hours) {
    if (hours < 1) return `${Math.max(1, Math.ceil(hours * 60))} min`;
    if (hours < 48) return `${hours.toFixed(1)} hours`;
    return `${(hours / 24).toFixed(1)} days`;
  }

  calculateRecoveryTime() {
    const sizing = this.calculateSizing();
    const bw = this.calculateBandwidth();

    const maxWindowHours = Math.max(1, ...this.state.sites.flatMap(site =>
      Object.values(site.workloads).filter(w => w.active).map(w => w.windowHours || 8)
    ));
    const cdpActive = !!(this.state.bcdr.siteContinuity && this.state.bcdr.rpo === "15min");
    const cleanScan = !!this.state.security.datahawk;

    const rpoText = cdpActive
      ? "Near-zero data loss (continuous CDP journaling via SiteContinuity)"
      : `Up to ${maxWindowHours}h of data loss (the gap since the last completed backup of the slowest-scheduled active workload)`;

    const pointInTimeNote = cleanScan
      ? "the most recent snapshot verified free of ransomware/anomaly indicators (Threat Defense & Data Classification)"
      : "the most recent completed snapshot — not malware-scanned before recovery (enable Threat Defense & Data Classification to change this)";

    const scenarios = [];

    // 1. Single workload instant recovery - SnapFS mounts the backup directly as a live
    // volume, so time-to-usable is independent of data size.
    scenarios.push({
      id: "instant",
      name: "Single VM / File / App Instant Recovery",
      rtoText: "Minutes, regardless of data size",
      detail: "Cohesity SnapFS mounts the backup directly as a live read/write volume (Instant Mass Restore) — no block-level copy has to complete before the workload is usable again.",
      whatYouGetBack: `You get back ${pointInTimeNote}.`,
      endState: "Restored in place, running on the original cluster/site from the mounted snapshot (an optional background migration moves it onto primary storage afterward)."
    });

    // 2. Full local bulk restore - bound by aggregate N+1 cluster restore throughput,
    // the same conservative per-node estThroughputMBps assumption used by the ingest
    // throughput check in calculateSizing().
    if (this.state.deployment.model === "saas") {
      scenarios.push({
        id: "bulk",
        name: "Full SaaS-Managed Bulk Restore",
        rtoText: "Bound by Cohesity's SaaS-managed infrastructure, not a customer-sized cluster",
        detail: "Capacity and throughput for this path are fully managed by Cohesity Cloud Services. Get a current RTO figure from your Cohesity account team for this deployment model.",
        whatYouGetBack: `You get back ${pointInTimeNote}.`,
        endState: "Restored into the same SaaS-managed environment."
      });
    } else if (sizing.nodeType && sizing.nodeType.estThroughputMBps && sizing.localNodeCount > 1) {
      const aggregateMBps = (sizing.localNodeCount - 1) * sizing.nodeType.estThroughputMBps;
      const hours = (sizing.usableLocalTBRaw * 1000000) / (aggregateMBps * 3600);
      scenarios.push({
        id: "bulk",
        name: `Full Local Bulk Restore (${sizing.usableLocalTB} TB)`,
        rtoText: `~${this.formatDuration(hours)} (N+1 cluster throughput: ~${aggregateMBps} MB/s)`,
        detail: "A full-cluster rebuild or mass restore of every protected workload at once, bound by aggregate cluster restore throughput rather than instant-mount.",
        whatYouGetBack: `You get back ${pointInTimeNote}, for every protected workload.`,
        endState: "Restored in place on the local cluster — the original environment, not a failover. No failback step needed afterward."
      });
    }

    // 3. DR failover to a live secondary - orchestration-bound (not data-transfer-bound)
    // when SiteContinuity automates it; otherwise a manual runbook estimate.
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      const automated = !!this.state.bcdr.siteContinuity;
      const targetName = this.state.bcdr.replication === "cloud-edition" ? "Cloud Edition" : "Secondary Site";
      scenarios.push({
        id: "failover",
        name: `DR Failover to ${targetName}`,
        rtoText: automated ? "~15-30 min (automated orchestration)" : "~2-6 hours (manual runbook execution — enable SiteContinuity to automate this)",
        detail: automated
          ? "SiteContinuity automates boot-order sequencing, network cutover, and health checks against an already-current replica — failover time is orchestration-bound, not data-transfer-bound."
          : "Without SiteContinuity, failover is a manual runbook: engineers power on replicated VMs, remap networking, and validate application health by hand.",
        whatYouGetBack: `You get back ${rpoText.charAt(0).toLowerCase()}${rpoText.slice(1)}.`,
        endState: `Running on the ${targetName.toLowerCase()} — failback to the primary site/cluster is a separate, planned step once it's repaired, not automatic.`
      });
    }

    // 4. FortKnox vault recovery - the ransomware worst-case: primary and local
    // replicas are assumed compromised or unavailable, so retrieval crosses the
    // internet via the vault's outbound-only link rather than the local backplane.
    // Reuses the same egress-bandwidth assumption as the vault's 4h sync SLA.
    if (this.state.security.fortknox && sizing.fortKnoxVaultTB > 0 && bw.vaultMbps > 0) {
      const hours = (sizing.fortKnoxVaultTB * 8000000) / (bw.vaultMbps * 3600);
      scenarios.push({
        id: "vault",
        name: `FortKnox Cyber Vault Recovery (${sizing.fortKnoxVaultTB} TB)`,
        rtoText: `~${this.formatDuration(hours)} (bound by the vault's cloud egress link, assumed at the same ${bw.vaultMbps} Mbps as its sync SLA)`,
        detail: "The slowest realistic recovery path by design — the vault is virtually air-gapped behind an outbound-only connection, so retrieval crosses the internet rather than the local cluster backplane. This is the ransomware worst-case scenario.",
        whatYouGetBack: "You get back the last clean, immutable snapshot in the vault, via Assisted Recovery.",
        endState: "Recovered first into an isolated cleanroom for verification, then moved to production or a DR site once confirmed clean — not restored directly in place."
      });
    }

    return { scenarios, rpoText, maxWindowHours, cdpActive, cleanScan };
  }

  updateRecoveryUI() {
    const recoveryRpoSummary = document.getElementById("recovery-rpo-summary");
    const recoveryList = document.getElementById("recovery-scenarios-list");
    if (!recoveryRpoSummary || !recoveryList) return;

    const recovery = this.calculateRecoveryTime();

    recoveryRpoSummary.innerHTML = `<strong style="color:var(--text-primary)">What do I get back?</strong> ${recovery.rpoText}. ${
      recovery.cleanScan
        ? "Recovered snapshots are malware-scanned before they're offered for recovery (Threat Defense & Data Classification)."
        : "Recovered snapshots are not malware-scanned before recovery — enable Threat Defense & Data Classification (Security step) for a verified-clean recovery point."
    }`;

    recoveryList.innerHTML = recovery.scenarios.map(s => `
      <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
        <div style="font-size:11.5px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${s.name}</div>
        <div style="font-size:13px; font-weight:700; color:var(--accent-green); font-family:var(--font-mono); margin-bottom:6px;">${s.rtoText}</div>
        <div style="font-size:10.5px; color:var(--text-secondary); line-height:1.4; margin-bottom:6px;">${s.detail}</div>
        <div style="font-size:10.5px; color:var(--text-secondary); line-height:1.4; margin-bottom:4px;">${s.whatYouGetBack}</div>
        <div style="font-size:10.5px; color:var(--text-secondary); line-height:1.4; margin-bottom:4px;"><strong style="color:var(--text-primary)">End state:</strong> ${s.endState}</div>
      </div>
    `).join("");
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
    if (ingestEl) ingestEl.textContent = `${bw.ingestDedupeMbps} Mbps (${bw.ingestDedupeMBs} MB/s)`;
    
    const bwSidebarHint = document.getElementById("bw-sidebar-hint");
    if (bwSidebarHint) {
      bwSidebarHint.innerHTML = `Sized for a ${bw.ingestHours.toFixed(1)}h backup window (Raw ingest requires <span id="bw-local-raw" style="font-weight:700">${bw.ingestRawMbps} Mbps (${bw.ingestRawMBs} MB/s)</span>). Source-side deduplication reduces local WAN transfer bandwidth.`;
    } else {
      if (ingestRawEl) ingestRawEl.textContent = `${bw.ingestRawMbps} Mbps (${bw.ingestRawMBs} MB/s)`;
    }

    // Secondary replication
    if (replContainer && replVal) {
      if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
        replContainer.style.display = "flex";
        replVal.textContent = `${bw.replMbps} Mbps (${bw.replMBs} MB/s)`;
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
        vaultVal.textContent = `${bw.vaultMbps} Mbps (${bw.vaultMBs} MB/s)`;
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
    if (step3Ingest) step3Ingest.textContent = `${bw.ingestDedupeMbps} Mbps (${bw.ingestDedupeMBs} MB/s)`;
    if (step3IngestRaw) step3IngestRaw.textContent = `${bw.ingestRawMbps} Mbps (${bw.ingestRawMBs} MB/s)`;

    const step3IngestTitle = document.getElementById("step3-ingest-title");
    if (step3IngestTitle) {
      step3IngestTitle.textContent = `Ingest Bandwidth (${bw.ingestHours.toFixed(1)}h)`;
    }

    if (step3ReplContainer && step3ReplVal) {
      if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
        step3ReplContainer.style.display = "flex";
        step3ReplVal.textContent = `${bw.replMbps} Mbps (${bw.replMBs} MB/s)`;
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
        step3VaultVal.textContent = `${bw.vaultMbps} Mbps (${bw.vaultMBs} MB/s)`;
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
      deductList.push("No active AI/ML threat detection scanning (requires Data Cloud Enterprise Edition)");
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

    // Edition badge (drives, and is driven by, the Threat Defense/DataHawk toggle)
    if (this.dom.statEdition) {
      this.dom.statEdition.textContent = this.state.deployment.edition === "enterprise" ? "Enterprise Edition" : "Core Edition";
    }

    // Phased-expansion / growth-plan checkpoint
    if (this.dom.statGrowthPlan) {
      if (sizing.year1NodeCount && sizing.localNodeCount) {
        this.dom.statGrowthPlan.textContent = sizing.year1NodeCount < sizing.localNodeCount
          ? `Deploy ${sizing.year1NodeCount} nodes now → grow to ${sizing.localNodeCount} within 3 years`
          : `${sizing.localNodeCount} nodes covers the full 3-year forecast today — no phased add planned`;
      } else {
        this.dom.statGrowthPlan.textContent = "";
      }
    }

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

    // Keep the bandwidth and recovery-expectations widgets live on every change,
    // not just on the initial render.
    this.updateBandwidthUI();
    this.updateRecoveryUI();
  }

  updateProductList(sizing) {
    let listHTML = "";
    
    // Check which products are actively selected
    const activeProducts = {
      dataprotect: true, // Always required for backup
      alta: this.state.deployment.model === "saas" || this.state.deployment.model === "hybrid",
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
      { label: "Real-time AI malware anomaly scanning (Enterprise Edition)", pass: this.state.security.datahawk },
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
    if (tabId === "firewall") {
      document.getElementById("code-title").textContent = "Enterprise Firewall & TCP Port Requirements";
      document.getElementById("code-desc").textContent = "Port mapping rules required for network routing and security group configurations between protected elements.";

      const ports = this.getNetworkPorts();
      const isFortKnoxActive = this.state.security.fortknox;
      const isReplicationActive = this.state.bcdr.replication !== "none";

      const colWidths = [12, 12, 20, 20, 60, 10];
      const headers = ["Port", "Protocol", "Source Component", "Destination Comp.", "Architectural Purpose / Description", "Status"];
      
      const formatRow = (cols) => {
        return "│ " + cols.map((c, i) => String(c).padEnd(colWidths[i])).join(" │ ") + " │\n";
      };

      const makeBorder = (left, sepChar, right) => {
        return left + colWidths.map(w => "─".repeat(w + 2)).join(sepChar) + right + "\n";
      };

      let table = "";
      table += makeBorder("┌", "┬", "┐");
      table += formatRow(headers);
      table += makeBorder("├", "┼", "┤");
      ports.forEach(p => {
        table += formatRow([p.port, p.proto, p.src, p.dest, p.desc, p.active ? "ACTIVE" : "INACTIVE"]);
      });
      table += makeBorder("└", "┴", "┘");

      this.dom.codePre.textContent = table;

      if (this.dom.playbookGuide) {
        let guideHTML = `
          <h4 style="font-size:12.5px; color:var(--accent-green); margin:0 0 6px 0; border-bottom:1px solid var(--border-color); padding-bottom:6px;">Firewall Policy Guide</h4>
          <p style="margin:0 0 8px 0; font-size:11px; line-height:1.4; color:var(--text-secondary);">Configure firewall rules to match the parameters below. Inactive rows represent ports not required in your current setup.</p>
          <ul style="padding-left:14px; margin:0; display:flex; flex-direction:column; gap:6px; font-size:11px; color:var(--text-secondary);">
            <li><strong>Zone Protection:</strong> Place local Cohesity nodes inside a protected administrative VLAN.</li>
            <li><strong>Outbound Telemetry:</strong> Keep port TCP 443 outbound open to <code>*.cohesity.com</code> for Helios cloud monitoring.</li>
            ${isFortKnoxActive ? '<li><strong>Air-Gapped Vaulting:</strong> Outbound TCP 443 routes are required to Amazon Web Services endpoints for FortKnox SaaS data transfers.</li>' : ''}
            ${isReplicationActive ? '<li><strong>Replication Paths:</strong> Configure bidirectional routing for port TCP 50051 between the VIP pools of primary and remote disaster recovery clusters.</li>' : ''}
          </ul>
          <h4 style="font-size:12.5px; color:var(--accent-blue); margin:14px 0 6px 0; border-bottom:1px solid var(--border-color); padding-bottom:6px;">Cluster-Internal Network Prerequisites</h4>
          <p style="margin:0 0 8px 0; font-size:11px; line-height:1.4; color:var(--text-secondary);">Distinct from the external firewall rows above — these apply to the cluster's own node-to-node network, regardless of firewall policy.</p>
          <ul style="padding-left:14px; margin:0; display:flex; flex-direction:column; gap:6px; font-size:11px; color:var(--text-secondary);">
            ${COHESITY_DATA.clusterNetworkRequirements.map(req => `<li><strong>${req.item}:</strong> ${req.detail}</li>`).join('')}
          </ul>
        `;
        this.dom.playbookGuide.innerHTML = guideHTML;
      }
      return;
    }

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

  // --- TCO estimate, save/load scenario, as-built export, competitive positioning, SVG export ---

  calculateTCO() {
    const sizing = this.calculateSizing();
    const rawTB = sizing.rawUndupedTBRaw || 0;
    const usableTB = sizing.usableLocalTBRaw || 0;
    const spaceSavedTB = Math.max(0, rawTB - usableTB);
    const avoidedCostUSD = spaceSavedTB * (this.state.pricing.primaryStorageCostPerTB || 0);
    const dedupeRatioBlended = usableTB > 0 ? (rawTB / usableTB) : 1;
    return { spaceSavedTB, avoidedCostUSD, dedupeRatioBlended, rawTB, usableTB };
  }

  renderTCO() {
    if (!this.dom.proposalTCO) return;
    const tco = this.calculateTCO();
    this.dom.proposalTCO.innerHTML = `
      <h3 style="font-size:15px; color:var(--accent-green); margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <span class="material-symbols-outlined" style="font-size:20px; vertical-align:middle;">savings</span>
        Consolidation Value &amp; TCO Estimate
      </h3>
      <p style="font-size:11px; color:var(--text-muted); margin:0 0 10px 0; line-height:1.4;">Illustrative only — compares the deduplicated, GFS-adjusted usable footprint actually stored against a naive undeduplicated equivalent, priced at an editable $/TB legacy primary-storage assumption (adjustable above). Not a substitute for a real cost assessment against the customer's current environment.</p>
      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px,1fr)); gap:12px;">
        <div>
          <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Blended Reduction</div>
          <div style="font-size:18px; font-weight:700; color:var(--accent-blue); font-family:var(--font-mono);">${tco.dedupeRatioBlended.toFixed(1)}:1</div>
        </div>
        <div>
          <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Capacity Avoided</div>
          <div style="font-size:18px; font-weight:700; color:var(--accent-green); font-family:var(--font-mono);">${tco.spaceSavedTB.toFixed(1)} TB</div>
        </div>
        <div>
          <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px;">Est. Avoided Storage Cost</div>
          <div style="font-size:18px; font-weight:700; color:var(--accent-green); font-family:var(--font-mono);">$${Math.round(tco.avoidedCostUSD).toLocaleString()}</div>
        </div>
      </div>
    `;
  }

  renderRecoveryExpectations() {
    if (!this.dom.proposalRecovery) return;
    const recovery = this.calculateRecoveryTime();
    this.dom.proposalRecovery.innerHTML = `
      <h3 style="font-size:15px; color:var(--accent-green); margin-bottom:8px; display:flex; align-items:center; gap:8px;">
        <span class="material-symbols-outlined" style="font-size:20px; vertical-align:middle;">restore</span>
        Recovery Expectations
      </h3>
      <p style="font-size:11px; color:var(--text-muted); margin:0 0 10px 0; line-height:1.4;">SE planning estimates computed from this configuration's actual throughput and bandwidth assumptions — not a guaranteed SLA. Answers the three questions customers ask in a recovery conversation: how long, what you get back, and what the environment looks like afterward.</p>
      <div style="background:rgba(255,255,255,0.03); padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); margin-bottom:14px; font-size:11.5px; color:var(--text-secondary); line-height:1.5;">
        <strong style="color:var(--text-primary)">What do I get back?</strong> ${recovery.rpoText}. ${
          recovery.cleanScan
            ? "Recovered snapshots are malware-scanned before they're offered for recovery (Threat Defense &amp; Data Classification)."
            : "Recovered snapshots are not malware-scanned before recovery — enable Threat Defense &amp; Data Classification for a verified-clean recovery point."
        }
      </div>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${recovery.scenarios.map(s => `
          <div style="background:rgba(255,255,255,0.02); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
            <div style="font-size:12px; font-weight:700; color:var(--text-primary); margin-bottom:4px;">${s.name}</div>
            <div style="font-size:14px; font-weight:700; color:var(--accent-green); font-family:var(--font-mono); margin-bottom:6px;">${s.rtoText}</div>
            <div style="font-size:11px; color:var(--text-secondary); line-height:1.4; margin-bottom:6px;">${s.detail}</div>
            <div style="font-size:11px; color:var(--text-secondary); line-height:1.4; margin-bottom:4px;">${s.whatYouGetBack}</div>
            <div style="font-size:11px; color:var(--text-secondary); line-height:1.4;"><strong style="color:var(--text-primary)">End state:</strong> ${s.endState}</div>
          </div>
        `).join("")}
      </div>
    `;
  }

  renderCompetitivePositioning() {
    if (!this.dom.proposalCompetitive) return;
    this.dom.proposalCompetitive.innerHTML = COHESITY_DATA.competitivePositioning.map(c => `
      <div style="padding:10px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
        <strong style="color:var(--accent-blue); font-size:12px;">vs. ${c.vendor}</strong>
        <p style="font-size:11.5px; color:var(--text-secondary); margin:4px 0 0 0; line-height:1.45;">${c.angle}</p>
      </div>
    `).join("");
  }

  downloadBlob(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  slugify(name, fallback) {
    return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || fallback;
  }

  exportScenario() {
    const snapshot = {
      _type: "cohesity-architect-toolkit-scenario",
      _version: 1,
      savedAt: new Date().toISOString(),
      project: this.state.project,
      sites: this.state.sites,
      activeSiteId: this.state.activeSiteId,
      bcdr: this.state.bcdr,
      security: this.state.security,
      deployment: this.state.deployment,
      pricing: this.state.pricing
    };
    this.downloadBlob(`${this.slugify(this.state.project.name, "cohesity-scenario")}.json`, JSON.stringify(snapshot, null, 2), "application/json");
  }

  importScenario(jsonText) {
    let data;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      alert("Could not load scenario: the file is not valid JSON.");
      return;
    }
    if (!data || data._type !== "cohesity-architect-toolkit-scenario" || !Array.isArray(data.sites) || data.sites.length === 0) {
      alert("Could not load scenario: this file doesn't look like a Cohesity Architect Toolkit scenario export.");
      return;
    }

    this.state.project = data.project || this.state.project;
    this.state.sites = data.sites;
    this.state.activeSiteId = (data.activeSiteId && data.sites.some(s => s.id === data.activeSiteId)) ? data.activeSiteId : data.sites[0].id;
    this.state.bcdr = data.bcdr || this.state.bcdr;
    this.state.security = data.security || this.state.security;
    this.state.deployment = data.deployment || this.state.deployment;
    if (data.pricing) this.state.pricing = { ...this.state.pricing, ...data.pricing };

    // Re-sync every DOM control to the loaded state
    const projName = document.getElementById("proj-name");
    if (projName) projName.value = this.state.project.name || "";
    const projIndustry = document.getElementById("proj-industry");
    if (projIndustry) projIndustry.value = this.state.project.industry || "Other";
    document.querySelectorAll(".compliance-chk").forEach(chk => {
      const checked = (this.state.project.compliance || []).includes(chk.value);
      chk.checked = checked;
      const card = chk.closest(".selectable-item");
      if (card) card.classList.toggle("selected", checked);
    });
    const rpoSel = document.getElementById("rpo-select");
    if (rpoSel) rpoSel.value = this.state.bcdr.rpo;
    const rtoSel = document.getElementById("rto-select");
    if (rtoSel) rtoSel.value = this.state.bcdr.rto;
    const replSel = document.getElementById("bcdr-repl-select");
    if (replSel) replSel.value = this.state.bcdr.replication;
    this.setCheckboxState("chk-sitecontinuity", this.state.bcdr.siteContinuity, "bcdr", "siteContinuity");
    this.setCheckboxState("chk-fortknox", this.state.security.fortknox, "security", "fortknox");
    this.setDataHawkState(this.state.security.datahawk);
    this.setCheckboxState("chk-mfa", this.state.security.mfa, "security", "mfa");
    this.setCheckboxState("chk-mpa", this.state.security.mpa, "security", "mpa");
    const kmsSel = document.getElementById("sec-kms");
    if (kmsSel) kmsSel.value = this.state.security.kms;
    document.querySelectorAll("input[name='deploy-model']").forEach(r => { r.checked = (r.value === this.state.deployment.model); });
    document.querySelectorAll("input[name='node-perf']").forEach(r => { r.checked = (r.value === this.state.deployment.nodePreference); });

    this.renderSitesManagerUI();
    this.loadWorkloadPresets();
    this.renderPricingAdjuster();
    this.updateUI();
    alert(`Scenario loaded: ${this.state.project.name || "Untitled"}`);
  }

  generateAsBuiltDocument() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();
    const bw = this.calculateBandwidth();

    let text = `=========================================
COHESITY AS-BUILT / HANDOVER DOCUMENT
=========================================
Project: ${this.state.project.name}
Sector: ${this.state.project.industry}
Document generated: ${this.getFormattedDate()}
Tool: Cohesity Architect Toolkit (client-side sizing wizard)

This document captures the exact configuration this sizing was generated against, for
implementation handover or later audit. It is a technical record, not the customer-facing
sales proposal (see "Copy Proposal Text" for that).

1. SITES & WORKLOADS
---------------------
`;
    this.state.sites.forEach(site => {
      text += `\nSite: ${site.name} (id: ${site.id})\n`;
      Object.keys(site.workloads).forEach(type => {
        const wl = site.workloads[type];
        const label = COHESITY_DATA.workloadPresets[type].name;
        text += `  - ${label}: ${wl.active ? "ACTIVE" : "inactive"} | ${wl.capacityTB} TB | growth ${wl.growth}%/yr | dedupe ${wl.dedupe}:1 | retention ${wl.retentionDays}d | backup window ${wl.windowHours}h\n`;
      });
    });

    text += `\n2. BUSINESS CONTINUITY & DR CONFIGURATION\n------------------------------------------\n`;
    text += `RPO Target: ${this.state.bcdr.rpo}\nRTO Target: ${this.state.bcdr.rto}\nReplication Mode: ${this.state.bcdr.replication}\nSiteContinuity DR Orchestrator: ${this.state.bcdr.siteContinuity ? "ENABLED" : "disabled"}\n`;

    text += `\n3. SECURITY CONFIGURATION\n--------------------------\n`;
    text += `Cohesity Data Cloud Edition: ${this.state.deployment.edition === "enterprise" ? "Enterprise" : "Core"}\nFortKnox Cyber Vault: ${this.state.security.fortknox ? "ENABLED" : "disabled"}\nThreat Defense & Data Classification: ${this.state.security.datahawk ? "ENABLED (Enterprise Edition)" : "disabled"}\nHelios MFA: ${this.state.security.mfa ? "ENABLED" : "disabled"}\nMulti-Party Authorization (MPA): ${this.state.security.mpa ? "ENABLED" : "disabled"}\nKMS: ${this.state.security.kms === "customer" ? "Customer-Managed External KMS" : "Cohesity-Managed Default Keys"}\nCyber Resilience Index: ${compliance.score}/100\n`;

    text += `\n4. DEPLOYMENT & HARDWARE\n-------------------------\n`;
    text += `Deployment Model: ${this.state.deployment.model}\n`;
    if (this.state.deployment.model !== "saas") {
      text += `Hardware Class Preference: ${this.state.deployment.nodePreference}\nRecommended Configuration: ${sizing.nodeRecommendation}\nResiliency Mode: ${sizing.resiliencyMode}\nYear-1 Node Checkpoint: ${sizing.year1NodeCount} nodes\nFull 3-Year Node Count: ${sizing.localNodeCount} nodes\n`;
    }
    text += `Front-End Data: ${sizing.frontEndTB} TB\nUsable Storage Required (3yr): ${sizing.usableLocalTB} TB\n`;
    if (this.state.security.fortknox) text += `FortKnox Vault Size: ${sizing.fortKnoxVaultTB} TB\n`;

    text += `\n5. BANDWIDTH SIZING\n--------------------\n`;
    text += `Daily Change (raw): ${bw.dailyChangeRawTB} TB/day\nDaily Change (deduplicated): ${bw.dailyChangeDedupeTB} TB/day\nIngest Bandwidth: ${bw.ingestDedupeMbps} Mbps (${bw.ingestDedupeMBs} MB/s)\n`;

    const recovery = this.calculateRecoveryTime();
    text += `\n6. RECOVERY EXPECTATIONS (SE planning estimates, not a guaranteed SLA)\n-------------------------------------------------------------------------\n`;
    text += `What you get back: ${recovery.rpoText}. ${recovery.cleanScan ? "Snapshots are malware-scanned before recovery (Threat Defense & Data Classification)." : "Snapshots are not malware-scanned before recovery."}\n\n`;
    recovery.scenarios.forEach(s => {
      text += `  - ${s.name}\n    How long: ${s.rtoText}\n    What you get back: ${s.whatYouGetBack}\n    End state: ${s.endState}\n`;
    });

    text += `\n7. PRICING SNAPSHOT (rates in effect when this document was generated)\n------------------------------------------------------------------------\n`;
    Object.keys(this.state.pricing).forEach(k => {
      text += `  ${k}: $${this.state.pricing[k].toLocaleString()}\n`;
    });

    text += `\n8. COMPLIANCE FRAMEWORKS SELECTED\n-----------------------------------\n`;
    text += (this.state.project.compliance && this.state.project.compliance.length > 0)
      ? this.state.project.compliance.map(c => COHESITY_DATA.complianceFrameworks[c] ? COHESITY_DATA.complianceFrameworks[c].name : c).join(", ") + "\n"
      : "None selected.\n";

    text += `\n9. CLUSTER-INTERNAL NETWORK PREREQUISITES\n-------------------------------------------\n`;
    COHESITY_DATA.clusterNetworkRequirements.forEach(req => {
      text += `  - ${req.item}: ${req.detail}\n`;
    });

    text += `\n10. FIREWALL / TCP PORT REQUIREMENTS\n-------------------------------------\n`;
    this.getNetworkPorts().forEach(p => {
      text += `  - ${p.port} (${p.proto}) ${p.src} -> ${p.dest}: ${p.desc} [${p.active ? "ACTIVE" : "inactive"}]\n`;
    });

    return text;
  }

  downloadTopologySVG() {
    if (!this.dom.svgContainer) return;
    const svgEl = this.dom.svgContainer.querySelector("svg");
    if (!svgEl) return;
    const svgText = new XMLSerializer().serializeToString(svgEl);
    this.downloadBlob(`${this.slugify(this.state.project.name, "cohesity-topology")}-diagram.svg`, svgText, "image/svg+xml");
  }

  updateUI() {
    this.updateSidebarStats(); // also refreshes the bandwidth and recovery-expectations widgets
    this.renderTopologyDiagram();

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
      .filter(w => this.state.sites.some(site => site.workloads[w] && site.workloads[w].active))
      .map(w => COHESITY_DATA.workloadPresets[w].name.split(" (")[0]);
      
    const complianceNames = this.state.project.compliance
      .map(c => COHESITY_DATA.complianceFrameworks[c] ? COHESITY_DATA.complianceFrameworks[c].name.split(" ")[0] : c.toUpperCase());
      
    let summaryText = `<span style="color:var(--text-muted); font-size:11px;">${COHESITY_DATA.companyContext}</span><br><br>`;
    summaryText += `This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster sized for <strong>${this.state.project.name}</strong> (Industry: <strong>${this.state.project.industry}</strong>). The design consolidates protection across <strong>${this.state.sites.length} site(s)</strong> (${this.state.sites.map(s => s.name).join(", ")}).<br><br>`;
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
      summaryText += `Cohesity Data Cloud <strong>Enterprise Edition</strong> is selected, adding machine learning anomaly scanning, threat hunting/containment, and automated sensitive data classification on top of Core Edition's backup and recovery capabilities. `;
    }

    if (this.state.deployment.model !== "saas" && sizing.year1NodeCount && sizing.year1NodeCount < sizing.localNodeCount) {
      summaryText += `<br><br><strong>Phased deployment:</strong> the full 3-year forecast sizes to ${sizing.localNodeCount} nodes, but only <strong>${sizing.year1NodeCount} nodes</strong> are required to cover Year 1 — the remaining capacity can be added later as a non-disruptive scale-out expansion. `;
    }

    if (complianceNames.length > 0) {
      summaryText += `<br><br>This architecture incorporates structural configurations designed to assist with your regulatory compliance targets for <strong>${complianceNames.join(", ")}</strong>.`;
    }
    
    const bandwidths = this.calculateBandwidth();
    summaryText += `<br><br><strong>Network & Bandwidth Estimates:</strong><br>`;
    summaryText += `• Raw daily backup change volume: <strong>${bandwidths.dailyChangeRawTB} TB/day</strong> (Deduplicated transfer footprint: <strong>${bandwidths.dailyChangeDedupeTB} TB/day</strong>).<br>`;
    summaryText += `• Ingest network link consumption (${bandwidths.ingestHours.toFixed(1)}-hour average backup window): <strong>${bandwidths.ingestDedupeMbps} Mbps (${bandwidths.ingestDedupeMBs} MB/s)</strong> (requires ~<strong>${bandwidths.ingestRawMbps} Mbps (${bandwidths.ingestRawMBs} MB/s)</strong> without source-side deduplication).<br>`;
    
    if (this.state.security.fortknox) {
      summaryText += `• Cloud vaulting bandwidth (FortKnox 4-hour sync window): <strong>${bandwidths.vaultMbps} Mbps (${bandwidths.vaultMBs} MB/s)</strong>.<br>`;
    }
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      summaryText += `• Off-site replication link requirements (4-hour replication window): <strong>${bandwidths.replMbps} Mbps (${bandwidths.replMBs} MB/s)</strong>.<br>`;
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
      const pricePerTB = this.state.pricing.saasTB; // Annual cost per SaaS TB
      const linePrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += linePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity DataProtect SaaS License</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Fully-managed cloud-to-cloud backup subscription ($${pricePerTB.toLocaleString()} / TB)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${linePrice.toLocaleString()}</td>
        </tr>
      `;
    } else {
      // Hardware Nodes
      const pricePerNode = this.state.pricing.physicalNode; // Annual subscription cost per node (includes support)
      const nodeLinePrice = sizing.localNodeCount * pricePerNode;
      
      // DataProtect capacity subscription
      const pricePerTB = this.state.pricing.dataprotectTB; // Annual cost per front-end TB
      const dataProtectPrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += (nodeLinePrice + dataProtectPrice);
      
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity ${sizing.nodeModelName} Nodes</td>
          <td style="padding: 12px; text-align: center;">${sizing.localNodeCount} Nodes</td>
          <td style="padding: 12px; color: var(--text-secondary);">Physical hyperconverged storage nodes (${sizing.nodeModelName} hardware subscription)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${nodeLinePrice.toLocaleString()}</td>
        </tr>
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity DataProtect Software Suite</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Backup & Instant Recovery software capacity subscription ($${pricePerTB.toLocaleString()} / Front-End TB)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${dataProtectPrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 2: Cloud Edition Nodes if Cloud Replication Target is active
    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudNodePrice = this.state.pricing.cloudNode; // Cloud Virtual Node sub price
      const cloudLinePrice = sizing.cloudNodeCount * cloudNodePrice;
      totalAnnualPrice += cloudLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity Cloud Edition IaaS Virtual Nodes</td>
          <td style="padding: 12px; text-align: center;">${sizing.cloudNodeCount} Nodes</td>
          <td style="padding: 12px; color: var(--text-secondary);">Replication target running in AWS/Azure Virtual private clouds ($${cloudNodePrice.toLocaleString()} / Node)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${cloudLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 3: FortKnox Cyber Vault
    if (this.state.security.fortknox) {
      const pricePerVaultedTB = this.state.pricing.fortknoxTB; // Annual cost per vaulted TB (includes cloud storage & egress)
      const fkLinePrice = sizing.fortKnoxVaultTB * pricePerVaultedTB;
      totalAnnualPrice += fkLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity FortKnox Cloud Cyber Vault</td>
          <td style="padding: 12px; text-align: center;">${sizing.fortKnoxVaultTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Isolated cloud vaulting with virtual air-gap and multi-party quorum control ($${pricePerVaultedTB.toLocaleString()} / TB)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${fkLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 4: Enterprise Edition Uplift (bundles Threat Defense & Data Classification,
    // formerly the standalone DataHawk SKU - see data.js "datahawk" product note)
    if (this.state.deployment.edition === "enterprise") {
      const upliftPricePerTB = this.state.pricing.enterpriseUpliftTB;
      const upliftLinePrice = parseFloat(sizing.frontEndTB) * upliftPricePerTB;
      totalAnnualPrice += upliftLinePrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity Data Cloud Enterprise Edition Uplift</td>
          <td style="padding: 12px; text-align: center;">${sizing.frontEndTB} TB</td>
          <td style="padding: 12px; color: var(--text-secondary);">Threat Defense (ransomware anomaly detection, threat hunting) & sensitive data classification, bundled in Enterprise Edition ($${upliftPricePerTB.toLocaleString()} / TB over Core)</td>
          <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--accent-green);">$${upliftLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    // Line 5: SiteContinuity Disaster Recovery
    if (this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none") {
      const siteContPrice = this.state.pricing.sitecontinuityFlat; // Flat base annual orchestrator sub
      totalAnnualPrice += siteContPrice;
      tableHTML += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 12px; font-weight: 600;">Cohesity SiteContinuity DR Orchestrator</td>
          <td style="padding: 12px; text-align: center;">Active</td>
          <td style="padding: 12px; color: var(--text-secondary);">Disaster recovery playbook sequencing, network mapping, and failover/failback scripting ($${siteContPrice.toLocaleString()} / yr flat)</td>
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

            if (framework.links && framework.links.length > 0) {
              complianceHTML += `
                <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08); display: flex; flex-wrap: wrap; gap: 12px; align-items: center;">
                  <span style="font-size: 10.5px; color: var(--text-secondary); font-weight: 600; display: flex; align-items: center; gap: 4px;">
                    <span class="material-symbols-outlined" style="font-size:14px;">link</span> References:
                  </span>
              `;
              framework.links.forEach(lnk => {
                complianceHTML += `
                  <a href="${lnk.url}" target="_blank" style="font-size: 10.5px; color: var(--accent-blue); text-decoration: none; display: inline-flex; align-items: center; gap: 2px; transition: color 0.2s;" onmouseover="this.style.color='#00bcff'" onmouseout="this.style.color='var(--accent-blue)'">
                    ${lnk.text} <span class="material-symbols-outlined" style="font-size: 11px;">open_in_new</span>
                  </a>
                `;
              });
              complianceHTML += `</div>`;
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

    // 5. TCO/consolidation value, recovery expectations, and competitive positioning
    this.renderTCO();
    this.renderRecoveryExpectations();
    this.renderCompetitivePositioning();
  }

  copyProposalToClipboard() {
    const sizing = this.calculateSizing();
    const compliance = this.calculateComplianceScore();
    
    const activeWls = Object.keys(this.state.workloads)
      .filter(w => this.state.sites.some(site => site.workloads[w] && site.workloads[w].active))
      .map(w => COHESITY_DATA.workloadPresets[w].name.split(" (")[0]);
      
    const complianceNames = this.state.project.compliance
      .map(c => COHESITY_DATA.complianceFrameworks[c] ? COHESITY_DATA.complianceFrameworks[c].name : c.toUpperCase());

    let text = `=========================================
COHESITY SOLUTION ARCHITECTURE PROPOSAL
=========================================
Project: ${this.state.project.name}
Sector: ${this.state.project.industry}
Date: ${this.getFormattedDate()}

1. EXECUTIVE SUMMARY
---------------------
${COHESITY_DATA.companyContext}

This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster. Sized to meet a front-end workload footprint of ${sizing.frontEndTB} TB (consisting of: ${activeWls.join(", ")}), the system establishes an integrated hyperconverged scale-out storage mesh. The design consolidates protection across ${this.state.sites.length} site(s) (${this.state.sites.map(s => s.name).join(", ")}). Compounded over a 3-year growth forecast and adjusted for GFS snapshot retention targets, the calculated usable storage requirement stands at ${sizing.usableLocalTB} TB.

Deployment model: ${this.state.deployment.model.toUpperCase()} Cloud Scenario.
Recommended primary cluster configuration: ${sizing.nodeRecommendation}.
`;

    if (this.state.security.fortknox) {
      text += `Cohesity FortKnox cloud cyber vaulting is incorporated, isolating an immutable copy of ${sizing.fortKnoxVaultTB} TB in a virtually air-gapped SaaS cloud vault.\n`;
    }
    if (this.state.security.datahawk) {
      text += `Cohesity Data Cloud Enterprise Edition is selected, adding machine learning anomaly scanning, threat hunting/containment, and automated sensitive data classification on top of Core Edition.\n`;
    }
    if (this.state.deployment.model !== "saas" && sizing.year1NodeCount && sizing.year1NodeCount < sizing.localNodeCount) {
      text += `Phased deployment: ${sizing.year1NodeCount} nodes cover Year 1; the remaining capacity to reach ${sizing.localNodeCount} nodes can be added later as a non-disruptive expansion.\n`;
    }
    if (complianceNames.length > 0) {
      text += `\nRegulatory Compliance Alignment Targets: ${complianceNames.join(", ")}.\n`;
    }

    const tco = this.calculateTCO();
    text += `\nConsolidation Value (illustrative TCO estimate):\n`;
    text += `- Blended deduplication/compression reduction: ${tco.dedupeRatioBlended.toFixed(1)}:1\n`;
    text += `- Legacy primary-storage capacity avoided: ${tco.spaceSavedTB.toFixed(1)} TB\n`;
    text += `- Estimated avoided storage cost: $${Math.round(tco.avoidedCostUSD).toLocaleString()} (at $${(this.state.pricing.primaryStorageCostPerTB || 0).toLocaleString()}/TB legacy storage assumption)\n`;

    const bandwidths = this.calculateBandwidth();
    text += `\nNetwork & Bandwidth Sizing:\n`;
    text += `- Daily Backup Change Rate (Raw): ${bandwidths.dailyChangeRawTB} TB/day\n`;
    text += `- Daily Backup Change Rate (Deduplicated): ${bandwidths.dailyChangeDedupeTB} TB/day\n`;
    text += `- Recommended Ingest Connection (${bandwidths.ingestHours.toFixed(1)}h average backup window): ${bandwidths.ingestDedupeMbps} Mbps (${bandwidths.ingestDedupeMBs} MB/s) (requires ~${bandwidths.ingestRawMbps} Mbps (${bandwidths.ingestRawMBs} MB/s) raw link)\n`;
    
    if (this.state.security.fortknox) {
      text += `- FortKnox SaaS Vault Replication (4h SLA): ${bandwidths.vaultMbps} Mbps (${bandwidths.vaultMBs} MB/s)\n`;
    }
    if (this.state.bcdr.replication === "second-site" || this.state.bcdr.replication === "cloud-edition") {
      text += `- Secondary Replication Link (4h SLA): ${bandwidths.replMbps} Mbps (${bandwidths.replMBs} MB/s)\n`;
    }

    const recovery = this.calculateRecoveryTime();
    text += `\nRecovery Expectations (SE planning estimates, not a guaranteed SLA):\n`;
    text += `- What you get back: ${recovery.rpoText}. ${recovery.cleanScan ? "Snapshots are malware-scanned before recovery (Threat Defense & Data Classification)." : "Snapshots are not malware-scanned before recovery."}\n`;
    recovery.scenarios.forEach(s => {
      text += `- ${s.name}: ${s.rtoText} — ${s.whatYouGetBack} — ${s.endState}\n`;
    });

    text += `
2. BILL OF MATERIALS (BOM) & PRICING
-------------------------------------
Estimated Annual Subscription Details:
- Front-End Sized Data: ${sizing.frontEndTB} TB
- Local Sized Usable Target: ${sizing.usableLocalTB} TB
`;

    let totalAnnualPrice = 0;
    if (this.state.deployment.model === "saas") {
      const pricePerTB = this.state.pricing.saasTB;
      const linePrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += linePrice;
      text += `- Cohesity DataProtect SaaS subscription: $${linePrice.toLocaleString()}/yr ($${pricePerTB.toLocaleString()} / TB)\n`;
    } else {
      const nodePrice = sizing.localNodeCount * this.state.pricing.physicalNode;
      const protectPrice = parseFloat(sizing.frontEndTB) * this.state.pricing.dataprotectTB;
      totalAnnualPrice += (nodePrice + protectPrice);
      text += `- Cohesity physical nodes (${sizing.nodeModelName}): $${nodePrice.toLocaleString()}/yr\n`;
      text += `- Cohesity DataProtect capacity license: $${protectPrice.toLocaleString()}/yr ($${this.state.pricing.dataprotectTB.toLocaleString()} / Front-End TB)\n`;
    }

    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudPrice = sizing.cloudNodeCount * this.state.pricing.cloudNode;
      totalAnnualPrice += cloudPrice;
      text += `- Cohesity Cloud Edition virtual nodes: $${cloudPrice.toLocaleString()}/yr ($${this.state.pricing.cloudNode.toLocaleString()} / Node)\n`;
    }
    if (this.state.security.fortknox) {
      const fkPrice = sizing.fortKnoxVaultTB * this.state.pricing.fortknoxTB;
      totalAnnualPrice += fkPrice;
      text += `- Cohesity FortKnox Cyber Vault capacity: $${fkPrice.toLocaleString()}/yr ($${this.state.pricing.fortknoxTB.toLocaleString()} / TB)\n`;
    }
    if (this.state.deployment.edition === "enterprise") {
      const upliftPrice = parseFloat(sizing.frontEndTB) * this.state.pricing.enterpriseUpliftTB;
      totalAnnualPrice += upliftPrice;
      text += `- Cohesity Data Cloud Enterprise Edition uplift (Threat Defense & data classification): $${upliftPrice.toLocaleString()}/yr ($${this.state.pricing.enterpriseUpliftTB.toLocaleString()} / TB)\n`;
    }
    if (this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none") {
      const scPrice = this.state.pricing.sitecontinuityFlat;
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
      { label: "Real-time AI malware anomaly scanning (Enterprise Edition)", pass: this.state.security.datahawk },
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
          if (framework.links && framework.links.length > 0) {
            text += `References & Solution Briefs:\n`;
            framework.links.forEach(lnk => {
              text += `- ${lnk.text}: ${lnk.url}\n`;
            });
          }
        }
      });
    }
 
    // 6. Network Firewall & TCP Port Routing Table
    text += `\n6. NETWORK FIREWALL & TCP PORT ROUTING TABLE\n`;
    text += `--------------------------------------------\n`;
    const portsList = this.getNetworkPorts();
    portsList.forEach(p => {
      text += `- Port: ${p.port.padEnd(10)} | Proto: ${p.proto.padEnd(11)} | Src: ${p.src.padEnd(18)} -> Dest: ${p.dest.padEnd(18)} | Purpose: ${p.desc} | Status: [${p.active ? 'ACTIVE' : 'INACTIVE'}]\n`;
    });

    text += `\n6a. CLUSTER-INTERNAL NETWORK PREREQUISITES\n-------------------------------------------\n`;
    COHESITY_DATA.clusterNetworkRequirements.forEach(req => {
      text += `- ${req.item}: ${req.detail}\n`;
    });

    text += `\n7. COMPETITIVE POSITIONING NOTES (SE talking points, verify against current battlecard)\n-------------------------------------------------------------------------------------------\n`;
    COHESITY_DATA.competitivePositioning.forEach(c => {
      text += `- vs. ${c.vendor}: ${c.angle}\n`;
    });

    const originalText = this.dom.btnCopyProposal.innerHTML;
    navigator.clipboard.writeText(text).then(() => {
      this.dom.btnCopyProposal.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle;">check</span> Proposal Copied!`;
    }).catch(() => {
      this.dom.btnCopyProposal.innerHTML = `<span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle;">error</span> Copy failed — clipboard access denied`;
    }).finally(() => {
      setTimeout(() => {
        this.dom.btnCopyProposal.innerHTML = originalText;
      }, 2000);
    });
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
        </g>
      `;
 
      // 1. SITES (Left column)
      const sites = this.state.sites;
    let wlStartY = 80;
    const wlSpacing = Math.max(50, Math.min(80, 240 / (sites.length || 1)));

    sites.forEach((site, idx) => {
      const yPos = wlStartY + (idx * wlSpacing);
      const iconChar = "corporate_fare";
      
      let siteCapacityTB = 0;
      let siteIngestRawMbps = 0;
      let siteIngestDedupeMbps = 0;

      Object.keys(site.workloads).forEach(wlKey => {
        const wl = site.workloads[wlKey];
        if (wl.active) {
          siteCapacityTB += wl.capacityTB;
          const preset = COHESITY_DATA.workloadPresets[wlKey];
          const dailyRate = preset ? preset.dailyChangeRate : 3;
          const rawChange = wl.capacityTB * (dailyRate / 100);
          const dedupeChange = rawChange / wl.dedupe;

          const windowHours = wl.windowHours || 8;
          siteIngestRawMbps += (rawChange * 8000000) / (windowHours * 3600);
          siteIngestDedupeMbps += (dedupeChange * 8000000) / (windowHours * 3600);
        }
      });

      const siteDedupeMbps = Math.ceil(siteIngestDedupeMbps);
      const siteDedupeMBs = (siteDedupeMbps / 8).toFixed(1).replace(/\.0$/, "");

      let activeWlsText = [];
      Object.keys(site.workloads).forEach(wlKey => {
        const wl = site.workloads[wlKey];
        if (wl.active) {
          const label = wlKey === "vm" ? "VMs" : wlKey === "database" ? "DBs" : wlKey === "files" ? "Files" : wlKey === "saas" ? "SaaS" : "K8s";
          activeWlsText.push(`${label}: ${wl.capacityTB}TB`);
        }
      });
      const workloadsDetail = activeWlsText.length > 0 ? activeWlsText.join(", ") : "No workloads";

      svgContent += `
        <!-- Site Link to Cluster -->
        <path d="M 170 ${yPos} Q 250 ${yPos}, 330 190" fill="none" stroke="var(--accent-blue)" stroke-opacity="0.3" stroke-width="2" />
        <path d="M 170 ${yPos} Q 250 ${yPos}, 330 190" class="flow-line" fill="none" stroke="var(--accent-blue)" stroke-opacity="0.8" stroke-width="2" />
        
        <!-- Site Bubble -->
        <g class="svg-hotspot" cursor="pointer" onclick="app.showHotspot('site-${site.id}')">
          <circle cx="100" cy="${yPos}" r="22" fill="#121a2f" stroke="var(--accent-blue)" stroke-width="1.5" />
          <text x="100" y="${yPos + 5}" font-family="Material Symbols Outlined" font-size="16" fill="var(--accent-blue)" text-anchor="middle">corporate_fare</text>
          <text x="135" y="${yPos - 4}" font-family="Inter" font-size="11" font-weight="700" fill="white">${site.name.toUpperCase()}</text>
          <text x="135" y="${yPos + 7}" font-size="9" font-family="JetBrains Mono" fill="var(--text-secondary)">${siteCapacityTB} TB (~${siteDedupeMbps} Mbps / ${siteDedupeMBs} MB/s)</text>
          <text x="135" y="${yPos + 17}" font-family="Inter" font-size="8.5" fill="var(--accent-blue)" font-weight="500">${workloadsDetail}</text>
        </g>
      `;
    });

    if (sites.length === 0) {
      svgContent += `
        <text x="100" y="190" font-family="Inter" font-size="12" fill="var(--accent-red)" text-anchor="middle" font-weight="600">❌ No Sites Configured</text>
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
          <rect x="-55" y="-8" width="110" height="15" rx="3" fill="#121a2f" stroke="var(--accent-purple)" stroke-width="1" />
          <text x="0" y="3" font-family="JetBrains Mono" font-size="8" font-weight="700" fill="var(--accent-purple)" text-anchor="middle">${bandwidths.vaultMbps} Mbps (${bandwidths.vaultMBs} MB/s)</text>
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
          <rect x="-55" y="-8" width="110" height="15" rx="3" fill="#121a2f" stroke="${replColor}" stroke-width="1" />
          <text x="0" y="3" font-family="JetBrains Mono" font-size="8" font-weight="700" fill="${replColor}" text-anchor="middle">${bandwidths.replMbps} Mbps (${bandwidths.replMBs} MB/s)</text>
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
    if (id.startsWith("site-")) {
      const siteId = id.replace("site-", "");
      const site = this.state.sites.find(s => s.id === siteId);
      if (site) {
        let content = `Site Name: <strong>${site.name}</strong><br>`;
        let activeWls = [];
        let siteFE = 0;
        let siteIngestDedupeMbps = 0;
        
        Object.keys(site.workloads).forEach(type => {
          const wl = site.workloads[type];
          if (wl.active) {
            siteFE += wl.capacityTB;
            const label = COHESITY_DATA.workloadPresets[type].name.split(" (")[0];
            
            const preset = COHESITY_DATA.workloadPresets[type];
            const dailyRate = preset ? preset.dailyChangeRate : 3;
            const rawChange = wl.capacityTB * (dailyRate / 100);
            const dedupeChange = rawChange / wl.dedupe;
            const windowHours = wl.windowHours || 8;
            const wlDedupeMbps = (dedupeChange * 8000000) / (windowHours * 3600);
            siteIngestDedupeMbps += wlDedupeMbps;

            activeWls.push(`• <strong>${label}</strong>: ${wl.capacityTB} TB (Growth: ${wl.growth}%, Window: ${wl.windowHours}h)`);
          }
        });

        content += `Total Sized: <strong>${siteFE} TB</strong><br>`;
        const siteDedupeMbps = Math.ceil(siteIngestDedupeMbps);
        const siteDedupeMBs = (siteDedupeMbps / 8).toFixed(1).replace(/\.0$/, "");
        content += `Ingest WAN Rate: <strong>${siteDedupeMbps} Mbps (${siteDedupeMBs} MB/s)</strong><br>`;
        
        if (activeWls.length > 0) {
          content += `<br>Active Workloads:<br>${activeWls.join("<br>")}`;
        } else {
          content += `<br><em>No active workloads configured at this site.</em>`;
        }

        this.dom.hotspotOverlay.innerHTML = `
          <div class="hotspot-overlay-card">
            <h4 style="margin:0 0 8px 0; color:var(--accent-blue); display:flex; align-items:center; justify-content:space-between;">
              <span>🏢 Site Infrastructure</span>
              <span class="material-symbols-outlined" style="cursor:pointer; font-size:16px; color:var(--text-muted);" onclick="document.getElementById('hotspot-overlay').style.display='none'">close</span>
            </h4>
            <p style="font-size:11.5px; line-height:1.4; color:var(--text-secondary); margin:0;">${content}</p>
          </div>
        `;
        this.dom.hotspotOverlay.style.display = "block";
        return;
      }
    }

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
    const tcoForPrint = this.calculateTCO();
    const recoveryForPrint = this.calculateRecoveryTime();

    // Renders structural data inside the print section
    let workloadsHTML = "";
    this.state.sites.forEach(site => {
      Object.keys(site.workloads).forEach(type => {
        const wl = site.workloads[type];
        if (wl.active) {
          workloadsHTML += `
            <tr>
              <td><strong>${site.name}</strong> - ${COHESITY_DATA.workloadPresets[type].name}</td>
              <td>${wl.capacityTB} TB</td>
              <td>${wl.growth}%</td>
              <td>${wl.dedupe}:1</td>
              <td>${wl.retentionDays} Days</td>
            </tr>
          `;
        }
      });
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
        
        <div class="print-page" style="page-break-before: always;">
          <div class="print-header">
            <h1 style="font-size: 20pt; margin: 0; color: #111;">Cohesity Solution Design (Cont.)</h1>
            <p style="font-size: 9pt; color: #666; margin: 4px 0 0 0;">Project: ${this.state.project.name} | GRC Appendices</p>
          </div>
          <div class="print-section">
            <h2>Appendix A: Governance, Risk & Compliance Reference Bibliography</h2>
            <p>This appendix compiles official documentation, regulatory guidelines, and Cohesity compliance briefs related to the security posture of the sized configuration:</p>
            <div style="margin-top: 15px;">
      `;

      activeComplianceKeys.forEach(key => {
        const framework = COHESITY_DATA.complianceFrameworks[key];
        if (framework && framework.links && framework.links.length > 0) {
          printComplianceHTML += `
            <div style="margin-top: 14px; border: 1px solid #ddd; padding: 10px; border-radius: 6px; page-break-inside: avoid;">
              <h3 style="font-size: 10pt; color: #0056b3; margin: 0 0 6px 0; border-bottom: 1.5px solid #eee; padding-bottom: 4px; font-weight: 700;">${framework.name} References</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; text-align: left;">
                <thead>
                  <tr style="border-bottom: 1px solid #ccc; font-weight: bold; background: #fafafa;">
                    <th style="padding: 6px 4px; width: 45%;">Resource Title</th>
                    <th style="padding: 6px 4px;">Official Verification Link</th>
                  </tr>
                </thead>
                <tbody>
          `;
          framework.links.forEach(lnk => {
            printComplianceHTML += `
              <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 6px 4px; font-weight: bold; color: #333; vertical-align: top;">${lnk.text}</td>
                <td style="padding: 6px 4px; vertical-align: top;"><a href="${lnk.url}" target="_blank" style="color: #0056b3; text-decoration: underline; font-family: monospace; font-size: 7.5pt; word-break: break-all;">${lnk.url}</a></td>
              </tr>
            `;
          });
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
        </div>
      `;
    }

    let totalAnnualPrice = 0;
    let printedBOMRows = "";

    if (this.state.deployment.model === "saas") {
      const pricePerTB = this.state.pricing.saasTB;
      const linePrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += linePrice;
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity DataProtect SaaS License</strong></td>
          <td>${sizing.frontEndTB} TB</td>
          <td>Fully-managed cloud-to-cloud backup subscription ($${pricePerTB.toLocaleString()} / TB)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${linePrice.toLocaleString()}</td>
        </tr>
      `;
    } else {
      const pricePerNode = this.state.pricing.physicalNode;
      const nodeLinePrice = sizing.localNodeCount * pricePerNode;
      const pricePerTB = this.state.pricing.dataprotectTB;
      const dataProtectPrice = parseFloat(sizing.frontEndTB) * pricePerTB;
      totalAnnualPrice += (nodeLinePrice + dataProtectPrice);
      
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity ${sizing.nodeModelName} Nodes</strong></td>
          <td>${sizing.localNodeCount} Nodes</td>
          <td>Physical hyperconverged storage nodes (${sizing.nodeModelName} hardware subscription)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${nodeLinePrice.toLocaleString()}</td>
        </tr>
        <tr>
          <td><strong>Cohesity DataProtect Software Suite</strong></td>
          <td>${sizing.frontEndTB} TB</td>
          <td>Backup & Instant Recovery software capacity subscription ($${pricePerTB.toLocaleString()} / Front-End TB)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${dataProtectPrice.toLocaleString()}</td>
        </tr>
      `;
    }

    if (this.state.bcdr.replication === "cloud-edition") {
      const cloudNodePrice = this.state.pricing.cloudNode;
      const cloudLinePrice = sizing.cloudNodeCount * cloudNodePrice;
      totalAnnualPrice += cloudLinePrice;
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity Cloud Edition IaaS Virtual Nodes</strong></td>
          <td>${sizing.cloudNodeCount} Nodes</td>
          <td>Replication target running in AWS/Azure Cloud ($${cloudNodePrice.toLocaleString()} / Node)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${cloudLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    if (this.state.security.fortknox) {
      const pricePerVaultedTB = this.state.pricing.fortknoxTB;
      const fkLinePrice = sizing.fortKnoxVaultTB * pricePerVaultedTB;
      totalAnnualPrice += fkLinePrice;
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity FortKnox Cloud Cyber Vault</strong></td>
          <td>${sizing.fortKnoxVaultTB} TB</td>
          <td>Isolated cloud vaulting with virtual air-gap ($${pricePerVaultedTB.toLocaleString()} / TB)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${fkLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    if (this.state.deployment.edition === "enterprise") {
      const upliftPricePerTB = this.state.pricing.enterpriseUpliftTB;
      const upliftLinePrice = parseFloat(sizing.frontEndTB) * upliftPricePerTB;
      totalAnnualPrice += upliftLinePrice;
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity Data Cloud Enterprise Edition Uplift</strong></td>
          <td>${sizing.frontEndTB} TB</td>
          <td>Threat Defense & sensitive data classification, bundled in Enterprise Edition ($${upliftPricePerTB.toLocaleString()} / TB over Core)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${upliftLinePrice.toLocaleString()}</td>
        </tr>
      `;
    }

    if (this.state.bcdr.siteContinuity && this.state.bcdr.replication !== "none") {
      const siteContPrice = this.state.pricing.sitecontinuityFlat;
      totalAnnualPrice += siteContPrice;
      printedBOMRows += `
        <tr>
          <td><strong>Cohesity SiteContinuity DR Orchestrator</strong></td>
          <td>Active</td>
          <td>Disaster recovery playbook sequencing flat subscription ($${siteContPrice.toLocaleString()} / yr flat)</td>
          <td style="text-align: right; font-weight: bold; color: #1e7e34;">$${siteContPrice.toLocaleString()}</td>
        </tr>
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
            <div style="font-size: 8pt; color: #888;">Generated: ${this.getFormattedDate()}</div>
          </div>
        </div>

        <div class="print-section">
          <h2>1. Executive Summary</h2>
          <p style="font-size: 8.5pt; color: #777; font-style: italic;">${COHESITY_DATA.companyContext}</p>
          <p>This technical architecture proposal outlines the deployment parameters of a Cohesity DataCloud resilient storage cluster. The design consolidates protection across <strong>${this.state.sites.length} site(s)</strong> (${this.state.sites.map(s => s.name).join(", ")}). Sized to meet a front-end workload footprint of <strong>${sizing.frontEndTB} TB</strong>, the system consolidates backup datasets into an integrated, secure scale-out pool reducing storage overhead through deduplication and compression.</p>
          
          <div class="print-bom-summary">
            <div class="print-bom-col" style="width: 22%;">
              <h3>Front-End Data</h3>
              <div class="print-bom-val">${sizing.frontEndTB} TB</div>
            </div>
            <div class="print-bom-col" style="width: 22%;">
              <h3>Sized Usable Storage</h3>
              <div class="print-bom-val" style="color:var(--accent-blue)">${sizing.usableLocalTB} TB</div>
            </div>
            <div class="print-bom-col" style="width: 22%;">
              <h3>Cyber Resiliency Score</h3>
              <div class="print-bom-val" style="color:#ff9900">${compliance.score}/100</div>
            </div>
            <div class="print-bom-col" style="width: 22%;">
              <h3>Est. Annual Cost</h3>
              <div class="print-bom-val" style="color:#00d68f">$${totalAnnualPrice.toLocaleString()}</div>
            </div>
          </div>
          <p style="font-size: 8pt; color: #888; margin-top: 10px;">Hardware: ${sizing.nodeRecommendation || "N/A"}${sizing.year1NodeCount && sizing.localNodeCount && sizing.year1NodeCount < sizing.localNodeCount ? ` — phased: ${sizing.year1NodeCount} nodes cover Year 1, growing to ${sizing.localNodeCount} nodes by Year 3.` : ""}</p>
        </div>

        <div class="print-section">
          <h2>2. Recommended Solution Sizing & Subscription Cost (BOM)</h2>
          <table class="print-table">
            <thead>
              <tr>
                <th>Component / License</th>
                <th>Quantity</th>
                <th>Sizing / Model Details</th>
                <th style="text-align: right;">Est. Annual Subscription</th>
              </tr>
            </thead>
            <tbody>
              ${printedBOMRows}
              <tr style="font-weight: bold; background: rgba(0, 214, 143, 0.08); border-top: 1.5px solid #1e7e34;">
                <td colspan="3" style="padding: 8px 6px; font-size: 10pt;">Estimated Total Cohesity Subscription (Annual Rate)</td>
                <td style="padding: 8px 6px; text-align: right; font-size: 10.5pt; color: #1e7e34;">$${totalAnnualPrice.toLocaleString()}</td>
              </tr>
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

        <div class="print-section">
          <h2>3a. Consolidation Value &amp; TCO Estimate</h2>
          <p style="font-size: 8pt; color: #888;">Illustrative only — compares the deduplicated, GFS-adjusted usable footprint actually stored against a naive undeduplicated equivalent, priced at an editable $/TB legacy primary-storage assumption. Not a substitute for a real cost assessment.</p>
          <div class="print-bom-summary">
            <div class="print-bom-col" style="width: 30%;">
              <h3>Blended Reduction</h3>
              <div class="print-bom-val">${tcoForPrint.dedupeRatioBlended.toFixed(1)}:1</div>
            </div>
            <div class="print-bom-col" style="width: 30%;">
              <h3>Capacity Avoided</h3>
              <div class="print-bom-val" style="color:var(--accent-blue)">${tcoForPrint.spaceSavedTB.toFixed(1)} TB</div>
            </div>
            <div class="print-bom-col" style="width: 30%;">
              <h3>Est. Avoided Storage Cost</h3>
              <div class="print-bom-val" style="color:#00d68f">$${Math.round(tcoForPrint.avoidedCostUSD).toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div class="print-section">
          <h2>3b. Recovery Expectations</h2>
          <p style="font-size: 8pt; color: #888;">SE planning estimates computed from this configuration's throughput and bandwidth assumptions — not a guaranteed SLA.</p>
          <p style="margin-bottom: 10px;"><strong>What you get back:</strong> ${recoveryForPrint.rpoText}. ${recoveryForPrint.cleanScan ? "Snapshots are malware-scanned before recovery (Threat Defense &amp; Data Classification)." : "Snapshots are not malware-scanned before recovery."}</p>
          <table class="print-table">
            <thead>
              <tr>
                <th>Recovery Scenario</th>
                <th>How Long (RTO)</th>
                <th>What You Get Back</th>
                <th>End State</th>
              </tr>
            </thead>
            <tbody>
              ${recoveryForPrint.scenarios.map(s => `
                <tr>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.rtoText}</td>
                  <td>${s.whatYouGetBack}</td>
                  <td>${s.endState}</td>
                </tr>
              `).join('')}
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

        <div class="print-section" style="page-break-inside: avoid;">
          <h2>6. Network Firewall & TCP Port Routing Table</h2>
          <p>The following ports must be enabled in the firewall policy to support connectivity between local, remote, and cloud SaaS elements:</p>
          <table class="print-table" style="font-size: 8.5pt;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding: 6px;">Port</th>
                <th style="padding: 6px;">Protocol</th>
                <th style="padding: 6px;">Source Component</th>
                <th style="padding: 6px;">Destination</th>
                <th style="padding: 6px;">Purpose / Description</th>
                <th style="padding: 6px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${this.getNetworkPorts().map(p => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px;"><strong>${p.port}</strong></td>
                  <td style="padding: 6px;">${p.proto}</td>
                  <td style="padding: 6px;">${p.src}</td>
                  <td style="padding: 6px;">${p.dest}</td>
                  <td style="padding: 6px;">${p.desc}</td>
                  <td style="padding: 6px;"><span style="font-weight:bold; color:${p.active ? '#1e7e34' : '#888'}">${p.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="print-section" style="page-break-inside: avoid;">
          <h2>6a. Cluster-Internal Network Prerequisites</h2>
          <p style="font-size: 8pt; color: #888;">Distinct from the external firewall rows above — these apply to the cluster's own node-to-node network, regardless of firewall policy.</p>
          <table class="print-table" style="font-size: 8.5pt;">
            <thead>
              <tr style="background:#fafafa;">
                <th style="padding: 6px; width: 32%;">Requirement</th>
                <th style="padding: 6px;">Detail</th>
              </tr>
            </thead>
            <tbody>
              ${COHESITY_DATA.clusterNetworkRequirements.map(req => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px;"><strong>${req.item}</strong></td>
                  <td style="padding: 6px;">${req.detail}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="print-page" style="page-break-before: always;">
        <div class="print-header">
          <h1>Cohesity Solution Design (Cont.)</h1>
          <div style="font-size: 8pt; color: #888;">Project: ${this.state.project.name} | Competitive Positioning</div>
        </div>
        <div class="print-section">
          <h2>7. Competitive Positioning Notes</h2>
          <p style="font-size: 8pt; color: #888;">SE talking points, not independently verified competitor claims — validate against the current competitive battlecard before customer use.</p>
          ${COHESITY_DATA.competitivePositioning.map(c => `
            <div style="margin-top: 10px; padding: 8px 0; border-bottom: 1px solid #eee;">
              <strong style="color: #0056b3; font-size: 9.5pt;">vs. ${c.vendor}</strong>
              <p style="font-size: 8.5pt; color: #444; margin: 4px 0 0 0; line-height: 1.4;">${c.angle}</p>
            </div>
          `).join('')}
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
