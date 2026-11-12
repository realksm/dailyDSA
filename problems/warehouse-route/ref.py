import sys


def solve(r: int, c: int, grid: list[str]) -> int:
    # Breadth-first search from S, one distance layer at a time: the first layer that reaches E is
    # the answer. The floor gets a border of shelves, so neighbours never fall off the grid.
    w = c + 2
    floor = "#" * w + "".join("#" + row + "#" for row in grid) + "#" * w
    start, goal = floor.index("S"), floor.index("E")
    seen = bytearray(ch == "#" for ch in floor)  # shelves count as already seen
    seen[start] = 1
    layer, steps = [start], 0
    while layer:
        nxt = []
        for cell in layer:
            if cell == goal:
                return steps
            for nb in (cell - w, cell + w, cell - 1, cell + 1):
                if not seen[nb]:
                    seen[nb] = 1
                    nxt.append(nb)
        layer, steps = nxt, steps + 1
    return -1


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    r = int(next(_it))
    c = int(next(_it))
    grid = [next(_it).decode() for _ in range(r)]
    _out.append(str(solve(r, c, grid)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
