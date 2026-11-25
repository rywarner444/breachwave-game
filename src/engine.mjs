import { MISSIONS, DIFFICULTIES, ABILITIES, INCIDENT_CATALOG, createRandom, routeToTarget, gradeForReport } from './content.mjs';

export const MAX_WAVES = 4;
export const THREATS_PER_WAVE = 3;
export const NODES = [
  { id: 'gateway', label: 'EDGE FIREWALL', type: 'firewall', x: .24, y: .48 },
  { id: 'identity', label: 'IDENTITY', type: 'identity', x: .49, y: .21 },
  { id: 'app', label: 'APPLICATION', type: 'app', x: .49, y: .70 },
  { id: 'cloud', label: 'CLOUD IAM', type: 'cloud', x: .79, y: .25 },
  { id: 'database', label: 'DATA VAULT', type: 'database', x: .79, y: .74 }
];
export const LINKS = [['gateway', 'identity'], ['gateway', 'app'], ['identity', 'cloud'], ['app', 'database'], ['identity', 'app'], ['cloud', 'database']];

const ACTION_COST = { block: 20, allow: 0, isolate: 45 };
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = number => Math.round(number);

/** Deterministic, browser-independent simulation of fictional security incidents. */
export class GameEngine {
  constructor() { this.reset(); }

  reset() {
    this.status = 'menu'; this.tutorial = false; this.mission = MISSIONS[0]; this.difficulty = DIFFICULTIES.operator;
    this.difficultyId = 'operator'; this.seed = 2026; this.random = createRandom(this.seed); this.unlockedLevel = 0;
    this.integrity = 100; this.credits = 160; this.score = 0; this.wave = 1; this.elapsed = 0;
    this.incidents = []; this.selectedId = null; this.nextId = 1; this.spawnedThisWave = 0;
    this.nextSpawnAt = 0; this.intermissionUntil = null; this.blocked = 0; this.falsePositives = 0;
    this.missed = 0; this.investigations = 0; this.handled = 0; this.correctAllows = 0;
    this.defenseUse = { identity: 0, cloud: 0, waf: 0 }; this.adversaryFocus = null;
    this.activeSlowUntil = 0; this.honeypotCharges = 0; this.abilityUses = {};
    this.timeline = []; this.agentTraces = []; this.fxQueue = [];
    this.agentResponse = 'Select an alert to request a rules-based recommendation. Every response needs your approval.';
    this.lastEvent = 'Network defense systems standing by.';
  }

  start({ tutorial = false, mission = 'quick', difficulty = 'operator', seed = 2026, unlockedLevel = 0 } = {}) {
    this.reset();
    this.tutorial = Boolean(tutorial);
    this.mission = MISSIONS.find(item => item.id === mission) ?? MISSIONS[0];
    this.difficultyId = DIFFICULTIES[difficulty] ? difficulty : 'operator';
    this.difficulty = DIFFICULTIES[this.difficultyId];
    this.seed = Number(seed) >>> 0; this.random = createRandom(this.seed);
    this.unlockedLevel = Math.max(0, round(Number(unlockedLevel) || 0));
    this.credits = this.difficulty.startingCredits;
    this.status = 'playing';
    this._log('mission', `${this.mission.name} launched on ${this.difficulty.label} difficulty.`);
    this._log('wave', 'Wave 1 incoming. Monitor the live network telemetry.');
    // The opening incident teaches each sector's core threat; later arrivals are seeded/adaptive.
    const opening = { quick: 0, identity: 0, cloud: 2, edge: 1, convergence: 0 };
    this.spawn(opening[this.mission.id]);
    this.nextSpawnAt = this.tutorial ? Infinity : 3.4;
    return this;
  }

  get threatCount() { return this.incidents.length; }
  get selected() { return this.incidents.find(item => item.id === this.selectedId) ?? null; }
  get totalWaves() { return this.mission.waves; }

  _log(type, message, incident = null) {
    this.lastEvent = message;
    this.timeline.push({ t: Number(this.elapsed.toFixed(1)), type, message, incidentId: incident?.id ?? null,
      technique: incident?.mitre ?? null });
  }

