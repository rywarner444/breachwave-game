# BREACHWAVE coding agent guidance

BREACHWAVE is a browser-first, cyber-defense strategy game for a public engineering portfolio.

## Product goals

- Recruiters should understand how to play within 60 seconds.
- The core loop is: select an alert → investigate → choose a response → see consequences.
- Game mechanics should be fun and clearly grounded in synthetic security scenarios.
- Keep the UI readable and keyboard-friendly; never rely on color alone for threat severity.

## Engineering constraints

- Use fictional/synthetic security events exclusively. Never add employer logs, secrets, accounts, or proprietary infrastructure details.
- Never put model API keys, tokens, or secrets in browser-delivered files.
- Distinguish rules-based recommendations from actual model-backed AI. Do not claim functionality that is not implemented.
- Response actions must be scoped to the simulation and approved by the player.
- Keep the simulation logic separate from DOM and rendering code.
- Add automated tests when modifying scoring, threats, progression, or response behavior.
- Keep campaign unlocks achievable without external services; preserve the instant Quick Play option.
- Maintain a seeded and deterministic adversary for reproducible incident analysis.
- Respect reduced-motion and sound-off preferences. Browser audio must be opt-in.
- Render incident reports from local synthetic event data only; print-to-PDF must not transmit user data.
- Run `npm test` and syntax checks of all application modules before claiming completion.
- Prefer small, verifiable milestones over broad rewrites.

## Current structure

- `index.html`, `styles.css` — accessible application interface.
- `src/engine.mjs` — independent simulation.
- `src/content.mjs` — mission definitions, abilities, and fictional attack scenarios.
- `src/main.mjs` — Canvas renderer and interaction controller.
- `tests/*.test.mjs` — deterministic simulation and UI contract tests using Node's built-in runner.
- `scripts/serve.mjs` — dependency-free local static server.

## Hosting

The first build is static and suitable for GitHub Pages. Publishing requires making the repository public on a plan that supports GitHub Pages for public repositories. Do not change repository visibility without explicit user approval.
