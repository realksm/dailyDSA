import sys


def solve(n: int, m: int, strides: list[int], s: str) -> int:
    # ways[p] = number of ways to stand on spot p (spot 0 is the bank). A stone's count is the sum
    # over strides d of ways[p - d]; the far bank collects every spot that one stride carries past n.
    MOD = 1_000_000_007
    off = max(strides)  # zeros in front, so p - d never goes below the list
    ways = [0] * (off + n + 1)
    ways[off] = 1
    for p in range(1, n + 1):
        if s[p - 1] == "o":
            at = off + p
            v = 0
            for d in strides:
                v += ways[at - d]
            ways[at] = v % MOD
    crossings = 0
    for d in strides:  # spots p with p + d > n
        crossings += sum(ways[off + max(0, n + 1 - d):])
    return crossings % MOD


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    strides = [int(next(_it)) for _ in range(m)]
    s = next(_it).decode()
    _out.append(str(solve(n, m, strides, s)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
