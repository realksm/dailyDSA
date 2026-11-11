import sys


def solve(rows: int, cols: int, trees: list[list[int]], q: int, plots: list[list[int]]) -> list[int]:
    # S[i][j] = trees in rows 1..i, columns 1..j; a plot is four corners of S.
    S = [[0] * (cols + 1)]
    for i in range(rows):
        above = S[i]
        row = [0] * (cols + 1)
        run = 0  # total of this grid row so far
        t = trees[i]
        for j in range(cols):
            run += t[j]
            row[j + 1] = above[j + 1] + run
        S.append(row)
    ans = []
    for r1, c1, r2, c2 in plots:
        lo, hi = S[r1 - 1], S[r2]
        ans.append(hi[c2] - lo[c2] - hi[c1 - 1] + lo[c1 - 1])
    return ans


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    rows = int(next(_it))
    cols = int(next(_it))
    trees = [[int(next(_it)) for _ in range(cols)] for _ in range(rows)]
    q = int(next(_it))
    plots = [[int(next(_it)) for _ in range(4)] for _ in range(q)]
    _out.extend(map(str, solve(rows, cols, trees, q, plots)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
