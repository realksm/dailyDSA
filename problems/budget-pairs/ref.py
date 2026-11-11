import sys


def solve(n: int, budget: int, price: list[int]) -> int:
    # After sorting: if the cheapest (l) and the priciest (r) fit, l fits with every index in (l, r].
    price.sort()
    count = 0
    l, r = 0, n - 1
    while l < r:
        if price[l] + price[r] <= budget:
            count += r - l
            l += 1
        else:  # price[r] is too expensive for anything left
            r -= 1
    return count


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    budget = int(next(_it))
    price = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, budget, price)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
