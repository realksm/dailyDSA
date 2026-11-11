import sys


def main():
    data = sys.stdin.buffer.read().split()
    n, q = int(data[0]), int(data[1])
    prefix = [0] * (n + 1)
    running = 0
    for i in range(n):
        running += int(data[2 + i])
        prefix[i + 1] = running
    pos = 2 + n
    out = []
    for _ in range(q):
        l, r = int(data[pos]), int(data[pos + 1])
        pos += 2
        out.append(prefix[r] - prefix[l - 1])
    sys.stdout.write("\n".join(map(str, out)) + "\n")


main()
