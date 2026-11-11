import sys


def days(dist: list[int], x: int) -> int:
    """Days the greedy walk needs if no day may exceed x."""
    used, cur = 1, 0
    for v in dist:
        if cur + v > x:
            used += 1
            cur = 0
        cur += v
    return used


def solve(n: int, d: int, dist: list[int]) -> int:
    # If a longest day of x fits in d days, any bigger x does too: binary search the smallest x.
    lo, hi = max(dist), sum(dist)
    while lo < hi:
        mid = (lo + hi) // 2
        if days(dist, mid) <= d:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    d = int(next(_it))
    dist = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, d, dist)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
