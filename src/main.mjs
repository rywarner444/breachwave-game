import { GameEngine, NODES, LINKS } from './engine.mjs';
import { MISSIONS, DIFFICULTIES, ABILITIES, ACHIEVEMENTS } from './content.mjs';

const game = new GameEngine();
const $ = id => document.getElementById(id);
const canvas = $('battlefield');
const context = canvas.getContext('2d');
const byId = new Map(NODES.map(node => [node.id, node]));
const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const tutorialText = [
  ['Welcome, Commander', 'You are defending a fictional network. Your mission is to stop attacks while keeping services online. Press Continue to begin.'],
  ['Select the incoming alert', 'Find the pulsing red alert on the network map and click it. You can also select the alert in the Active Alerts list.'],
  ['Ask AEGIS for guidance', 'Your automated copilot can recommend an investigation. Click the Ask AEGIS button in the right-hand panel.'],
  ['Investigate the evidence', 'Review what happened before you act. Click Investigate to reveal the supporting synthetic security events.'],
  ['Contain the attack', 'The evidence indicates a malicious sign-in. Click Block to protect the network.'],
  ['Training complete', 'Excellent work! You stopped your first simulated breach. You are ready for the full four-wave mission.']
];

let tutorialStep = -1;
let previousTime = 0;
let lastUIRender = 0;
let previousStatus = 'menu';
let helpPaused = false;
let flash = '';
let lastAlertSignature = '';
let lastAbilitySignature = '';
let lastEngineeringSignature = '';
let selectedMissionId = 'quick';
let selectedDifficultyId = 'operator';
let audioEnabled = false;
let audioContext = null;
let engineeringVisible = false;
const effects = [];
let unlockedLevel = readStorage('breachwave-level', 0);
let unlockedAchievements = readStorage('breachwave-achievements', []);
let highScores = readStorage('breachwave-records', {});

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch { return fallback; }
}
function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Optional browser storage. */ }
}
unlockedLevel = Math.min(3, Math.max(0, Number(unlockedLevel) || 0));
if (!Array.isArray(unlockedAchievements)) unlockedAchievements = [];
if (!highScores || typeof highScores !== 'object') highScores = {};
const html = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function playSound(type) {
  if (!audioEnabled || reducedMotion && type === 'spawn') return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  try {
    audioContext ||= new Audio();
    if (audioContext.state === 'suspended') audioContext.resume();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = type === 'damage' ? 'sawtooth' : 'sine';
    const pitches = { block: [330, 670], allow: [350, 490], damage: [225, 80], spawn: [480, 300], scan: [580, 820], shield: [390, 670], pulse: [290, 210], honeypot: [450, 730] };
    const [from, to] = pitches[type] || [450, 600];
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + .18);
    gain.gain.setValueAtTime(.001, now);
    gain.gain.exponentialRampToValueAtTime(.045, now + .018);
    gain.gain.exponentialRampToValueAtTime(.001, now + .24);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + .26);
  } catch { /* Sound is an optional progressive enhancement. */ }
}

function paintText(text, x, y, color, size = 11, align = 'center', weight = 700) {
  context.font = `${weight} ${size}px ui-sans-serif, system-ui, sans-serif`;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillText(text, x, y);
}

function routePoints(threat, width, height) {
  return [{ x: width * .025, y: height * .48 }, ...threat.route.map(id => {
    const node = byId.get(id);
    return { x: node.x * width, y: node.y * height };
  })];
}
function pointOnPath(points, progress) {
  const lengths = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const length = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(length); total += length;
  }
  let remaining = Math.max(0, Math.min(1, progress)) * total;
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const ratio = lengths[i] ? remaining / lengths[i] : 0;
      return { x: points[i].x + (points[i + 1].x - points[i].x) * ratio, y: points[i].y + (points[i + 1].y - points[i].y) * ratio };
    }
    remaining -= lengths[i];
  }
  return points[0];
}
function threatPosition(threat, width, height) {
  return pointOnPath(routePoints(threat, width, height), threat.progress);
}

function prepareCanvas() {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const displayWidth = Math.max(1, Math.round(bounds.width * dpr));
  const displayHeight = Math.max(1, Math.round(bounds.height * dpr));
  if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width: bounds.width, height: bounds.height };
}

