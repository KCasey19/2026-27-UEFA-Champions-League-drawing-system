// UEFA Champions League 2026/27 League Phase Draw Simulator
// JavaScript implementation

const TEAMS = [
    // Pot 1
    { name: "Paris Saint-Germain", assoc: "FRA", pot: 1 },
    { name: "Bayern München", assoc: "GER", pot: 1 },
    { name: "Real Madrid", assoc: "ESP", pot: 1 },
    { name: "Liverpool", assoc: "ENG", pot: 1 },
    { name: "Inter Milan", assoc: "ITA", pot: 1 },
    { name: "Manchester City", assoc: "ENG", pot: 1 },
    { name: "Arsenal", assoc: "ENG", pot: 1 },
    { name: "Barcelona", assoc: "ESP", pot: 1 },
    { name: "Atlético Madrid", assoc: "ESP", pot: 1 },
    // Pot 2
    { name: "Borussia Dortmund", assoc: "GER", pot: 2 },
    { name: "Roma", assoc: "ITA", pot: 2 },
    { name: "Sporting CP", assoc: "POR", pot: 2 },
    { name: "Aston Villa", assoc: "ENG", pot: 2 },
    { name: "Porto", assoc: "POR", pot: 2 },
    { name: "Manchester United", assoc: "ENG", pot: 2 },
    { name: "Club Brugge", assoc: "BEL", pot: 2 },
    { name: "Real Betis", assoc: "ESP", pot: 2 },
    { name: "PSV Eindhoven", assoc: "NED", pot: 2 },
    // Pot 3
    { name: "Feyenoord", assoc: "NED", pot: 3 },
    { name: "Lille", assoc: "FRA", pot: 3 },
    { name: "Bodø/Glimt", assoc: "NOR", pot: 3 },
    { name: "Napoli", assoc: "ITA", pot: 3 },
    { name: "RB Leipzig", assoc: "GER", pot: 3 },
    { name: "Villarreal", assoc: "ESP", pot: 3 },
    { name: "Fenerbahçe", assoc: "TUR", pot: 3 },
    { name: "Shakhtar Donetsk", assoc: "UKR", pot: 3 },
    { name: "Galatasaray", assoc: "TUR", pot: 3 },
    // Pot 4
    { name: "Slavia Praha", assoc: "CZE", pot: 4 },
    { name: "Slovan Bratislava", assoc: "SVK", pot: 4 },
    { name: "Stuttgart", assoc: "GER", pot: 4 },
    { name: "AEK Athens", assoc: "GRE", pot: 4 },
    { name: "LASK", assoc: "AUT", pot: 4 },
    { name: "Como", assoc: "ITA", pot: 4 },
    { name: "Lens", assoc: "FRA", pot: 4 },
    { name: "Viking", assoc: "NOR", pot: 4 },
    { name: "Sabah", assoc: "AZE", pot: 4 }
];

const MAX_FULL_DRAW_ATTEMPTS = 400;
const MAX_SUBSTEP_ATTEMPTS = 150;

class Team {
    constructor(name, assoc, pot) {
        this.name = name;
        this.assoc = assoc;
        this.pot = pot;
        this.home = [];
        this.away = [];
    }

    get opponents() {
        return [...this.home, ...this.away];
    }

    assocCount(assoc) {
        return this.opponents.filter(o => o.assoc === assoc).length;
    }

    reset() {
        this.home = [];
        this.away = [];
    }
}

function makeTeams() {
    return TEAMS.map(t => new Team(t.name, t.assoc, t.pot));
}

function canPair(a, b) {
    if (a === b) return false;
    if (a.assoc === b.assoc) return false;
    if (b.opponents.includes(a)) return false;
    if (a.assocCount(b.assoc) >= 2 || b.assocCount(a.assoc) >= 2) return false;
    return true;
}

