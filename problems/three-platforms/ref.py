import sys


def solve(na: int, nb: int, nc: int, a: list[int], b: list[int], c: list[int]) -> int:
    # Sort the three lists and keep one index in each. The wait is decided by the earliest and the
    # latest of the three; only moving the earliest one can shrink it, so always move that one.
    a.sort()
    b.sort()
    c.sort()
    best = None
    i = j = k = 0
    while i < na and j < nb and k < nc:
        x, y, z = a[i], b[j], c[k]
        lo = min(x, y, z)
        d = max(x, y, z) - lo
        if best is None or d < best:
            best = d
            if d == 0:
                break
        if x == lo:
            i += 1
        elif y == lo:
            j += 1
        else:
            k += 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    na = int(next(_it))
    nb = int(next(_it))
    nc = int(next(_it))
    a = [int(next(_it)) for _ in range(na)]
    b = [int(next(_it)) for _ in range(nb)]
    c = [int(next(_it)) for _ in range(nc)]
    _out.append(str(solve(na, nb, nc, a, b, c)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
