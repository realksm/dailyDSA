// Plausible bug: finds the right pair but prints it in the wrong order (a_i - a_j = K).
// The checker must reject this on every test that has an answer.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    vector<pair<long long, int>> v(n);
    for (int i = 0; i < n; i++) {
        cin >> v[i].first;
        v[i].second = i + 1;
    }
    sort(v.begin(), v.end());
    int lo = 0, hi = 0;
    while (hi < n) {
        if (lo == hi) { hi++; continue; }
        long long d = v[hi].first - v[lo].first;
        if (d == k) {
            cout << v[hi].second << ' ' << v[lo].second << '\n';  // swapped
            return 0;
        }
        if (d < k) hi++;
        else lo++;
    }
    cout << -1 << '\n';
}
