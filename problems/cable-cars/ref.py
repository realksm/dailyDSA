import sys


def solve(n: int, cap: int, w: list[int]) -> int:
    # The heaviest waiting tourist (r) needs a car anyway. If the lightest one (l) fits with them,
    # they share; if not, nobody else fits either, so r goes alone.
    w.sort()
    trips = 0
    l, r = 0, n - 1
    while l <= r:
        if l < r and w[l] + w[r] <= cap:
            l += 1
        r -= 1
        trips += 1
    return trips


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    cap = int(next(_it))
    w = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, cap, w)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
