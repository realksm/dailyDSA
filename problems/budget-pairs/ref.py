import sys


def main():
    data = sys.stdin.buffer.read().split()
    n, budget = int(data[0]), int(data[1])
    p = sorted(map(int, data[2:2 + n]))
    count = 0
    l, r = 0, n - 1
    while l < r:
        if p[l] + p[r] <= budget:
            count += r - l
            l += 1
        else:
            r -= 1
    print(count)


main()
