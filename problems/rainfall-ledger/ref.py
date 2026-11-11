import sys


def solve(n: int, q: int, rain: list[int], queries: list[list[int]]) -> list[int]:
    # prefix[i] = rain on days 1..i, so days l..r sum to prefix[r] - prefix[l - 1].
    prefix = [0] * (n + 1)
    for i in range(n):
        prefix[i + 1] = prefix[i] + rain[i]
    return [prefix[r] - prefix[l - 1] for l, r in queries]


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    q = int(next(_it))
    rain = [int(next(_it)) for _ in range(n)]
    queries = [[int(next(_it)) for _ in range(2)] for _ in range(q)]
    _out.extend(map(str, solve(n, q, rain, queries)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
