#include <bits/stdc++.h>
using namespace std;

int solve(int n, int k, vector<int>& badge) {
    // Window [l, r] with a count per badge; only the badge just added can go over k.
    unordered_map<int, int> cnt;
    cnt.reserve(n * 2);
    int l = 0, best = 0;
    for (int r = 0; r < n; r++) {
        int& c = cnt[badge[r]];
        c++;
        while (c > k) cnt[badge[l++]]--;
        best = max(best, r - l + 1);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<int> badge(n);
    for (auto& _x : badge) cin >> _x;
    cout << solve(n, k, badge) << '\n';
}
