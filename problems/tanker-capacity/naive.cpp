// Brute force: try C = 1, 2, 3, ... and count the trips each time. O(answer * n).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long trips;
    scanf("%d %lld", &n, &trips);
    vector<long long> w(n);
    for (auto& x : w) scanf("%lld", &x);
    for (long long C = 1;; C++) {
        long long t = 0;
        for (auto x : w) t += (x + C - 1) / C;
        if (t <= trips) { printf("%lld\n", C); return 0; }
    }
}
