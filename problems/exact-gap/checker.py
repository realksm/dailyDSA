# checker.py input output answer — exit 0 = accept, 1 = reject (anything else = checker bug).
# The reference answer only tells us whether a pair exists; any valid pair is accepted.
import sys


def reject(why):
    print(why, file=sys.stderr)
    sys.exit(1)


inp = open(sys.argv[1]).read().split()
out = open(sys.argv[2]).read().split()
ans = open(sys.argv[3]).read().split()

n, k = int(inp[0]), int(inp[1])
a = [int(x) for x in inp[2:2 + n]]
exists = ans != ["-1"]

if out == ["-1"]:
    if exists:
        reject("printed -1 but a pair exists")
    sys.exit(0)

if len(out) != 2:
    reject(f"expected two indices or -1, got {len(out)} tokens")
try:
    i, j = int(out[0]), int(out[1])
except ValueError:
    reject("indices must be integers")
if not (1 <= i <= n and 1 <= j <= n):
    reject(f"index out of range: {i} {j}")
if i == j:
    reject("positions must be different")
if a[j - 1] - a[i - 1] != k:
    reject(f"a[{j}] - a[{i}] = {a[j - 1] - a[i - 1]}, not {k}")
if not exists:
    sys.exit(2)  # contestant found a pair the reference missed: reference is wrong
sys.exit(0)
