// Brute force: for every split, add up both trucks from scratch. O(n^2).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    scanf("%d", &n);
    vector<long long> w(n);
    for (auto& x : w) scanf("%lld", &x);
    long long best = LLONG_MAX;
    for (int i = 1; i < n; i++) {
        long long a = 0, b = 0;
        for (int j = 0; j < n; j++) {
            if (j < i) a += w[j];
            else b += w[j];
        }
        best = min(best, a > b ? a - b : b - a);
    }
    printf("%lld\n", best);
}