function draw(timestamp) {
  const { width, height } = prepareCanvas();
  context.clearRect(0, 0, width, height);
  const phase = reducedMotion ? 0 : timestamp / 1000;
  const rad = Math.PI * 2;
  context.lineCap = 'round';

  // Layer 1: depth grid, perimeter stars, and a slow radar fan.
  context.strokeStyle = '#17485a';
  context.lineWidth = .7;
  context.globalAlpha = .35;
  for (let x = 0; x < width; x += 33) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
  for (let y = 0; y < height; y += 33) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
  context.globalAlpha = 1;
  const cx = width * .51, cy = height * .51;
  for (const radius of [.21, .38, .55]) {
    context.strokeStyle = '#256e8242'; context.lineWidth = 1;
    context.beginPath(); context.arc(cx, cy, height * radius, 0, rad); context.stroke();
  }
  if (!reducedMotion) {
    const angle = phase * .21;
    context.fillStyle = '#29f3d508';
    context.beginPath(); context.moveTo(cx, cy); context.arc(cx, cy, Math.max(width, height), angle, angle + .3); context.closePath(); context.fill();
  }
  for (let i = 0; i < 37; i++) {
    const x = ((i * 89 + 31) % 997) / 997 * width, y = ((i * 137 + 17) % 991) / 991 * height;
    const alpha = reducedMotion ? .2 : .12 + .12 * (1 + Math.sin(phase * .8 + i));
    context.fillStyle = `rgba(99,205,222,${alpha})`;
    context.fillRect(x, y, 1.5, 1.5);
  }

  // Layer 2: live links with independently moving data packets.
  for (const [source, target] of LINKS) {
    const a = byId.get(source), b = byId.get(target);
    const ax = a.x * width, ay = a.y * height, bx = b.x * width, by = b.y * height;
    const gradient = context.createLinearGradient(ax, ay, bx, by);
    gradient.addColorStop(0, '#277287'); gradient.addColorStop(.5, '#3bd5ca'); gradient.addColorStop(1, '#277287');
    context.strokeStyle = '#124157'; context.lineWidth = 7; context.globalAlpha = .35;
    context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.stroke();
    context.globalAlpha = .9; context.strokeStyle = gradient; context.lineWidth = 1.6;
    context.beginPath(); context.moveTo(ax, ay); context.lineTo(bx, by); context.stroke();
    for (let i = 0; i < 4; i++) {
      const t = reducedMotion ? (i + 1) / 5 : ((phase * .18 + i / 4 + ax / 1700) % 1);
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      context.shadowColor = '#3affdf'; context.shadowBlur = 10; context.fillStyle = i % 2 ? '#b5fff2' : '#37efce';
      context.beginPath(); context.arc(x, y, i % 2 ? 2.4 : 3.2, 0, rad); context.fill();
      context.shadowBlur = 0;
    }
  }

  // Layer 3: incoming trajectories and moving alert packets.
  for (const incident of game.incidents) {
    const points = routePoints(incident, width, height);
    const tint = incident.severity === 'LOW' ? '#ffc978' : '#ff677d';
    context.strokeStyle = incident.severity === 'LOW' ? '#c9944859' : '#ff526362';
    context.lineWidth = 4; context.setLineDash([5, 9]); context.lineDashOffset = reducedMotion ? 0 : -phase * 22;
    context.beginPath(); context.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) context.lineTo(point.x, point.y);
    context.stroke(); context.setLineDash([]);
    const { x, y } = threatPosition(incident, width, height);
    for (let i = 1; i <= 5; i++) {
      const t = Math.max(0, incident.progress - i * .025);
      const trail = pointOnPath(points, t);
      context.globalAlpha = (6 - i) / 11;
      context.fillStyle = tint;
      context.beginPath(); context.arc(trail.x, trail.y, Math.max(1.2, 4 - i * .5), 0, rad); context.fill();
    }
    context.globalAlpha = 1;
    const selected = incident.id === game.selectedId;
    const pulse = selected ? 29 : 21 + Math.sin(phase * 5 + incident.id) * (reducedMotion ? 0 : 4);
    context.fillStyle = incident.severity === 'LOW' ? '#c9944824' : '#ff657a24';
    context.beginPath(); context.arc(x, y, pulse, 0, rad); context.fill();
    context.strokeStyle = tint; context.lineWidth = selected ? 2.7 : 1.3;
    context.beginPath(); context.arc(x, y, pulse, 0, rad); context.stroke();
    // Clockwise danger arc fills as the signal closes on a resource.
    context.lineWidth = 3.2;
    context.beginPath(); context.arc(x, y, 18, -.5 * Math.PI, (-.5 + incident.progress * 2) * Math.PI); context.stroke();
    context.fillStyle = '#4c2433'; context.strokeStyle = tint; context.lineWidth = 2;
    context.shadowColor = tint; context.shadowBlur = reducedMotion ? 0 : 14;
    context.beginPath(); context.arc(x, y, 12, 0, rad); context.fill(); context.stroke(); context.shadowBlur = 0;
    paintText('!', x, y - 1, '#fff', 14, 'center', 900);
    if (selected) paintText('TARGET: ' + incident.target.toUpperCase(), x, y - 38, '#ffbdc8', 9);
  }

  // Layer 4: protected node cores, rotating defense rings, activity halos.
  const threatened = new Set(game.incidents.map(item => item.target));
  for (const node of NODES) {
    const x = node.x * width, y = node.y * height, targeted = threatened.has(node.id);
    const pulse = 41 + (reducedMotion ? 0 : Math.sin(phase * 1.65 + x) * 5);
    const radius = targeted ? pulse + 16 : pulse + 5;
    const radial = context.createRadialGradient(x, y, 4, x, y, radius);
    radial.addColorStop(0, targeted ? '#ff586451' : '#2ce7d654');
    radial.addColorStop(1, '#2ce7d600');
    context.fillStyle = radial; context.beginPath(); context.arc(x, y, radius, 0, rad); context.fill();
    context.strokeStyle = targeted ? '#ff8796aa' : '#4ce9d65e'; context.lineWidth = 1.25;
    context.beginPath(); context.arc(x, y, 31, 0, rad); context.stroke();
    if (!reducedMotion) {
      context.strokeStyle = targeted ? '#ff8e9e' : '#8dfff0'; context.lineWidth = 3;
      context.beginPath(); context.arc(x, y, 31, phase * .48, phase * .48 + 1.35); context.stroke();
    }
    context.fillStyle = '#0b293b'; context.strokeStyle = targeted ? '#ff8296' : '#3ac9c7'; context.lineWidth = 2;
    context.shadowColor = targeted ? '#ff5766' : '#38f1d8'; context.shadowBlur = targeted ? 15 : 10;
    context.beginPath(); context.arc(x, y, 24, 0, rad); context.fill(); context.stroke(); context.shadowBlur = 0;
    context.strokeStyle = '#77fbea'; context.lineWidth = .8;
    context.beginPath(); context.arc(x, y, 17, 0, rad); context.stroke();
    const symbol = { firewall: '⛨', identity: '◎', app: '⬡', cloud: '☁', database: '▤' }[node.type];
    paintText(symbol, x, y - .5, '#b5fff3', 19);
    paintText(node.label, x, y + 45, targeted ? '#ffb0be' : '#addce6', width < 420 ? 9 : 11, 'center', 800);
  }

  // Layer 5: containment bursts, service disruption shockwaves, ability rings.
  for (const item of game.fxQueue.splice(0)) {
    const node = byId.get(item.target);
    if (!node) continue;
    effects.push({ x: node.x, y: node.y, type: item.type, created: timestamp, seed: effects.length + timestamp });
    playSound(item.type);
  }
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index];
    const elapsed = reducedMotion ? .6 : (timestamp - effect.created) / 1000;
    if (elapsed > 1.1) { effects.splice(index, 1); continue; }
    const x = effect.x * width, y = effect.y * height;
    const color = effect.type === 'damage' ? '#ff627a' : effect.type === 'allow' ? '#ffcd7b' : '#49ffdb';
    context.globalAlpha = 1 - elapsed / 1.1; context.strokeStyle = color; context.lineWidth = 3;
    context.beginPath(); context.arc(x, y, 19 + elapsed * 90, 0, rad); context.stroke();
    if (!reducedMotion) {
      for (let j = 0; j < 13; j++) {
        const angle = j * rad / 13 + effect.seed;
        const distance = 13 + elapsed * (65 + (j % 4) * 9);
        context.fillStyle = color;
        context.beginPath(); context.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, 2 + (j % 3), 0, rad); context.fill();
      }
    }
    context.globalAlpha = 1;
  }
  if (game.elapsed < game.activeSlowUntil) {
    paintText('◉ TIME DILATION ACTIVE', width / 2, height * .91, '#a8f4fa', 10);
  } else if (game.status === 'menu') {
    paintText('TACTICAL NETWORK // STANDBY', width / 2, height * .91, '#5a9fb4', 11);
  }
}

