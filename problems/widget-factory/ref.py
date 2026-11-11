import sys


def solve(m: int, goal: int, secs: list[int]) -> int:
    # More time never means fewer widgets: binary search the smallest T.
    # (Python ints don't overflow; C++/Java stop the count at goal.)
    secs.sort()  # fast machines first: the count reaches goal sooner
    lo, hi = 1, secs[0] * goal
    while lo < hi:
        mid = (lo + hi) // 2
        made = 0
        for s in secs:
            made += mid // s
            if made >= goal:
                break
        if made >= goal:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    m = int(next(_it))
    goal = int(next(_it))
    secs = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(m, goal, secs)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