  _chooseTemplate() {
    const indexes = INCIDENT_CATALOG.map((_, index) => index);
    const focus = this.mission.focus;
    const blockedKinds = Object.entries(this.defenseUse).sort((a, b) => b[1] - a[1]);
    this.adversaryFocus = blockedKinds[0][1] >= 2 ? blockedKinds[0][0] : null;
    // A simulated opponent shifts toward a less-defended surface after repeated blocks.
    const weight = index => {
      const item = INCIDENT_CATALOG[index];
      let result = item.malicious ? 1.7 : 1.15;
      if (item.kind === focus) result *= 3.5;
      if (focus === 'mixed') result *= 1.2;
      if (this.adversaryFocus && item.kind === this.adversaryFocus && item.malicious && focus === 'mixed') result *= .24;
      if (this.wave >= 3 && item.malicious) result *= 1.2;
      return result;
    };
    const total = indexes.reduce((sum, index) => sum + weight(index), 0);
    let roll = this.random() * total;
    for (const index of indexes) { roll -= weight(index); if (roll <= 0) return index; }
    return indexes.at(-1);
  }

  spawn(catalogIndex) {
    if (this.status !== 'playing') return null;
    const index = Number.isInteger(catalogIndex) && INCIDENT_CATALOG[catalogIndex] ? catalogIndex : this._chooseTemplate();
    const definition = INCIDENT_CATALOG[index];
    const incident = { ...definition, id: this.nextId++, wave: this.wave, progress: 0,
      route: routeToTarget(definition.target), investigated: false,
      speed: (.031 + this.random() * .009 + (this.wave - 1) * .003) * this.difficulty.speed };
    this.incidents.push(incident);
    this.spawnedThisWave++;
    this._log('alert', `Incoming ${definition.kind.toUpperCase()} signal: ${definition.title}.`, incident);
    this.fxQueue.push({ type: 'spawn', target: incident.target, route: incident.route });
    return incident;
  }

  select(id) {
    if (this.status !== 'playing') return false;
    const incident = this.incidents.find(item => item.id === Number(id));
    if (!incident) return false;
    this.selectedId = incident.id;
    this.agentResponse = 'Incident selected. Ask for a recommendation or investigate its evidence.';
    return true;
  }

  investigate() {
    if (!this.selected || this.status !== 'playing') return false;
    if (!this.selected.investigated) {
      this.selected.investigated = true;
      this.investigations++;
      this.score += 12;
      this._log('investigation', `Evidence collected for ${this.selected.title}.`, this.selected);
      this.fxQueue.push({ type: 'scan', target: this.selected.target });
    }
    return true;
  }

  askAgent() {
    const incident = this.selected;
    if (this.status !== 'playing' || !incident) return null;
    const readLog = { tool: 'read_synthetic_telemetry', incidentId: incident.id, status: 'complete',
      result: incident.investigated ? `${incident.evidence.length} evidence entries reviewed` : 'Evidence not yet collected' };
    const correlate = { tool: 'correlate_signals', incidentId: incident.id, status: 'complete',
      result: incident.investigated ? `${incident.severity} severity · ${incident.kind} telemetry` : 'Insufficient context' };
    const decision = !incident.investigated ? 'investigate' : incident.malicious ? 'block' : 'allow';
    this.agentTraces.push({ t: Number(this.elapsed.toFixed(1)), incidentId: incident.id, steps: [readLog, correlate,
      { tool: 'recommend_response', incidentId: incident.id, status: 'complete', result: decision }],
      recommendation: decision, mode: 'deterministic_rules' });
    const rationale = decision === 'investigate' ? 'Evidence is not yet verified.' :
      decision === 'block' ? `Synthetic ${incident.kind} evidence indicates malicious behavior.` :
      'The collected telemetry is consistent with legitimate activity.';
    this.agentResponse = `AEGIS / ${decision.toUpperCase()}: ${rationale} Human approval required; no action was taken.`;
    this._log('agent', `AEGIS recommended ${decision.toUpperCase()} for ${incident.title}.`, incident);
    return decision;
  }

