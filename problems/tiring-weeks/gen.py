# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(50_000 + i)
MAXN = 200_000


def emit(limit, h):
    n = len(h)
    assert 1 <= n <= MAXN and 0 <= limit <= 24
    assert all(0 <= x <= 24 for x in h)
    sys.stdout.write(f"{n} {limit}\n{' '.join(map(str, h))}\n")


def days(n, p_heavy, limit=8):
    # heavy with probability p_heavy
    return [rnd.randint(limit + 1, 24) if rnd.random() < p_heavy else rnd.randint(0, limit) for _ in range(n)]


if i == 1:  # sample
    emit(8, [9, 9, 6, 0, 6, 6, 9])
elif i == 2:  # sample: no heavy day
    emit(8, [8, 7, 8])
elif i == 3:  # a single heavy day
    emit(8, [12])
elif i == 4:  # a single light day
    emit(8, [3])
elif i == 5:  # all heavy
    emit(0, [rnd.randint(1, 24) for _ in range(40)])
elif i == 6:  # L = 24: nothing is heavy
    emit(24, [rnd.randint(0, 24) for _ in range(40)])
elif i <= 9:  # small random
    emit(8, days(rnd.randint(5, 40), rnd.random()))
elif i == 10:  # medium random, balanced
    emit(8, days(rnd.randint(3_000, 8_000), 0.5))
elif i == 11:  # max: balanced, long answers
    emit(8, days(MAXN, 0.5))
elif i == 12:  # max: mostly light, the answer is short
    emit(8, days(MAXN, 0.3))
elif i == 13:  # max: alternating light/heavy then a heavy block at the end
    emit(8, [0 if j % 2 == 0 else 12 for j in range(MAXN - 1000)] + [12] * 1000)
elif i == 14:  # max: light first half, heavy second half, slightly fewer heavy
    half = MAXN // 2
    emit(8, [2] * (half + 10) + [20] * (half - 10))
else:  # max: mostly heavy
    emit(8, days(MAXN, 0.55))
