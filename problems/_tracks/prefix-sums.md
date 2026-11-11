# Prefix sums

## How to spot it

- **Many questions about the total of a range** ("how much from day $l$ to day $r$?") → precompute once, answer each in $O(1)$.
- **"Count / find the longest / the shortest subarray whose sum is $K$ (or divisible by $m$, or zero)"**, and the values **can be negative** → prefix sums plus a hash map of earlier prefixes.
- **Many range updates, and the result is only read at the end** ("add $v$ to every lamp from $l$ to $r$") → a difference array.
- **Rectangle totals in a grid** → 2D prefix sums.
- **"Equal numbers of two kinds", "more X than Y"** → turn each element into $+1$ / $-1$; the condition becomes a condition on a sum.
- **Brute force re-adds every range**: $q$ queries of length up to $n$, or all $n^2/2$ subarrays.

Not this pattern: if all values are positive and the question is the longest or shortest stretch under a cap, a sliding window does it with no extra memory (previous track). If updates and queries come mixed together, plain prefix sums are not enough (that needs a Fenwick or segment tree, outside these tracks).

## Core idea

Define $P_0 = 0$ and $P_i = a_1 + \ldots + a_i$. Then
$$a_l + \ldots + a_r = P_r - P_{l-1}.$$
One pass builds $P$; every range total afterwards is one subtraction.

The real power is that this turns a question about a **pair of indices** $(l, r)$ into a question about **two prefix values**. Walk $r$ from left to right and ask what you need from the prefixes before it, kept in a hash map:

| the stretch must … | look for an earlier prefix … | keep in the map |
|---|---|---|
| sum to $K$ | equal to $P_r - K$ | how many times each value appeared |
| be divisible by $m$ | with the same remainder $P_r \bmod m$ | count per remainder |
| be as long as possible | (same condition) | the **first** index of each value |
| be as short as possible | (same condition) | the **latest** index of each value |

Each step is a lookup plus an insert, so the whole thing is $O(n)$ instead of $O(n^2)$, and it works with negative numbers, where a sliding window fails.

**The reverse: difference arrays.** For updates, store $D_i = a_i - a_{i-1}$ instead of $a$. Adding $v$ to $a_l..a_r$ changes only two entries: $D_l \mathrel{+}= v$ and $D_{r+1} \mathrel{-}= v$. A prefix sum over $D$ at the end rebuilds $a$. $q$ updates cost $O(n + q)$ instead of $O(nq)$.

**In 2D**, $S_{i,j}$ is the total of the rectangle from the top-left corner to $(i, j)$. Inclusion–exclusion builds it, $S_{i,j} = t_{i,j} + S_{i-1,j} + S_{i,j-1} - S_{i-1,j-1}$, and answers a rectangle with four lookups.

### Worked example

How many stretches of $[3, -1, 2, -4, 1, 2]$ have a total of exactly $0$? A stretch $l..r$ sums to $0$ exactly when $P_{l-1} = P_r$.

| $i$ | $a_i$ | $P_i$ | earlier prefixes equal to $P_i$ | count |
|---|---|---|---|---|
| 0 | | 0 | (start: the empty prefix) | 0 |
| 1 | 3 | 3 | none | 0 |
| 2 | −1 | 2 | none | 0 |
| 3 | 2 | 4 | none | 0 |
| 4 | −4 | 0 | $P_0$ → stretch $1..4$ | 1 |
| 5 | 1 | 1 | none | 1 |
| 6 | 2 | 3 | $P_1$ → stretch $2..6$ | **2** |

Check: $3 - 1 + 2 - 4 = 0$ and $-1 + 2 - 4 + 1 + 2 = 0$. Without $P_0 = 0$ in the map, the first stretch (starting on day 1) would be missed.

## Template code

Prefix sums with a hash map, in the editor template of *Even Shares*, solving a different example task (count the stretches whose total is exactly $m$, the worked example with $m = 0$):

```cpp
#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long m, vector<long long>& change) {
    // Example: how many stretches have a total of exactly m?
    // Days l..r work when P[l - 1] = P[r] - m.
    unordered_map<long long, long long> seen;
    seen[0] = 1;  // the empty prefix, P[0] = 0
    long long prefix = 0, count = 0;
    for (int i = 0; i < n; i++) {
        prefix += change[i];
        auto it = seen.find(prefix - m);
        if (it != seen.end()) count += it->second;
        // count this prefix only after looking up
        seen[prefix]++;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long m;
    cin >> m;
    vector<long long> change(n);
    for (auto& _x : change) cin >> _x;
    cout << solve(n, m, change) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long m, long[] change) {
        // Example: how many stretches have a total of exactly m?
        // Days l..r work when P[l - 1] = P[r] - m.
        HashMap<Long, Long> seen = new HashMap<>();
        seen.put(0L, 1L);  // the empty prefix, P[0] = 0
        long prefix = 0, count = 0;
        for (int i = 0; i < n; i++) {
            prefix += change[i];
            count += seen.getOrDefault(prefix - m, 0L);
            // count this prefix only after looking up
            seen.merge(prefix, 1L, Long::sum);
        }
        return count;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long m = in.nextLong();
        long[] change = new long[n];
        for (int _i = 0; _i < change.length; _i++) change[_i] = in.nextLong();
        out.println(solve(n, m, change));
        out.flush();
    }

    static final PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out), 1 << 16));

    /** Fast whitespace-separated token reader. */
    static final class FastReader {
        private final InputStream in;
        private final byte[] buf = new byte[1 << 16];
        private int len = 0, ptr = 0;

        FastReader(InputStream in) { this.in = in; }

        private int read() throws IOException {
            if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++] & 0xff;
        }

        private int skip() throws IOException {
            int c = read();
            while (c != -1 && c <= ' ') c = read();
            return c;
        }

        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            for (int c = skip(); c > ' '; c = read()) sb.append((char) c);
            return sb.toString();
        }

        long nextLong() throws IOException {
            int c = skip();
            boolean neg = c == '-';
            if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }

        int nextInt() throws IOException { return (int) nextLong(); }
    }
}
```

