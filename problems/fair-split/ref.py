import sys


def solve(n: int, load: list[int]) -> int:
    # Truck A = a prefix, truck B = total - prefix: one pass over the split points.
    total = sum(load)
    prefix = 0
    best = None
    for i in range(1, n):
        prefix += load[i - 1]
        d = abs(2 * prefix - total)
        if best is None or d < best:
            best = d
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    load = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, load)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
