# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(32_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(a, b):
    sys.stdout.write(f"{len(a)} {len(b)}\n{' '.join(map(str, a))}\n{' '.join(map(str, b))}\n")


def rand_list(k, lo=-LIM, hi=LIM):
    return [rnd.randint(lo, hi) for _ in range(k)]


if i == 1:  # sample
    emit([14, -3, 25, 8], [30, 11, 19])
elif i == 2:  # sample: a shared value gives 0
    emit([5, 1, 9], [7, 9])
elif i == 3:  # one reading each, as far apart as possible
    emit([-LIM], [LIM])
elif i == 4:  # all of A below all of B
    emit([-5, -9, -1, -7], [3, 10, 4])
elif i <= 7:  # small random
    emit(rand_list(rnd.randint(1, 30), -100, 100), rand_list(rnd.randint(1, 30), -100, 100))
elif i == 8:  # medium random
    emit(rand_list(5_000), rand_list(7_000))
elif i == 9:  # max: A all negative, B all positive — answer is min(B) - max(A)
    emit(rand_list(MAXN, -LIM, -1), rand_list(MAXN, 1, LIM))
elif i == 10:  # max: even numbers vs odd numbers, answer 1
    emit([2 * rnd.randint(-LIM // 2, LIM // 2 - 1) for _ in range(MAXN)],
         [2 * rnd.randint(-LIM // 2, LIM // 2 - 1) + 1 for _ in range(MAXN)])
elif i == 11:  # max: very unequal sizes
    emit(rand_list(MAXN), rand_list(3))
elif i == 12:  # max: multiples of 1000 vs values that miss them by 300..700
    emit([1000 * rnd.randint(-10**5, 10**5) for _ in range(MAXN)],
         [1000 * rnd.randint(-10**5, 10**5) + rnd.randint(300, 700) for _ in range(MAXN)])
else:  # max random
    emit(rand_list(MAXN), rand_list(MAXN))
