# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(36_000 + i)
MAXN = 200_000
T = 10**12


def emit(a, b, c):
    for x in (a, b, c):
        assert 1 <= len(x) <= MAXN and all(0 <= t <= T for t in x)
    lines = [f"{len(a)} {len(b)} {len(c)}"] + [" ".join(map(str, x)) for x in (a, b, c)]
    sys.stdout.write("\n".join(lines) + "\n")


def rand_list(k, lo=0, hi=T):
    return [rnd.randint(lo, hi) for _ in range(k)]


if i == 1:  # sample: 15, 18, 21 → 6
    emit([30, 2, 15], [18, 40, 7], [21, 50, 1])
elif i == 2:  # sample: all three meet at minute 9
    emit([9, 4], [12, 9, 3], [9])
elif i == 3:  # one train each, far apart
    emit([0], [T], [T // 2])
elif i == 4:  # every list is the same single minute
    emit([5, 5], [5], [5, 5, 5])
elif i <= 7:  # small random
    emit(*(rand_list(rnd.randint(1, 15), 0, 100) for _ in range(3)))
elif i == 8:  # medium random
    emit(rand_list(300), rand_list(400), rand_list(500))
elif i == 9:  # max: three separate ranges; best = last of A .. first of C around B
    emit(rand_list(MAXN, 0, T // 3), rand_list(MAXN, T // 3, 2 * T // 3), rand_list(MAXN, 2 * T // 3, T))
elif i == 10:  # max: residues mod 3 never meet, answer small but > 0
    emit([3 * x for x in rand_list(MAXN, 0, T // 3 - 1)],
         [3 * x + 1 for x in rand_list(MAXN, 0, T // 3 - 1)],
         [3 * x + 2 for x in rand_list(MAXN, 0, T // 3 - 1)])
elif i == 11:  # max: one list has a single train
    emit(rand_list(MAXN), [rnd.randint(0, T)], rand_list(MAXN))
elif i == 12:  # max: a single exact meeting point hidden among spread-out times
    meet = rnd.randint(0, T)
    a, b, c = (rand_list(MAXN) for _ in range(3))
    a[rnd.randrange(MAXN)] = meet
    b[rnd.randrange(MAXN)] = meet
    c[rnd.randrange(MAXN)] = meet
    emit(a, b, c)
elif i == 13:  # max: lines interleave in long runs (AAAA…BBBB…CCCC… repeated)
    a, b, c = [], [], []
    t = 0
    while len(a) < MAXN:
        for lst in (a, b, c):
            for _ in range(rnd.randint(100, 2_000)):
                t += rnd.randint(1, 1_000)
                if len(lst) < MAXN:
                    lst.append(t)
    rnd.shuffle(a), rnd.shuffle(b), rnd.shuffle(c)
    emit(a, b, c)
else:  # max random
    emit(rand_list(MAXN), rand_list(MAXN), rand_list(MAXN))
