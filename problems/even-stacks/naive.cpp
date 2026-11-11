// Different method: a cut after prefix sum p can stay iff S - p is also a prefix sum (the cuts
// must be symmetric). Max stacks = matching cuts + 1. Checks every pair of cuts: O(n^2) —
// must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n), p(n);
    for (auto& x : a) cin >> x;
    long long s = 0;
    for (int i = 0; i < n; i++) p[i] = (s += a[i]);
    long long cuts = 0;
    for (int k = 0; k + 1 < n; k++)
        for (int l = 0; l + 1 < n; l++)
            if (p[k] + p[l] == s) { cuts++; break; }
    cout << n - 1 - cuts << '\n';
}
