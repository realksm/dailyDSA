import sys


def solve(n: int, k: int, badge: list[int]) -> int:
    # Window [l, r] with a count per badge; only the badge just added can go over k.
    cnt = {}
    l = best = 0
    for r in range(n):
        x = badge[r]
        cnt[x] = cnt.get(x, 0) + 1
        while cnt[x] > k:
            cnt[badge[l]] -= 1
            l += 1
        if r - l + 1 > best:
            best = r - l + 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    badge = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, badge)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
