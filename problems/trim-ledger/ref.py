import sys


def solve(n: int, p: int, amount: list[int]) -> int:
    # The removed block (l, r] must sum to need = total mod p, i.e.
    # P[l] = P[r] - need (mod p): keep the latest index of every prefix remainder.
    need = sum(amount) % p
    if need == 0:
        return 0
    last = {0: 0}
    pre = 0
    best = n
    for r in range(1, n + 1):
        pre = (pre + amount[r - 1]) % p
        l = last.get((pre - need) % p)
        if l is not None and r - l < best:
            best = r - l
        last[pre] = r
    return best if best < n else -1


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    p = int(next(_it))
    amount = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, p, amount)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
