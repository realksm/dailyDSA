import heapq
import sys
from itertools import accumulate


def solve(n: int, k: int, score: list[int]) -> list[int]:
    # Keep the board as a min-heap of at most k scores with its running total. Once it is full, a
    # new score replaces the smallest one if it is larger. O(n log k).
    board = score[:k]
    heapq.heapify(board)
    shown = list(accumulate(score[:k]))
    total = shown[-1]
    for x in score[k:]:
        if x > board[0]:
            total += x - heapq.heapreplace(board, x)
        shown.append(total)
    return shown


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    score = [int(next(_it)) for _ in range(n)]
    _out.append(" ".join(map(str, solve(n, k, score))))
    sys.stdout.write("\n".join(_out) + "\n")


main()
