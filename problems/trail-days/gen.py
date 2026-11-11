# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(37_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(d, a):
    assert 1 <= d <= len(a) <= MAXN and all(1 <= x <= LIM for x in a)
    sys.stdout.write(f"{len(a)} {d}\n{' '.join(map(str, a))}\n")


if i == 1:  # sample: 7+2 | 5+4 | 8 → 9
    emit(3, [7, 2, 5, 4, 8])
elif i == 2:  # sample: one day for everything
    emit(1, [3, 1, 4])
elif i == 3:  # one stretch
    emit(1, [LIM])
elif i == 4:  # as many days as stretches → the longest stretch
    emit(6, [4, 9, 1, 9, 2, 6])
elif i <= 7:  # small random
    n = rnd.randint(1, 30)
    emit(rnd.randint(1, n), [rnd.randint(1, 50) for _ in range(n)])
elif i == 8:  # medium random
    emit(rnd.randint(1, 50), [rnd.randint(1, LIM) for _ in range(5_000)])
elif i == 9:  # max: one day, answer = the whole sum ~1e14
    emit(1, [rnd.randint(LIM // 2, LIM) for _ in range(MAXN)])
elif i == 10:  # max: two days
    emit(2, [rnd.randint(1, LIM) for _ in range(MAXN)])
elif i == 11:  # max: few days, all stretches equal
    emit(7, [LIM] * MAXN)
elif i == 12:  # max: one huge stretch among tiny ones, many days → that stretch
    a = [rnd.randint(1, 10) for _ in range(MAXN)]
    a[rnd.randrange(MAXN)] = LIM
    emit(1_000, a)
else:  # max random
    emit(rnd.randint(2, 500), [rnd.randint(1, LIM) for _ in range(MAXN)])
