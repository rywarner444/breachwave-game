import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine, MAX_WAVES, NODES, LINKS } from '../src/engine.mjs';
import { MISSIONS, DIFFICULTIES, INCIDENT_CATALOG, gradeForReport } from '../src/content.mjs';

test('network topology is valid', () => {
  const ids = new Set(NODES.map(node => node.id));
  assert.equal(ids.size, NODES.length);
  for (const [source, target] of LINKS) {
    assert.ok(ids.has(source));
    assert.ok(ids.has(target));
  }
  assert.equal(MAX_WAVES, 4);
});

test('tutorial creates a known incident without advancing time', () => {
  const engine = new GameEngine();
  engine.start({ tutorial: true });
  assert.equal(engine.threatCount, 1);
  engine.tick(100);
  assert.equal(engine.incidents[0].progress, 0);
});

test('investigation exposes evidence and assistant offers bounded recommendations', () => {
  const engine = new GameEngine();
  engine.start();
  const incident = engine.incidents[0];
  engine.select(incident.id);
  assert.equal(engine.askAgent(), 'investigate');
  assert.equal(engine.investigate(), true);
  assert.equal(engine.askAgent(), 'block');
  assert.match(engine.agentResponse, /Human approval required/);
  assert.equal(engine.incidents[0].investigated, true);
});

test('blocking real threats rewards defense and requires credits', () => {
  const engine = new GameEngine();
  engine.start();
  engine.select(engine.incidents[0].id);
  const result = engine.resolve('block');
  assert.equal(result.ok, true);
  assert.equal(engine.blocked, 1);
  assert.equal(engine.integrity, 100);
  assert.ok(engine.score > 0);
  assert.equal(engine.threatCount, 0);
});

test('false positives harm availability', () => {
  const engine = new GameEngine();
  engine.start({ tutorial: true });
  const benign = engine.spawn(3);
  engine.select(benign.id);
  engine.resolve('isolate');
  assert.equal(engine.integrity, 82);
  assert.equal(engine.falsePositives, 1);
});

test('letting malicious activity through harms integrity', () => {
  const engine = new GameEngine();
  engine.start();
  engine.select(engine.incidents[0].id);
  engine.resolve('allow');
  assert.equal(engine.integrity, 78);
});

test('limited credits prevent expensive actions', () => {
  const engine = new GameEngine();
  engine.start();
  engine.credits = 0;
  engine.select(engine.incidents[0].id);
  assert.equal(engine.resolve('isolate').ok, false);
  assert.equal(engine.threatCount, 1);
});

test('pause and resume freeze the simulation', () => {
  const engine = new GameEngine();
  engine.start();
  engine.togglePause();
  engine.tick(10);
  assert.equal(engine.elapsed, 0);
  engine.togglePause();
  engine.tick(0.1);
  assert.ok(engine.elapsed > 0);
});

test('waves progress and successful completion ends the game', () => {
  const engine = new GameEngine();
  engine.start();
  for (let index = 0; index < 1300 && engine.status === 'playing'; index++) {
    for (const item of [...engine.incidents]) {
      engine.select(item.id);
      engine.resolve(item.malicious ? 'block' : 'allow');
    }
    engine.tick(0.1);
  }
  assert.equal(engine.status, 'won');
  assert.equal(engine.wave, 4);
});

test('every mission has a distinct objective and winnable number of waves', () => {
  for (const mission of MISSIONS) {
    const game = new GameEngine();
    game.start({ mission: mission.id, seed: 42 });
    for (let index = 0; index < 1600 && game.status === 'playing'; index++) {
      for (const incident of [...game.incidents]) {
        game.select(incident.id);
        game.resolve(incident.malicious ? 'block' : 'allow');
      }
      game.tick(.15);
    }
    assert.equal(game.status, 'won', mission.name);
    assert.equal(game.wave, mission.waves);
    assert.equal(game.handled, mission.waves * mission.perWave);
    assert.equal(game.getReport().totalWaves, mission.waves);
  }
});

test('difficulty affects initial resources, speed, and mistakes', () => {
  const cadet = new GameEngine(), expert = new GameEngine();
  cadet.start({ difficulty: 'cadet', seed: 13 });
  expert.start({ difficulty: 'expert', seed: 13 });
  assert.equal(cadet.credits, DIFFICULTIES.cadet.startingCredits);
  assert.equal(expert.credits, DIFFICULTIES.expert.startingCredits);
  assert.ok(expert.incidents[0].speed > cadet.incidents[0].speed);
  cadet.select(cadet.incidents[0].id); cadet.resolve('allow');
  expert.select(expert.incidents[0].id); expert.resolve('allow');
  assert.ok(expert.integrity < cadet.integrity);
});

