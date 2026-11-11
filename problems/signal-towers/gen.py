# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(38_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(h):
    assert 1 <= len(h) <= MAXN and all(1 <= x <= LIM for x in h)
    sys.stdout.write(f"{len(h)}\n{' '.join(map(str, h))}\n")


if i == 1:  # sample
    emit([30, 20, 25, 40, 35, 50])
elif i == 2:  # sample: equal heights don't count
    emit([7, 7, 3, 7])
elif i == 3:  # one tower
    emit([LIM])
elif i == 4:  # increasing
    emit([1, 2, 3, 4, 5])
elif i <= 7:  # small random, many ties
    emit([rnd.randint(1, 6) for _ in range(rnd.randint(1, 30))])
elif i == 8:  # medium random
    emit([rnd.randint(1, LIM) for _ in range(5_000)])
elif i == 9:  # max: strictly decreasing → all 0
    emit(list(range(LIM, LIM - MAXN, -1)))
elif i == 10:  # max: decreasing, then one giant at the very end
    emit(list(range(LIM - 1, LIM - MAXN, -1)) + [LIM])
elif i == 11:  # max: all equal → all 0
    emit([42] * MAXN)
elif i == 12:  # max: saw-tooth — decreasing runs of 1000
    emit([LIM - (k % 1000) * 1000 - rnd.randint(0, 999) for k in range(MAXN)])
else:  # max random
    emit([rnd.randint(1, LIM) for _ in range(MAXN)])
