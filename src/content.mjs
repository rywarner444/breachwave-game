export const MISSIONS = [
  { id: 'quick', name: 'Quick Defense', subtitle: 'A recruiter-friendly mixed-threat run', sector: 'SECTOR 01', waves: 4, perWave: 3, focus: 'mixed', objective: 'Keep the network online through four attack waves.', unlock: 0, accent: '#36f1d7' },
  { id: 'identity', name: 'Identity Under Siege', subtitle: 'MFA abuse and suspicious sign-ins', sector: 'MISSION 01', waves: 3, perWave: 3, focus: 'identity', objective: 'Preserve identity access while stopping account abuse.', unlock: 0, accent: '#67d5ff' },
  { id: 'cloud', name: 'Ghost in the Cloud', subtitle: 'IAM changes and privilege escalation', sector: 'MISSION 02', waves: 4, perWave: 3, focus: 'cloud', objective: 'Protect privileged cloud resources without stopping approved maintenance.', unlock: 1, accent: '#ba9aff' },
  { id: 'edge', name: 'Firewall Frontline', subtitle: 'Web traffic and automated attacks', sector: 'MISSION 03', waves: 4, perWave: 4, focus: 'waf', objective: 'Keep the application available while filtering hostile traffic.', unlock: 2, accent: '#ffbc78' },
  { id: 'convergence', name: 'Convergence Protocol', subtitle: 'The final coordinated assault', sector: 'FINAL MISSION', waves: 5, perWave: 4, focus: 'mixed', objective: 'Defend every layer against adaptive multi-vector attacks.', unlock: 3, accent: '#ff778e' }
];

export const DIFFICULTIES = {
  cadet: { label: 'Cadet', speed: 0.72, penalty: 0.7, startingCredits: 210, multiplier: 1, description: 'Extra time, more credits, gentler consequences' },
  operator: { label: 'Operator', speed: 1, penalty: 1, startingCredits: 160, multiplier: 1.25, description: 'Balanced tactical challenge' },
  expert: { label: 'Expert', speed: 1.32, penalty: 1.35, startingCredits: 130, multiplier: 1.6, description: 'Faster attacks and unforgiving mistakes' }
};

export const ABILITIES = [
  { id: 'scan', label: 'Signal Sweep', icon: '⌕', cost: 25, unlock: 0, hint: 'Reveal evidence for every active alert' },
  { id: 'shield', label: 'Recovery Patch', icon: '✚', cost: 40, unlock: 1, hint: 'Restore 16% network integrity' },
  { id: 'pulse', label: 'Time Dilation', icon: '◉', cost: 55, unlock: 2, hint: 'Slow active threats for 12 seconds' },
  { id: 'honeypot', label: 'Decoy Beacon', icon: '◇', cost: 45, unlock: 3, hint: 'Intercept the next malicious arrival' }
];

export const ACHIEVEMENTS = [
  { id: 'first_block', title: 'First Responder', description: 'Contain your first malicious threat', icon: '⛨' },
  { id: 'clean_run', title: 'Zero False Positives', description: 'Complete a run without disrupting legitimate traffic', icon: '◈' },
  { id: 'perfect_integrity', title: 'Untouchable', description: 'Win with full network integrity', icon: '✦' },
  { id: 'investigator', title: 'Evidence First', description: 'Investigate at least eight incidents in one mission', icon: '⌕' },
  { id: 'campaign', title: 'Sector Guardian', description: 'Complete the final campaign mission', icon: '★' }
];

