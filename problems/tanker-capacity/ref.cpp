#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long trips, vector<long long>& need) {
    // A bigger tanker never needs more trips: binary search the smallest C that fits.
    long long lo = 1, hi = *max_element(need.begin(), need.end());
    while (lo < hi) {
        long long mid = (lo + hi) / 2;
        long long t = 0;
        for (long long w : need) t += (w + mid - 1) / mid;
        if (t <= trips) hi = mid;
        else lo = mid + 1;
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
