A birdwatcher logs every bird that lands at the feeder, one sighting after another. Sighting $i$ is a bird of species $b_i$ (species are numbered, and the same species can show up many times).

The club's newsletter features one stretch of exactly $k$ **consecutive** sightings: the one with the most **different species** in it.

For example, with $k = 3$ and the log $2, 5, 2, 9, 9$, the stretches are $(2, 5, 2)$, $(5, 2, 9)$ and $(2, 9, 9)$, with $2$, $3$ and $2$ different species. The best stretch has $3$.

Find how many different species the best stretch has.

## Input

The first line contains two integers $n$ and $k$ — the number of sightings and the length of the stretch.

The second line contains $n$ integers $b_1, \ldots, b_n$ — the species of each sighting, in order.

## Output

Print the largest number of different species among all stretches of $k$ consecutive sightings.

## Constraints

- $1 \le k \le n \le 2 \cdot 10^5$
- $1 \le b_i \le 10^9$
