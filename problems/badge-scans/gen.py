# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(41_000 + i)
MAXN = 200_000


def emit(k, b):
    n = len(b)
    assert 1 <= k <= n <= MAXN
    assert all(1 <= x <= 10**9 for x in b)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, b))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample
    emit(2, [5, 3, 5, 5, 3, 7, 3, 3])
elif i == 2:  # sample: k = 1, all different
    emit(1, [4, 1, 2, 1, 3, 4])
elif i == 3:  # a single scan
    emit(1, [7])
elif i == 4:  # one badge, k = 1
    emit(1, [9] * 20)
elif i == 5:  # one badge, k = n: everything
    emit(25, [9] * 25)
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(1, 4), rand(n, 6))
elif i == 9:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(rnd.randint(1, 20), rand(n, 300))
elif i == 10:  # max: all different, k = 1 → answer n (slow for restarting at every start)
    b = rnd.sample(range(1, 10**9 + 1), MAXN)
    emit(1, b)
elif i == 11:  # max: few badges, large k
    emit(10_000, rand(MAXN, 5))
elif i == 12:  # max: many badges, k = 3
    emit(3, rand(MAXN, 50_000))
elif i == 13:  # max: random big ids, a repeat block in the middle
    b = rnd.sample(range(1, 10**9 + 1), MAXN)
    for j in range(90_000, 90_010):
        b[j] = 77
    emit(2, b)
elif i == 14:  # max: badges repeat in long periodic cycles
    emit(4, [j % 30_000 + 1 for j in range(MAXN)])
else:  # max random
    emit(rnd.randint(1, 50), rand(MAXN, rnd.randint(1_000, 100_000)))
