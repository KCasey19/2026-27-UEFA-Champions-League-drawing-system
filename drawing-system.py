#!/usr/bin/env python3
"""
UEFA Champions League 2026/27 League Phase Draw Simulator
-----------------------------------------------------------
Simulates the Swiss-model league phase draw using the real 2026/27
pots (as confirmed by UEFA before the actual draw).

Rules implemented:
  - 36 teams split into 4 pots of 9.
  - Each team plays 8 opponents: 2 from each pot (including its own),
    1 at home and 1 away against each of those 2.
  - Teams from the same association can never meet.
  - A team can face at most 2 opponents total from any other single
    association.

Run:  python3 cl_draw.py
"""

import random
from collections import defaultdict

# ---------------------------------------------------------------------------
# Data: the real, confirmed 2026/27 UEFA Champions League league-phase pots
# ---------------------------------------------------------------------------
TEAMS = [
    # Pot 1
    ("Paris Saint-Germain", "FRA", 1),
    ("Bayern München", "GER", 1),
    ("Real Madrid", "ESP", 1),
    ("Liverpool", "ENG", 1),
    ("Inter Milan", "ITA", 1),
    ("Manchester City", "ENG", 1),
    ("Arsenal", "ENG", 1),
    ("Barcelona", "ESP", 1),
    ("Atlético Madrid", "ESP", 1),
    # Pot 2
    ("Borussia Dortmund", "GER", 2),
    ("Roma", "ITA", 2),
    ("Sporting CP", "POR", 2),
    ("Aston Villa", "ENG", 2),
    ("Porto", "POR", 2),
    ("Manchester United", "ENG", 2),
    ("Club Brugge", "BEL", 2),
    ("Real Betis", "ESP", 2),
    ("PSV Eindhoven", "NED", 2),
    # Pot 3
    ("Feyenoord", "NED", 3),
    ("Lille", "FRA", 3),
    ("Bodø/Glimt", "NOR", 3),
    ("Napoli", "ITA", 3),
    ("RB Leipzig", "GER", 3),
    ("Villarreal", "ESP", 3),
    ("Fenerbahçe", "TUR", 3),
    ("Shakhtar Donetsk", "UKR", 3),
    ("Galatasaray", "TUR", 3),
    # Pot 4
    ("Slavia Praha", "CZE", 4),
    ("Slovan Bratislava", "SVK", 4),
    ("Stuttgart", "GER", 4),
    ("AEK Athens", "GRE", 4),
    ("LASK", "AUT", 4),
    ("Como", "ITA", 4),
    ("Lens", "FRA", 4),
    ("Viking", "NOR", 4),
    ("Sabah", "AZE", 4),
]

MAX_FULL_DRAW_ATTEMPTS = 400
MAX_SUBSTEP_ATTEMPTS = 150


class Team:
    def __init__(self, name, assoc, pot):
        self.name = name
        self.assoc = assoc
        self.pot = pot
        self.home = []  # opponents faced at home
        self.away = []  # opponents faced away

    @property
    def opponents(self):
        return self.home + self.away

    def assoc_count(self, assoc):
        return sum(1 for o in self.opponents if o.assoc == assoc)

    def reset(self):
        self.home = []
        self.away = []


def make_teams():
    return [Team(name, assoc, pot) for name, assoc, pot in TEAMS]


def can_pair(a, b):
    """Can a and b be drawn against each other at all (not yet paired)?"""
    if a is b:
        return False
    if a.assoc == b.assoc:
        return False
    if b in a.opponents:
        return False
    if a.assoc_count(b.assoc) >= 2 or b.assoc_count(a.assoc) >= 2:
        return False
    return True


