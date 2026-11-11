# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(59_000 + i)
MAXN = 100_000
V = 10**9


def emit(g, p):
    n, m = len(g), len(p)
    assert 1 <= n <= MAXN and 1 <= m <= MAXN
    assert all(0 <= x <= V for x in g + p)
    sys.stdout.write(f"{n} {m}\n{' '.join(map(str, g))}\n{' '.join(map(str, p))}\n")


def rand(n, lo=0, hi=V):
    return [rnd.randint(lo, hi) for _ in range(n)]


if i == 1:  # sample: guard 2 takes lamps 1, 4, 6 (left first, 6 s); guard 9 takes 11
    emit([9, 2], [4, 11, 1, 6])
elif i == 2:  # sample: one guard, lamps on both sides → do the nearer side first
    emit([8], [12, 2])
elif i == 3:  # every lamp at a guard post → 0
    emit([10, 3, 3], [3, 10, 3, 10])
elif i == 4:  # one guard at one end, one lamp at the other → 1e9
    emit([0], [V])
elif i == 5:  # one guard in the middle, lamps at both ends → 1.5e9 (needs 64 bits)
    emit([V // 2], [0, V])
elif i <= 9:  # small random
    emit(rand(rnd.randint(1, 12), 0, 60), rand(rnd.randint(1, 40), 0, 60))
elif i == 10:  # medium random (still small enough for the slow DP)
    emit(rand(rnd.randint(20, 60)), rand(rnd.randint(100, 250)))
elif i == 11:  # max: guards and lamps random
    emit(rand(MAXN), rand(MAXN))
elif i == 12:  # max: few guards, many lamps → big answer
    emit(rand(5), rand(MAXN))
elif i == 13:  # max: every guard sits between two lamp clusters
    g, p = [], []
    for c in range(MAXN // 2):
        base = c * 20_000
        g.append(base + rnd.randint(5_000, 15_000))
        p += [base + rnd.randint(0, 4_000), base + rnd.randint(16_000, 19_999)]
    emit(g, p)
elif i == 14:  # max: one guard, lamps everywhere
    emit([rnd.randint(0, V)], rand(MAXN))
else:  # max: many guards, few lamps
    emit(rand(MAXN), rand(50))
