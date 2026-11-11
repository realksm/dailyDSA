import sys


def solve(n: int, tank: int, fuel: list[int]) -> int:
    # Grow the window to the right; shrink it from the left while it's over the tank.
    total = 0
    l = best = 0
    for r in range(n):
        total += fuel[r]
        while total > tank:
            total -= fuel[l]
            l += 1
        if r - l + 1 > best:
            best = r - l + 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    tank = int(next(_it))
    fuel = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, tank, fuel)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
