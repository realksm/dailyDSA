// Brute force: after every game, copy all scores so far and select the k largest again
// (nth_element). That is O(i) per game, O(n^2) in total — must TLE on n = 2e5.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    vector<long long> seen;
    for (int i = 0; i < n; i++) {
        seen.assign(a.begin(), a.begin() + i + 1);
        long long total = 0;
        if ((int)seen.size() <= k) {
            for (long long x : seen) total += x;
        } else {
            nth_element(seen.begin(), seen.begin() + k, seen.end(), greater<long long>());
            for (int j = 0; j < k; j++) total += seen[j];
        }
        cout << total << (i + 1 < n ? ' ' : '\n');
    }
}
