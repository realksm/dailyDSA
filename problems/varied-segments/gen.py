# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(45_000 + i)
MAXN = 200_000


def emit(lo, hi, g):
    n = len(g)
    assert 1 <= n <= MAXN and 1 <= lo <= hi <= n
    assert all(1 <= x <= 10**9 for x in g)
    sys.stdout.write(f"{n} {lo} {hi}\n{' '.join(map(str, g))}\n")


def rand(n, k):
    return [rnd.randint(1, k) for _ in range(n)]


def big_ids(g):
    # spread small genre numbers over 1..1e9 (same structure)
    ids = {}
    return [ids.setdefault(x, rnd.randint(1, 10**9)) for x in g]


if i == 1:  # sample
    emit(2, 2, [1, 2, 1, 3, 3])
elif i == 2:  # sample: a wide range
    emit(1, 3, [5, 5, 8, 2])
elif i == 3:  # a single song
    emit(1, 1, [4])
elif i == 4:  # one genre, A = 2: nothing qualifies
    emit(2, 5, [3] * 30)
elif i == 5:  # all different, A = B
    emit(4, 4, list(range(1, 31)))
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    lo = rnd.randint(1, 4)
    emit(lo, rnd.randint(lo, min(n, 6)) if lo <= n else n, rand(n, 6))
elif i == 9:  # medium random
    n = rnd.randint(3_000, 8_000)
    lo = rnd.randint(1, 30)
    emit(lo, lo + rnd.randint(0, 50), big_ids(rand(n, 100)))
elif i == 10:  # max: A = 1, B = n: every segment, slow for trying every start
    emit(1, MAXN, big_ids(rand(MAXN, 50_000)))
elif i == 11:  # max: few genres, exactly 2 of them
    emit(2, 2, rand(MAXN, 3))
elif i == 12:  # max: all different, a band of lengths
    emit(1_000, 5_000, rnd.sample(range(1, 10**9 + 1), MAXN))
elif i == 13:  # max: long runs of one genre
    g = []
    while len(g) < MAXN:
        g += [rnd.randint(1, 1000)] * rnd.randint(1, 500)
    emit(3, 10, g[:MAXN])
elif i == 14:  # max: many genres, wide band
    emit(10, 30_000, big_ids(rand(MAXN, 40_000)))
else:  # max random
    k = rnd.randint(10, 5_000)
    lo = rnd.randint(1, k)
    emit(lo, rnd.randint(lo, k), big_ids(rand(MAXN, k)))
