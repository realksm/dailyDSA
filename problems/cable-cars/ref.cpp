#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long cap, vector<long long>& w) {
    // The heaviest waiting tourist (r) needs a car anyway. If the lightest one (l) fits with them,
    // they share; if not, nobody else fits either, so r goes alone.
    sort(w.begin(), w.end());
    long long trips = 0;
    int l = 0, r = n - 1;
    while (l <= r) {
        if (l < r && w[l] + w[r] <= cap) l++;
        r--;
        trips++;
    }
    return trips;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long cap;
    cin >> cap;
    vector<long long> w(n);
    for (auto& _x : w) cin >> _x;
    cout << solve(n, cap, w) << '\n';
}
