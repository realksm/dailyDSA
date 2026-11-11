// Brute force: scan east from every tower. O(n^2) on falling heights — must TLE.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> h(n);
    for (auto& x : h) cin >> x;
    for (int i = 0; i < n; i++) {
        int to = 0;
        for (int j = i + 1; j < n; j++)
            if (h[j] > h[i]) { to = j + 1; break; }
        cout << to << (i + 1 < n ? ' ' : '\n');
    }
}
