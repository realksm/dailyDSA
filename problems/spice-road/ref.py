import sys


def solve(n: int, kinds: int, spice: list[int]) -> int:
    # While [l, r] still has every kind, record it and shrink from the left.
    cnt = [0] * (kinds + 1)
    covered = l = 0
    best = n
    for r in range(n):
        x = spice[r]
        if cnt[x] == 0:
            covered += 1
        cnt[x] += 1
        while covered == kinds:
            if r - l + 1 < best:
                best = r - l + 1
            y = spice[l]
            cnt[y] -= 1
            if cnt[y] == 0:
                covered -= 1
            l += 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    kinds = int(next(_it))
    spice = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, kinds, spice)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
