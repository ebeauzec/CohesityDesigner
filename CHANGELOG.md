# Changelog

All notable changes to the Cohesity Architect Toolkit are documented here.

---

## [3.1.0] - 2026-11-06

**Recovery expectations and Middle East compliance pass.** Added the one scenario the sizing engine didn't answer yet — "how long will it take to get my data back, what do I get back, and what does it look like afterward" — plus three Gulf-region compliance frameworks that were missing entirely.

### Added (Recovery Expectations)
- **New `calculateRecoveryTime()` engine** computing four recovery scenarios from the existing sizing/bandwidth model (no new inputs required): single-workload Instant Mass Restore (SnapFS mount, minutes regardless of size), a full local bulk restore bound by aggregate N+1 cluster throughput, DR failover to a live secondary (orchestration-bound if SiteContinuity is on, manual-runbook-bound if not), and FortKnox vault recovery bound by the vault's cloud egress link — the realistic ransomware worst case.
- Each scenario answers all three questions customers actually ask: **how long** (RTO estimate), **what do I get back** (point-in-time/RPO, and whether the recovered snapshot was malware-scanned), and **what's the end state** (restored in place vs. running on DR/cloud infra pending failback vs. recovered into an isolated cleanroom pending validated move to production).
- Surfaced in three places: a live "Recovery Expectations" card on the Resilience step, a matching section in the Proposal step/PDF export, and a new section in the As-Built document and clipboard proposal text.

### Fixed
- **The bandwidth widgets didn't actually live-update.** `updateBandwidthUI()` was only ever called once, at initial page load — changing a workload's backup window, toggling FortKnox, or switching the replication target after that point left the sidebar and Step 3 bandwidth figures stale until a full page reload. It's now called from `updateSidebarStats()`, which already runs on every state change, alongside the new `updateRecoveryUI()`.

### Added (Middle East Compliance)
- **UAE PDPL (Federal Decree-Law No. 45/2021)** — breach notification, DPO obligations, and data-subject rights mapped to Helios audit logging, AES-256/DataLock, and Threat Defense PII discovery. Notes the separate DIFC/ADGM regimes outside mainland UAE.
- **Saudi PDPL** — breach-notification, data-residency, and security-safeguard obligations mapped to Helios audit evidence, in-Kingdom/customer-controlled deployment, and customer-managed KMS.
- **Saudi Essential Cybersecurity Controls (ECC-2:2024)** — backup/recovery management and DR testing controls mapped to FortKnox vaulting and SiteContinuity.
- Checking either PDPL directive now auto-enables Threat Defense & Data Classification (PII discovery); checking Saudi PDPL also forces customer-managed KMS; checking ECC-2 forces FortKnox + SiteContinuity + MPA — following the same auto-apply pattern as the existing eight frameworks.

## [3.0.0] - 2026-09-25

**Architecture & deliverables pass.** A follow-up gap analysis against Cohesity's actual products and published best practices turned up a real pricing accuracy problem and several sizing/deliverable gaps. This release closes them.

### Fixed (accuracy)
- **DataHawk was being billed as a standalone per-TB SKU it may no longer be.** Checked Cohesity's current packaging directly (cohesity.com/buy/cohesity-data-cloud-packaging/): Cohesity Data Cloud now ships as **Core** and **Enterprise** Editions, and DataHawk isn't named in that packaging — its capabilities (threat detection, classification, ransomware anomaly detection) appear bundled into Enterprise Edition. The BOM's "DataHawk Threat Scan/Classify" line item is replaced with a "Data Cloud Enterprise Edition Uplift" line, and the Security step's toggle now drives a real `deployment.edition` (Core/Enterprise) state shown as a badge in the sidebar.
- **Usable capacity ignored cluster size entirely.** Per Cohesity's Fault Tolerance white paper, RF2 (below 6 nodes) yields ~50% usable capacity; Erasure Coding (6+ nodes) yields up to ~80%. The sizing engine previously applied one flat ratio regardless of node count. `sizeNodesForCapacity()` now computes usable capacity dynamically per candidate node count, switching resiliency mode automatically at the 6-node EC threshold, and the sidebar/BOM/proposal show which mode was used.
- **No utilization headroom.** The engine sized clusters to exactly 100% of the calculated requirement. Now targets 80% utilization in steady state (an SE planning guideline, not an official published Cohesity number — labeled as such throughout).
- **Capacity-only sizing ignored throughput.** Added a per-node-family throughput estimate (`estThroughputMBps`, an SE planning figure) and a check that bumps node count when aggregate required ingest bandwidth would exceed it — the recommendation now notes when it's throughput-bound rather than capacity-bound.

