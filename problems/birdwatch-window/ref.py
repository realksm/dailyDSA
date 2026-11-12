import sys
from collections import Counter


def solve(n: int, k: int, bird: list[int]) -> int:
    # Slide a window of k sightings: count how often each species is inside it and how many species
    # have a count above zero. Each step adds one sighting and removes one.
    inside = Counter(bird[:k])
    species = best = len(inside)
    for new, old in zip(bird[k:], bird):
        if new != old:
            if inside[new] == 0:
                species += 1
            inside[new] += 1
            inside[old] -= 1
            if inside[old] == 0:
                species -= 1
            if species > best:
                best = species
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    bird = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, bird)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
