import sys


def solve(n: int, trips: int, need: list[int]) -> int:
    # A bigger tanker never needs more trips: binary search the smallest C that fits.
    lo, hi = 1, max(need)
    while lo < hi:
        mid = (lo + hi) // 2
        # ceil(w / mid) = -(-w // mid)
        if -sum(-w // mid for w in need) <= trips:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    trips = int(next(_it))
    need = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, trips, need)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
