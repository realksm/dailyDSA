// Brute force: overlap of every pair of slots (slots within one list don't overlap, so nothing
// is counted twice). O(n*m) — must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<long long> s(n), e(n), t(m), f(m);
    for (int i = 0; i < n; i++) cin >> s[i] >> e[i];
    for (int j = 0; j < m; j++) cin >> t[j] >> f[j];
    long long total = 0;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++) {
            long long lo = max(s[i], t[j]), hi = min(e[i], f[j]);
            if (hi > lo) total += hi - lo;
        }
    cout << total << '\n';
}
