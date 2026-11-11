# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(46_000 + i)
MAXN = 200_000


def emit(w):
    n = len(w)
    assert 2 <= n <= MAXN
    assert all(1 <= x <= 10**9 for x in w)
    sys.stdout.write(f"{n}\n{' '.join(map(str, w))}\n")


def rand(n, hi):
    return [rnd.randint(1, hi) for _ in range(n)]


if i == 1:  # sample
    emit([3, 1, 4, 1, 5])
elif i == 2:  # sample: two equal crates
    emit([7, 7])
elif i == 3:  # two very different crates
    emit([1, 10**9])
elif i == 4:  # one huge crate at the front
    emit([10**9] + [1] * 30)
elif i <= 7:  # small random
    emit(rand(rnd.randint(3, 40), 50))
elif i == 8:  # medium random
    emit(rand(rnd.randint(3_000, 8_000), 10**9))
elif i == 9:  # max: all equal, even n → 0
    emit([10**9] * MAXN)
elif i == 10:  # max: all equal, odd n
    emit([10**9] * (MAXN - 1))
elif i == 11:  # max: increasing
    emit([j * 5000 + 1 for j in range(MAXN)])
elif i == 12:  # max: huge last crate
    emit(rand(MAXN - 1, 1000) + [10**9])
else:  # max random
    emit(rand(MAXN, 10**9))
