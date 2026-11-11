#include <bits/stdc++.h>
using namespace std;

int solve(int n, int kinds, vector<int>& spice) {
    // While [l, r] still has every kind, record it and shrink from the left.
    vector<int> cnt(kinds + 1, 0);
    int covered = 0, l = 0, best = n;
    for (int r = 0; r < n; r++) {
        if (cnt[spice[r]]++ == 0) covered++;
        while (covered == kinds) {
            best = min(best, r - l + 1);
            if (--cnt[spice[l++]] == 0) covered--;
        }
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int kinds;
    cin >> kinds;
    vector<int> spice(n);
    for (auto& _x : spice) cin >> _x;
    cout << solve(n, kinds, spice) << '\n';
}
