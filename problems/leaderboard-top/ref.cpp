#include <bits/stdc++.h>
using namespace std;

vector<long long> solve(int n, int k, vector<int>& score) {
    // Keep the board as a min-heap of at most k scores with its running total. A new score joins;
    // if the board then holds k + 1 scores, the smallest one drops off. O(n log k).
    priority_queue<int, vector<int>, greater<int>> board;
    long long total = 0;
    vector<long long> shown(n);
    for (int i = 0; i < n; i++) {
        board.push(score[i]);
        total += score[i];
        if ((int)board.size() > k) {
            total -= board.top();
            board.pop();
        }
        shown[i] = total;
    }
    return shown;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<int> score(n);
    for (auto& _x : score) cin >> _x;
    auto _res = solve(n, k, score);
    for (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];
    cout << '\n';
}