  _damage(amount) {
    const actual = Math.round(amount * this.difficulty.penalty);
    this.integrity = clamp(this.integrity - actual, 0, 100);
    if (this.integrity <= 0) this._finish('lost');
    return actual;
  }

  _remove(incident) {
    this.incidents = this.incidents.filter(item => item.id !== incident.id);
    if (this.selectedId === incident.id) this.selectedId = null;
    this.handled++;
  }

  resolve(action) {
    const incident = this.selected;
    if (this.status !== 'playing' || !incident) return { ok: false, reason: 'Select an active alert first.' };
    if (!(action in ACTION_COST)) return { ok: false, reason: 'Unknown response action.' };
    const cost = ACTION_COST[action];
    if (this.credits < cost) return { ok: false, reason: `Insufficient credits: need ${cost}.` };
    this.credits -= cost;
    const contained = action === 'block' || action === 'isolate';
    if (incident.malicious && contained) {
      this.blocked++;
      this.defenseUse[incident.kind]++;
      this.score += round((action === 'isolate' ? 80 : 110) * this.difficulty.multiplier);
      this.credits += 23;
      this._log('block', `${incident.title} contained at ${incident.target.toUpperCase()}.`, incident);
      this.fxQueue.push({ type: 'block', target: incident.target, route: incident.route });
    } else if (!incident.malicious && !contained) {
      this.correctAllows++;
      this.score += round(65 * this.difficulty.multiplier);
      this.credits += 18;
      this._log('allow', `Verified legitimate activity allowed: ${incident.title}.`, incident);
      this.fxQueue.push({ type: 'allow', target: incident.target });
    } else if (!incident.malicious && contained) {
      this.falsePositives++;
      const damage = this._damage(action === 'isolate' ? 18 : 12);
      this.score = Math.max(0, this.score - 35);
      this._log('false_positive', `False positive disrupted services (-${damage}% integrity).`, incident);
      this.fxQueue.push({ type: 'damage', target: incident.target });
    } else {
      this.missed++;
      const damage = this._damage(22);
      this.score = Math.max(0, this.score - 40);
      this._log('breach', `Attack allowed through: ${incident.title} (-${damage}% integrity).`, incident);
      this.fxQueue.push({ type: 'damage', target: incident.target });
    }
    this._remove(incident);
    this.finishIfReady();
    return { ok: true, cost };
  }

  useAbility(id) {
    const ability = ABILITIES.find(item => item.id === id);
    if (!ability || this.status !== 'playing' || this.tutorial) return { ok: false, reason: 'Ability unavailable.' };
    if (ability.unlock > this.unlockedLevel) return { ok: false, reason: 'Complete campaign missions to unlock this ability.' };
    if (this.credits < ability.cost) return { ok: false, reason: `Need ${ability.cost} credits.` };
    if (id === 'shield' && this.integrity >= 100) return { ok: false, reason: 'Network integrity is already full.' };
    this.credits -= ability.cost;
    if (id === 'scan') { for (const incident of [...this.incidents]) { if (!incident.investigated) { incident.investigated = true; this.investigations++; } } }
    if (id === 'shield') this.integrity = clamp(this.integrity + 16, 0, 100);
    if (id === 'pulse') this.activeSlowUntil = Math.max(this.elapsed, this.activeSlowUntil) + 12;
    if (id === 'honeypot') this.honeypotCharges++;
    this.abilityUses[id] = (this.abilityUses[id] || 0) + 1;
    this._log('ability', `${ability.label} deployed for ${ability.cost} credits.`);
    this.fxQueue.push({ type: id, target: id === 'shield' ? 'gateway' : 'cloud' });
    return { ok: true, cost: ability.cost };
  }