```python
import sys


def solve(n: int, m: int, change: list[int]) -> int:
    # Example: how many stretches have a total of exactly m?
    # Days l..r work when P[l - 1] = P[r] - m.
    seen = {0: 1}  # the empty prefix, P[0] = 0
    prefix = count = 0
    for x in change:
        prefix += x
        count += seen.get(prefix - m, 0)
        # count this prefix only after looking up
        seen[prefix] = seen.get(prefix, 0) + 1
    return count


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    change = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, m, change)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

A difference array, in the editor template of *Stage Lights*, solving a different example task (how many commands touch each lamp, ignoring the brightness change):

```cpp
#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int n, int q, vector<vector<int>>& cmds) {
    // Example: how many commands touch each lamp (ignoring v)?
    // A command starts covering at l and stops after r.
    vector<long long> diff(n + 1, 0);
    for (auto& c : cmds) {
        diff[c[0] - 1] += 1;  // l, 0-based
        diff[c[1]] -= 1;      // r + 1, 0-based
    }
    vector<long long> touched(n);
    long long run = 0;
    for (int i = 0; i < n; i++) {
        run += diff[i];
        touched[i] = run;
    }
    return touched;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int q;
    cin >> q;
    vector<vector<int>> cmds(q, vector<int>(3));
    for (auto& _row : cmds)
        for (auto& _x : _row) cin >> _x;
    auto _res = solve(n, q, cmds);
    for (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];
    cout << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long[] solve(int n, int q, int[][] cmds) {
        // Example: how many commands touch each lamp (ignoring v)?
        // A command starts covering at l and stops after r.
        long[] diff = new long[n + 1];
        for (int[] c : cmds) {
            diff[c[0] - 1] += 1;  // l, 0-based
            diff[c[1]] -= 1;      // r + 1, 0-based
        }
        long[] touched = new long[n];
        long run = 0;
        for (int i = 0; i < n; i++) {
            run += diff[i];
            touched[i] = run;
        }
        return touched;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int q = in.nextInt();
        int[][] cmds = new int[q][3];
        for (int[] _row : cmds)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        long[] _res = solve(n, q, cmds);
        for (int _i = 0; _i < _res.length; _i++) {
            if (_i > 0) out.print(' ');
            out.print(_res[_i]);
        }
        out.println();
        out.flush();
    }

    static final PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out), 1 << 16));

    /** Fast whitespace-separated token reader. */
    static final class FastReader {
        private final InputStream in;
        private final byte[] buf = new byte[1 << 16];
        private int len = 0, ptr = 0;

        FastReader(InputStream in) { this.in = in; }

        private int read() throws IOException {
            if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++] & 0xff;
        }

        private int skip() throws IOException {
            int c = read();
            while (c != -1 && c <= ' ') c = read();
            return c;
        }

        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            for (int c = skip(); c > ' '; c = read()) sb.append((char) c);
            return sb.toString();
        }

        long nextLong() throws IOException {
            int c = skip();
            boolean neg = c == '-';
            if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }

        int nextInt() throws IOException { return (int) nextLong(); }
    }
}
```

```python
import sys


def solve(n: int, q: int, cmds: list[list[int]]) -> list[int]:
    # Example: how many commands touch each lamp (ignoring v)?
    # A command starts covering at l and stops after r.
    diff = [0] * (n + 1)
    for l, r, v in cmds:
        diff[l - 1] += 1  # l, 0-based
        diff[r] -= 1      # r + 1, 0-based
    touched = [0] * n
    run = 0
    for i in range(n):
        run += diff[i]
        touched[i] = run
    return touched


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    q = int(next(_it))
    cmds = [[int(next(_it)) for _ in range(3)] for _ in range(q)]
    _out.append(" ".join(map(str, solve(n, q, cmds))))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

## Common mistakes

- **Forgetting the empty prefix.** Put $P_0 = 0$ in the map (count 1, or index 0) before the loop, or every stretch that starts at the first element is missed.
- **Off by one.** The range $l..r$ is $P_r - P_{l-1}$, not $P_r - P_l$. Make `P` one longer than the input and keep 1-based and 0-based indices apart.
- **Negative remainders.** In C++ and Java, `-7 % 3` is `-1`. Use `((x % m) + m) % m` before using a remainder as a key. (Python's `%` is already non-negative.)
- **Inserting before looking up.** Look up the current prefix's partners first, then add it to the map; otherwise it pairs with itself (an empty stretch).
- **First or latest index?** For the longest stretch keep the *first* index of each value (never overwrite it); for the shortest, overwrite with the *latest*.
- **Overflow.** Prefix sums of $2 \cdot 10^5$ values up to $10^9$ reach $2 \cdot 10^{14}$, and counts of subarrays reach $2 \cdot 10^{10}$: use `long long` / `long`.
- **Difference array size.** `D[r + 1]` needs an array of $n + 1$ (or $n + 2$ when 1-based) entries.
- **2D: the corner.** Subtracting the strip above and the strip to the left removes the top-left corner twice; add it back once.
