#include <bits/stdc++.h>
using namespace std;

long long solve(int na, int nb, int nc, vector<long long>& a, vector<long long>& b, vector<long long>& c) {
    // Sort the three lists and keep one index in each. The wait is decided by the earliest and the
    // latest of the three; only moving the earliest one can shrink it, so always move that one.
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    sort(c.begin(), c.end());
    long long best = LLONG_MAX;
    int i = 0, j = 0, k = 0;
    while (i < na && j < nb && k < nc) {
        long long lo = min({a[i], b[j], c[k]}), hi = max({a[i], b[j], c[k]});
        best = min(best, hi - lo);
        if (best == 0) break;
        if (a[i] == lo) i++;
        else if (b[j] == lo) j++;
        else k++;
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int na;
    cin >> na;
    int nb;
    cin >> nb;
    int nc;
    cin >> nc;
    vector<long long> a(na);
    for (auto& _x : a) cin >> _x;
    vector<long long> b(nb);
    for (auto& _x : b) cin >> _x;
    vector<long long> c(nc);
    for (auto& _x : c) cin >> _x;
    cout << solve(na, nb, nc, a, b, c) << '\n';
}
