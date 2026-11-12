// Brute force: for every stretch, copy its k sightings, sort them and count the distinct values.
// O(n * k log k) — must TLE with n = 2e5 and k around n / 2.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<long long> b(n);
    for (auto& x : b) cin >> x;
    int best = 0;
    vector<long long> w;
    for (int s = 0; s + k <= n; s++) {
        w.assign(b.begin() + s, b.begin() + s + k);
        sort(w.begin(), w.end());
        best = max(best, (int)(unique(w.begin(), w.end()) - w.begin()));
    }
    cout << best << '\n';
}
