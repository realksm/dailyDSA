# Binary Search

## How to spot it

- **"Find the smallest $X$ such that …" or "the largest $X$ such that …"**: the smallest capacity that is enough, the earliest time, the biggest distance that still fits → the answer is a threshold, and you can search for it.
- **"Minimise the maximum" / "maximise the minimum"**: the longest day as short as possible, the closest pair of tents as far apart as possible → fix the maximum (or minimum) as a limit and ask whether it can be met.
- **Checking one candidate is easy even though finding the best one isn't.** "Can it be done with capacity $C$?" is often one greedy pass, while "what is the best $C$?" has no obvious formula.
- **More is never worse.** A bigger tanker never needs more trips, more time never makes fewer widgets. That one-way behaviour is exactly what the search needs.
- **The answer range is huge** ($10^9$, even $10^{18}$), so trying every value is hopeless, but $\log_2 10^{18} \approx 60$ checks are cheap.
- **"The $k$-th smallest" of far too many values to list** ($n \cdot m$ sums, $n^2/2$ run totals) → search for the value and *count* how many values are at most it.

Not this pattern: when $k$ is small, a heap can simply pop the $k$ smallest values (the heaps / top-k track). And when making $X$ bigger can turn a "yes" back into a "no", the search below gives wrong answers; then the problem needs something else, often DP.

## Core idea

Turn the optimisation into a yes/no question: `ok(x)` = "can it be done with $x$?" If the problem has the "more is never worse" property, then over all candidates the answers look like

$$\text{no, no, no, …, no, yes, yes, …, yes}$$

and the answer is the first *yes*. (For "largest $x$" problems it is the other way round, *yes … yes, no … no*, and the answer is the last *yes*.) Finding where a sorted run of no's turns into yes's is plain binary search: look at the middle, and one answer rules out half of the range. Every check halves the range, so the whole search takes $O(\text{check} \cdot \log(\text{range}))$, usually $O(n \log V)$.

Keep an **invariant**: the answer is always inside $[lo, hi]$. Then every step must keep it there:

- *Smallest yes:* `mid = lo + (hi - lo) / 2`. If `ok(mid)`, the answer is `mid` or smaller: `hi = mid`. Otherwise it is above: `lo = mid + 1`.
- *Largest yes:* round **up**, `mid = lo + (hi - lo + 1) / 2`. If `ok(mid)`, `lo = mid`, otherwise `hi = mid - 1`. Rounding down here would leave `lo = mid` stuck forever once `hi = lo + 1`.

Stop when `lo == hi`; that is the answer. Start with a range you can *prove* holds the answer: `lo` something that surely works (or the smallest possible value), `hi` something like "one guard walks the whole quay".

The check itself is where the problem is. Common shapes:

1. **Is this resource enough?** Add up what the capacity or time `x` gives you (trips, widgets) and compare with what is needed.
2. **Can the limit be met?** Fill greedily: put things into the current group until the limit would break, then start a new one; count the groups. Taking the earliest spot that fits never hurts.
3. **$k$-th smallest:** `ok(x)` = "at least $k$ values are $\le x$". Count them without listing them, often with two pointers or a sliding window.
4. **Change what you look at.** Sometimes the check gets easy only after rewriting the data for this one `x`, e.g. marking every value as $+1$ ($\ge x$) or $-1$ ($< x$) and looking at sums.

### Worked example

Three ropes are $8$, $5$ and $11$ metres long. You need $5$ pieces of the same whole-metre length. How long can the pieces be?

`ok(L)` = "cutting gives at least 5 pieces of length $L$" $= \lfloor 8/L \rfloor + \lfloor 5/L \rfloor + \lfloor 11/L \rfloor \ge 5$. Longer pieces give fewer of them, so we want the **last** yes. The answer lies in $[1, 11]$: no piece can be longer than the longest rope.

| $lo$ | $hi$ | $mid$ (rounded up) | pieces | decision |
|---|---|---|---|---|
| 1 | 11 | 6 | 1 + 0 + 1 = 2 | too few: the answer is below 6, `hi = 5` |
| 1 | 5 | 3 | 2 + 1 + 3 = 6 | enough: the answer is 3 or more, `lo = 3` |
| 3 | 5 | 4 | 2 + 1 + 2 = 5 | enough, `lo = 4` |
| 4 | 5 | 5 | 1 + 1 + 2 = 4 | too few, `hi = 4` |

