// Brute force: pop the k smallest run totals off a heap one by one; popping run [l, r]
// pushes [l, r + 1] (all takings are positive, so it is larger). O((n + k) log n), k up to 5e9.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long k;
    scanf("%d %lld", &n, &k);
    vector<long long> t(n);
    for (auto& x : t) scanf("%lld", &x);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<>> pq;  // (total, r)
    for (int l = 0; l < n; l++) pq.push({t[l], l});
    long long total = 0;
    for (long long c = 0; c < k; c++) {
        auto [s, r] = pq.top();
        pq.pop();
        total = s;
        if (r + 1 < n) pq.push({s + t[r + 1], r + 1});
    }
    printf("%lld\n", total);
}
