# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(42_000 + i)
MAXN = 200_000


def emit(kinds, s):
    n = len(s)
    assert 1 <= kinds <= n <= MAXN
    assert all(1 <= x <= kinds for x in s)
    assert len(set(s)) == kinds
    sys.stdout.write(f"{n} {kinds}\n{' '.join(map(str, s))}\n")


def with_all(n, kinds, pick):
    # every kind once at random places, the rest from pick()
    s = [pick() for _ in range(n)]
    for kind, pos in zip(range(1, kinds + 1), rnd.sample(range(n), kinds)):
        s[pos] = kind
    return s


if i == 1:  # sample
    emit(3, [1, 3, 1, 1, 2, 3, 1, 2, 2])
elif i == 2:  # sample: one kind
    emit(1, [1, 1, 1, 1])
elif i == 3:  # a single stall
    emit(1, [1])
elif i == 4:  # every kind exactly once: the whole road
    s = list(range(1, 31))
    rnd.shuffle(s)
    emit(30, s)
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    kinds = rnd.randint(1, min(n, 6))
    emit(kinds, with_all(n, kinds, lambda: rnd.randint(1, kinds)))
elif i == 9:  # medium random
    n = rnd.randint(3_000, 8_000)
    kinds = rnd.randint(10, 200)
    emit(kinds, with_all(n, kinds, lambda: rnd.randint(1, kinds)))
elif i == 10:  # max: every kind once → answer n; slow for restarting at every start
    s = list(range(1, MAXN + 1))
    rnd.shuffle(s)
    emit(MAXN, s)
elif i == 11:  # max: many kinds, each about twice
    kinds = MAXN // 2
    s = list(range(1, kinds + 1)) * 2
    rnd.shuffle(s)
    emit(kinds, s)
elif i == 12:  # max: one rare kind at both ends, the answer spans almost everything
    kinds = 1000
    s = [rnd.randint(2, kinds) for _ in range(MAXN)]
    s[3] = 1
    s[-4] = 1
    emit(kinds, s)
elif i == 13:  # max: few kinds, short answer
    emit(5, with_all(MAXN, 5, lambda: rnd.randint(1, 5)))
elif i == 14:  # max: blocks of the same kind
    kinds = 400
    s = []
    while len(s) < MAXN:
        s += [rnd.randint(1, kinds)] * rnd.randint(1, 600)
    s = s[:MAXN]
    for kind, pos in zip(range(1, kinds + 1), rnd.sample(range(MAXN), kinds)):
        s[pos] = kind
    emit(kinds, s)
else:  # max random
    kinds = rnd.randint(100, 20_000)
    emit(kinds, with_all(MAXN, kinds, lambda: rnd.randint(1, kinds)))
