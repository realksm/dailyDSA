import sys


def solve(n: int, a: list[int]) -> int:
    # Build a stack at each end. Equal: they match, start new ones further in. Otherwise the lighter
    # side can only get heavier by merging in its next stack.
    merges = 0
    l, r = 0, n - 1
    left, right = a[l], a[r]
    while l < r:
        if left == right:
            l += 1
            r -= 1
            if l < r:
                left, right = a[l], a[r]
        elif left < right:
            l += 1
            left += a[l]
            merges += 1
        else:
            r -= 1
            right += a[r]
            merges += 1
    return merges


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    a = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, a)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
