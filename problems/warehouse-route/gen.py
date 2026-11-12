# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(63_000 + i)
MAXS = 500


def emit(rows):
    r, c = len(rows), len(rows[0])
    assert 1 <= r <= MAXS and 1 <= c <= MAXS and r * c >= 2
    assert all(len(row) == c and set(row) <= set(".#SE") for row in rows)
    text = "".join(rows)
    assert text.count("S") == 1 and text.count("E") == 1
    sys.stdout.write(f"{r} {c}\n" + "\n".join(rows) + "\n")


def put(grid, cell, ch):
    y, x = cell
    grid[y][x] = ch


def random_floor(r, c, p_wall):
    grid = [["#" if rnd.random() < p_wall else "." for _ in range(c)] for _ in range(r)]
    cells = rnd.sample(range(r * c), 2)
    put(grid, divmod(cells[0], c), "S")
    put(grid, divmod(cells[1], c), "E")
    return ["".join(row) for row in grid]


def column_snake(r, c):
    # Shelf columns at odd x with one gap, alternating bottom / top: one long winding corridor.
    grid = [["." for _ in range(c)] for _ in range(r)]
    for x in range(1, c, 2):
        gap = r - 1 if x % 4 == 1 else 0
        for y in range(r):
            if y != gap:
                grid[y][x] = "#"
    return grid


if i == 1:  # sample
    emit(["S..#.",
          ".#...",
          ".#.#E",
          "...#."])
elif i == 2:  # sample: the station is walled off
    emit(["S.#.",
          "..#E"])
elif i == 3:  # two cells
    emit(["SE"])
elif i == 4:  # one long row, the station at the far end
    emit(["S" + "." * 498 + "E"])
elif i <= 7:  # small random
    emit(random_floor(rnd.randint(1, 8), rnd.randint(2, 8), 0.3))
elif i == 8:  # medium random
    emit(random_floor(100, 100, 0.3))
elif i == 9:  # max, no shelves, opposite corners
    g = [["."] * MAXS for _ in range(MAXS)]
    put(g, (0, 0), "S")
    put(g, (MAXS - 1, MAXS - 1), "E")
    emit(["".join(row) for row in g])
elif i == 10:  # max, one corridor winding down and up the columns
    g = column_snake(MAXS, MAXS - 1)
    put(g, (0, 0), "S")
    put(g, (0, MAXS - 2), "E")
    emit(["".join(row) for row in g])
elif i == 11:  # max, the same corridor turned to wind along the rows, from the far end back
    g = column_snake(MAXS, MAXS - 1)
    g = [list(col) for col in zip(*g)]  # transpose: shelf rows with gaps
    put(g, (MAXS - 2, 0), "S")
    put(g, (0, 0), "E")
    emit(["".join(row) for row in g])
elif i == 12:  # max random
    emit(random_floor(MAXS, MAXS, 0.35))
elif i == 13:  # max winding corridor, but the station's end is shut
    g = column_snake(MAXS, MAXS - 1)
    put(g, (0, 0), "S")
    put(g, (MAXS - 1, MAXS - 2), "E")
    for y in range(MAXS):
        put(g, (y, MAXS - 3), "#")  # last gap column fully shelved
    emit(["".join(row) for row in g])
else:  # max random, fewer shelves
    emit(random_floor(MAXS, MAXS, 0.2))
