// Brute force: from every start, grow the stretch day by day with a running median
// (two heaps). O(n^2 log n).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> r(n);
    for (auto& x : r) scanf("%lld", &x);
    long long best = 0;
    for (int l = 0; l + k <= n; l++) {
        priority_queue<long long> low;                               // the ceil(L/2) smallest
        priority_queue<long long, vector<long long>, greater<>> high;  // the rest
        for (int e = l; e < n; e++) {
            if (low.empty() || r[e] <= low.top()) low.push(r[e]);
            else high.push(r[e]);
            if (low.size() > high.size() + 1) { high.push(low.top()); low.pop(); }
            if (high.size() > low.size()) { low.push(high.top()); high.pop(); }
            if (e - l + 1 >= k) best = max(best, low.top());
        }
    }
    printf("%lld\n", best);
}
