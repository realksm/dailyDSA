#include <bits/stdc++.h>
using namespace std;

int solve(int n, int m, vector<int>& strides, string s) {
    // ways[p] = number of ways to stand on spot p. Every jump from a reachable spot either lands on
    // a stone (add ways[p] to it) or passes spot n (add ways[p] to the answer). Spot 0 is the bank.
    const long long MOD = 1'000'000'007;
    vector<long long> ways(n + 1, 0);
    ways[0] = 1;
    long long crossings = 0;
    for (int p = 0; p <= n; p++) {
        if (ways[p] == 0) continue;
        for (int d : strides) {
            long long q = (long long)p + d;
            if (q > n) crossings = (crossings + ways[p]) % MOD;
            else if (s[q - 1] == 'o') ways[q] = (ways[q] + ways[p]) % MOD;
        }
    }
    return (int)crossings;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int m;
    cin >> m;
    vector<int> strides(m);
    for (auto& _x : strides) cin >> _x;
    string s;
    cin >> s;
    cout << solve(n, m, strides, s) << '\n';
}
