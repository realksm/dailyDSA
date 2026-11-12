# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(61_000 + i)
MAXN = 100_000
MAXD = 200_000


def emit(strides, s):
    n, m = len(s), len(strides)
    assert 1 <= n <= MAXN and 1 <= m <= 10 and len(set(strides)) == m
    assert all(1 <= d <= MAXD for d in strides) and set(s) <= {"o", "~"}
    sys.stdout.write(f"{n} {m}\n{' '.join(map(str, strides))}\n{s}\n")


def river(n, p_stone):
    return "".join("o" if rnd.random() < p_stone else "~" for _ in range(n))


if i == 1:  # sample: the example from the statement
    emit([1, 2], "o~oo")
elif i == 2:  # sample: every first jump ends in water or leads nowhere
    emit([2, 3], "~o~~~")
elif i == 3:  # one stone
    emit([1], "o")
elif i == 4:  # one spot of water, a stride that clears it
    emit([1, 2], "~")
elif i <= 8:  # small random
    n = rnd.randint(1, 20)
    emit(rnd.sample(range(1, 7), rnd.randint(1, 4)), river(n, 0.7))
elif i == 9:  # medium random
    emit(rnd.sample(range(1, 30), 6), river(2_000, 0.75))
elif i == 10:  # max, all stones, strides 1 and 2 (Fibonacci-sized count)
    emit([2, 1], "o" * MAXN)
elif i == 11:  # max, all stones, strides 1..10
    emit(list(range(10, 0, -1)), "o" * MAXN)
elif i == 12:  # max random, short strides
    emit(rnd.sample(range(1, 51), 10), river(MAXN, 0.8))
elif i == 13:  # max, water runs of up to 15 spots, some strides long enough
    s = []
    while len(s) < MAXN:
        s += ["o"] * rnd.randint(1, 30) + ["~"] * rnd.randint(1, 15)
    emit(rnd.sample(range(1, 21), 10), "".join(s[:MAXN]))
else:  # max: mostly water, a few strides, some longer than the river
    emit([7, 13, 150_000, MAXD], river(MAXN, 0.3))
