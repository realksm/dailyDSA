# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(52_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(k, a):
    sys.stdout.write(f"{len(a)} {k}\n{' '.join(map(str, a))}\n")


def distinct_evens(n, lo=-LIM, hi=LIM):
    # n distinct even values: every difference is even, so an odd K has no answer
    return [2 * x for x in rnd.sample(range(lo // 2, hi // 2), n)]


if i == 1:  # sample: several answers (e.g. "1 2" or "4 3")
    emit(3, [4, 7, 1, 10, 6])
elif i == 2:  # sample: none
    emit(5, [1, 2, 3])
elif i == 3:  # K = 0 with a duplicate
    emit(0, [8, 3, 5, 3])
elif i == 4:  # K = 0, all distinct → -1
    emit(0, [1, 2, 3, 4, 5])
elif i == 5:  # extreme values: difference 2e9 exceeds K's range → -1
    emit(LIM, [-LIM, LIM])
elif i == 6:  # extreme values with an answer
    emit(LIM, [0, -LIM, 7, LIM])
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(0, 30), [rnd.randint(-50, 50) for _ in range(n)])
elif i == 9:  # medium random
    n = 5_000
    emit(rnd.randint(1, 1_000), [rnd.randint(-10**6, 10**6) for _ in range(n)])
elif i <= 11:  # max, no answer (odd K, all even) — worst case for brute force
    emit(2 * rnd.randint(0, LIM // 2 - 1) + 1, distinct_evens(MAXN))
elif i == 12:  # max, K = 0, all distinct → -1
    emit(0, distinct_evens(MAXN))
elif i == 13:  # max, exactly one answer, planted far apart
    a = distinct_evens(MAXN, -LIM // 2, LIM // 2)
    k = 2 * rnd.randint(1, LIM // 4) + 1
    a[-1] = a[0] + k  # the only odd value, so the only possible pair is (1, n)
    emit(k, a)
else:  # max, K = 0 with a single duplicate at the ends
    a = distinct_evens(MAXN)
    a[-1] = a[0]
    emit(0, a)
