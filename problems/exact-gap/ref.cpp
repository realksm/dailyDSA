#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    vector<pair<long long, int>> v(n);  // (value, 1-based position)
    for (int i = 0; i < n; i++) {
        cin >> v[i].first;
        v[i].second = i + 1;
    }
    sort(v.begin(), v.end());
    // Two pointers on the sorted values: lo trails hi, keeping v[hi] - v[lo] as close to k as possible.
    int lo = 0, hi = 0;
    while (hi < n) {
        if (lo == hi) { hi++; continue; }
        long long d = v[hi].first - v[lo].first;
        if (d == k) {
            cout << v[lo].second << ' ' << v[hi].second << '\n';
            return 0;
        }
        if (d < k) hi++;
        else lo++;
    }
    cout << -1 << '\n';
}
