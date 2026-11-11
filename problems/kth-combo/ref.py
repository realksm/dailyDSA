import sys
from bisect import bisect_right
from itertools import repeat
from operator import sub


def solve(n: int, m: int, k: int, mains: list[int], drinks: list[int]) -> int:
    # The number of combos costing <= X grows with X: binary search the smallest X
    # with at least k of them. Count per main how many drinks cost <= X - main
    # (bisect does the same job as the moving drinks pointer, but runs in C).
    mains.sort()
    drinks.sort()
    if n > m:  # loop over the shorter list
        n, m, mains, drinks = m, n, drinks, mains
    lo, hi = mains[0] + drinks[0], mains[-1] + drinks[-1]
    while lo < hi:
        mid = (lo + hi) // 2
        cnt = sum(map(bisect_right, repeat(drinks), map(sub, repeat(mid), mains)))
        if cnt >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    k = int(next(_it))
    mains = [int(next(_it)) for _ in range(n)]
    drinks = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(n, m, k, mains, drinks)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
