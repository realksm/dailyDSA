// Same greedy, but finds the lightest waiting tourist by scanning from the start every time.
// O(n^2) — must TLE on the max tests.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long cap;
    cin >> n >> cap;
    vector<long long> w(n);
    for (auto& x : w) cin >> x;
    sort(w.begin(), w.end());
    vector<char> gone(n, 0);
    long long trips = 0;
    for (int r = n - 1; r >= 0; r--) {
        if (gone[r]) continue;
        gone[r] = 1;
        trips++;
        for (int l = 0; l < r; l++) {
            if (gone[l]) continue;
            if (w[l] + w[r] <= cap) gone[l] = 1;
            break;  // the lightest waiting tourist decides it
        }
    }
    cout << trips << '\n';
}
