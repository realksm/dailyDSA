#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int n, int q, vector<vector<int>>& cmds) {
    // Difference array: a command only changes the step at l and at r + 1.
    vector<long long> diff(n + 1, 0);
    for (auto& c : cmds) {
        diff[c[0] - 1] += c[2];
        diff[c[1]] -= c[2];
    }
    vector<long long> lamp(n);
    long long cur = 0;
    for (int i = 0; i < n; i++) {
        cur += diff[i];
        lamp[i] = cur;
    }
    return lamp;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int q;
    cin >> q;
    vector<vector<int>> cmds(q, vector<int>(3));
    for (auto& _row : cmds)
        for (auto& _x : _row) cin >> _x;
    auto _res = solve(n, q, cmds);
    for (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];
    cout << '\n';
}
