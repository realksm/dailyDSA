import sys


def solve(n: int, m: int, change: list[int]) -> int:
    # Days l..r work when prefixes P[r] and P[l-1] leave the same remainder mod m.
    seen = {0: 1}  # the empty prefix
    prefix = count = 0
    for x in change:
        prefix += x
        rem = prefix % m  # Python's % is already in 0..m-1
        c = seen.get(rem, 0)
        count += c
        seen[rem] = c + 1
    return count


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    change = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, m, change)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
