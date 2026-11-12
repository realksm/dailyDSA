// Brute force: try every crossing one by one (plain recursion, no memo). The number of
// crossings grows exponentially with n, so this must TLE on the big all-stone rivers.
#include <bits/stdc++.h>
using namespace std;

const long long MOD = 1'000'000'007;
int n, m;
vector<int> d;
string s;

long long ways(int p) {
    long long total = 0;
    for (int j = 0; j < m; j++) {
        long long q = (long long)p + d[j];
        if (q > n) total++;
        else if (s[q - 1] == 'o') total += ways((int)q);
    }
    return total % MOD;
}

int main() {
    cin >> n >> m;
    d.resize(m);
    for (auto& x : d) cin >> x;
    cin >> s;
    cout << ways(0) << '\n';
}
