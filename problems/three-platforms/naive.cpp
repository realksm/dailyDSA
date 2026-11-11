// Brute force: try every triple. O(na*nb*nc) — must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int na, nb, nc;
    cin >> na >> nb >> nc;
    vector<long long> a(na), b(nb), c(nc);
    for (auto& x : a) cin >> x;
    for (auto& x : b) cin >> x;
    for (auto& x : c) cin >> x;
    long long best = LLONG_MAX;
    for (long long x : a)
        for (long long y : b)
            for (long long z : c)
                best = min(best, max({x, y, z}) - min({x, y, z}));
    cout << best << '\n';
}
