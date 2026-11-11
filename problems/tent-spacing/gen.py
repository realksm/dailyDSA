# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(55_000 + i)
MAXN = 200_000
V = 10**9


def emit(k, x):
    n = len(x)
    assert 2 <= k <= n <= MAXN
    assert all(0 <= v <= V for v in x) and len(set(x)) == n
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, x))}\n")


def spots(n, hi=V):
    return rnd.sample(range(0, hi + 1), n)


if i == 1:  # sample
    emit(3, [1, 2, 8, 4, 9])
elif i == 2:  # sample: every spot gets a tent
    emit(3, [10, 1, 5])
elif i == 3:  # two spots at the ends of the bank
    emit(2, [V, 0])
elif i == 4:  # evenly spaced
    x = [j * 7 for j in range(50)]
    rnd.shuffle(x)
    emit(9, x)
elif i <= 7:  # small random
    n = rnd.randint(3, 40)
    emit(rnd.randint(2, n), spots(n, 200))
elif i == 8:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(rnd.randint(2, n), spots(n))
elif i == 9:  # max: k = 2 → the two ends, answer ~1e9 (slow for trying D = 1, 2, ...)
    emit(2, spots(MAXN))
elif i == 10:  # max: k = 3
    emit(3, spots(MAXN))
elif i == 11:  # max: k = n → the smallest gap
    emit(MAXN, spots(MAXN))
elif i == 12:  # max: clustered spots plus two far away
    x = rnd.sample(range(400_000_000, 400_500_000), MAXN - 2) + [0, V]
    rnd.shuffle(x)
    emit(1000, x)
elif i == 13:  # max: consecutive integers
    x = list(range(5, MAXN + 5))
    rnd.shuffle(x)
    emit(777, x)
else:  # max random k
    emit(rnd.randint(2, 5000), spots(MAXN))
