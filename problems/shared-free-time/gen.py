# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(34_000 + i)
MAXN = 200_000
T = 10**9


def emit(a, b):
    for slots in (a, b):
        assert all(0 <= s < e <= T for s, e in slots)
        assert all(slots[k][1] <= slots[k + 1][0] for k in range(len(slots) - 1))
    out = [f"{len(a)} {len(b)}"] + [f"{s} {e}" for s, e in a] + [f"{s} {e}" for s, e in b]
    sys.stdout.write("\n".join(out) + "\n")


def slots(k, lo=0, hi=T, touch=0.0):
    """k sorted, non-overlapping slots inside [lo, hi]; with probability `touch` a slot starts
    exactly where the previous one ended."""
    pts = sorted(rnd.sample(range(lo, hi + 1), 2 * k))
    res = [[pts[2 * x], pts[2 * x + 1]] for x in range(k)]
    for x in range(1, k):
        if rnd.random() < touch:
            res[x][0] = res[x - 1][1]
    return res


if i == 1:  # sample
    emit([[0, 30], [60, 120], [200, 260]], [[20, 70], [100, 210]])
elif i == 2:  # sample: never free together (touching ends don't count)
    emit([[10, 20], [40, 50]], [[0, 10], [20, 40], [50, 90]])
elif i == 3:  # one slot each, the whole range
    emit([[0, T]], [[0, T]])
elif i == 4:  # one long slot against many short ones
    emit([[5, 95]], [[0, 10], [10, 20], [30, 31], [90, 100]])
elif i <= 7:  # small random
    emit(slots(rnd.randint(1, 20), 0, 300, 0.3), slots(rnd.randint(1, 20), 0, 300, 0.3))
elif i == 8:  # medium random
    emit(slots(5_000, touch=0.2), slots(8_000, touch=0.2))
elif i == 9:  # max: Asha in the first half of the range, Ravi in the second
    emit(slots(MAXN, 0, T // 2), slots(MAXN, T // 2, T))
elif i == 10:  # max: back-to-back slots on both sides, answer is large
    emit(slots(MAXN, touch=0.9), slots(MAXN, touch=0.9))
elif i == 11:  # max vs one slot
    emit(slots(MAXN, touch=0.3), [[rnd.randint(0, T // 4), rnd.randint(3 * T // 4, T)]])
elif i == 12:  # max: identical lists
    a = slots(MAXN, touch=0.5)
    emit(a, [s[:] for s in a])
else:  # max random
    emit(slots(MAXN, touch=0.1), slots(MAXN, touch=0.1))
