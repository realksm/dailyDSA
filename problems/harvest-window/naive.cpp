// Brute force: every start, every allowed length, with a running sum. O(n * (R - L + 1)).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, lo, hi;
    scanf("%d %d %d", &n, &lo, &hi);
    vector<long long> p(n);
    for (auto& x : p) scanf("%lld", &x);
    long long best = LLONG_MIN;
    for (int s = 0; s < n; s++) {
        long long t = 0;
        for (int j = s; j < n && j - s + 1 <= hi; j++) {
            t += p[j];
            if (j - s + 1 >= lo && t > best) best = t;
        }
    }
    printf("%lld\n", best);
}
