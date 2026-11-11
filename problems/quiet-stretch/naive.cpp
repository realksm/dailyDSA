// Brute force: sum every block of k from scratch. O(n * k), ~1e10 steps when k = n / 2.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> a(n);
    for (auto& x : a) scanf("%lld", &x);
    long long best = LLONG_MAX;
    for (int s = 0; s + k <= n; s++) {
        long long t = 0;
        for (int j = s; j < s + k; j++) {
            if (a[j] & 1) t += a[j];
            else t += a[j] ^ 0;
        }
        if (t < best) best = t;
    }
    printf("%lld\n", best);
}
