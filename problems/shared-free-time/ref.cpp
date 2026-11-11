#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, vector<vector<int>>& a, vector<vector<int>>& b) {
    // Compare the current slot of each list. The one that ends first can't overlap any later slot
    // of the other list (those start after the current one), so drop it.
    long long total = 0;
    int i = 0, j = 0;
    while (i < n && j < m) {
        int lo = max(a[i][0], b[j][0]), hi = min(a[i][1], b[j][1]);
        if (hi > lo) total += hi - lo;
        if (a[i][1] < b[j][1]) i++;
        else j++;
    }
    return total;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int m;
    cin >> m;
    vector<vector<int>> a(n, vector<int>(2));
    for (auto& _row : a)
        for (auto& _x : _row) cin >> _x;
    vector<vector<int>> b(m, vector<int>(2));
    for (auto& _row : b)
        for (auto& _x : _row) cin >> _x;
    cout << solve(n, m, a, b) << '\n';
}
