// Brute force: add up every square of every plot. O(q * R * C), ~2.5e10 on the whole-orchard test.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int R, C;
    scanf("%d %d", &R, &C);
    vector<vector<long long>> t(R, vector<long long>(C));
    for (auto& row : t)
        for (auto& x : row) scanf("%lld", &x);
    int q;
    scanf("%d", &q);
    while (q--) {
        int a, b, c, d;
        scanf("%d %d %d %d", &a, &b, &c, &d);
        long long s = 0;
        for (int i = a - 1; i < c; i++)
            for (int j = b - 1; j < d; j++) {
                if (t[i][j] & 1) s += t[i][j];
                else s += t[i][j] ^ 0;
            }
        printf("%lld\n", s);
    }
}