  tick(dt) {
    if (this.status !== 'playing' || this.tutorial) return;
    const delta = clamp(Number(dt) || 0, 0, .25);
    this.elapsed += delta;
    for (const incident of [...this.incidents]) {
      incident.progress = Math.min(1, incident.progress + delta * incident.speed * (this.elapsed < this.activeSlowUntil ? .35 : 1));
      if (incident.progress < 1) continue;
      if (incident.malicious && this.honeypotCharges) {
        this.honeypotCharges--;
        this.blocked++; this.defenseUse[incident.kind]++;
        this.score += round(90 * this.difficulty.multiplier);
        this._log('block', `Decoy Beacon intercepted ${incident.title}.`, incident);
        this.fxQueue.push({ type: 'block', target: incident.target });
      } else if (incident.malicious) {
        this.missed++;
        const damage = this._damage(24);
        this._log('breach', `${incident.title} reached ${incident.target.toUpperCase()} (-${damage}% integrity).`, incident);
        this.fxQueue.push({ type: 'damage', target: incident.target });
      } else {
        this.correctAllows++;
        this._log('allow', `Legitimate ${incident.title} completed without disruption.`, incident);
      }
      this._remove(incident);
      if (this.status !== 'playing') return;
    }
    if (this.spawnedThisWave < this.mission.perWave && this.elapsed >= this.nextSpawnAt) {
      this.spawn(); this.nextSpawnAt = this.elapsed + Math.max(1.55, 3.25 - this.wave * .21);
    }
    this.finishIfReady();
  }

  finishIfReady() {
    if (this.status !== 'playing' || this.tutorial) return;
    if (this.spawnedThisWave < this.mission.perWave || this.incidents.length) { this.intermissionUntil = null; return; }
    if (this.wave === this.mission.waves) { this._finish('won'); return; }
    if (this.intermissionUntil === null) {
      this.intermissionUntil = this.elapsed + 2.25;
      this._log('wave', `Wave ${this.wave} secured. Next wave incoming...`);
    } else if (this.elapsed >= this.intermissionUntil) {
      this.wave++;
      this.spawnedThisWave = 0;
      this.intermissionUntil = null;
      this.credits += 22;
      this._log('wave', `Wave ${this.wave} / ${this.totalWaves} underway. +22 defense credits.`);
      this.spawn();
      this.nextSpawnAt = this.elapsed + 3.25;
    }
  }

  _finish(status) {
    if (this.status !== 'playing') return;
    this.status = status;
    this._log('outcome', status === 'won' ? `${this.mission.name} complete. Network remains operational.` : 'Network integrity lost. Mission failed.');
  }

  togglePause() {
    if (this.tutorial) return;
    if (this.status === 'playing') this.status = 'paused';
    else if (this.status === 'paused') this.status = 'playing';
  }

  getAchievements() {
    const awards = [];
    if (this.blocked) awards.push('first_block');
    if (this.status === 'won' && this.falsePositives === 0) awards.push('clean_run');
    if (this.status === 'won' && this.integrity === 100) awards.push('perfect_integrity');
    if (this.investigations >= 8) awards.push('investigator');
    if (this.status === 'won' && this.mission.id === 'convergence') awards.push('campaign');
    return awards;
  }

  getReport() {
    const won = this.status === 'won';
    const report = { mission: this.mission.name, missionId: this.mission.id, difficulty: this.difficulty.label,
      objective: this.mission.objective, sector: this.mission.sector, won, seed: this.seed,
      elapsedSeconds: round(this.elapsed), integrity: round(this.integrity), score: this.score,
      blocked: this.blocked, falsePositives: this.falsePositives, missed: this.missed,
      investigations: this.investigations, correctAllows: this.correctAllows, handled: this.handled,
      wavesCompleted: this.wave, totalWaves: this.totalWaves,
      abilities: { ...this.abilityUses }, achievements: this.getAchievements(),
      timeline: this.timeline.map(event => ({ ...event })),
      agentTraces: this.agentTraces.map(trace => ({ ...trace, steps: trace.steps.map(step => ({ ...step })) })) };
    report.grade = gradeForReport(report);
    return report;
  }
}
