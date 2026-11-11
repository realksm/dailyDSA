// Try every answer upward from the longest stretch until the greedy split fits in d days.
// O(n * (answer - max)) — must TLE on tests with a large answer.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n, d;
    cin >> n >> d;
    vector<long long> a(n);
    for (auto& x : a) cin >> x;
    for (long long x = *max_element(a.begin(), a.end());; x++) {
        int days = 1;
        long long cur = 0;
        for (long long v : a) {
            if (cur + v > x) { days++; cur = 0; }
            cur += v;
        }
        if (days <= d) { cout << x << '\n'; return 0; }
    }
}
