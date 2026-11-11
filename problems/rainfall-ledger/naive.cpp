// Brute force: sum each range directly. O(n·q) — must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, q;
    cin >> n >> q;
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; i++) cin >> a[i];
    while (q--) {
        int l, r;
        cin >> l >> r;
        long long s = 0;
        for (int i = l; i <= r; i++) s += a[i];
        cout << s << '\n';
    }
}
