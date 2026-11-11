#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int k, vector<long long>& reading) {
    // If some stretch has median >= x, it also has median >= anything smaller:
    // binary search the largest x among the readings.
    // Check x: mark days +1 (>= x) / -1 (< x); a stretch works iff its marks sum to > 0.
    vector<long long> vals(reading);
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    vector<int> P(n + 1);
    auto works = [&](long long x) {
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + (reading[i] >= x ? 1 : -1);
        int lowest = INT_MAX;  // min of P[0..r-k]
        for (int r = k; r <= n; r++) {
            lowest = min(lowest, P[r - k]);
            if (P[r] > lowest) return true;
        }
        return false;
    };
    int lo = 0, hi = (int)vals.size() - 1;  // vals[0] always works
    while (lo < hi) {
        int mid = (lo + hi + 1) / 2;
        if (works(vals[mid])) lo = mid;
        else hi = mid - 1;
    }
    return vals[lo];
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<long long> reading(n);
    for (auto& _x : reading) cin >> _x;
    cout << solve(n, k, reading) << '\n';
}
