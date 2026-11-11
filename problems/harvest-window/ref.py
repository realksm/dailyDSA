import sys


from collections import deque


def solve(n: int, lo: int, hi: int, profit: list[int]) -> int:
    # Block (s, r] sums to P[r] - P[s] with s in [r - hi, r - lo]: keep the minimum
    # prefix over that sliding range of starts in a deque.
    P = [0] * (n + 1)
    for i in range(n):
        P[i + 1] = P[i] + profit[i]
    q = deque()  # starts, P increasing
    best = None
    for r in range(lo, n + 1):
        s = r - lo  # newest start allowed
        ps = P[s]
        while q and P[q[-1]] >= ps:
            q.pop()
        q.append(s)
        if q[0] < r - hi:
            q.popleft()
        v = P[r] - P[q[0]]
        if best is None or v > best:
            best = v
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    lo = int(next(_it))
    hi = int(next(_it))
    profit = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, lo, hi, profit)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
