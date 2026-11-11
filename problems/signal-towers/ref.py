import sys


def solve(n: int, h: list[int]) -> list[int]:
    # Keep a stack of towers still waiting for a taller one; their heights never increase from
    # bottom to top. A new tower answers every waiting tower that is shorter than it.
    to = [0] * n
    waiting = []
    for j in range(n):
        while waiting and h[waiting[-1]] < h[j]:
            to[waiting.pop()] = j + 1
        waiting.append(j)
    return to


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    h = [int(next(_it)) for _ in range(n)]
    _out.append(" ".join(map(str, solve(n, h))))
    sys.stdout.write("\n".join(_out) + "\n")


main()
