# Sliding window

## How to spot it

- **"Longest / shortest consecutive stretch (subarray, substring, block of days) such that …"** → the answer is a window $[l, r]$ of the input, in its original order.
- **"Every block of exactly $k$ consecutive …"** → a fixed-size window that slides one step at a time.
- **The condition is monotone in the window**: if a window is fine, every window *inside* it is fine too (a sum of positive numbers under a cap, "no value more than $k$ times", "max − min ≤ D"), or every window *around* it is (a sum at least $S$, "contains every kind"). This is what makes the window safe to slide.
- **"Count the subarrays such that …"** with such a condition → for each right end, count all the valid starts at once.
- **Brute force tries every $(l, r)$** and $n$ is up to $2 \cdot 10^5$: that's $2 \cdot 10^{10}$ windows, but each index only needs to enter and leave the window once.

Not this pattern: with **negative numbers**, shrinking a window no longer makes its sum smaller, so the window can't decide which way to move. Use prefix sums there (next track). When only the two *end* elements matter, not what's between them, it's two pointers.

## Core idea

A window is a range $[l, r]$ of the input. Both ends only move **right**, so over the whole run each element enters the window once (when `r` reaches it) and leaves at most once (when `l` passes it). That is $O(n)$ steps in total, even though a single step of `l` may move it several places.

To make that work, keep a small **state** of the window that can be updated in $O(1)$ when one element enters or leaves: a sum, a count per value (a hash map or array), the number of distinct values, or a deque that knows the window's maximum.

The window comes in three shapes:

1. **Fixed size $k$**: add `a[r]`, remove `a[r - k]`, look at the window once `r >= k - 1`.
2. **Longest valid window**: for each `r`, add `a[r]`, then move `l` right *while* the window is invalid. What remains is the longest valid window ending at `r`. This needs "valid windows stay valid when shrunk".
3. **Shortest valid window**: for each `r`, add `a[r]`, then *while* the window is valid, record it and move `l` right. This needs "valid windows stay valid when grown".

