# Changelog

All notable changes to the Cohesity Architect Toolkit are documented here.

---

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