function renderAlerts() {
  $('alertCount').textContent = String(game.threatCount);
  const signature = `${game.incidents.map(item => `${item.id}:${Math.floor(item.progress * 20)}:${item.investigated}`).join(',')}|${game.selectedId}`;
  if (signature === lastAlertSignature) return;
  lastAlertSignature = signature;
  if (game.incidents.length === 0) {
    $('alertList').innerHTML = '<div class="empty-state">All clear. Incoming security events will appear here.</div>';
    return;
  }
  $('alertList').innerHTML = game.incidents.map(incident => `
    <button type="button" class="alert-item ${game.selectedId === incident.id ? 'selected' : ''}" data-incident="${incident.id}" aria-pressed="${game.selectedId === incident.id}">
      <span class="alert-icon">!</span>
      <span class="alert-copy"><strong>${html(incident.title)}</strong><small>${html(incident.source)} · ${Math.round((1 - incident.progress) * 100)}% to destination</small></span>
      <span class="severity ${incident.severity.toLowerCase()}">${incident.severity}</span>
    </button>`).join('');
}

function renderDetails() {
  const incident = game.selected;
  if (!incident) {
    $('threatDetail').innerHTML = '<div class="empty-state">Select a pulsing alert on the map or in the Active Alerts list to investigate.</div>';
    return;
  }
  const evidence = incident.investigated
    ? `<div class="evidence-label">Investigation evidence</div><ul class="evidence-list">${incident.evidence.map(item => `<li>${html(item)}</li>`).join('')}</ul>
       <p class="threat-meta">${incident.mitre ? `ATT&CK reference: <a href="https://attack.mitre.org/techniques/${incident.mitre}/" target="_blank" rel="noopener noreferrer">${incident.mitre} · ${html(incident.technique)} ↗</a>` : 'No adversary technique mapped · Benign activity'}</p>`
    : '<p class="evidence-label">Evidence locked · Select Investigate</p>';
  $('threatDetail').innerHTML = `<h3>${html(incident.title)}</h3><p class="threat-meta">${incident.severity} PRIORITY · ${incident.target.toUpperCase()}</p><p>${html(incident.detail)}</p>${evidence}`;
}