function shuffle(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function buildIntraPotEdges(potTeams) {
    for (let attempt = 0; attempt < MAX_SUBSTEP_ATTEMPTS; attempt++) {
        const remaining = new Map();
        potTeams.forEach(t => remaining.set(t, 2));
        const edges = [];
        const nodes = shuffle(potTeams);
        let ok = true;

        const pool = [];
        nodes.forEach(t => {
            pool.push(t, t);
        });
        shuffle(pool);

        while (pool.length > 0) {
            const a = pool.pop();
            if (remaining.get(a) <= 0) continue;

            const candidates = shuffle(
                nodes.filter(b =>
                    b !== a &&
                    remaining.get(b) > 0 &&
                    canPairTentative(a, b, edges)
                )
            );

            if (candidates.length === 0) {
                ok = false;
                break;
            }

            const b = candidates[0];
            edges.push([a, b]);
            remaining.set(a, remaining.get(a) - 1);
            remaining.set(b, remaining.get(b) - 1);

            const bIndex = pool.indexOf(b);
            if (bIndex !== -1) pool.splice(bIndex, 1);
        }

        if (ok && Array.from(remaining.values()).every(v => v === 0)) {
            return edges;
        }
    }
    return null;
}

function canPairTentative(a, b, edges) {
    if (a === b || a.assoc === b.assoc) return false;
    if (edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) return false;
    if (a.assocCount(b.assoc) >= 2 || b.assocCount(a.assoc) >= 2) return false;
    return true;
}

function orientIntraEdges(edges) {
    const adj = new Map();
    edges.forEach(([a, b]) => {
        if (!adj.has(a)) adj.set(a, []);
        if (!adj.has(b)) adj.set(b, []);
        adj.get(a).push(b);
        adj.get(b).push(a);
    });

    const visitedEdges = new Set();
    const matches = [];

    const edgeKey = (a, b) => `${a.name}-${a.pot}-${b.name}-${b.pot}`;

    for (const start of adj.keys()) {
        const neighbors = adj.get(start);
        if (neighbors.every(n =>
            visitedEdges.has(edgeKey(start, n)) ||
            visitedEdges.has(edgeKey(n, start))
        )) continue;

        const cycle = [start];
        let prev = null;
        let cur = start;

        while (true) {
            const nexts = adj.get(cur).filter(n => {
                if (n === prev && adj.get(cur).filter(x => x === prev).length < 2) return false;
                if (visitedEdges.has(edgeKey(cur, n)) || visitedEdges.has(edgeKey(n, cur))) return false;
                return true;
            });

            if (nexts.length === 0) break;

            const nxt = nexts[0];
            visitedEdges.add(edgeKey(cur, nxt));

            if (nxt === start) break;

            cycle.push(nxt);
            prev = cur;
            cur = nxt;
        }

        for (let i = 0; i < cycle.length; i++) {
            const home = cycle[i];
            const away = cycle[(i + 1) % cycle.length];
            matches.push([home, away]);
        }
    }

    return matches;
}

function buildInterPotMatching(potA, potB) {
    for (let attempt = 0; attempt < MAX_SUBSTEP_ATTEMPTS; attempt++) {
        const m1 = tryPerfectMatching(potA, potB, null, null);
        if (!m1) continue;

        const forbidden = new Set(m1.map(([a, b]) => `${a.name}-${b.name}`));
        const m2 = tryPerfectMatching(potA, potB, forbidden, m1);

        if (m2) return [m1, m2];
    }
    return null;
}

function tryPerfectMatching(potA, potB, forbidden, provisional) {
    forbidden = forbidden || new Set();
    const aList = shuffle(potA);
    const bPool = new Set(potB);

    const tempAdded = [];
    if (provisional) {
        provisional.forEach(([a, b]) => {
            a.home.push(b);
            b.away.push(a);
            tempAdded.push([a, b]);
        });
    }

    const result = new Map();

    function backtrack(i, remaining) {
        if (i === aList.length) return true;

        const a = aList[i];
        const candidates = shuffle(
            Array.from(remaining).filter(b =>
                !forbidden.has(`${a.name}-${b.name}`) && canPair(a, b)
            )
        );

        for (const b of candidates) {
            result.set(a, b);
            remaining.delete(b);

            if (backtrack(i + 1, remaining)) return true;

            remaining.add(b);
            result.delete(a);
        }
        return false;
    }

    const success = backtrack(0, new Set(bPool));

    tempAdded.forEach(([a, b]) => {
        a.home.splice(a.home.indexOf(b), 1);
        b.away.splice(b.away.indexOf(a), 1);
    });

    if (!success) return null;
    return aList.map(a => [a, result.get(a)]);
}

function attemptFullDraw(teams) {
    teams.forEach(t => t.reset());

    const pots = {
        1: teams.filter(t => t.pot === 1),
        2: teams.filter(t => t.pot === 2),
        3: teams.filter(t => t.pot === 3),
        4: teams.filter(t => t.pot === 4)
    };

    // Intra-pot matches
    for (const p of [1, 2, 3, 4]) {
        const edges = buildIntraPotEdges(pots[p]);
        if (!edges) return false;

        orientIntraEdges(edges).forEach(([home, away]) => {
            home.home.push(away);
            away.away.push(home);
        });
    }

    // Inter-pot matches
    const potPairs = [[1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]];
    for (const [p, q] of potPairs) {
        const result = buildInterPotMatching(pots[p], pots[q]);
        if (!result) return false;

        const [m1, m2] = result;
        m1.forEach(([a, b]) => {
            a.home.push(b);
            b.away.push(a);
        });
        m2.forEach(([a, b]) => {
            a.away.push(b);
            b.home.push(a);
        });
    }

    // Final validation
    for (const t of teams) {
        if (t.home.length !== 4 || t.away.length !== 4) return false;
        if (new Set(t.opponents).size !== 8) return false;

        const counts = {};
        t.opponents.forEach(o => {
            counts[o.assoc] = (counts[o.assoc] || 0) + 1;
        });
        if (Object.values(counts).some(c => c > 2)) return false;
    }

    return true;
}

function runDraw() {
    const teams = makeTeams();
    for (let attempt = 1; attempt <= MAX_FULL_DRAW_ATTEMPTS; attempt++) {
        if (attemptFullDraw(teams)) {
            return { teams, attempts: attempt };
        }
    }
    throw new Error("Could not complete a valid draw after many attempts.");
}

// UI Functions
function showPots() {
    const resultsDiv = document.getElementById('results');
    const pots = {
        1: TEAMS.filter(t => t.pot === 1),
        2: TEAMS.filter(t => t.pot === 2),
        3: TEAMS.filter(t => t.pot === 3),
        4: TEAMS.filter(t => t.pot === 4)
    };

    let html = '<div class="pots-view"><h2>UEFA Champions League 2026/27 Pots</h2><div class="pots-grid">';

    for (let p = 1; p <= 4; p++) {
        html += `<div class="pot-card"><h3>Pot ${p}</h3><ul>`;
        pots[p].forEach(team => {
            html += `<li>${team.name} (${team.assoc})</li>`;
        });
        html += '</ul></div>';
    }

    html += '</div></div>';
    resultsDiv.innerHTML = html;
    document.getElementById('exportBtn').style.display = 'none';
}

function displayDrawResults(teams, attempts) {
    const resultsDiv = document.getElementById('results');

    let html = `
        <div class="info-banner">
            <h3>✅ Draw Complete!</h3>
            <p>Successfully generated a valid draw in ${attempts} attempt${attempts > 1 ? 's' : ''}.</p>
            <p>Each team plays 8 opponents: 2 from each pot, with 4 home matches and 4 away matches.</p>
        </div>
        <div class="legend">
            <div class="legend-item">
                <div class="legend-box home"></div>
                <span>(H) Home Match</span>
            </div>
            <div class="legend-item">
                <div class="legend-box away"></div>
                <span>(A) Away Match</span>
            </div>
        </div>
        <div class="draw-results">
    `;

    for (let p = 1; p <= 4; p++) {
        const potTeams = teams.filter(t => t.pot === p).sort((a, b) => a.name.localeCompare(b.name));

        html += `
            <div class="pot-section">
                <h3>Pot ${p}</h3>
                <div style="overflow-x: auto;">
                    <table class="team-table">
                        <thead>
                            <tr>
                                <th>Team</th>
                                ${Array.from({length: 8}, (_, i) => `<th>Opponent ${i + 1}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
        `;

        potTeams.forEach(team => {
            const homeOpps = team.home.sort((a, b) => a.name.localeCompare(b.name));
            const awayOpps = team.away.sort((a, b) => a.name.localeCompare(b.name));
            const allOpps = [...homeOpps, ...awayOpps];

            html += `<tr><td class="team-name">${team.name} (${team.assoc})</td>`;

            homeOpps.forEach(opp => {
                html += `<td><span class="opponent home">${opp.name} (H)</span></td>`;
            });
            awayOpps.forEach(opp => {
                html += `<td><span class="opponent away">${opp.name} (A)</span></td>`;
            });

            html += '</tr>';
        });

        html += '</tbody></table></div></div>';
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
    document.getElementById('exportBtn').style.display = 'flex';
}

function exportResults() {
    const resultsDiv = document.getElementById('results');
    if (!resultsDiv.textContent.includes('Draw Complete')) {
        alert('No draw results to export. Please run a draw first.');
        return;
    }

    let text = '=== UEFA Champions League 2026/27 League Phase Draw Results ===\n\n';

    const tables = document.querySelectorAll('.pot-section');
    tables.forEach(potSection => {
        const potTitle = potSection.querySelector('h3').textContent;
        text += `\n${potTitle}\n${'='.repeat(potTitle.length)}\n\n`;

        const rows = potSection.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const team = cells[0].textContent.trim();
            text += `${team}\n`;

            for (let i = 1; i < cells.length; i++) {
                const opp = cells[i].textContent.trim();
                if (opp) text += `  ${i}. ${opp}\n`;
            }
            text += '\n';
        });
    });

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UCL_2026-27_Draw_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Event Listeners
document.getElementById('runDrawBtn').addEventListener('click', async () => {
    const btn = document.getElementById('runDrawBtn');
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');

    btn.disabled = true;
    loading.style.display = 'block';
    results.innerHTML = '';

    // Simulate delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    try {
        const { teams, attempts } = runDraw();
        loading.style.display = 'none';
        displayDrawResults(teams, attempts);
    } catch (error) {
        loading.style.display = 'none';
        results.innerHTML = `<div class="info-banner" style="border-left-color: #f44336;"><h3>❌ Error</h3><p>${error.message}</p></div>`;
    } finally {
        btn.disabled = false;
    }
});

document.getElementById('showPotsBtn').addEventListener('click', () => {
    showPots();
});

document.getElementById('exportBtn').addEventListener('click', () => {
    exportResults();
});

// Show pots on page load
window.addEventListener('DOMContentLoaded', () => {
    showPots();
});
