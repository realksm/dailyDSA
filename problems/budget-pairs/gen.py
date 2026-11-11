# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(31_000 + i)
MAXN = 200_000


def emit(budget, prices):
    sys.stdout.write(f"{len(prices)} {budget}\n{' '.join(map(str, prices))}\n")


if i == 1:  # sample
    emit(10, [2, 7, 5, 1, 9])
elif i == 2:  # sample: nothing fits
    emit(3, [4, 2, 8])
elif i == 3:  # a single gadget can't form a pair
    emit(10**9, [1])
elif i == 4:  # exactly on the budget counts
    emit(10, [5, 5, 5, 5])
elif i <= 7:  # small random
    n = rnd.randint(5, 40)
    emit(rnd.randint(1, 200), [rnd.randint(1, 100) for _ in range(n)])
elif i <= 9:  # medium random
    n = rnd.randint(2_000, 8_000)
    emit(rnd.randint(1, 2 * 10**9), [rnd.randint(1, 10**9) for _ in range(n)])
elif i == 10:  # max: every pair fits → answer ~2e10, needs 64-bit
    emit(2 * 10**9, [rnd.randint(1, 10**9) for _ in range(MAXN)])
elif i == 11:  # max: no pair fits
    emit(1, [rnd.randint(1, 10**9) for _ in range(MAXN)])
elif i == 12:  # max: many equal prices around half the budget
    emit(10**9, [rnd.choice([499_999_999, 500_000_000, 500_000_001]) for _ in range(MAXN)])
else:  # max random
    emit(rnd.randint(5 * 10**8, 15 * 10**8), [rnd.randint(1, 10**9) for _ in range(MAXN)])