function renderAbilities() {
  const signature = `${game.status}:${game.tutorial}:${game.credits}:${unlockedLevel}:${Math.round(game.integrity)}:${game.activeSlowUntil > game.elapsed}`;
  if (signature === lastAbilitySignature) return;
  lastAbilitySignature = signature;
  $('abilityGrid').innerHTML = ABILITIES.map(ability => {
    const locked = ability.unlock > unlockedLevel;
    const unavailable = locked || game.status !== 'playing' || game.tutorial || game.credits < ability.cost || ability.id === 'shield' && game.integrity >= 100;
    return `<button type="button" class="ability-btn ${locked ? 'locked' : ''}" data-ability="${ability.id}" title="${html(ability.hint)}" ${unavailable ? 'disabled' : ''}>
      <span class="ability-top"><span class="ability-icon">${ability.icon}</span><span class="ability-cost">${locked ? '🔒 SECTOR ' + ability.unlock : ability.cost + ' CR'}</span></span>
      <strong>${html(ability.label)}</strong><small>${html(ability.hint)}</small></button>`;
  }).join('');
  const statuses = [];
  if (game.activeSlowUntil > game.elapsed) statuses.push(`SLOW ${Math.ceil(game.activeSlowUntil - game.elapsed)}S`);
  if (game.honeypotCharges) statuses.push(`DECOYS ${game.honeypotCharges}`);
  $('activeEffects').textContent = statuses.join(' · ') || 'SYSTEMS READY';
}

