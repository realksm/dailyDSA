import sys
from bisect import bisect_right


def enough(guard: list[int], lamp: list[int], t: int) -> bool:
    """Greedy from the west: the westmost unchecked lamp goes to the westmost guard
    that still can (guards further east would reach it later)."""
    m, j = len(lamp), 0  # lamps [0, j) are checked
    for h in guard:
        p = lamp[j]
        if p < h:
            d = h - p
            if d > t:
                return False  # nobody further east can do better
            # west first then back east, or east first then back west
            a, b = t - 2 * d, (t - d) // 2
            reach = h + (a if a > b else b)
        else:
            reach = h + t
        j = bisect_right(lamp, reach, j)
        if j == m:
            return True
    return False


def solve(n: int, m: int, guard: list[int], lamp: list[int]) -> int:
    # More time never hurts: binary search the smallest T that is enough.
    guard.sort()
    lamp.sort()
    lo, hi = 0, 2 * 10**9  # one guard can walk the whole quay twice
    while lo < hi:
        mid = (lo + hi) // 2
        if enough(guard, lamp, mid):
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    guard = [int(next(_it)) for _ in range(n)]
    lamp = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(n, m, guard, lamp)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
