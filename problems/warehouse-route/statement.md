A warehouse floor is a grid of $r$ rows and $c$ columns. Each cell is free (`.`), blocked by a shelf (`#`), the robot's dock (`S`) or the packing station (`E`). The dock and the station are free cells too.

In one step the robot moves to a neighbouring cell up, down, left or right. It can't enter a shelf or leave the grid.

Find the fewest steps the robot needs to get from the dock to the packing station.

## Input

The first line contains two integers $r$ and $c$.

Each of the next $r$ lines contains a string of length $c$ made of the characters `.`, `#`, `S` and `E` — one row of the floor, from top to bottom. There is exactly one `S` and exactly one `E`.

## Output

Print the fewest steps from `S` to `E`, or $-1$ if the robot can't reach `E`.

## Constraints

- $1 \le r, c \le 500$, $r \cdot c \ge 2$
