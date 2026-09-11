# UEFA Champions League 2026/27 League Phase Draw Simulator

A Python simulation of the **UEFA Champions League 2026/27 League Phase Draw**, using the real Swiss-model format and the confirmed 2026/27 pots (as stated by UEFA before the actual draw).

![Python](https://img.shields.io/badge/python-3.x-blue)

## What it does

- Splits all **36 qualified teams** into **4 pots of 9** (as in the real draw).
- Generates a full schedule where **each team plays 8 league-phase opponents**:
  - 2 opponents from its own pot
  - 2 opponents from each of the other 3 pots
  - Always 1 match at home and 1 away against each of those opponents
- Respects the competition's restriction rules (see below).
- Retries automatically (up to 400 full-draw attempts) until a schedule that satisfies every rule is found.

## Rules implemented

- 36 teams split into 4 pots of 9.
- Each team plays 8 opponents: **2 from each pot** (including its own), with one leg at home and one away against each of those 2.
- **Teams from the same association can never meet.**
- A team can face **at most 2 opponents** from any other single association.

## Requirements

- **Python 3** (no third-party packages required — only the standard library).

## How to run

```bash
python3 drawing-system.py
```

Example output:

```
=== UEFA Champions League 2026/27 League Phase Draw ===
1) Run a new draw
2) Show the pots
3) Quit
Choose an option:
```

## Usage

Once running, the program offers an interactive menu:

| Option | Action                                                                            |
|--------|-----------------------------------------------------------------------------------|
| **1**  | Run a new draw and print 4 UEFA-style tables (one per pot): each team's 8 opponents with (H)/(A) markers |
| **2**  | Show the 4 pots of teams used for the draw                                        |
| **3**  | Quit the program                                                                  |

After running a draw, the output is one table per pot. Every row is one of the pot's 9 teams; the 8 columns are that team's opponents, marked **(H)** for home matches and **(A)** for away matches:

```text
=========== Pot 1 ===========
Team                       | Opp 1                     | Opp 2                     | ...
---------------------------|---------------------------|---------------------------|
Arsenal (ENG)              | Bayern München (A)        | Barcelona (H)             | ...
...
```

## Project structure

```
.
├── drawing-system.py   # The full simulator (data, rules, draw engine, CLI)
└── README.md           # This file
```

## How the draw engine works

1. **Intra-pot stage** — teams are paired with 2 others from their own pot (respecting association limits).
2. **Inter-pot stage** — each pair of pots (1-2, 1-3, 1-4, 2-3, 2-4, 3-4) is matched using a backtracking matcher, producing one home and one away leg per pairing.
3. **Validation** — every schedule is checked before being accepted (8 unique opponents, 4 home + 4 away, max 2 teams per foreign association).
4. If any stage fails, the whole draw is restarted (up to 400 attempts).

## Disclaimer

This is an unofficial fan simulation and is **not** affiliated with UEFA. Team names and pot data are used for educational/entertainment purposes.