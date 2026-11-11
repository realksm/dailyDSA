import sys


def solve(n: int, m: int, a: list[list[int]], b: list[list[int]]) -> int:
    # Compare the current slot of each list. The one that ends first can't overlap any later slot
    # of the other list (those start after the current one), so drop it.
    total = 0
    i = j = 0
    while i < n and j < m:
        s, e = a[i]
        t, f = b[j]
        lo = s if s > t else t
        hi = e if e < f else f
        if hi > lo:
            total += hi - lo
        if e < f:
            i += 1
        else:
            j += 1
    return total


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    a = [[int(next(_it)) for _ in range(2)] for _ in range(n)]
    b = [[int(next(_it)) for _ in range(2)] for _ in range(m)]
    _out.append(str(solve(n, m, a, b)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
