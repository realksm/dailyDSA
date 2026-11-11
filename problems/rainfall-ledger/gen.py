# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(7_000 + i)
MAXN = 200_000


def emit(a, qs):
    out = [f"{len(a)} {len(qs)}", " ".join(map(str, a))]
    out += [f"{l} {r}" for l, r in qs]
    sys.stdout.write("\n".join(out) + "\n")


def rand_queries(n, q, full=False):
    qs = []
    for _ in range(q):
        if full:
            qs.append((1, n))  # worst case for brute force
        else:
            l = rnd.randint(1, n)
            qs.append((l, rnd.randint(l, n)))
    return qs


if i == 1:  # sample
    emit([3, 0, 7, 2, 5], [(1, 3), (2, 4), (5, 5)])
elif i == 2:  # single day
    emit([42], [(1, 1)])
elif i == 3:  # all dry
    emit([0] * 10, rand_queries(10, 10))
elif i <= 6:  # small random
    n = rnd.randint(5, 50)
    emit([rnd.randint(0, 100) for _ in range(n)], rand_queries(n, rnd.randint(5, 50)))
elif i <= 8:  # medium
    n = rnd.randint(1_000, 5_000)
    emit([rnd.randint(0, 10**9) for _ in range(n)], rand_queries(n, n))
elif i == 9:  # max values everywhere: sums need 64-bit
    emit([10**9] * MAXN, rand_queries(MAXN, MAXN, full=True))
elif i == 10:  # max size, full-range queries
    emit([rnd.randint(0, 10**9) for _ in range(MAXN)], rand_queries(MAXN, MAXN, full=True))
else:  # max size, random queries
    emit([rnd.randint(0, 10**9) for _ in range(MAXN)], rand_queries(MAXN, MAXN))
