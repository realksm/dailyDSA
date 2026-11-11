# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(44_000 + i)
MAXN = 200_000
V = 10**9


def emit(lo, hi, p):
    n = len(p)
    assert 1 <= lo <= hi <= n <= MAXN
    assert all(-V <= x <= V for x in p)
    sys.stdout.write(f"{n} {lo} {hi}\n{' '.join(map(str, p))}\n")


def rand(n, a, b):
    return [rnd.randint(a, b) for _ in range(n)]


if i == 1:  # sample
    emit(2, 3, [4, -6, 3, 5, -2, 4, -9])
elif i == 2:  # sample: everything negative, the block must still be at least L long
    emit(2, 4, [-3, -1, -4, -2, -5])
elif i == 3:  # a single day
    emit(1, 1, [-7])
elif i == 4:  # L = R = n: the whole season
    emit(30, 30, rand(30, -100, 100))
elif i == 5:  # all positive: take R days
    emit(3, 8, rand(40, 1, 100))
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    lo = rnd.randint(1, n)
    emit(lo, rnd.randint(lo, n), rand(n, -50, 50))
elif i == 9:  # medium random
    n = rnd.randint(3_000, 8_000)
    lo = rnd.randint(1, n // 2)
    emit(lo, rnd.randint(lo, n), rand(n, -V, V))
elif i == 10:  # max: L = 1, R = n, slow for trying every length
    emit(1, MAXN, rand(MAXN, -V, V))
elif i == 11:  # max: all positive, huge totals
    emit(1, MAXN, rand(MAXN, V - 1000, V))
elif i == 12:  # max: all negative, best is a block of exactly L
    emit(500, 150_000, rand(MAXN, -V, -1))
elif i == 13:  # max: positive drift with negative spikes
    p = [rnd.randint(-1000, 3000) if rnd.random() > 0.01 else -V for _ in range(MAXN)]
    emit(1000, 120_000, p)
elif i == 14:  # max: a narrow range of lengths in the middle
    emit(99_000, 101_000, rand(MAXN, -V, V))
else:  # max random range
    lo = rnd.randint(1, 50_000)
    emit(lo, rnd.randint(lo + 50_000, MAXN), rand(MAXN, -V, V))
