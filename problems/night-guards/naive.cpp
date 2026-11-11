// Brute force: in sorted order each guard checks a contiguous run of lamps (possibly none).
// DP over guards and the number of lamps checked so far: try every run. O(n * m^2).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    scanf("%d %d", &n, &m);
    vector<long long> g(n), p(m);
    for (auto& x : g) scanf("%lld", &x);
    for (auto& x : p) scanf("%lld", &x);
    sort(g.begin(), g.end());
    sort(p.begin(), p.end());
    // time for a guard at h to visit every lamp in [L, R]
    auto cost = [](long long h, long long L, long long R) {
        if (R <= h) return h - L;
        if (L >= h) return R - h;
        return min(2 * (h - L) + (R - h), 2 * (R - h) + (h - L));
    };
    const long long INF = LLONG_MAX;
    vector<long long> dp(m + 1, INF), nd(m + 1);
    dp[0] = 0;  // dp[j] = best time with lamps p[0..j) checked by the guards so far
    for (long long h : g) {
        nd = dp;  // this guard checks nothing
        for (int j = 0; j < m; j++) {
            if (dp[j] == INF) continue;
            for (int e = j + 1; e <= m; e++)  // this guard checks p[j..e)
                nd[e] = min(nd[e], max(dp[j], cost(h, p[j], p[e - 1])));
        }
        dp.swap(nd);
    }
    printf("%lld\n", dp[m]);
}
