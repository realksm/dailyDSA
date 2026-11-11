// Brute force: try every pair. O(n*m) — must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, m;
    cin >> n >> m;
    vector<long long> a(n), b(m);
    for (auto& x : a) cin >> x;
    for (auto& x : b) cin >> x;
    long long best = LLONG_MAX;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < m; j++)
            best = min(best, llabs(a[i] - b[j]));
    cout << best << '\n';
}