function renderEngineering() {
  if (!engineeringVisible) return;
  const signature = `${game.timeline.length}|${game.agentTraces.length}|${game.status}`;
  if (signature === lastEngineeringSignature) return;
  lastEngineeringSignature = signature;
  $('engineeringEvents').innerHTML = game.timeline.slice(-13).reverse().map(event => `<li><span class="trace-time">[${event.t.toFixed(1)}s]</span> <span class="trace-label">${html(event.type)}</span> ${html(event.message)}</li>`).join('');
  const trace = game.agentTraces.at(-1);
  $('engineeringTrace').innerHTML = trace ? `<strong>INCIDENT #${trace.incidentId} / RULES ENGINE</strong>${trace.steps.map(step => `<li><span class="trace-label">${html(step.tool)}</span><div>${html(step.result)}</div></li>`).join('')}<div class="evidence-label">Recommendation: ${html(trace.recommendation)} · Human approval required</div>` : 'Ask AEGIS about an alert to see its tool trace.';
}

function canUseAction(action) {
  if (!game.selected || game.status !== 'playing') return false;
  if (!game.tutorial) return true;
  return { agent: 2, investigate: 3, block: 4 }[action] === tutorialStep;
}

function renderTutorial() {
  const banner = $('tutorialBanner');
  banner.hidden = !game.tutorial || tutorialStep < 0;
  if (banner.hidden) return;
  $('tutorialTitle').textContent = tutorialText[tutorialStep][0];
  $('tutorialText').textContent = tutorialText[tutorialStep][1];
  $('tutorialCounter').textContent = `${Math.min(tutorialStep + 1, 5)}/5`;
  $('tutorialNext').hidden = ![0, 5].includes(tutorialStep);
  $('tutorialNext').textContent = tutorialStep === 5 ? 'Start Quick Play →' : 'Continue →';
}

function renderUI() {
  $('integrityValue').innerHTML = `${Math.round(game.integrity)}<span>%</span>`;
  $('creditsValue').textContent = game.credits;
  $('scoreValue').textContent = String(game.score).padStart(4, '0');
  $('waveValue').innerHTML = `${String(game.wave).padStart(2, '0')}<span>/${String(game.totalWaves).padStart(2, '0')}</span>`;
  $('integrityBar').style.width = `${Math.max(0, game.integrity)}%`;
  $('integrityBar').style.background = game.integrity < 35 ? '#ff657a' : 'linear-gradient(90deg,#179a9a,#36f1d7)';
  $('eventText').textContent = flash || game.lastEvent;
  $('agentMessage').textContent = game.agentResponse;
  $('missionSector').textContent = game.mission.sector;
  $('missionName').textContent = game.mission.name.toUpperCase();
  $('missionObjective').textContent = game.mission.objective;
  $('difficultyChip').textContent = game.difficulty.label.toUpperCase() + ' MODE';
  $('flowStatus').textContent = game.status === 'playing' ? `${game.threatCount} INBOUND · ${game.mission.focus.toUpperCase()} SECTOR` : 'FLOW NOMINAL · STANDBY';
  const statusLabel = game.status === 'playing' ? 'LIVE DEFENSE' : game.status === 'paused' ? 'PAUSED' : game.status === 'menu' ? 'STANDBY' : 'MISSION ENDED';
  $('missionState').innerHTML = `<span class="live-dot"></span> ${statusLabel}`;
  $('missionState').classList.toggle('danger', game.integrity < 35 || game.status === 'lost');
  renderAlerts(); renderDetails(); renderTutorial(); renderAbilities(); renderEngineering();
  for (const action of ['investigate', 'block', 'allow', 'isolate']) {
    $(action + 'Button').disabled = !canUseAction(action);
  }
  $('agentButton').disabled = !canUseAction('agent');
  $('pauseButton').disabled = game.tutorial || !['playing', 'paused'].includes(game.status);
  $('pauseButton').innerHTML = game.status === 'paused' ? '▶ <span>Resume</span>' : 'Ⅱ <span>Pause</span>';
}

function saveRecord() {
  const key = `${game.mission.id}:${game.difficultyId}`;
  highScores[key] = Math.max(Number(highScores[key]) || 0, game.score);
  saveStorage('breachwave-records', highScores);
  if (game.status === 'won') {
    const levelIndex = MISSIONS.findIndex(mission => mission.id === game.mission.id);
    if (levelIndex > 0 && levelIndex < 4) {
      unlockedLevel = Math.max(unlockedLevel, levelIndex);
      saveStorage('breachwave-level', unlockedLevel);
    }
  }
  unlockedAchievements = [...new Set([...unlockedAchievements, ...game.getAchievements()])];
  saveStorage('breachwave-achievements', unlockedAchievements);
}