### Added (architecture)
- **Cluster-internal network prerequisites** (IPMI/BMC per node, node VIP, single L2 domain, LACP bonding, jumbo frames) — sourced from Cohesity's "Optimal Network Designs" reference architecture, distinct from the external firewall port table. Surfaced in the Firewall/TCP Ports tab, the print export, and the As-Built document.
- **Phased-expansion / growth-plan checkpoint** — the sizing engine now also computes a Year-1 node count alongside the full 3-year figure, and the sidebar/executive summary surface both ("Deploy N nodes now → grow to M within 3 years") when they differ.
- **Save / Load Scenario** — the entire wizard state can be exported to a JSON file and reloaded later (or shared with a colleague), via new header buttons. Closes the biggest standing UX gap: there was previously no way to persist work between sessions.

### Added (deliverables)
- **Consolidation Value & TCO Estimate** — a new Proposal-step card (and export section) translating the blended dedupe/compression ratio into an illustrative avoided-storage-cost figure, using an editable $/TB legacy-storage assumption.
- **As-Built / Handover document** — a new export (`Download As-Built Doc`) producing a full technical configuration record (sites/workloads, BCDR, security, hardware, pricing snapshot, compliance selections, network prerequisites, firewall ports) distinct from the customer-facing sales proposal.
- **Competitive Positioning Notes** — a new Proposal-step section with SE talking points vs. Veeam, Rubrik, Commvault, and legacy Veritas NetBackup estates, factual/defensible rather than unverifiable claims about competitors.
- **Standalone topology diagram export** — a "Download SVG" button on the topology diagram, independent of the full PDF export.

### Changed
- Pricing model: `datahawkTB` replaced with `enterpriseUpliftTB` (the Enterprise Edition premium over Core), and a new `primaryStorageCostPerTB` rate (for the TCO estimate) added to `pricing.json` and the editable pricing panel.
- Node hardware data (`data.js`) now separates a documented reference `capacityUsableTB` (at minNodes/RF2) from the dynamically-computed actual usable capacity, and adds `estThroughputMBps` per family.

## [2.0.0] - 2026-09-25

**Audit & accuracy pass.** Ran the wizard end-to-end in a real browser, read every line of `app.js`/`data.js`/`index.html`, and fixed the bugs and stale facts that turned up. No build step, so upgrading is just pulling the new files.

### Fixed
- **Hardware specs were hardcoded in two places and had drifted apart.** `calculateSizing()` in `app.js` hardcoded node capacities independently of `data.js`'s `nodeTypes` table. Refactored so `app.js` reads `data.js` as the single source of truth — one hardware catalog, not two.
- **The "All-Flash" tier was actually the hybrid C6200's specs.** Cohesity's real all-flash line (CX8000) didn't exist in the tool at all. Corrected the tier mapping and added CX8000 as its own entry.
- **FortKnox vault sizing formula contradicted its own comment.** The comment said "front-end capacity + ~15%"; the code did `totalFrontEndTB × 0.9` (a reduction, not an increase). Now sizes off the deduplicated usable footprint × 1.15, matching the stated intent.
- **Proposal dates were hardcoded** to `2026-05-31` / `2026-05-30` regardless of when the proposal is actually generated. Now computed from the system clock.
- **Clipboard-copy buttons showed "Copied!" even when the copy silently failed.** `navigator.clipboard.writeText()` promise rejections were unhandled. Both copy buttons (integration code panel, proposal text) now show an explicit failure state instead of a false positive.

