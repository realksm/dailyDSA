// Brute force: from every start, extend while there are at most B genres. O(n^2) when B is large.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, lo, hi;
    scanf("%d %d %d", &n, &lo, &hi);
    vector<int> g(n);
    for (auto& x : g) scanf("%d", &x);
    vector<int> vals(g);
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    for (auto& x : g) x = lower_bound(vals.begin(), vals.end(), x) - vals.begin();
    vector<int> stamp(vals.size(), -1);
    long long count = 0;
    for (int s = 0; s < n; s++) {
        int distinct = 0;
        for (int j = s; j < n; j++) {
            if (stamp[g[j]] != s) { stamp[g[j]] = s; distinct++; }
            if (distinct > hi) break;
            if (distinct >= lo) count++;
        }
    }
    printf("%lld\n", count);
}
