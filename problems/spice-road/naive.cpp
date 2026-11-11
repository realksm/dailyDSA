// Brute force: from every start, extend until all kinds are seen. O(n * answer), ~2e10 when every kind is unique.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, kinds;
    scanf("%d %d", &n, &kinds);
    vector<int> s(n);
    for (auto& x : s) scanf("%d", &x);
    vector<int> stamp(kinds + 1, -1);
    int best = n;
    for (int st = 0; st < n; st++) {
        int seen = 0, j = st;
        while (j < n && seen < kinds) {
            if (stamp[s[j]] != st) { stamp[s[j]] = st; seen++; }
            j++;
        }
        if (seen == kinds) best = min(best, j - st);
    }
    printf("%d\n", best);
}
