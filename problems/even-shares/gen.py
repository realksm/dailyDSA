# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(48_000 + i)
MAXN = 200_000
V = 10**9


def emit(m, c):
    n = len(c)
    assert 1 <= n <= MAXN and 1 <= m <= 10**9
    assert all(-V <= x <= V for x in c)
    sys.stdout.write(f"{n} {m}\n{' '.join(map(str, c))}\n")


def rand(n, lo, hi):
    return [rnd.randint(lo, hi) for _ in range(n)]


if i == 1:  # sample
    emit(3, [2, -1, 4, 3, -2])
elif i == 2:  # sample: m = 1, every stretch
    emit(1, [5, -7, 2])
elif i == 3:  # a single day, divisible
    emit(4, [-8])
elif i == 4:  # a single day, not divisible
    emit(4, [-7])
elif i == 5:  # all zeros: every stretch
    emit(10**9, [0] * 50)
elif i <= 8:  # small random, negatives
    n = rnd.randint(5, 40)
    emit(rnd.randint(1, 7), rand(n, -10, 10))
elif i == 9:  # medium random
    emit(rnd.randint(2, 1000), rand(rnd.randint(3_000, 8_000), -V, V))
elif i == 10:  # max: m = 1, answer n(n+1)/2 (slow for trying every stretch)
    emit(1, rand(MAXN, -V, V))
elif i == 11:  # max: m = 2, half the stretches
    emit(2, rand(MAXN, -V, V))
elif i == 12:  # max: big m, almost nothing
    emit(999_999_937, rand(MAXN, -V, V))
elif i == 13:  # max: all negative, small m
    emit(7, rand(MAXN, -V, -1))
elif i == 14:  # max: multiples of m with noise
    m = 1000
    emit(m, [rnd.randint(-10**6, 10**6) * m + (1 if rnd.random() < 0.01 else 0) for _ in range(MAXN)])
else:  # max random
    emit(rnd.randint(2, 10**5), rand(MAXN, -V, V))
