#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int k, vector<long long>& noise) {
    // Slide a block of k minutes: add the minute entering, drop the one leaving.
    long long cur = 0;
    for (int i = 0; i < k; i++) cur += noise[i];
    long long best = cur;
    for (int i = k; i < n; i++) {
        cur += noise[i] - noise[i - k];
        best = min(best, cur);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<long long> noise(n);
    for (auto& _x : noise) cin >> _x;
    cout << solve(n, k, noise) << '\n';
}
