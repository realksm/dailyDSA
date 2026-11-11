# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(39_000 + i)
MAXN = 200_000


def emit(k, a):
    n = len(a)
    assert 1 <= k <= n <= MAXN
    assert all(0 <= x <= 10**9 for x in a)
    sys.stdout.write(f"{n} {k}\n{' '.join(map(str, a))}\n")


if i == 1:  # sample
    emit(3, [4, 9, 2, 1, 6, 8, 3])
elif i == 2:  # sample: the session is the whole log
    emit(4, [5, 1, 2, 3])
elif i == 3:  # a single reading
    emit(1, [rnd.randint(0, 10**9)])
elif i == 4:  # k = 1: the quietest single minute
    emit(1, [rnd.randint(0, 1000) for _ in range(50)])
elif i == 5:  # all equal
    emit(7, [42] * 30)
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(1, n), [rnd.randint(0, 100) for _ in range(n)])
elif i == 9:  # medium random
    n = rnd.randint(3_000, 8_000)
    emit(rnd.randint(1, n), [rnd.randint(0, 10**9) for _ in range(n)])
elif i == 10:  # max, k = n / 2: the slowest case for trying every block
    emit(MAXN // 2, [rnd.randint(0, 10**9) for _ in range(MAXN)])
elif i == 11:  # max, huge values: answer ~1e14
    emit(100_000, [rnd.randint(10**9 - 1000, 10**9) for _ in range(MAXN)])
elif i == 12:  # max, k = n
    emit(MAXN, [rnd.randint(0, 10**9) for _ in range(MAXN)])
elif i == 13:  # max, decreasing: the best block is at the very end
    emit(MAXN // 3, [10**9 - 4 * j for j in range(MAXN)])
else:  # max random k
    emit(rnd.randint(1_000, MAXN), [rnd.randint(0, 10**9) for _ in range(MAXN)])
