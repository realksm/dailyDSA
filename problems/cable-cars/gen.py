# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(33_000 + i)
MAXN = 200_000


def emit(cap, w):
    assert all(1 <= x <= cap for x in w)
    sys.stdout.write(f"{len(w)} {cap}\n{' '.join(map(str, w))}\n")


if i == 1:  # sample: 50+90, 60+80, 100 → 3
    emit(140, [90, 50, 100, 60, 80])
elif i == 2:  # sample: nobody can share
    emit(100, [70, 60, 55])
elif i == 3:  # one tourist
    emit(10**9, [10**9])
elif i == 4:  # exactly on the limit, odd count
    emit(10, [5, 5, 5, 5, 5])
elif i <= 7:  # small random
    cap = rnd.randint(10, 200)
    emit(cap, [rnd.randint(1, cap) for _ in range(rnd.randint(1, 40))])
elif i == 8:  # medium random
    cap = rnd.randint(10**8, 10**9)
    emit(cap, [rnd.randint(1, cap) for _ in range(7_000)])
elif i == 9:  # max: everyone light, every pair fits
    emit(10**9, [rnd.randint(1, 5 * 10**8) for _ in range(MAXN)])
elif i == 10:  # max: everyone heavier than half, nobody shares
    emit(10**9, [rnd.randint(5 * 10**8 + 1, 10**9) for _ in range(MAXN)])
elif i == 11:  # max: a few light people, many heavy ones
    cap = 10**9
    w = [rnd.randint(1, 10**6) for _ in range(1_000)] + [rnd.randint(9 * 10**8, cap) for _ in range(MAXN - 1_000)]
    rnd.shuffle(w)
    emit(cap, w)
elif i == 12:  # max: weights around half the limit
    cap = 10**9
    emit(cap, [rnd.choice([499_999_999, 500_000_000, 500_000_001]) for _ in range(MAXN)])
else:  # max random
    cap = rnd.randint(5 * 10**8, 10**9)
    emit(cap, [rnd.randint(1, cap) for _ in range(MAXN)])
