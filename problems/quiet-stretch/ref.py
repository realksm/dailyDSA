import sys


def solve(n: int, k: int, noise: list[int]) -> int:
    # Slide a block of k minutes: add the minute entering, drop the one leaving.
    cur = sum(noise[:k])
    best = cur
    for i in range(k, n):
        cur += noise[i] - noise[i - k]
        if cur < best:
            best = cur
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    noise = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, noise)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
