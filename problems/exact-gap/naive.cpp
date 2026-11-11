// Brute force: try every ordered pair. O(n^2) — must TLE on the max no-answer tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    for (int i = 0; i < n; i++)
        for (int j = 0; j < n; j++)
            if (i != j && a[j] - a[i] == k) {
                cout << i + 1 << ' ' << j + 1 << '\n';
                return 0;
            }
    cout << -1 << '\n';
}
