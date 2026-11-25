# BREACHWAVE

**Defend the network. Investigate the evidence. Command the response.**

BREACHWAVE is an original, zero-dependency tactical cybersecurity game that runs entirely in a web browser. Play the role of a security operations defender: triage fictional alerts, inspect evidence, use explainable AEGIS recommendations, and stop coordinated attacks without disrupting legitimate services.

> **Status:** Playable milestone **v0.2** — expanded campaign, animated network telemetry, engineering observability, and printable incident reports. **The GitHub repository remains private during development.** A public GitHub Pages link will follow only when the owner approves publishing.

## Try it locally (or in GitHub Codespaces)

Requirements: Node.js 20.11+ (Node 22 recommended), a modern browser. **No API keys, accounts, databases, paid AI credits, or dependencies to install.**

```bash
npm run dev
```

Visit **http://localhost:4173**. In Codespaces, open the forwarded port **4173** in a browser.

```bash
npm test
npm run check
```

## How to play — 30-second field guide

1. **Select** an approaching alert by clicking its map marker or its entry in **Active alerts**.
2. **Investigate** to see the synthetic log evidence. Optionally ask AEGIS for a transparent recommendation.
3. **Respond:** **Block** malicious activity, **Allow** legitimate activity, or **Isolate** for more costly containment.
4. Keep **Network Integrity above zero** until the final wave. Use tactical countermeasures below the map when needed.

New players can choose **Guided Tutorial** from the mission screen or **How to Play** at any time. Opening the field manual pauses live gameplay; tutorial time stays frozen until you complete each guided step.

**The tradeoff is real within the simulation:** allowing an attack damages the network, while blocking an innocent event creates a false positive and disrupts availability. Investigations, credits, and response choices matter.

## Campaign and progression

| Mode | Mission | Security theme | Waves | Unlock |
|---|---|---|---:|---|
| Quick Play | Quick Defense | Mixed incidents for a short recruiter demo | 4 | Available immediately |
| 01 | Identity Under Siege | MFA fatigue, authentication anomalies, credential spraying | 3 | Available immediately |
| 02 | Ghost in the Cloud | IAM manipulation, privilege escalation, approved changes | 4 | Complete mission 01 |
| 03 | Firewall Frontline | Application protection, WAF traffic, legitimate surges | 4 | Complete mission 02 |
| 04 | Convergence Protocol | Adaptive multi-vector defense across all layers | 5 | Complete mission 03 |

Choose **Cadet**, **Operator**, or **Expert** difficulty. Difficulty changes incoming attack speed, consequences, starting resources, and scoring. Campaign progress, achievements, and personal records persist using browser local storage. There is no account or public leaderboard.

Countermeasures become available as you progress:

- **Signal Sweep** — unlock immediately: investigate all active alerts using credits.
- **Recovery Patch** — after sector 01: recover damaged network integrity.
- **Time Dilation** — after sector 02: slow incoming threats temporarily.
- **Decoy Beacon** — after sector 03: automatically contain the next arriving malicious threat.

## What makes the simulation alive

- **Canvas 2D battlefield** with multi-layer radar, telemetry packets moving over graph links, glowing node shields, attacking signals traveling through specific network routes, threat progress rings, and containment/shockwave effects.
- **Responsive SOC-style interface** with color **and** text severity cues, keyboard-accessible list controls, and reduced-motion support.
- **Optional original synthesized sound effects**, muted by default, using browser Web Audio. No audio files or music licenses.
- **Seeded adaptive adversary** that changes attack-selection weights in response to heavily defended surfaces. Behavior is intentionally visible and reproducible for testing; this is game AI, not a trained model.
- **Synthetic security scenarios** with illustrative [MITRE ATT&CK](https://attack.mitre.org/) technique references.

## AEGIS: explainable automation without paid LLM calls

AEGIS is a **deterministic rules-based copilot**, not a generative AI service. It uses a scoped, inspectable three-step process for the selected alert:

1. `read_synthetic_telemetry` — inspect available fictional evidence.
2. `correlate_signals` — apply severity and source context.
3. `recommend_response` — recommend **Investigate**, **Block**, or **Allow**.

It **never executes a defender response**. The player must explicitly approve every action. Select **Engineering View** during gameplay to inspect the synthetic event stream and AEGIS tool traces. No network calls are made by the agent, and no credentials are stored or transmitted.

## Incident reports that demonstrate engineering thinking

After each win or loss, choose **View Incident Report / Save PDF** to review:

- Grade, score, remaining integrity, false positives, detected and missed threats.
- Investigation statistics, countermeasure usage, and achievements.
- A **chronological audit trail** of alerts, evidence collection, recommendations, choices, and consequences.
- A clear statement of simulation limits and the local deterministic automation model.

The **Print / Save PDF** button opens the browser print dialog. Choose *Save as PDF* to export a recruiter-friendly report. No data is uploaded to a server.

## Technical architecture

| Component | Role |
|---|---|
| `src/content.mjs` | Declarative missions, difficulties, defensive abilities, synthetic incident catalog, ATT&CK mappings, seeded random generator |
| `src/engine.mjs` | Pure JavaScript simulation: state, risk, score, waves, adaptation, achievements, traces, reports |
| `src/main.mjs` | Browser-only controller, Canvas 2D visualization, audio, dialogs, local storage |
| `index.html`, `styles.css` | Responsive UI, controls, field manual, printable report layout |
| `scripts/serve.mjs` | Minimal local HTTP development server using Node built-ins |
| `tests/*.test.mjs` | Deterministic simulation and interface-contract tests, using Node's built-in runner |
| `.github/workflows/ci.yml` | Continuous test and syntax checks on pull requests and main branch |

**Design decisions:** Rendering is separated from the pure simulation engine so scenarios can be tested independently of any browser. Attack selection is seeded, so bugs are reproducible. The source and tests have **no third-party runtime dependencies**, and the static application is compatible with GitHub Pages when publishing is authorized.

## Cybersecurity relevance and boundaries

The game explores principles familiar to SOC, detection, identity security, cloud IAM, and WAF operations: alert triage, false positives, least disruption, detection-to-response decisions, observability, and human oversight of automation.

The examples are **fictional simplified scenarios**; ATT&CK references are illustrative. BREACHWAVE is not a real SIEM, intrusion-detection system, incident-response product, or offensive security tool. It reads no real traffic, accounts, personal data, or employer systems.

## Responsible AI-assisted development

BREACHWAVE was built using AI-assisted code generation and iterative human-directed product decisions. The product owner chose the security focus, evaluated gameplay and the tutorial, prioritized improvements, and requested this major iteration. The design documents what is truly built versus proposed. AI assistance is not represented as production-grade autonomous defense.

Potential future enhancements include accessibility playtesting, more balanced scenario packs, analytics limited to the local device, and a recorded demo. A live LLM integration is **not planned for this milestone**; it would require explicit security, budget, and backend decisions.

## Publishing

The repository is kept **private** while testing and iterating. When ready, the owner can explicitly approve making it public and enabling GitHub Pages so employers can play directly in their browsers with a single link.
