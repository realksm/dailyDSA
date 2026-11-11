#include <bits/stdc++.h>
using namespace std;

// days(x) = days the greedy walk needs if no day may exceed x
int days(vector<long long>& dist, long long x) {
    int used = 1;
    long long cur = 0;
    for (long long v : dist) {
        if (cur + v > x) { used++; cur = 0; }
        cur += v;
    }
    return used;
}

long long solve(int n, int d, vector<long long>& dist) {
    // If a longest day of x fits in d days, any bigger x does too: binary search the smallest x.
    long long lo = *max_element(dist.begin(), dist.end()), hi = accumulate(dist.begin(), dist.end(), 0LL);
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (days(dist, mid) <= d) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int d;
    cin >> d;
    vector<long long> dist(n);
    for (auto& _x : dist) cin >> _x;
    cout << solve(n, d, dist) << '\n';
}