// Each ATT&CK mapping references an official MITRE Enterprise technique. These
// are simplified interpretations for a fictional training game.
export const INCIDENT_CATALOG = [
  { kind: 'identity', title: 'MFA Fatigue Attempt', target: 'identity', severity: 'HIGH', source: 'Identity telemetry', mitre: 'T1621', technique: 'MFA Request Generation', detail: 'Repeated authentication challenges were followed by a successful sign-in.', evidence: ['16 MFA prompts in 90 seconds', 'Most challenges were denied', 'A new session was created after repeated prompts'], malicious: true },
  { kind: 'waf', title: 'Public Endpoint Probe', target: 'gateway', severity: 'HIGH', source: 'Firewall telemetry', mitre: 'T1190', technique: 'Exploit Public-Facing Application', detail: 'An attacker is probing a public application endpoint for weaknesses.', evidence: ['Elevated HTTP error responses', 'Repeated crafted requests target one endpoint', 'A known defensive rule matched the request pattern'], malicious: true },
  { kind: 'cloud', title: 'Privileged Role Change', target: 'cloud', severity: 'HIGH', source: 'Cloud audit telemetry', mitre: 'T1098', technique: 'Account Manipulation', detail: 'An identity unexpectedly requested elevated infrastructure permissions.', evidence: ['Rarely used principal changed IAM bindings', 'Permissions expanded outside the change window', 'A privileged API action followed'], malicious: true },
  { kind: 'identity', title: 'Unexpected Sign-in', target: 'identity', severity: 'LOW', source: 'Identity telemetry', mitre: null, technique: 'Benign authentication anomaly', detail: 'A successful authentication occurred from a newly observed location.', evidence: ['The user completed MFA successfully', 'Previously registered device was used', 'No unusual follow-up activity observed'], malicious: false },
  { kind: 'waf', title: 'Product Launch Traffic', target: 'app', severity: 'MEDIUM', source: 'Application telemetry', mitre: null, technique: 'Benign traffic increase', detail: 'Traffic has increased rapidly on a public application endpoint.', evidence: ['Requests match an announced product release', 'No suspicious error anomaly is present', 'Clients resemble legitimate visitors'], malicious: false },
  { kind: 'cloud', title: 'Approved Policy Update', target: 'database', severity: 'LOW', source: 'Cloud audit telemetry', mitre: null, technique: 'Approved infrastructure maintenance', detail: 'A role policy update occurred on a sensitive service.', evidence: ['Change matches a scheduled maintenance window', 'Service owner approved the change', 'Resulting policy narrows permissions'], malicious: false },
  { kind: 'identity', title: 'Credential Spray', target: 'identity', severity: 'HIGH', source: 'Identity telemetry', mitre: 'T1110', technique: 'Brute Force', detail: 'Many accounts are receiving failed password attempts from one source.', evidence: ['Failures span 42 identities', 'Attempts share a single network origin', 'Attempt rate is inconsistent with user behavior'], malicious: true },
  { kind: 'waf', title: 'Attack Traffic Surge', target: 'app', severity: 'HIGH', source: 'Firewall telemetry', mitre: 'T1190', technique: 'Exploit Public-Facing Application', detail: 'A burst of suspicious requests is targeting an exposed route.', evidence: ['Requests contain repeated exploit-like patterns', 'WAF challenges are increasing', 'Target route has sensitive capabilities'], malicious: true },
  { kind: 'cloud', title: 'Unusual Cloud Access', target: 'database', severity: 'HIGH', source: 'Cloud audit telemetry', mitre: 'T1098', technique: 'Account Manipulation', detail: 'A principal with newly expanded permissions is touching sensitive data.', evidence: ['Elevated policy assigned minutes earlier', 'Principal queried protected storage', 'No approved change request exists'], malicious: true }
];

export function createRandom(seed) {
  let state = Number(seed) >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function routeToTarget(target) {
  const routes = {
    gateway: ['gateway'],
    identity: ['gateway', 'identity'],
    app: ['gateway', 'app'],
    cloud: ['gateway', 'identity', 'cloud'],
    database: ['gateway', 'app', 'database']
  };
  return routes[target] ? [...routes[target]] : ['gateway', 'app'];
}

export function gradeForReport({ won, integrity, falsePositives, missed, score }) {
  if (!won) return 'F';
  if (integrity >= 90 && falsePositives === 0 && missed === 0 && score >= 600) return 'S';
  if (integrity >= 75 && falsePositives <= 1 && missed <= 1) return 'A';
  if (integrity >= 55 && falsePositives <= 2) return 'B';
  return 'C';
}
