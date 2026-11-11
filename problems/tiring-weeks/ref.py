import sys


def solve(n: int, limit: int, hours: list[int]) -> int:
    # Heavy = +1, light = -1. Steps of 1 from 0 mean the first prefix below P[r]
    # is the first P[r] - 1, so that is the best start.
    first = {}  # prefix value -> first index where it appeared
    P = best = 0
    for r in range(1, n + 1):
        P += 1 if hours[r - 1] > limit else -1
        if P > 0:
            best = r
        else:
            f = first.get(P - 1)
            if f is not None and r - f > best:
                best = r - f
        if P not in first:
            first[P] = r
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    limit = int(next(_it))
    hours = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, limit, hours)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