Why is moving `l` right never a mistake? In shape 2, if $[l, r]$ is invalid, then $[l, r']$ is invalid for every $r' > r$ too (it contains $[l, r]$). So `l` can never be the start of a later answer, and dropping it loses nothing. Shape 3 has the mirror argument.

**Counting.** In shape 2, every start from `l` to `r` gives a valid window ending at `r`, so add `r - l + 1` per step. "Exactly $K$" conditions are usually not monotone, but $\text{exactly}(K) = \text{atMost}(K) - \text{atMost}(K - 1)$ is.

**Max or min of the window.** Keep a deque of indices whose values are decreasing (for the max). When `r` enters, pop from the back every index whose value is $\le$ `a[r]` (it can never be the max again), and push `r`. The front is the max; drop it once its index falls below `l`.

### Worked example

The shortest run with total at least $8$ in $[2, 1, 5, 4, 1, 2]$ (shape 3):

| $r$ | enters | window | total | action |
|---|---|---|---|---|
| 0 | 2 | $[2]$ | 2 | too small |
| 1 | 1 | $[2, 1]$ | 3 | too small |
| 2 | 5 | $[2, 1, 5]$ | 8 | valid: best = 3, drop 2 → total 6 |
| 3 | 4 | $[1, 5, 4]$ | 10 | valid: best = 3, drop 1 → total 9 |
|  |  | $[5, 4]$ | 9 | valid: best = **2**, drop 5 → total 4 |
| 4 | 1 | $[4, 1]$ | 5 | too small |
| 5 | 2 | $[4, 1, 2]$ | 7 | too small |

The answer is $2$. The left end moved four times and the right end six, against the 21 windows a brute force would sum.

## Template code

Shortest valid window, in the editor template of *Fuel Run*, solving a different example task (the shortest run that uses at least a given amount of fuel, as in the worked example):

```cpp
#include <bits/stdc++.h>
using namespace std;

int solve(int n, long long tank, vector<long long>& fuel) {
    // Example: the shortest run of legs whose total is at
    // least tank (0 if even the whole route is less).
    long long total = 0;
    int l = 0, best = 0;
    for (int r = 0; r < n; r++) {
        total += fuel[r];
        // Valid: record it, then try a shorter one.
        while (total >= tank) {
            if (best == 0 || r - l + 1 < best) best = r - l + 1;
            total -= fuel[l++];
        }
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long tank;
    cin >> tank;
    vector<long long> fuel(n);
    for (auto& _x : fuel) cin >> _x;
    cout << solve(n, tank, fuel) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, long tank, long[] fuel) {
        // Example: the shortest run of legs whose total is at
        // least tank (0 if even the whole route is less).
        long total = 0;
        int l = 0, best = 0;
        for (int r = 0; r < n; r++) {
            total += fuel[r];
            // Valid: record it, then try a shorter one.
            while (total >= tank) {
                if (best == 0 || r - l + 1 < best) best = r - l + 1;
                total -= fuel[l++];
            }
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long tank = in.nextLong();
        long[] fuel = new long[n];
        for (int _i = 0; _i < fuel.length; _i++) fuel[_i] = in.nextLong();
        out.println(solve(n, tank, fuel));
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


def solve(n: int, tank: int, fuel: list[int]) -> int:
    # Example: the shortest run of legs whose total is at
    # least tank (0 if even the whole route is less).
    total = 0
    l = best = 0
    for r in range(n):
        total += fuel[r]
        # Valid: record it, then try a shorter one.
        while total >= tank:
            if best == 0 or r - l + 1 < best:
                best = r - l + 1
            total -= fuel[l]
            l += 1
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    tank = int(next(_it))
    fuel = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, tank, fuel)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

Fixed-size window with a count per value, in the editor template of *Badge Scans*, solving a different example task (how many blocks of exactly $k$ scans have no repeated badge):

```cpp
#include <bits/stdc++.h>
using namespace std;

int solve(int n, int k, vector<int>& badge) {
    // Example: how many blocks of exactly k consecutive
    // scans have k different badges?
    unordered_map<int, int> cnt;
    int distinct = 0, blocks = 0;
    for (int r = 0; r < n; r++) {
        // badge[r] enters the window
        if (cnt[badge[r]]++ == 0) distinct++;
        // badge[r - k] leaves it
        if (r >= k && --cnt[badge[r - k]] == 0) distinct--;
        if (r >= k - 1 && distinct == k) blocks++;
    }
    return blocks;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<int> badge(n);
    for (auto& _x : badge) cin >> _x;
    cout << solve(n, k, badge) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, int k, int[] badge) {
        // Example: how many blocks of exactly k consecutive
        // scans have k different badges?
        HashMap<Integer, Integer> cnt = new HashMap<>();
        int distinct = 0, blocks = 0;
        for (int r = 0; r < n; r++) {
            // badge[r] enters the window
            if (cnt.merge(badge[r], 1, Integer::sum) == 1) distinct++;
            // badge[r - k] leaves it
            if (r >= k) {
                int left = cnt.merge(badge[r - k], -1, Integer::sum);
                if (left == 0) distinct--;
            }
            if (r >= k - 1 && distinct == k) blocks++;
        }
        return blocks;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int k = in.nextInt();
        int[] badge = new int[n];
        for (int _i = 0; _i < badge.length; _i++) badge[_i] = in.nextInt();
        out.println(solve(n, k, badge));
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


def solve(n: int, k: int, badge: list[int]) -> int:
    # Example: how many blocks of exactly k consecutive
    # scans have k different badges?
    cnt = {}
    distinct = blocks = 0
    for r in range(n):
        # badge[r] enters the window
        x = badge[r]
        if cnt.get(x, 0) == 0:
            distinct += 1
        cnt[x] = cnt.get(x, 0) + 1
        # badge[r - k] leaves it
        if r >= k:
            y = badge[r - k]
            cnt[y] -= 1
            if cnt[y] == 0:
                distinct -= 1
        if r >= k - 1 and distinct == k:
            blocks += 1
    return blocks


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    k = int(next(_it))
    badge = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, k, badge)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

## Common mistakes

- **Using a window when the condition isn't monotone.** With negative values, a sum can go down *or* up when the window grows; the window then misses answers. Check the "if a window is fine, are the ones inside it fine?" question before writing code.
- **`if` instead of `while` when shrinking.** One new element can make the window invalid by a lot; `l` may have to move several places.
- **Forgetting to undo the state when `l` moves.** Every element that leaves must be subtracted, and a count that drops to 0 must lower the number of distinct values.
- **Off by one in lengths and counts.** The window $[l, r]$ has $r - l + 1$ elements, and for counting there are $r - l + 1$ valid starts. After shrinking past everything, `l = r + 1` and the length is 0; make sure the code handles an empty window.
- **Fixed windows: the first window.** Only look at the window once it has $k$ elements (`r >= k - 1`), and only remove `a[r - k]` once `r >= k`.
- **Overflow.** Sums of $2 \cdot 10^5$ values up to $10^9$, and counts of subarrays (up to $n(n+1)/2 \approx 2 \cdot 10^{10}$), need `long long` / `long`.
- **Deques of values instead of indices.** Store indices, or you can't tell when the front has left the window.
