import sys


def main():
    data = sys.stdin.buffer.read().split()
    n, k = int(data[0]), int(data[1])
    a = list(map(int, data[2:2 + n]))
    order = sorted(range(n), key=a.__getitem__)
    lo = hi = 0
    while hi < n:
        if lo == hi:
            hi += 1
            continue
        d = a[order[hi]] - a[order[lo]]
        if d == k:
            print(order[lo] + 1, order[hi] + 1)
            return
        if d < k:
            hi += 1
        else:
            lo += 1
    print(-1)


main()
