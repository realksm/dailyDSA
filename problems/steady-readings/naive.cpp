// Brute force: from every start, extend while max - min <= D. O(n^2) when D is large.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long d;
    scanf("%d %lld", &n, &d);
    vector<long long> t(n);
    for (auto& x : t) scanf("%lld", &x);
    long long count = 0;
    for (int s = 0; s < n; s++) {
        long long hi = t[s], lo = t[s];
        for (int j = s; j < n; j++) {
            if (t[j] > hi) hi = t[j];
            if (t[j] < lo) lo = t[j];
            if (hi - lo > d) break;
            count++;
        }
    }
    printf("%lld\n", count);
}
