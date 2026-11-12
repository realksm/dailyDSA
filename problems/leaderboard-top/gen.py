# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(62_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(k, a):
    n = len(a)
    assert 1 <= k <= n <= MAXN and all(0 <= x <= LIM for x in a)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, a))}\n")


if i == 1:  # sample
    emit(3, [5, 1, 9, 3, 9, 2])
elif i == 2:  # sample: k = 1 is the best score so far
    emit(1, [4, 7, 2, 7, 10])
elif i == 3:  # one game
    emit(1, [0])
elif i == 4:  # the board holds every game
    emit(5, [3, 0, 8, 8, 1])
elif i <= 7:  # small random, many ties
    n = rnd.randint(1, 30)
    emit(rnd.randint(1, n), [rnd.randint(0, 9) for _ in range(n)])
elif i == 8:  # medium random
    emit(300, [rnd.randint(0, LIM) for _ in range(5_000)])
elif i == 9:  # max, rising scores: every game enters the board
    emit(1_000, sorted(rnd.randint(0, LIM) for _ in range(MAXN)))
elif i == 10:  # max, falling scores: no game after the first k enters
    emit(MAXN // 2, sorted((rnd.randint(0, LIM) for _ in range(MAXN)), reverse=True))
elif i == 11:  # max, every score 1e9 and k = n: totals up to 2e14
    emit(MAXN, [LIM] * MAXN)
elif i == 12:  # max random, random k
    emit(rnd.randint(1, MAXN), [rnd.randint(0, LIM) for _ in range(MAXN)])
elif i == 13:  # max random, k = 1
    emit(1, [rnd.randint(0, LIM) for _ in range(MAXN)])
else:  # max, few distinct scores, k in the middle
    emit(77_777, [rnd.randint(0, 5) * 200_000_000 for _ in range(MAXN)])