function renderPicker() {
  if (MISSIONS.find(mission => mission.id === selectedMissionId)?.unlock > unlockedLevel) selectedMissionId = 'quick';
  $('progressNote').textContent = `${Math.min(4, unlockedLevel + 1)}/4 CAMPAIGN SECTORS UNLOCKED`;
  $('missionCards').innerHTML = MISSIONS.map(mission => {
    const locked = mission.unlock > unlockedLevel;
    const selected = mission.id === selectedMissionId;
    const record = highScores[`${mission.id}:${selectedDifficultyId}`];
    return `<button type="button" data-mission="${mission.id}" class="mission-card ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}" ${locked ? 'disabled' : ''} aria-pressed="${selected}">
      <span class="sector">${locked ? '🔒 UNLOCK AFTER MISSION ' + (mission.unlock - 1) : mission.sector}</span>
      <strong>${html(mission.name)}</strong><small>${html(mission.subtitle)} · ${mission.waves} WAVES${record ? ' · BEST ' + record : ''}</small></button>`;
  }).join('');
  const chosen = MISSIONS.find(item => item.id === selectedMissionId) || MISSIONS[0];
  $('missionBrief').textContent = `${chosen.objective} ${DIFFICULTIES[selectedDifficultyId].description}.`;
  $('difficultySelect').value = selectedDifficultyId;
  $('playButton').textContent = '▶ Deploy ' + (chosen.id === 'quick' ? 'Quick Play' : chosen.name);
}

function renderReport() {
  const report = game.getReport();
  const awards = report.achievements.map(id => ACHIEVEMENTS.find(item => item.id === id)).filter(Boolean);
  $('reportContent').innerHTML = `
    <header class="report-header"><div><div class="report-kicker">BREACHWAVE // AFTER-ACTION REPORT // ${html(report.sector)}</div>
      <h2 id="reportTitle">${html(report.mission)}</h2>
      <p>${report.won ? 'DEFENDED' : 'COMPROMISED'} · ${html(report.difficulty)} · Seed ${report.seed} · ${report.elapsedSeconds}s elapsed</p>
    </div><span class="grade-seal" aria-label="Mission grade ${report.grade}">${report.grade}</span></header>
    <p><strong>Mission objective:</strong> ${html(report.objective)}</p>
    <section class="report-stats" aria-label="Mission statistics">
      ${[['FINAL SCORE', report.score], ['INTEGRITY', report.integrity + '%'], ['THREATS BLOCKED', report.blocked], ['FALSE POSITIVES', report.falsePositives],
        ['MISSED ATTACKS', report.missed], ['INVESTIGATIONS', report.investigations], ['LEGITIMATE ALLOWED', report.correctAllows],
        ['WAVES', report.wavesCompleted + '/' + report.totalWaves]].map(([label, value]) => `<div class="report-stat"><strong>${html(value)}</strong>${html(label)}</div>`).join('')}
    </section>
    <h3>Defender actions and automation</h3>
    <p>Countermeasures used: ${Object.entries(report.abilities).map(([id, count]) => html(id + ' ×' + count)).join(', ') || 'none'}.
       AEGIS recommendations requested: ${report.agentTraces.length}. All actions required human approval.</p>
    <p>Achievements earned: ${awards.map(item => html(item.icon + ' ' + item.title)).join(' · ') || 'none yet'}.</p>
    <h3>Chronological incident timeline</h3>
    <ol class="report-log">${report.timeline.map(event => `<li><time>${event.t.toFixed(1)}s</time><strong>${html(event.type.toUpperCase())}</strong><span>${html(event.message)}${event.technique ? ' · ATT&CK ' + html(event.technique) : ''}</span></li>`).join('')}</ol>
    <h3>Engineering integrity</h3>
    <p class="report-note">This report is generated entirely in your browser from fictional simulation data. MITRE ATT&CK mappings are illustrative references, not evidence of real compromise. AEGIS uses deterministic rules and scoped simulated read-only tools; no live LLM, secrets, external telemetry, or real systems are involved.</p>`;
}

