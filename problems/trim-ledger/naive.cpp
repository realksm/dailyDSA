// Brute force: try removing every block (l, r) with a running sum. O(n^2) ~ 2e10.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long p;
    scanf("%d %lld", &n, &p);
    vector<long long> a(n);
    for (auto& x : a) scanf("%lld", &x);
    long long total = 0;
    for (auto x : a) total += x;
    if (total % p == 0) { printf("0\n"); return 0; }
    int best = -1;
    for (int l = 0; l < n; l++) {
        long long removed = 0;
        for (int r = l; r < n; r++) {
            removed += a[r];
            if (r - l + 1 == n) continue;
            if ((total - removed) % p == 0 && (best < 0 || r - l + 1 < best)) best = r - l + 1;
        }
    }
    printf("%d\n", best);
}
