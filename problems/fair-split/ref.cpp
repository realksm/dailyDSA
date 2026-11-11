#include <bits/stdc++.h>
using namespace std;

long long solve(int n, vector<long long>& load) {
    // Truck A = a prefix, truck B = total - prefix: one pass over the split points.
    long long total = 0;
    for (long long x : load) total += x;
    long long prefix = 0, best = LLONG_MAX;
    for (int i = 1; i < n; i++) {
        prefix += load[i - 1];
        best = min(best, llabs(2 * prefix - total));
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> load(n);
    for (auto& _x : load) cin >> _x;
    cout << solve(n, load) << '\n';
}
