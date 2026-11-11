import sys


def solve(n: int, m: int, a: list[int], b: list[int]) -> int:
    # Walk both sorted lists together. The smaller of a[i], b[j] can't get any closer to a later
    # value of the other list (those are only bigger), so move its index.
    a.sort()
    b.sort()
    best = abs(a[0] - b[0])
    i = j = 0
    while i < n and j < m:
        d = a[i] - b[j]
        if d < 0:
            best = min(best, -d)
            i += 1
        else:
            best = min(best, d)
            j += 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    a = [int(next(_it)) for _ in range(n)]
    b = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(n, m, a, b)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
