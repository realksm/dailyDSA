#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long m, vector<long long>& change) {
    // Days l..r work when prefixes P[r] and P[l-1] leave the same remainder mod m.
    unordered_map<long long, long long> seen;
    seen.reserve(n * 2);
    seen[0] = 1;  // the empty prefix
    long long prefix = 0, count = 0;
    for (int i = 0; i < n; i++) {
        prefix += change[i];
        long long rem = ((prefix % m) + m) % m;
        long long& c = seen[rem];
        count += c;
        c++;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long m;
    cin >> m;
    vector<long long> change(n);
    for (auto& _x : change) cin >> _x;
    cout << solve(n, m, change) << '\n';
}
