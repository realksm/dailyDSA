# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(43_000 + i)
MAXN = 200_000


def emit(d, t):
    n = len(t)
    assert 1 <= n <= MAXN and 0 <= d <= 10**9
    assert all(0 <= x <= 10**9 for x in t)
    sys.stdout.write(f"{n} {d}\n{' '.join(map(str, t))}\n")


def walk(n, step, start=500_000_000):
    # a random walk kept inside [0, 1e9]
    out, x = [], start
    for _ in range(n):
        x = min(10**9, max(0, x + rnd.randint(-step, step)))
        out.append(x)
    return out


if i == 1:  # sample
    emit(2, [3, 1, 2, 5, 4])
elif i == 2:  # sample: D = 0, only equal readings
    emit(0, [7, 7, 2])
elif i == 3:  # a single reading
    emit(0, [5])
elif i == 4:  # all equal: every stretch
    emit(0, [9] * 40)
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(0, 20), [rnd.randint(0, 30) for _ in range(n)])
elif i == 9:  # medium random walk
    emit(rnd.randint(100, 5000), walk(rnd.randint(3_000, 8_000), 200))
elif i == 10:  # max: D huge, every stretch (answer n(n+1)/2), slow for trying every start
    emit(10**9, [rnd.randint(0, 10**9) for _ in range(MAXN)])
elif i == 11:  # max: D = 0 with long equal runs
    t = []
    while len(t) < MAXN:
        t += [rnd.randint(0, 10)] * rnd.randint(1, 3000)
    emit(0, t[:MAXN])
elif i == 12:  # max: slow random walk, long steady stretches
    emit(50_000, walk(MAXN, 100))
elif i == 13:  # max: increasing then decreasing (the deques grow large)
    half = MAXN // 2
    emit(10**6, [j * 5000 for j in range(half)] + [(half - j) * 5000 for j in range(half)])
elif i == 14:  # max: zigzag, max/min change every step
    emit(10**8, [(j % 2) * 10**9 if j % 1000 else 5 * 10**8 for j in range(MAXN)])
else:  # max random walk, medium D
    emit(rnd.randint(10**5, 10**7), walk(MAXN, 50_000))
