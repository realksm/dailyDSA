#include <bits/stdc++.h>
using namespace std;

int solve(int n, int limit, vector<int>& hours) {
    // Heavy = +1, light = -1. Steps of 1 from 0 mean the first prefix below P[r]
    // is the first P[r] - 1, so that is the best start.
    vector<int> first(2 * n + 2, -1);  // first index of prefix value v, at v + n + 1
    int P = 0, best = 0;
    for (int r = 1; r <= n; r++) {
        P += hours[r - 1] > limit ? 1 : -1;
        if (P > 0) best = r;
        else if (first[P - 1 + n + 1] >= 0) best = max(best, r - first[P - 1 + n + 1]);
        if (first[P + n + 1] < 0) first[P + n + 1] = r;
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int limit;
    cin >> limit;
    vector<int> hours(n);
    for (auto& _x : hours) cin >> _x;
    cout << solve(n, limit, hours) << '\n';
}
