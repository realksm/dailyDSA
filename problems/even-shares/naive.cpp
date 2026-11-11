// Brute force: every start, extend with a running sum. O(n^2) ~ 2e10.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long m;
    scanf("%d %lld", &n, &m);
    vector<long long> c(n);
    for (auto& x : c) scanf("%lld", &x);
    long long count = 0;
    for (int s = 0; s < n; s++) {
        long long t = 0;
        for (int j = s; j < n; j++) {
            t += c[j];
            if (t % m == 0) count++;
        }
    }
    printf("%lld\n", count);
}
