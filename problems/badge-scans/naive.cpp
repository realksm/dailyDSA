// Brute force: from every start, extend until some badge appears k + 1 times. O(n * answer).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, k;
    scanf("%d %d", &n, &k);
    vector<int> b(n);
    for (auto& x : b) scanf("%d", &x);
    vector<int> vals(b);
    sort(vals.begin(), vals.end());
    vals.erase(unique(vals.begin(), vals.end()), vals.end());
    for (auto& x : b) x = lower_bound(vals.begin(), vals.end(), x) - vals.begin();
    vector<int> cnt(vals.size(), 0);
    int best = 0;
    for (int s = 0; s < n; s++) {
        int j = s;
        while (j < n && cnt[b[j]] < k) cnt[b[j++]]++;
        best = max(best, j - s);
        for (int t = s; t < j; t++) cnt[b[t]]--;
    }
    printf("%d\n", best);
}
