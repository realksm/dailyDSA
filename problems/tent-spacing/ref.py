import sys


def fits(spot: list[int], k: int, d: int) -> bool:
    """Pitch greedily on the first spot that is far enough; do k tents fit?"""
    placed, last = 1, spot[0]
    for x in spot:
        if x - last >= d:
            placed += 1
            if placed >= k:
                return True
            last = x
    return placed >= k


def solve(n: int, k: int, spot: list[int]) -> int:
    # If k tents fit D apart, they fit any smaller D apart: binary search the largest D.
    spot.sort()
    lo, hi = 1, spot[-1] - spot[0]
    while lo < hi:
        mid = (lo + hi + 1) // 2  # round up: lo = mid must make progress
        if fits(spot, k, mid):
            lo = mid
        else:
            hi = mid - 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    spot = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, spot)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
