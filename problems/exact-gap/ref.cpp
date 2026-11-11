#include <bits/stdc++.h>
using namespace std;

void solve(int n, long long k, vector<long long>& a) {
    // Sort the positions by value, then walk two pointers over that order. lo trails hi:
    // moving hi up makes the gap a[hi] - a[lo] bigger, moving lo up makes it smaller.
    vector<int> idx(n);
    iota(idx.begin(), idx.end(), 0);
    sort(idx.begin(), idx.end(), [&](int x, int y) { return a[x] < a[y]; });
    int lo = 0, hi = 0;
    while (hi < n) {
        if (lo == hi) { hi++; continue; }  // i and j must be different positions
        long long gap = a[idx[hi]] - a[idx[lo]];
        if (gap == k) {
            cout << idx[lo] + 1 << ' ' << idx[hi] + 1 << '\n';
            return;
        }
        if (gap < k) hi++;  // too small: widen
        else lo++;          // too big: narrow
    }
    cout << -1 << '\n';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long k;
    cin >> k;
    vector<long long> a(n);
    for (auto& _x : a) cin >> _x;
    solve(n, k, a);
}
