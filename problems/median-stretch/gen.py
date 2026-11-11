# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(58_000 + i)
MAXN = 200_000
V = 10**9


def emit(k, r):
    n = len(r)
    assert 1 <= k <= n <= MAXN
    assert all(1 <= x <= V for x in r)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, r))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample: [2 5 4] has median 4; the 5 alone is too short
    emit(3, [1, 3, 2, 5, 4])
elif i == 2:  # sample: the longer stretch [7 3 9] beats every pair
    emit(2, [1, 7, 3, 9])
elif i == 3:  # one day
    emit(1, [V])
elif i == 4:  # k = n: the median of everything
    emit(9, rand(9, 100))
elif i <= 7:  # small random
    n = rnd.randint(2, 40)
    emit(rnd.randint(1, n), rand(n, rnd.choice([5, 100])))
elif i == 8:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(rnd.randint(1, n), rand(n, V))
elif i == 9:  # max: k = n, all random (the naive tries one start only, so it is fast)
    emit(MAXN, rand(MAXN, V))
elif i == 10:  # max: small k, few distinct values
    emit(rnd.randint(2, 50), rand(MAXN, 10))
elif i == 11:  # max: k = n / 2
    emit(MAXN // 2, rand(MAXN, V))
elif i == 12:  # max: a high plateau hidden in a low sea, k just longer than the plateau
    r = rand(MAXN, 1000)
    start = rnd.randint(0, MAXN - 3000)
    for j in range(start, start + 2000):
        r[j] = rnd.randint(V // 2, V)
    emit(3001, r)
elif i == 13:  # max: increasing readings
    emit(rnd.randint(1, MAXN), sorted(rand(MAXN, V)))
else:  # max random
    emit(rnd.randint(1, 1000), rand(MAXN, V))