test('seeded threat selection reproduces the same scenario order', () => {
  const one = new GameEngine(), two = new GameEngine();
  one.start({ seed: 1245, mission: 'convergence' });
  two.start({ seed: 1245, mission: 'convergence' });
  for (let index = 0; index < 8; index++) {
    assert.equal(one.incidents[index].title, two.incidents[index].title);
    assert.equal(one.incidents[index].speed, two.incidents[index].speed);
    one.spawn(); two.spawn();
  }
});

test('adversary changes focus after repeated identity blocks in mixed mode', () => {
  const game = new GameEngine();
  game.start();
  const second = game.spawn(0);
  for (const item of [game.incidents[0], second]) {
    game.select(item.id);
    game.resolve('block');
  }
  game.spawn();
  assert.equal(game.adversaryFocus, 'identity');
  assert.equal(game.defenseUse.identity, 2);
});

test('signal sweep reveals synthetic evidence without an AI API', () => {
  const game = new GameEngine();
  game.start();
  const second = game.spawn(3);
  assert.equal(game.useAbility('scan').ok, true);
  assert.equal(game.investigations, 2);
  assert.ok(game.incidents.every(item => item.investigated));
  assert.equal(game.credits, 135);
  game.select(second.id);
  assert.equal(game.askAgent(), 'allow');
  assert.equal(game.agentTraces.at(-1).mode, 'deterministic_rules');
});

test('ability unlocks and insufficient credits are enforced', () => {
  const game = new GameEngine();
  game.start();
  assert.equal(game.useAbility('shield').ok, false);
  game.credits = 0;
  assert.equal(game.useAbility('scan').ok, false);
  game.start({ unlockedLevel: 3 });
  game.select(game.incidents[0].id); game.resolve('allow');
  assert.equal(game.integrity, 78);
  assert.equal(game.useAbility('shield').ok, true);
  assert.equal(game.integrity, 94);
  assert.equal(game.useAbility('pulse').ok, true);
  assert.ok(game.activeSlowUntil > game.elapsed);
});

test('decoy beacon intercepts a malicious arrival and preserves integrity', () => {
  const game = new GameEngine();
  game.start({ unlockedLevel: 3 });
  assert.equal(game.useAbility('honeypot').ok, true);
  game.incidents[0].progress = .999;
  game.tick(.25);
  assert.equal(game.blocked, 1);
  assert.equal(game.integrity, 100);
  assert.equal(game.honeypotCharges, 0);
});

test('agent trace explicitly records read-only telemetry and human approval', () => {
  const game = new GameEngine();
  game.start();
  game.select(game.incidents[0].id);
  game.askAgent();
  assert.deepEqual(game.agentTraces[0].steps.map(step => step.tool), [
    'read_synthetic_telemetry', 'correlate_signals', 'recommend_response'
  ]);
  assert.equal(game.agentTraces[0].recommendation, 'investigate');
  assert.match(game.agentResponse, /Human approval required/);
  assert.equal(game.threatCount, 1);
  game.investigate();
  game.askAgent();
  assert.equal(game.agentTraces[1].recommendation, 'block');
});

test('report includes chronology, grade, and achievements without leaking state', () => {
  const game = new GameEngine();
  game.start({ mission: 'identity' });
  game.select(game.incidents[0].id);
  game.investigate();
  game.resolve('block');
  const report = game.getReport();
  assert.ok(report.timeline.some(entry => entry.type === 'investigation'));
  assert.ok(report.achievements.includes('first_block'));
  assert.equal(report.missionId, 'identity');
  assert.equal(report.agentTraces.length, 0);
  report.timeline.length = 0;
  assert.ok(game.timeline.length);
});

test('ATT&CK identifiers are valid references and benign signals are not mislabeled', () => {
  for (const item of INCIDENT_CATALOG) {
    if (item.malicious) assert.match(item.mitre, /^T\d{4}$/);
    else assert.equal(item.mitre, null);
  }
  assert.equal(gradeForReport({ won: true, integrity: 99, falsePositives: 0, missed: 0, score: 1000 }), 'S');
  assert.equal(gradeForReport({ won: false, integrity: 0, falsePositives: 0, missed: 3, score: 0 }), 'F');
});
