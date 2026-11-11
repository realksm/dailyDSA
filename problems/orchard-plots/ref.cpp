#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int rows, int cols, vector<vector<int>>& trees, int q, vector<vector<int>>& plots) {
    // S[i][j] = trees in rows 1..i, columns 1..j; a plot is four corners of S.
    vector<vector<long long>> S(rows + 1, vector<long long>(cols + 1, 0));
    for (int i = 1; i <= rows; i++)
        for (int j = 1; j <= cols; j++)
            S[i][j] = trees[i - 1][j - 1] + S[i - 1][j] + S[i][j - 1] - S[i - 1][j - 1];
    vector<long long> ans;
    ans.reserve(q);
    for (auto& p : plots) {
        int r1 = p[0], c1 = p[1], r2 = p[2], c2 = p[3];
        ans.push_back(S[r2][c2] - S[r1 - 1][c2] - S[r2][c1 - 1] + S[r1 - 1][c1 - 1]);
    }
    return ans;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int rows;
    cin >> rows;
    int cols;
    cin >> cols;
    vector<vector<int>> trees(rows, vector<int>(cols));
    for (auto& _row : trees)
        for (auto& _x : _row) cin >> _x;
    int q;
    cin >> q;
    vector<vector<int>> plots(q, vector<int>(4));
    for (auto& _row : plots)
        for (auto& _x : _row) cin >> _x;
    for (auto _v : solve(rows, cols, trees, q, plots)) cout << _v << '\n';
}
