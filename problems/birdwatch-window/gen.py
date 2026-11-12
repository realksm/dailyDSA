# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(64_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(k, b):
    n = len(b)
    assert 1 <= k <= n <= MAXN and all(1 <= x <= LIM for x in b)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, b))}\n")


if i == 1:  # sample
    emit(4, [3, 7, 3, 3, 8, 7, 1, 8])
elif i == 2:  # sample: one species only
    emit(3, [5, 5, 5, 5])
elif i == 3:  # one sighting
    emit(1, [LIM])
elif i == 4:  # the stretch is the whole log
    emit(6, [4, 1, 4, 2, 1, 9])
elif i <= 7:  # small random, few species
    n = rnd.randint(1, 30)
    emit(rnd.randint(1, n), [rnd.randint(1, 6) for _ in range(n)])
elif i == 8:  # medium random
    emit(700, [rnd.randint(1, 1_500) for _ in range(5_000)])
elif i == 9:  # max, every sighting a new species
    emit(MAXN // 2, rnd.sample(range(1, LIM + 1), MAXN))
elif i == 10:  # max, one species
    emit(MAXN // 2, [123_456_789] * MAXN)
elif i == 11:  # max, 1000 species, long stretch
    emit(50_000, [rnd.randint(1, 1_000) for _ in range(MAXN)])
elif i == 12:  # max random, random k
    emit(rnd.randint(1, MAXN), [rnd.randint(1, LIM) for _ in range(MAXN)])
elif i == 13:  # max, species ids far apart; the log gets more varied towards the end
    ids = rnd.sample(range(1, LIM + 1), 60_000)
    b = [ids[rnd.randint(0, min(len(ids) - 1, 10 + j // 4))] for j in range(MAXN)]
    emit(80_000, b)
else:  # max, a repeating cycle of 99_999 species with a few strays, k = 100_000
    ids = rnd.sample(range(1, LIM + 1), 100_000)
    b = [ids[j % 99_999] if rnd.random() > 0.001 else ids[99_999] for j in range(MAXN)]
    emit(100_000, b)