# ---------------------------------------------------------------------------
# Intra-pot pairing (each team plays 2 others from its own pot)
# ---------------------------------------------------------------------------
def build_intra_pot_edges(pot_teams):
    """Return a list of (teamA, teamB) edges forming a 2-regular graph on
    this pot's 9 teams, respecting association constraints. None on failure."""
    for _ in range(MAX_SUBSTEP_ATTEMPTS):
        remaining = defaultdict(int)
        for t in pot_teams:
            remaining[t] = 2
        edges = []
        nodes = list(pot_teams)
        random.shuffle(nodes)
        ok = True

        def pick(a):
            candidates = [
                b for b in nodes
                if b is not a and remaining[b] > 0 and can_pair_tentative(a, b, edges)
            ]
            random.shuffle(candidates)
            return candidates

        pool = [t for t in nodes for _ in range(2)]
        random.shuffle(pool)
        while pool:
            a = pool.pop()
            if remaining[a] <= 0:
                continue
            options = pick(a)
            if not options:
                ok = False
                break
            b = options[0]
            edges.append((a, b))
            remaining[a] -= 1
            remaining[b] -= 1
            pool.remove(b)
        if ok and all(v == 0 for v in remaining.values()):
            return edges
    return None


def can_pair_tentative(a, b, edges_so_far):
    if a is b or a.assoc == b.assoc:
        return False
    if any((x is a and y is b) or (x is b and y is a) for x, y in edges_so_far):
        return False
    if a.assoc_count(b.assoc) >= 2 or b.assoc_count(a.assoc) >= 2:
        return False
    return True


def orient_intra_edges(edges):
    """Turn an undirected 2-regular graph into home/away matches by
    decomposing into cycles and following each cycle in one direction."""
    adj = defaultdict(list)
    for a, b in edges:
        adj[a].append(b)
        adj[b].append(a)

    visited_edges = set()
    matches = []  # (home, away)

    def edge_key(a, b):
        return (id(a), id(b))

    for start in adj:
        if any(edge_key(start, n) in visited_edges or edge_key(n, start) in visited_edges
               for n in adj[start]):
            continue
        # walk the cycle containing `start`
        cycle = [start]
        prev, cur = None, start
        while True:
            nexts = [n for n in adj[cur] if n is not prev or adj[cur].count(prev) > 1]
            # choose an unvisited-edge neighbor
            nxt = None
            for cand in adj[cur]:
                if cand is prev and adj[cur].count(prev) < 2:
                    continue
                if edge_key(cur, cand) in visited_edges or edge_key(cand, cur) in visited_edges:
                    continue
                nxt = cand
                break
            if nxt is None:
                break
            visited_edges.add(edge_key(cur, nxt))
            if nxt is start:
                break
            cycle.append(nxt)
            prev, cur = cur, nxt

        k = len(cycle)
        for i in range(k):
            home = cycle[i]
            away = cycle[(i + 1) % k]
            matches.append((home, away))
    return matches


# ---------------------------------------------------------------------------
# Inter-pot pairing (each team plays 2 from every other pot)
# ---------------------------------------------------------------------------
def build_inter_pot_matching(pot_a, pot_b):
    """Return two perfect matchings (as lists of (a,b) pairs) between
    pot_a and pot_b such that no pair repeats and constraints hold."""
    for _ in range(MAX_SUBSTEP_ATTEMPTS):
        m1 = try_perfect_matching(pot_a, pot_b, forbidden=None)
        if m1 is None:
            continue
        forbidden = {(id(a), id(b)) for a, b in m1}
        m2 = try_perfect_matching(pot_a, pot_b, forbidden=forbidden, provisional=m1)
        if m2 is not None:
            return m1, m2
    return None


def try_perfect_matching(pot_a, pot_b, forbidden=None, provisional=None):
    """Randomised backtracking search for a perfect matching between two
    9-team pots respecting can_pair (+ optionally excluding `forbidden`
    pairs, and counting `provisional` matches as already-committed
    opponents for association-cap purposes during the search)."""
    forbidden = forbidden or set()
    a_list = list(pot_a)
    random.shuffle(a_list)
    b_pool = list(pot_b)

    # temporarily account for provisional matches so caps are respected
    temp_added = []
    if provisional:
        for a, b in provisional:
            a.home.append(b)  # direction doesn't matter for counting here
            b.away.append(a)
            temp_added.append((a, b))

    result = {}

    def backtrack(i, remaining):
        if i == len(a_list):
            return True
        a = a_list[i]
        candidates = [
            b for b in remaining
            if (id(a), id(b)) not in forbidden and can_pair(a, b)
        ]
        random.shuffle(candidates)
        for b in candidates:
            result[a] = b
            remaining.remove(b)
            if backtrack(i + 1, remaining):
                return True
            remaining.add(b)
            del result[a]
        return False

    success = backtrack(0, set(b_pool))

    # undo temporary accounting
    for a, b in temp_added:
        a.home.remove(b)
        b.away.remove(a)

    if not success:
        return None
    return [(a, result[a]) for a in a_list]


