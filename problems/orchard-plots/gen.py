# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(49_000 + i)
T = 10**6


def emit(grid, plots):
    R, C = len(grid), len(grid[0])
    assert 1 <= R <= 500 and 1 <= C <= 500 and 1 <= len(plots) <= 10**5
    assert all(len(row) == C and all(0 <= x <= T for x in row) for row in grid)
    assert all(1 <= a <= c <= R and 1 <= b <= d <= C for a, b, c, d in plots)
    out = [f"{R} {C}"] + [" ".join(map(str, row)) for row in grid]
    out += [str(len(plots))] + [f"{a} {b} {c} {d}" for a, b, c, d in plots]
    sys.stdout.write("\n".join(out) + "\n")


def grid_of(R, C, hi):
    return [[rnd.randint(0, hi) for _ in range(C)] for _ in range(R)]


def plot(R, C):
    a, c = sorted((rnd.randint(1, R), rnd.randint(1, R)))
    b, d = sorted((rnd.randint(1, C), rnd.randint(1, C)))
    return (a, b, c, d)


if i == 1:  # sample
    emit([[1, 2, 0, 3], [4, 1, 1, 0], [2, 0, 5, 1]], [(1, 1, 2, 2), (1, 3, 3, 4), (3, 1, 3, 1)])
elif i == 2:  # one square
    emit([[7]], [(1, 1, 1, 1)] * 3)
elif i == 3:  # one row
    g = grid_of(1, 50, 9)
    emit(g, [plot(1, 50) for _ in range(40)])
elif i == 4:  # one column
    g = grid_of(50, 1, 9)
    emit(g, [plot(50, 1) for _ in range(40)])
elif i <= 7:  # small random
    R, C = rnd.randint(2, 12), rnd.randint(2, 12)
    emit(grid_of(R, C, 20), [plot(R, C) for _ in range(rnd.randint(1, 40))])
elif i == 8:  # medium
    R, C = rnd.randint(50, 150), rnd.randint(50, 150)
    emit(grid_of(R, C, T), [plot(R, C) for _ in range(5000)])
elif i == 9:  # max: every query is the whole orchard (slow for adding up each plot)
    emit(grid_of(500, 500, T), [(1, 1, 500, 500)] * 10**5)
elif i == 10:  # max: all trees at the cap, big plots → ~2.5e11
    emit([[T] * 500 for _ in range(500)], [(rnd.randint(1, 3), rnd.randint(1, 3), 500, 500) for _ in range(10**5)])
elif i == 11:  # max: single-square plots
    emit(grid_of(500, 500, T), [(a, b, a, b) for a, b in ((rnd.randint(1, 500), rnd.randint(1, 500)) for _ in range(10**5))])
elif i == 12:  # max: thin strips
    plots = []
    for _ in range(10**5):
        if rnd.random() < 0.5:
            r = rnd.randint(1, 500)
            plots.append((r, 1, r, 500))
        else:
            c = rnd.randint(1, 500)
            plots.append((1, c, 500, c))
    emit(grid_of(500, 500, T), plots)
else:  # max random
    emit(grid_of(500, 500, T), [plot(500, 500) for _ in range(10**5)])
