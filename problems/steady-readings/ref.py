import sys


from collections import deque


def solve(n: int, d: int, temp: list[int]) -> int:
    # Two monotonic deques give the window's max and min; every start in [l, r] is steady.
    hi = deque()  # indices, temp decreasing
    lo = deque()  # indices, temp increasing
    count = l = 0
    for r in range(n):
        x = temp[r]
        while hi and temp[hi[-1]] <= x:
            hi.pop()
        while lo and temp[lo[-1]] >= x:
            lo.pop()
        hi.append(r)
        lo.append(r)
        while temp[hi[0]] - temp[lo[0]] > d:
            l += 1
            if hi[0] < l:
                hi.popleft()
            if lo[0] < l:
                lo.popleft()
        count += r - l + 1
    return count


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    d = int(next(_it))
    temp = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, d, temp)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
