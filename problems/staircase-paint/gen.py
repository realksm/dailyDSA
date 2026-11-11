# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(51_000 + i)
MAXN = 200_000
V = 10**4


def emit(n, ops):
    q = len(ops)
    assert 1 <= n <= MAXN and 1 <= q <= MAXN
    assert all(1 <= l <= r <= n and 1 <= v <= V for l, r, v in ops)
    sys.stdout.write(f"{n} {q}\n" + "".join(f"{l} {r} {v}\n" for l, r, v in ops))


def rand_op(n, vhi, maxlen=None):
    l = rnd.randint(1, n)
    r = rnd.randint(l, n if maxlen is None else min(n, l + maxlen))
    return (l, r, rnd.randint(1, vhi))


if i == 1:  # sample
    emit(6, [(2, 4, 1), (1, 6, 2)])
elif i == 2:  # sample: one column
    emit(1, [(1, 1, 4), (1, 1, 1)])
elif i == 3:  # steps of length 1
    emit(10, [(j, j, j) for j in range(1, 11)])
elif i <= 6:  # small random
    n = rnd.randint(5, 30)
    emit(n, [rand_op(n, 10) for _ in range(rnd.randint(1, 30))])
elif i == 7:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(n, [rand_op(n, V) for _ in range(rnd.randint(3_000, 8_000))])
elif i == 8:  # max: every step covers the whole wall with v = 1e4 → heights up to 4e14
    emit(MAXN, [(1, MAXN, V)] * MAXN)
elif i == 9:  # max: long steps (slow for adding tile by tile)
    emit(MAXN, [rand_op(MAXN, V) for _ in range(MAXN)])
elif i == 10:  # max: short steps
    emit(MAXN, [rand_op(MAXN, V, maxlen=5) for _ in range(MAXN)])
elif i == 11:  # max: steps ending at the last column
    emit(MAXN, [(rnd.randint(1, MAXN), MAXN, rnd.randint(1, V)) for _ in range(MAXN)])
elif i == 12:  # max: steps starting at the first column
    emit(MAXN, [(1, rnd.randint(1, MAXN), rnd.randint(1, V)) for _ in range(MAXN)])
else:  # max random
    emit(MAXN, [rand_op(MAXN, V) for _ in range(MAXN)])
