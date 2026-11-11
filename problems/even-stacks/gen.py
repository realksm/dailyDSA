# python3 gen.py <i>  → prints test i. Deterministic: the RNG is seeded from i.
import random
import sys

i = int(sys.argv[1])
rnd = random.Random(35_000 + i)
MAXN = 200_000
LIM = 10**9


def emit(a):
    assert 1 <= len(a) <= MAXN and all(1 <= x <= LIM for x in a)
    sys.stdout.write(f"{len(a)}\n{' '.join(map(str, a))}\n")


def split(total, parts):
    """total split into `parts` positive pieces, each <= LIM (total <= parts * LIM)."""
    assert parts <= total <= parts * LIM
    res = [1] * parts
    left = total - parts
    while left:
        k = rnd.randrange(parts)
        add = min(left, LIM - res[k], rnd.randint(1, max(1, left // parts * 2)))
        res[k] += add
        left -= add
    return res


def balanced_then_split(segments, max_seg, pieces):
    """A balanced row of `segments` stack weights, each stack then split back into up to
    `pieces` smaller stacks. Answer <= n - segments."""
    half = [rnd.randint(1, max_seg) for _ in range(segments // 2)]
    mid = [rnd.randint(1, max_seg)] if segments % 2 else []
    row = half + mid + half[::-1]
    out = []
    for w in row:
        lo = -(-w // LIM)  # fewest pieces that can each stay <= LIM
        k = rnd.randint(lo, max(lo, min(pieces, w)))
        out += split(w, k)
    return out


if i == 1:  # sample: 1+4, 2+3, 5 → 5 5 5, two merges
    emit([1, 4, 2, 3, 5])
elif i == 2:  # sample: has to become one stack
    emit([2, 7, 1, 4])
elif i == 3:  # one stack
    emit([LIM])
elif i == 4:  # already balanced
    emit([3, 1, 4, 1, 3])
elif i == 5:  # two different stacks → one merge
    emit([LIM, LIM - 1])
elif i <= 8:  # small random
    emit([rnd.randint(1, 4) for _ in range(rnd.randint(1, 30))])
elif i == 9:  # medium: built balanced, then split
    emit(balanced_then_split(2_001, 10**6, 4))
elif i == 10:  # max: all equal, nothing to do
    emit([7] * MAXN)
elif i == 11:  # max: powers-of-two-like weights, no balanced cut → n - 1 merges
    emit([1] + [rnd.randint(LIM // 2, LIM) for _ in range(MAXN - 2)] + [LIM // 3])
elif i == 12:  # max: tiny weights, lots of matching cuts
    emit([rnd.randint(1, 3) for _ in range(MAXN)])
elif i == 13:  # max: built balanced from ~60k stacks, then split
    a = balanced_then_split(60_001, 10**9, 3)
    emit(a[:MAXN] if len(a) > MAXN else a)
elif i == 14:  # max: built balanced from 2 huge halves (answer large but not n - 1)
    a = balanced_then_split(2, 10**14, 100_000)
    emit(a)
else:  # max random
    emit([rnd.randint(1, LIM) for _ in range(MAXN)])
