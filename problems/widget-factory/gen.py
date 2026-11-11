# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(56_000 + i)
MAXN = 200_000
V = 10**9


def emit(goal, s):
    m = len(s)
    assert 1 <= m <= MAXN and 1 <= goal <= V
    assert all(1 <= x <= V for x in s)
    sys.stdout.write(f"{m} {goal}\n{' '.join(map(str, s))}\n")


def rand(m, hi):
    return [rnd.randint(1, hi) for _ in range(m)]


if i == 1:  # sample
    emit(10, [2, 3, 7])
elif i == 2:  # sample: one machine
    emit(5, [4])
elif i == 3:  # one slow machine, a huge order → 1e18
    emit(V, [V])
elif i == 4:  # one widget
    emit(1, rand(30, 100))
elif i <= 7:  # small random
    emit(rnd.randint(1, 100), rand(rnd.randint(1, 30), 20))
elif i == 8:  # medium random
    emit(rnd.randint(10**5, 10**6), rand(rnd.randint(3_000, 8_000), 10**6))
elif i == 9:  # max: many 1-second machines and a huge order (overflow trap in the check)
    emit(V, [1] * (MAXN - 1) + [V])
elif i == 10:  # max: slow machines, huge order (slow to simulate widget by widget)
    emit(V, rand(MAXN, V))
elif i == 11:  # max: all equal
    emit(V - 7, [12345] * MAXN)
elif i == 12:  # max: one fast machine among slow ones
    emit(V, [1] + rand(MAXN - 1, V)[1:] + [V])
elif i == 13:  # max: small order
    emit(1000, rand(MAXN, V))
else:  # max random
    emit(rnd.randint(10**8, V), rand(MAXN, rnd.randint(10**3, V)))
