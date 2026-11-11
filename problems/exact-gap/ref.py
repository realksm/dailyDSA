import sys


def solve(n: int, k: int, a: list[int]) -> None:
    # Sort the positions by value, then walk two pointers over that order. lo trails hi:
    # moving hi up makes the gap a[hi] - a[lo] bigger, moving lo up makes it smaller.
    idx = sorted(range(n), key=a.__getitem__)
    lo = hi = 0
    while hi < n:
        if lo == hi:  # i and j must be different positions
            hi += 1
            continue
        gap = a[idx[hi]] - a[idx[lo]]
        if gap == k:
            print(idx[lo] + 1, idx[hi] + 1)
            return
        if gap < k:  # too small: widen
            hi += 1
        else:  # too big: narrow
            lo += 1
    print(-1)


def main():
    _it = iter(sys.stdin.buffer.read().split())
    n = int(next(_it))
    k = int(next(_it))
    a = [int(next(_it)) for _ in range(n)]
    solve(n, k, a)


main()