# ---------------------------------------------------------------------------
# Full draw
# ---------------------------------------------------------------------------
def attempt_full_draw(teams):
    for t in teams:
        t.reset()

    pots = {p: [t for t in teams if t.pot == p] for p in (1, 2, 3, 4)}

    # 1) intra-pot matches
    for p in (1, 2, 3, 4):
        edges = build_intra_pot_edges(pots[p])
        if edges is None:
            return False
        for home, away in orient_intra_edges(edges):
            home.home.append(away)
            away.away.append(home)

    # 2) inter-pot matches
    pot_pairs = [(1, 2), (1, 3), (1, 4), (2, 3), (2, 4), (3, 4)]
    for p, q in pot_pairs:
        result = build_inter_pot_matching(pots[p], pots[q])
        if result is None:
            return False
        m1, m2 = result
        for a, b in m1:
            a.home.append(b)
            b.away.append(a)
        for a, b in m2:
            a.away.append(b)
            b.home.append(a)

    # final validation
    for t in teams:
        if len(t.home) != 4 or len(t.away) != 4:
            return False
        if len(set(id(o) for o in t.opponents)) != 8:
            return False
        counts = defaultdict(int)
        for o in t.opponents:
            counts[o.assoc] += 1
        if any(c > 2 for c in counts.values()):
            return False
    return True


def run_draw():
    teams = make_teams()
    for attempt in range(1, MAX_FULL_DRAW_ATTEMPTS + 1):
        if attempt_full_draw(teams):
            return teams, attempt
    raise RuntimeError("Could not complete a valid draw after many attempts.")


# ---------------------------------------------------------------------------
# Display
# ---------------------------------------------------------------------------
def print_pot_tables(teams):
    """Print one UEFA-style table per pot: rows are the pot's 9 teams,
    columns are their 8 opponents with (H) home / (A) away markers."""
    col_w = 26
    headers = ["Team"] + [f"Opp {i}" for i in range(1, 9)]

    def row_str(cells):
        return " | ".join(c.ljust(col_w)[:col_w] for c in cells)

    for p in (1, 2, 3, 4):
        pot_teams = sorted((t for t in teams if t.pot == p), key=lambda t: t.name)
        print(f"\n=========== Pot {p} ===========")
        print(row_str(headers))
        print(" | ".join("-" * col_w for _ in headers))
        for t in pot_teams:
            opps = [f"{o.name} (H)" for o in sorted(t.home, key=lambda o: o.name)]
            opps += [f"{o.name} (A)" for o in sorted(t.away, key=lambda o: o.name)]
            print(row_str([f"{t.name} ({t.assoc})"] + opps))


def print_pots():
    """Print a single table with 4 columns (one per pot); each column
    lists that pot's 9 teams with their association codes."""
    pots = {p: [t for t in TEAMS if t[2] == p] for p in (1, 2, 3, 4)}
    headers = ["Pot 1", "Pot 2", "Pot 3", "Pot 4"]
    col_w = 26

    def row_str(cells):
        return " | ".join(c.ljust(col_w)[:col_w] for c in cells)

    print()
    print(row_str(headers))
    print(" | ".join("-" * col_w for _ in headers))
    for i in range(9):
        cells = [f"{pots[p][i][0]} ({pots[p][i][1]})" for p in (1, 2, 3, 4)]
        print(row_str(cells))


def main():
    while True:
        print("\n=== UEFA Champions League 2026/27 League Phase Draw ===")
        print("1) Run a new draw")
        print("2) Show the pots")
        print("3) Quit")
        choice = input("Choose an option: ").strip()
        if choice == "1":
            teams, attempts = run_draw()
            print(f"\nDraw complete (took {attempts} attempt(s) to satisfy all rules).")
            print_pot_tables(teams)
        elif choice == "2":
            print_pots()
        elif choice == "3":
            print("Goodbye!")
            break
        else:
            print("Invalid choice, try again.")


if __name__ == "__main__":
    main()
