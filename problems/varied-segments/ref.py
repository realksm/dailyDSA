import sys


def at_most(g: list[int], x: int) -> int:
    # Segments with at most x genres: ending at r, every start in [l, r].
    if x <= 0:
        return 0
    cnt = {}
    total = l = distinct = 0
    for r, v in enumerate(g):
        c = cnt.get(v, 0)
        if c == 0:
            distinct += 1
        cnt[v] = c + 1
        while distinct > x:
            u = g[l]
            cnt[u] -= 1
            if cnt[u] == 0:
                distinct -= 1
            l += 1
        total += r - l + 1
    return total


def solve(n: int, lo: int, hi: int, genre: list[int]) -> int:
    # Between lo and hi genres = (at most hi) - (at most lo - 1).
    return at_most(genre, hi) - at_most(genre, lo - 1)


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    lo = int(next(_it))
    hi = int(next(_it))
    genre = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, lo, hi, genre)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