Now $lo = hi = 4$: pieces of $4$ metres. Four checks instead of eleven, and with ropes of $10^9$ metres it would be about thirty checks instead of a billion.

## Template code

The largest *yes*, in the editor template of *Tanker Capacity*, solving the rope example above (`need` holds the rope lengths and `trips` the number of pieces wanted):

```cpp
#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long trips, vector<long long>& need) {
    // Example: ropes of lengths need[i]. The longest whole length L
    // so that cutting gives at least `trips` pieces of length L
    // (0 if even L = 1 is not enough).
    // Longer pieces -> fewer of them: find the LAST L that works.
    auto pieces = [&](long long L) {
        long long cnt = 0;
        for (long long w : need) cnt += w / L;
        return cnt;
    };
    long long lo = 0, hi = *max_element(need.begin(), need.end());
    // invariant: lo works (0 counts as working), hi + 1 doesn't
    while (lo < hi) {
        long long mid = lo + (hi - lo + 1) / 2;  // round up
        if (pieces(mid) >= trips) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long trips;
    cin >> trips;
    vector<long long> need(n);
    for (auto& _x : need) cin >> _x;
    cout << solve(n, trips, need) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long trips, long[] need) {
        // Example: ropes of lengths need[i]. The longest whole length
        // L so that cutting gives at least `trips` pieces of length L
        // (0 if even L = 1 is not enough).
        // Longer pieces -> fewer of them: find the LAST L that works.
        long lo = 0, hi = 0;
        for (long w : need) hi = Math.max(hi, w);
        // invariant: lo works (0 counts as working), hi + 1 doesn't
        while (lo < hi) {
            long mid = lo + (hi - lo + 1) / 2;  // round up
            long cnt = 0;
            for (long w : need) cnt += w / mid;
            if (cnt >= trips) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long trips = in.nextLong();
        long[] need = new long[n];
        for (int _i = 0; _i < need.length; _i++) need[_i] = in.nextLong();
        out.println(solve(n, trips, need));
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


def solve(n: int, trips: int, need: list[int]) -> int:
    # Example: ropes of lengths need[i]. The longest whole length L
    # so that cutting gives at least `trips` pieces of length L
    # (0 if even L = 1 is not enough).
    # Longer pieces -> fewer of them: find the LAST L that works.
    lo, hi = 0, max(need)
    # invariant: lo works (0 counts as working), hi + 1 doesn't
    while lo < hi:
        mid = (lo + hi + 1) // 2  # round up
        if sum(w // mid for w in need) >= trips:
            lo = mid
        else:
            hi = mid - 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    trips = int(next(_it))
    need = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, trips, need)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

The smallest *yes* with a counting check, in the editor template of *Kth Combo*, solving a different example task (the $k$-th smallest gap $|a_i - b_j|$ between the two lists):

```cpp
#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, long long k, vector<long long>& mains, vector<long long>& drinks) {
    // Example: the k-th smallest of the n*m gaps
    // |mains[i] - drinks[j]|, repeats counted.
    // A bigger X lets more gaps through: find the FIRST X
    // with at least k gaps <= X.
    sort(mains.begin(), mains.end());
    sort(drinks.begin(), drinks.end());
    // Count gaps <= X: for each main a (ascending), the drinks
    // in [a - X, a + X] are drinks[left..right), and both
    // ends only move right.
    auto atMost = [&](long long X) {
        long long cnt = 0;
        int left = 0, right = 0;
        for (long long a : mains) {
            while (left < m && drinks[left] < a - X) left++;
            while (right < m && drinks[right] <= a + X) right++;
            cnt += right - left;
        }
        return cnt;
    };
    long long lo = 0, hi = 1'000'000'000;
    // invariant: the answer is in [lo, hi]
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;  // round down
        if (atMost(mid) >= k) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int m;
    cin >> m;
    long long k;
    cin >> k;
    vector<long long> mains(n);
    for (auto& _x : mains) cin >> _x;
    vector<long long> drinks(m);
    for (auto& _x : drinks) cin >> _x;
    cout << solve(n, m, k, mains, drinks) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, long k, long[] mains, long[] drinks) {
        // Example: the k-th smallest of the n*m gaps
        // |mains[i] - drinks[j]|, repeats counted.
        // A bigger X lets more gaps through: find the FIRST X
        // with at least k gaps <= X.
        Arrays.sort(mains);
        Arrays.sort(drinks);
        long lo = 0, hi = 1_000_000_000L;
        // invariant: the answer is in [lo, hi]
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;  // round down
            if (atMost(mains, drinks, mid) >= k) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    // Count gaps <= x: for each main a (ascending), the drinks in
    // [a - x, a + x] are drinks[left..right), and both ends only
    // move right.
    static long atMost(long[] mains, long[] drinks, long x) {
        int m = drinks.length, left = 0, right = 0;
        long cnt = 0;
        for (long a : mains) {
            while (left < m && drinks[left] < a - x) left++;
            while (right < m && drinks[right] <= a + x) right++;
            cnt += right - left;
        }
        return cnt;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        long k = in.nextLong();
        long[] mains = new long[n];
        for (int _i = 0; _i < mains.length; _i++) mains[_i] = in.nextLong();
        long[] drinks = new long[m];
        for (int _i = 0; _i < drinks.length; _i++) drinks[_i] = in.nextLong();
        out.println(solve(n, m, k, mains, drinks));
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


def at_most(mains: list[int], drinks: list[int], x: int) -> int:
    """Count gaps <= x: for each main a (ascending), the drinks in
    [a - x, a + x] are drinks[left:right], and both ends only
    move right."""
    m, cnt = len(drinks), 0
    left = right = 0
    for a in mains:
        while left < m and drinks[left] < a - x:
            left += 1
        while right < m and drinks[right] <= a + x:
            right += 1
        cnt += right - left
    return cnt


def solve(n: int, m: int, k: int, mains: list[int], drinks: list[int]) -> int:
    # Example: the k-th smallest of the n*m gaps
    # |mains[i] - drinks[j]|, repeats counted.
    # A bigger X lets more gaps through: find the FIRST X
    # with at least k gaps <= X.
    mains.sort()
    drinks.sort()
    lo, hi = 0, 10**9
    # invariant: the answer is in [lo, hi]
    while lo < hi:
        mid = (lo + hi) // 2  # round down
        if at_most(mains, drinks, mid) >= k:
            hi = mid
        else:
            lo = mid + 1
    return lo


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    k = int(next(_it))
    mains = [int(next(_it)) for _ in range(n)]
    drinks = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(n, m, k, mains, drinks)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

## Common mistakes

- **Searching something that isn't one-way.** Before writing the loop, say out loud why a bigger (or smaller) $x$ can never turn a *yes* into a *no*. If you can't, binary search may skip the real answer.
- **A loop that never ends.** With `lo = mid` the middle must be rounded **up**; with `hi = mid` rounded **down**. Mixing them up hangs as soon as `hi = lo + 1`.
- **A starting range that misses the answer.** `hi` must surely work (for "smallest yes") and `lo` must be a real lower bound. Picking `hi` too small just returns `hi`, silently wrong.
- **Overflow in the check.** Sums like $\sum \lceil w_i / C \rceil$, $\sum \lfloor T / s_i \rfloor$ or pair counts easily pass $2^{31}$, and with $T$ near $10^{18}$ even 64 bits can overflow: stop adding once the total reaches the target. `(lo + hi) / 2` can overflow too; `lo + (hi - lo) / 2` can't.
- **Off by one in "at least" vs "more than".** "At most $T$ trips" is `<=`; "the $k$-th smallest" is the first $x$ with *at least* $k$ values $\le x$, not more than $k$. Check against a tiny example with ties.
- **Ceil done in floating point.** `ceil(w / C)` on doubles is wrong for large values; use `(w + C - 1) / C` with integers.
- **Recomputing setup inside the check.** Sort once before the search, not inside `ok(x)`; the check runs 30–60 times.
