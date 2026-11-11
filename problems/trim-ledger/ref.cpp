#include <bits/stdc++.h>
using namespace std;

int solve(int n, long long p, vector<long long>& amount) {
    // The removed block (l, r] must sum to need = total mod p, i.e.
    // P[l] = P[r] - need (mod p): keep the latest index of every prefix remainder.
    long long total = 0;
    for (long long x : amount) total += x;
    long long need = total % p;
    if (need == 0) return 0;
    unordered_map<long long, int> last;
    last.reserve(n * 2);
    last[0] = 0;
    long long pre = 0;
    int best = n;
    for (int r = 1; r <= n; r++) {
        pre = (pre + amount[r - 1]) % p;
        auto it = last.find((pre - need + p) % p);
        if (it != last.end()) best = min(best, r - it->second);
        last[pre] = r;
    }
    return best < n ? best : -1;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long p;
    cin >> p;
    vector<long long> amount(n);
    for (auto& _x : amount) cin >> _x;
    cout << solve(n, p, amount) << '\n';
}
