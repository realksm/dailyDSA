import sys
from itertools import accumulate
from operator import sub


def works(n: int, k: int, reading: list[int], x: int) -> bool:
    """Mark days +1 (>= x) / -1 (< x): is there a long-enough stretch with sum > 0?"""
    p = list(accumulate([1 if v >= x else -1 for v in reading], initial=0))
    lowest = list(accumulate(p, min))  # lowest[i] = min(p[0..i])
    # stretch (l, r] with r - l >= k: compare p[r] with lowest[r - k]
    return max(map(sub, p[k:], lowest)) > 0


def solve(n: int, k: int, reading: list[int]) -> int:
    # If some stretch has median >= x, it also has median >= anything smaller:
    # binary search the largest x among the readings.
    vals = sorted(set(reading))
    lo, hi = 0, len(vals) - 1  # vals[0] always works
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if works(n, k, reading, vals[mid]):
            lo = mid
        else:
            hi = mid - 1
    return vals[lo]


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    reading = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, reading)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
