# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(40_000 + i)
MAXN = 200_000


def emit(tank, f):
    n = len(f)
    assert 1 <= n <= MAXN and 1 <= tank <= 10**15
    assert all(1 <= x <= 10**9 for x in f)
    sys.stdout.write(f"{n} {tank}\n{' '.join(map(str, f))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample
    emit(6, [3, 1, 2, 7, 1, 1, 2, 1])
elif i == 2:  # sample: no single leg fits
    emit(4, [5, 9, 6])
elif i == 3:  # one leg that fits exactly
    emit(10, [10])
elif i == 4:  # one leg that doesn't fit
    emit(9, [10])
elif i == 5:  # everything fits
    emit(10**15, rand(30, 100))
elif i <= 8:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(1, 300), rand(n, 60))
elif i == 9:  # medium random
    emit(rnd.randint(10**10, 10**11), rand(rnd.randint(3_000, 8_000), 10**9))
elif i == 10:  # max: the whole route fits (answer n), slowest for trying every start
    f = rand(MAXN, 10**9)
    emit(sum(f), f)
elif i == 11:  # max: all but one leg fits
    f = rand(MAXN, 10**9)
    emit(sum(f) - min(f[0], f[-1]), f)
elif i == 12:  # max: answer about half the route
    f = rand(MAXN, 10**9)
    emit(sum(f) // 2, f)
elif i == 13:  # max: mostly cheap legs with rare huge ones that never fit
    f = [10**9 if rnd.random() < 0.001 else rnd.randint(1, 1000) for _ in range(MAXN)]
    emit(10**9 - 1, f)
else:  # max random tank
    emit(rnd.randint(10**9, 10**13), rand(MAXN, 10**9))
