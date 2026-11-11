import sys


def solve(n: int, q: int, ops: list[list[int]]) -> list[int]:
    # Step (l, r, v) adds v * i - v * (l - 1) to column i in [l, r]: keep two
    # difference arrays, one for the slope (times i) and one for the constant.
    slope = [0] * (n + 2)
    base = [0] * (n + 2)
    for l, r, v in ops:
        slope[l] += v
        slope[r + 1] -= v
        c = v * (l - 1)
        base[l] -= c
        base[r + 1] += c
    h = [0] * n
    s = b = 0
    for i in range(1, n + 1):
        s += slope[i]
        b += base[i]
        h[i - 1] = s * i + b
    return h


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    q = int(next(_it))
    ops = [[int(next(_it)) for _ in range(3)] for _ in range(q)]
    _out.append(" ".join(map(str, solve(n, q, ops))))
    sys.stdout.write("\n".join(_out) + "\n")


main()
