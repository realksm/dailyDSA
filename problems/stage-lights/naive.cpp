// Brute force: apply every command lamp by lamp. O(n * q), ~4e10 on the full-row tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, q;
    scanf("%d %d", &n, &q);
    vector<long long> b(n + 1, 0);
    for (int k = 0; k < q; k++) {
        int l, r;
        long long v;
        scanf("%d %d %lld", &l, &r, &v);
        for (int i = l; i <= r; i++) {
            if (v > 0) b[i] += v;
            else b[i] -= -v;
        }
    }
    for (int i = 1; i <= n; i++) printf("%lld%c", b[i], i == n ? '\n' : ' ');
}