### Changed
- **Node hardware catalog corrected to real, current-generation Cohesity SKUs**, each with a documented representative model and SKU range:
  - **CX8000 Series** (CX8305 representative) — genuinely all-flash NVMe, replaces the mislabeled C6200 entry
  - **C6200 Series** (C6216S representative) — corrected to its real role: hybrid HDD + PCIe flash cache, not all-flash
  - **C5200 Series** (C5224 representative) — new entry-level/ROBO tier, exposed as a third radio option on the Deploy step
- **FIPS 140-2 references updated to FIPS 140-3** across the FedRAMP compliance mapping — NIST moved 140-2 module validations to its Historical list on September 21, 2026.
- **FedRAMP compliance section now states Cohesity's actual authorization level** (Moderate, via Cohesity Cloud Services for Government, since May 2024) instead of leaving the level ambiguous — avoids a rep overpromising "High" to a federal prospect.
- **Pricing panel relabeled** from "(Live List)" to "(Editable Estimates)" with an explicit disclaimer that the numbers are illustrative planning defaults from `pricing.json`, not a published Cohesity price list. The misleading `console.log("Downloaded live list prices...")` was also corrected.
- Added **Cohesity Alta** to the product catalog and an explicit company-context note (surfaced in the proposal's executive summary, in-app and in the print/PDF and copy-to-clipboard outputs) acknowledging the December 2024 Cohesity–Veritas combination and NetBackup, and stating plainly that this tool scopes to native Cohesity Data Cloud — not NetBackup sizing.
- Enhanced the Gaia product entry with the 2026 Gaia Catalog / NVIDIA AI Enterprise integration.

### Added
- Full documentation set: this `CHANGELOG.md`, an extensive `README.md`, `LICENSE`, and `LEGAL.md`.
- `docs/images/` — real screenshots of every wizard step, the BOM, the compliance mapping, and the interactive topology diagram.

---

## [1.11.0] - 2026-06-03
### Added
- GRC appendices with official reference links to regulatory bodies (EUR-Lex, HHS, PCI SSC, FedRAMP.gov, AICPA, CPPA) and Cohesity compliance solution briefs, printed as a dedicated appendix page in the exported proposal.

## [1.10.0] - 2026-06-03
### Added
- Interactive pricing adjuster in the Proposal step, loading baseline rates from `pricing.json` with live-editable per-line overrides that recompute the BOM instantly.

## [1.9.0] - 2026-06-03
### Added
- Firewall/TCP port requirements table (dynamically filtered to only the ports relevant to the current configuration) and topology-diagram workload annotations.

## [1.8.0] - 2026-05-31
### Added
- Multi-site sizing: add/rename/remove sites, per-site workload configuration, interactive site tabs, and aggregate front-end/usable metrics rolled up across all sites.

## [1.7.0] - 2026-05-31
### Changed
- Bandwidth figures now shown in MB/s alongside Mbps throughout the tool (sidebar, Resilience step, proposal, print output).

## [1.6.0] - 2026-05-31
### Added
- Per-workload custom backup windows, feeding a dynamic ingest-bandwidth calculation instead of a fixed assumption.

## [1.5.0] - 2026-05-31
### Added
- Detailed regulatory compliance mappings (GDPR, HIPAA, PCI-DSS, NIS2, DORA, FedRAMP, SOC 2, CCPA) with clause-level "how it's satisfied" text, rendered inside the executive proposal.

## [1.4.0] - 2026-05-31
### Added
- Estimated network bandwidth consumption model (ingest, replication, vault sync) with sidebar and Resilience-step dashboard widgets.

## [1.3.0] - 2026-05-31
### Added
- Sample integration snippets and playbooks: Splunk SIEM webhook, ServiceNow REST script, SiteContinuity DR runbook YAML, and an Ansible bootstrap playbook — each with dynamic placeholder substitution based on the current project.

## [1.2.0] - 2026-05-31
### Added
- Interactive Step 6 (Proposal) with dynamically generated Bill of Materials and estimated annual pricing.

## [1.1.0] - 2026-05-30
### Added
- Additional industry verticals, compliance directive options, contextual tooltips, and auto-recommended configuration defaults based on selected compliance frameworks.

## [1.0.0] - 2026-05-30
### Added
- Initial release of the Cohesity Architect Wizard: six-step sizing flow (Project → Workloads → Resilience → Security → Deploy → Proposal), core sizing engine, and interactive topology diagram.
