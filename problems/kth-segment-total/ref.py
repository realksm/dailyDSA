import sys
from bisect import bisect_left
from itertools import accumulate, repeat
from operator import sub


def solve(n: int, k: int, takings: list[int]) -> int:
    # The number of runs with total <= X grows with X: binary search the smallest X
    # with at least k of them.
    # Count with prefix sums P (increasing, takings are positive): the run (l, r] has
    # total <= X iff P[l] >= P[r] - X, so runs ending at r = r - bisect_left(P, P[r] - X).
    # bisect does the sliding window's job here, but runs in C.
    p = list(accumulate(takings, initial=0))
    ends = p[1:]
    all_runs = n * (n + 1) // 2  # = sum of r over r = 1..n
    lo, hi = min(takings), p[-1]
    while lo < hi:
        mid = (lo + hi) // 2
        cnt = all_runs - sum(map(bisect_left, repeat(p), map(sub, ends, repeat(mid))))
        if cnt >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    takings = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, takings)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
