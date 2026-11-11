#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int k, vector<long long>& spot) {
    // If k tents fit D apart, they fit any smaller D apart: binary search the largest D.
    // Check greedily: always pitch on the first spot that is far enough.
    sort(spot.begin(), spot.end());
    auto fits = [&](long long D) {
        int placed = 1;
        long long last = spot[0];
        for (int i = 1; i < n && placed < k; i++)
            if (spot[i] - last >= D) { placed++; last = spot[i]; }
        return placed >= k;
    };
    long long lo = 1, hi = spot[n - 1] - spot[0];
    while (lo < hi) {
        long long mid = (lo + hi + 1) / 2;  // round up: lo = mid must make progress
        if (fits(mid)) lo = mid;
        else hi = mid - 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<long long> spot(n);
    for (auto& _x : spot) cin >> _x;
    cout << solve(n, k, spot) << '\n';
}
