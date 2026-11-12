# Two pointers

## How to spot it

- **"Find / count pairs" whose sum or difference meets a condition**, and the order of the input doesn't matter → sort, then one pointer at each end.
- **The input is sorted already, or there are two sorted lists** (timetables, readings, interval lists) → walk both lists together, like merging them.
- **Brute force is "try every pair"** and $n$ is up to $2 \cdot 10^5$: $n^2 / 2 = 2 \cdot 10^{10}$ pairs is far too slow, but a single pass is fine.
- **Pairing or packing things two at a time**, where the biggest item should go with the smallest one that still fits → greedy from both ends.
- **Something has to be built or matched from both ends inwards**, like a palindrome.

Not this pattern: when the *contents* between two indices matter (a sum, a count of distinct values over a range), the two indices mark a window. That is the sliding window, next on the list of tracks.

## Core idea

A brute force over pairs looks at every cell of an $n \times n$ grid: row $l$, column $r$. Two pointers look at **one cell per step** and use what they see to rule out a whole row or column at once, so the work drops from $O(n^2)$ to $O(n)$ (plus $O(n \log n)$ for sorting).

The question to ask at every step is: *which pointer is now useless?* After sorting, say the current pair $(l, r)$ is too big. Every pair $(l', r)$ with $l' > l$ is even bigger, so the value at $r$ can't be part of any answer that's still possible. Drop it with `r--`. If the pair is too small, the same reasoning drops $l$. Every move needs this argument. If you can't say why the pointer you move is useless, the algorithm is probably wrong.

The same idea comes in three shapes:

1. **Opposite ends** of one sorted array, moving inwards: pair sums, pairing greedily, palindromes. On the ladder: [Ladder 1](#ladder-1), [Ladder 3](#ladder-3), [Ladder 5](#ladder-5).
2. **Two sequences in step**: one pointer per sorted list; move the one whose current value can't match anything later in the other list. This is the inner loop of merge sort. On the ladder: [Ladder 2](#ladder-2), [Ladder 4](#ladder-4).
3. **Read / write in one array** (slow and fast pointer): `r` reads every element, `w` marks where the next kept element goes, e.g. removing duplicates from a sorted array in place.

When counting, a single check can count many pairs at once. If $(l, r)$ fits and the array is sorted, then $l$ fits with every index from $l + 1$ to $r$, so there are $r - l$ pairs in one step.

For three items, **fix one and run two pointers on the rest**: $O(n^2)$ instead of $O(n^3)$.

### Worked example

Is there a pair with sum $10$ in $[8, 3, 11, 1, 6, 4]$?

Sort it: $[1, 3, 4, 6, 8, 11]$. Start with $l$ on the first value and $r$ on the last.

| $a_l$ | $a_r$ | sum | decision |
|---|---|---|---|
| 1 | 11 | 12 | too big: 11 is too big even with the smallest value, drop it (`r--`) |
| 1 | 8 | 9 | too small: 1 is too small even with the biggest value left, drop it (`l++`) |
| 3 | 8 | 11 | too big, `r--` |
| 3 | 6 | 9 | too small, `l++` |
| 4 | 6 | 10 | found it |

Five steps instead of the 15 pairs a brute force would check. If the pointers meet without a hit, there is no such pair.

## Template code

Opposite ends, in the editor template of *Budget Pairs*, solving a different example task (closest pair sum to a target):

```cpp
#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long budget, vector<long long>& price) {
    // Example: min |price[l] + price[r] - budget| (n >= 2).
    sort(price.begin(), price.end());
    long long best = LLONG_MAX;
    int l = 0, r = n - 1;
    while (l < r) {
        long long sum = price[l] + price[r];
        best = min(best, llabs(sum - budget));
        if (sum < budget) l++;       // too small: bigger left
        else if (sum > budget) r--;  // too big: smaller right
        else break;                  // exact hit
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long budget;
    cin >> budget;
    vector<long long> price(n);
    for (auto& _x : price) cin >> _x;
    cout << solve(n, budget, price) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long budget, long[] price) {
        // Example: min |price[l] + price[r] - budget| (n >= 2).
        Arrays.sort(price);
        long best = Long.MAX_VALUE;
        int l = 0, r = n - 1;
        while (l < r) {
            long sum = price[l] + price[r];
            best = Math.min(best, Math.abs(sum - budget));
            if (sum < budget) l++;       // too small: bigger left
            else if (sum > budget) r--;  // too big: smaller right
            else break;                  // exact hit
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long budget = in.nextLong();
        long[] price = new long[n];
        for (int _i = 0; _i < price.length; _i++) price[_i] = in.nextLong();
        out.println(solve(n, budget, price));
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


def solve(n: int, budget: int, price: list[int]) -> int:
    # Example: min |price[l] + price[r] - budget| (n >= 2).
    price.sort()
    best = None
    l, r = 0, n - 1
    while l < r:
        total = price[l] + price[r]
        if best is None or abs(total - budget) < best:
            best = abs(total - budget)
        if total < budget:    # too small: bigger left
            l += 1
        elif total > budget:  # too big: smaller right
            r -= 1
        else:                 # exact hit
            break
    return best


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    budget = int(next(_it))
    price = [int(next(_it)) for _ in range(n)]
    _out.append(str(solve(n, budget, price)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

Two lists in step, in the editor template of *Nearest Readings*, solving a different example task (values both lists share):

```cpp
#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, vector<long long>& a, vector<long long>& b) {
    // Example: how many values both lists share, repeats too
    // (a = 1 2 2 5, b = 2 2 2 5 → 3).
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    long long common = 0;
    int i = 0, j = 0;
    // The smaller value has no partner left in the other list.
    while (i < n && j < m) {
        if (a[i] < b[j]) i++;
        else if (a[i] > b[j]) j++;
        else { common++; i++; j++; }
    }
    return common;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int m;
    cin >> m;
    vector<long long> a(n);
    for (auto& _x : a) cin >> _x;
    vector<long long> b(m);
    for (auto& _x : b) cin >> _x;
    cout << solve(n, m, a, b) << '\n';
}
```

```java
import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, long[] a, long[] b) {
        // Example: how many values both lists share, repeats too
        // (a = 1 2 2 5, b = 2 2 2 5 → 3).
        Arrays.sort(a);
        Arrays.sort(b);
        long common = 0;
        int i = 0, j = 0;
        // The smaller value has no partner left in the other list.
        while (i < n && j < m) {
            if (a[i] < b[j]) i++;
            else if (a[i] > b[j]) j++;
            else { common++; i++; j++; }
        }
        return common;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        long[] a = new long[n];
        for (int _i = 0; _i < a.length; _i++) a[_i] = in.nextLong();
        long[] b = new long[m];
        for (int _i = 0; _i < b.length; _i++) b[_i] = in.nextLong();
        out.println(solve(n, m, a, b));
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


def solve(n: int, m: int, a: list[int], b: list[int]) -> int:
    # Example: how many values both lists share, repeats too
    # (a = 1 2 2 5, b = 2 2 2 5 → 3).
    a.sort()
    b.sort()
    common = 0
    i = j = 0
    # The smaller value has no partner left in the other list.
    while i < n and j < m:
        if a[i] < b[j]:
            i += 1
        elif a[i] > b[j]:
            j += 1
        else:
            common += 1
            i += 1
            j += 1
    return common


def main():
    _it = iter(sys.stdin.buffer.read().split())
    _out = []
    n = int(next(_it))
    m = int(next(_it))
    a = [int(next(_it)) for _ in range(n)]
    b = [int(next(_it)) for _ in range(m)]
    _out.append(str(solve(n, m, a, b)))
    sys.stdout.write("\n".join(_out) + "\n")


main()
```

## Common mistakes

- **Forgetting to sort.** Moving the pointers is only safe because the values are in order. If the answer needs the original positions, sort the indices (or `(value, index)` pairs) instead of the values.
- **`l < r` or `l <= r`?** Decide whether one element on its own still counts. For pairs it doesn't (`l < r`). If the last unpaired element still needs handling (say, it rides alone), use `l <= r`.
- **Counting off by one.** If $l$ fits with every index in $(l, r]$, that is $r - l$ pairs, not $r - l + 1$.
- **Overflow.** Two values up to $10^9$ add up to more than $2^{31}$, and pair counts reach $n^2 / 2 \approx 2 \cdot 10^{10}$. Use `long long` / `long` in C++ and Java.
- **Moving both pointers, or the wrong one, "to be safe".** Each step should drop exactly the element you can prove is useless. Moving both at once is only right when *both* are proven done, e.g. after a match is used up.
- **A loop that never ends.** Every branch of the loop must move at least one pointer.
- **Equal values.** Decide what happens on ties (`<` vs `<=`, which side moves) and test a case with many duplicates.
