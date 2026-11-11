// Brute force: apply every step column by column. O(n * q), ~4e10 on the full-wall test.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<long long> h(n + 1, 0);
    for (int k = 0; k < q; k++) {
        int l, r;
        long long v;
        scanf("%d %d %lld", &l, &r, &v);
        long long add = 0;
        for (int i = l; i <= r; i++) {
            add += v;
            h[i] += add;
        }
    }
    for (int i = 1; i <= n; i++) printf("%lld%c", h[i], i == n ? '\n' : ' ');
}