function showOverlay() {
  $('screenOverlay').hidden = false;
  $('overlayResults').hidden = true;
  $('achievementAwards').hidden = true;
  $('reportButton').hidden = true;
  $('missionPicker').hidden = game.status === 'paused';
  if (game.status === 'menu') {
    $('overlayEyebrow').textContent = 'MISSION BRIEFING // SECTOR 01';
    $('overlayTitle').innerHTML = 'THE NETWORK<br><em>IS UNDER SIEGE.</em>';
    $('overlayDescription').textContent = 'Five scenarios. Four unlockable campaign sectors. One mission: protect the network. Select a mission, investigate alerts, and make your calls.';
    $('guidedButton').hidden = false;
  } else if (game.status === 'paused') {
    $('overlayEyebrow').textContent = 'MISSION CONTROL // PAUSED';
    $('overlayTitle').innerHTML = 'TAKE A <em>BREATHER.</em>';
    $('overlayDescription').textContent = 'Your network is safe while paused. Resume whenever you are ready.';
    $('playButton').textContent = '▶ Resume Mission';
    $('guidedButton').hidden = true;
  } else {
    saveRecord();
    renderReport();
    $('overlayEyebrow').textContent = game.status === 'won' ? 'MISSION COMPLETE // SYSTEM SECURE' : 'MISSION FAILED // SYSTEM COMPROMISED';
    $('overlayTitle').innerHTML = game.status === 'won' ? 'NETWORK <em>SECURED.</em>' : 'DEFENSES <em>OVERRUN.</em>';
    $('overlayDescription').textContent = game.status === 'won'
      ? `You defended ${game.mission.name} through ${game.totalWaves} waves. Explore the report, replay, or move to the next unlocked sector.`
      : 'Network integrity reached zero. Explore the incident timeline, refine your strategy, and redeploy.';
    const report = game.getReport();
    $('overlayResults').hidden = false;
    $('overlayResults').innerHTML = `<div class="result-stat"><strong>${report.grade}</strong>GRADE</div><div class="result-stat"><strong>${game.score}</strong>SCORE</div><div class="result-stat"><strong>${game.blocked}</strong>THREATS BLOCKED</div><div class="result-stat"><strong>${game.falsePositives}</strong>FALSE POSITIVES</div>`;
    const achievements = game.getAchievements().map(id => ACHIEVEMENTS.find(item => item.id === id)).filter(Boolean);
    $('achievementAwards').hidden = !achievements.length;
    $('achievementAwards').textContent = achievements.length ? 'ACHIEVEMENTS // ' + achievements.map(item => item.icon + ' ' + item.title).join(' · ') : '';
    $('reportButton').hidden = false;
    $('guidedButton').hidden = false;
  }
  if (game.status !== 'paused') renderPicker();
}

function startMission(tutorial = false) {
  const selected = MISSIONS.find(mission => mission.id === selectedMissionId) || MISSIONS[0];
  if (!tutorial && selected.unlock > unlockedLevel) return;
  game.start({ tutorial, mission: tutorial ? 'quick' : selectedMissionId, difficulty: tutorial ? 'operator' : selectedDifficultyId,
    unlockedLevel, seed: tutorial ? 2026 : Math.floor(Math.random() * 0xffffffff) });
  lastAlertSignature = '';
  lastAbilitySignature = '';
  lastEngineeringSignature = '';
  tutorialStep = tutorial ? 0 : -1;
  flash = '';
  effects.length = 0;
  $('screenOverlay').hidden = true;
  renderUI();
}

function advanceTutorial(eventType) {
  const expected = { select: 1, agent: 2, investigate: 3, block: 4 };
  if (game.tutorial && expected[eventType] === tutorialStep) tutorialStep++;
}

function selectThreat(id) {
  if (game.tutorial && tutorialStep !== 1) return;
  if (game.select(Number(id))) {
    advanceTutorial('select');
    flash = '';
    renderUI();
  }
}

function doAction(action) {
  if (!canUseAction(action)) return;
  flash = '';
  if (action === 'agent') {
    game.askAgent();
    advanceTutorial('agent');
  } else if (action === 'investigate') {
    game.investigate();
    advanceTutorial('investigate');
  } else {
    const result = game.resolve(action);
    if (!result?.ok) flash = result?.reason || 'Unable to perform this action.';
    if (result?.ok) advanceTutorial(action);
  }
  renderUI();
}

