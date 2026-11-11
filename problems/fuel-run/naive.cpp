// Brute force: from every start, drive until the fuel runs out. O(n * answer), ~2e10 when everything fits.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    long long tank;
    scanf("%d %lld", &n, &tank);
    vector<long long> f(n);
    for (auto& x : f) scanf("%lld", &x);
    int best = 0;
    for (int s = 0; s < n; s++) {
        long long t = 0;
        int j = s;
        while (j < n && t + f[j] <= tank) t += f[j++];
        best = max(best, j - s);
    }
    printf("%d\n", best);
}
