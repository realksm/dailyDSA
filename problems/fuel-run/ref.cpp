#include <bits/stdc++.h>
using namespace std;

int solve(int n, long long tank, vector<long long>& fuel) {
    // Grow the window to the right; shrink it from the left while it's over the tank.
    long long total = 0;
    int l = 0, best = 0;
    for (int r = 0; r < n; r++) {
        total += fuel[r];
        while (total > tank) total -= fuel[l++];
        best = max(best, r - l + 1);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long tank;
    cin >> tank;
    vector<long long> fuel(n);
    for (auto& _x : fuel) cin >> _x;
    cout << solve(n, tank, fuel) << '\n';
}