canvas.addEventListener('click', event => {
  const bounds = canvas.getBoundingClientRect();
  const x = event.clientX - bounds.left;
  const y = event.clientY - bounds.top;
  let closest = null;
  let bestDistance = 35;
  for (const incident of game.incidents) {
    const position = threatPosition(incident, bounds.width, bounds.height);
    const distance = Math.hypot(position.x - x, position.y - y);
    if (distance < bestDistance) { closest = incident; bestDistance = distance; }
  }
  if (closest) selectThreat(closest.id);
});

$('alertList').addEventListener('click', event => {
  const button = event.target.closest('[data-incident]');
  if (button) selectThreat(button.dataset.incident);
});

$('missionCards').addEventListener('click', event => {
  const button = event.target.closest('[data-mission]');
  const mission = MISSIONS.find(item => item.id === button?.dataset.mission);
  if (!mission || mission.unlock > unlockedLevel) return;
  selectedMissionId = mission.id;
  renderPicker();
});
$('difficultySelect').addEventListener('change', event => {
  if (!(event.target.value in DIFFICULTIES)) return;
  selectedDifficultyId = event.target.value;
  renderPicker();
});
$('abilityGrid').addEventListener('click', event => {
  const button = event.target.closest('[data-ability]');
  if (!button) return;
  const result = game.useAbility(button.dataset.ability);
  flash = result.ok ? '' : result.reason;
  lastAbilitySignature = '';
  renderUI();
});
$('audioButton').addEventListener('click', () => {
  audioEnabled = !audioEnabled;
  $('audioButton').setAttribute('aria-pressed', String(audioEnabled));
  $('audioButton').innerHTML = audioEnabled ? '♫ <span>Sound On</span>' : '♫ <span>Sound Off</span>';
  if (audioEnabled) playSound('allow');
});
$('engineeringButton').addEventListener('click', () => {
  engineeringVisible = !engineeringVisible;
  $('engineeringPanel').hidden = !engineeringVisible;
  $('engineeringButton').setAttribute('aria-pressed', String(engineeringVisible));
  lastEngineeringSignature = '';
  renderUI();
});
$('reportButton').addEventListener('click', () => $('reportDialog').showModal());
$('closeReport').addEventListener('click', () => $('reportDialog').close());
$('printReport').addEventListener('click', () => window.print());

$('investigateButton').addEventListener('click', () => doAction('investigate'));
$('blockButton').addEventListener('click', () => doAction('block'));
$('allowButton').addEventListener('click', () => doAction('allow'));
$('isolateButton').addEventListener('click', () => doAction('isolate'));
$('agentButton').addEventListener('click', () => doAction('agent'));
$('pauseButton').addEventListener('click', () => {
  game.togglePause();
  $('screenOverlay').hidden = game.status !== 'paused';
  if (game.status === 'paused') showOverlay();
  renderUI();
});
$('playButton').addEventListener('click', () => {
  if (game.status === 'paused') {
    game.togglePause();
    $('screenOverlay').hidden = true;
    renderUI();
  } else startMission(false);
});
$('guidedButton').addEventListener('click', () => startMission(true));
$('tutorialSkip').addEventListener('click', () => startMission(false));
$('tutorialNext').addEventListener('click', () => {
  if (tutorialStep === 0) tutorialStep = 1;
  else if (tutorialStep === 5) startMission(false);
  renderUI();
});
$('helpButton').addEventListener('click', () => {
  helpPaused = game.status === 'playing' && !game.tutorial;
  if (helpPaused) game.togglePause();
  $('helpDialog').showModal();
  renderUI();
});
$('closeHelp').addEventListener('click', () => $('helpDialog').close());
$('helpDialog').addEventListener('close', () => {
  if (helpPaused && game.status === 'paused') game.togglePause();
  helpPaused = false;
  renderUI();
});
$('helpTutorialButton').addEventListener('click', () => {
  helpPaused = false;
  $('helpDialog').close();
  startMission(true);
});

function frame(timestamp) {
  const seconds = previousTime ? (timestamp - previousTime) / 1000 : 0;
  previousTime = timestamp;
  game.tick(seconds);
  draw(timestamp);
  if (game.status !== previousStatus) {
    if (['won', 'lost'].includes(game.status)) showOverlay();
    previousStatus = game.status;
  }
  if (timestamp - lastUIRender > 200) {
    renderUI();
    lastUIRender = timestamp;
  }
  window.requestAnimationFrame(frame);
}

showOverlay();
renderUI();
window.requestAnimationFrame(frame);
