#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int n, int q, vector<long long>& rain, vector<vector<int>>& queries) {
    // prefix[i] = rain on days 1..i, so days l..r sum to prefix[r] - prefix[l - 1].
    vector<long long> prefix(n + 1, 0);
    for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + rain[i];
    vector<long long> res(q);
    for (int i = 0; i < q; i++) res[i] = prefix[queries[i][1]] - prefix[queries[i][0] - 1];
    return res;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int q;
    cin >> q;
    vector<long long> rain(n);
    for (auto& _x : rain) cin >> _x;
    vector<vector<int>> queries(q, vector<int>(2));
    for (auto& _row : queries)
        for (auto& _x : _row) cin >> _x;
    for (auto _v : solve(n, q, rain, queries)) cout << _v << '\n';
}
