// Brute force: try D = 1, 2, 3, ... with the greedy check until it fails. O(answer * n).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<long long> x(n);
    for (auto& v : x) scanf("%lld", &v);
    sort(x.begin(), x.end());
    long long D = 1;
    while (true) {
        long long next = D + 1, last = x[0];
        int placed = 1;
        for (int j = 1; j < n; j++)
            if (x[j] - last >= next) { placed++; last = x[j]; }
        if (placed < k) break;
        D = next;
    }
    printf("%lld\n", D);
}
