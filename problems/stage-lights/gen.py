# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(47_000 + i)
MAXN = 200_000
V = 10**9


def emit(n, cmds):
    q = len(cmds)
    assert 1 <= n <= MAXN and 1 <= q <= MAXN
    assert all(1 <= l <= r <= n and -V <= v <= V for l, r, v in cmds)
    sys.stdout.write(f"{n} {q}\n" + "".join(f"{l} {r} {v}\n" for l, r, v in cmds))


def rand_cmd(n, vlo, vhi, maxlen=None):
    l = rnd.randint(1, n)
    r = rnd.randint(l, n if maxlen is None else min(n, l + maxlen))
    return (l, r, rnd.randint(vlo, vhi))


if i == 1:  # sample
    emit(5, [(1, 3, 2), (2, 5, 1), (4, 4, -3)])
elif i == 2:  # sample: one lamp
    emit(1, [(1, 1, 5), (1, 1, -2)])
elif i == 3:  # commands that cancel out
    emit(10, [(2, 8, 7), (2, 8, -7), (1, 10, 0)])
elif i <= 6:  # small random
    n = rnd.randint(5, 30)
    emit(n, [rand_cmd(n, -10, 10) for _ in range(rnd.randint(1, 30))])
elif i == 7:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(n, [rand_cmd(n, -V, V) for _ in range(rnd.randint(3_000, 8_000))])
elif i == 8:  # max: every command covers everything (slow for touching each lamp)
    emit(MAXN, [(1, MAXN, rnd.randint(-V, V)) for _ in range(MAXN)])
elif i == 9:  # max: all +1e9 on the whole row → 2e14 everywhere
    emit(MAXN, [(1, MAXN, V)] * MAXN)
elif i == 10:  # max: long ranges, positive
    emit(MAXN, [rand_cmd(MAXN, 1, V) for _ in range(MAXN)])
elif i == 11:  # max: short ranges
    emit(MAXN, [rand_cmd(MAXN, -V, V, maxlen=10) for _ in range(MAXN)])
elif i == 12:  # max: ranges touching the ends
    cmds = []
    for _ in range(MAXN):
        if rnd.random() < 0.5:
            cmds.append((1, rnd.randint(1, MAXN), rnd.randint(-V, V)))
        else:
            cmds.append((rnd.randint(1, MAXN), MAXN, rnd.randint(-V, V)))
    emit(MAXN, cmds)
else:  # max random
    emit(MAXN, [rand_cmd(MAXN, -V, V) for _ in range(MAXN)])
