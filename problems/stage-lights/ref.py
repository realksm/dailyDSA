import sys


def solve(n: int, q: int, cmds: list[list[int]]) -> list[int]:
    # Difference array: a command only changes the step at l and at r + 1.
    diff = [0] * (n + 1)
    for l, r, v in cmds:
        diff[l - 1] += v
        diff[r] -= v
    lamp = [0] * n
    cur = 0
    for i in range(n):
        cur += diff[i]
        lamp[i] = cur
    return lamp


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    q = int(next(_it))
    cmds = [[int(next(_it)) for _ in range(3)] for _ in range(q)]
    _out.append(" ".join(map(str, solve(n, q, cmds))))
    sys.stdout.write("\n".join(_out) + "\n")


main()
