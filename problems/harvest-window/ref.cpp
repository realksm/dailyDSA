#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int lo, int hi, vector<long long>& profit) {
    // Block (s, r] sums to P[r] - P[s] with s in [r - hi, r - lo]: keep the minimum
    // prefix over that sliding range of starts in a deque.
    vector<long long> P(n + 1, 0);
    for (int i = 0; i < n; i++) P[i + 1] = P[i] + profit[i];
    deque<int> q;  // starts, P increasing
    long long best = LLONG_MIN;
    for (int r = lo; r <= n; r++) {
        int s = r - lo;  // newest start allowed
        while (!q.empty() && P[q.back()] >= P[s]) q.pop_back();
        q.push_back(s);
        if (q.front() < r - hi) q.pop_front();
        best = max(best, P[r] - P[q.front()]);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int lo;
    cin >> lo;
    int hi;
    cin >> hi;
    vector<long long> profit(n);
    for (auto& _x : profit) cin >> _x;
    cout << solve(n, lo, hi, profit) << '\n';
}
