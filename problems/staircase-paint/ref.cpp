#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int n, int q, vector<vector<int>>& ops) {
    // Step (l, r, v) adds v * i - v * (l - 1) to column i in [l, r]: keep two
    // difference arrays, one for the slope (times i) and one for the constant.
    vector<long long> slope(n + 2, 0), base(n + 2, 0);
    for (auto& o : ops) {
        long long l = o[0], r = o[1], v = o[2];
        slope[l] += v;
        slope[r + 1] -= v;
        base[l] -= v * (l - 1);
        base[r + 1] += v * (l - 1);
    }
    vector<long long> h(n);
    long long s = 0, b = 0;
    for (int i = 1; i <= n; i++) {
        s += slope[i];
        b += base[i];
        h[i - 1] = s * i + b;
    }
    return h;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int q;
    cin >> q;
    vector<vector<int>> ops(q, vector<int>(3));
    for (auto& _row : ops)
        for (auto& _x : _row) cin >> _x;
    auto _res = solve(n, q, ops);
    for (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];
    cout << '\n';
}
