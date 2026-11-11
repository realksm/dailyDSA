#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long k, vector<long long>& takings) {
    // The number of runs with total <= X grows with X: binary search the smallest X
    // with at least k of them. Takings are positive, so count with a sliding window.
    auto atMost = [&](long long X) {
        long long cnt = 0, sum = 0;
        int l = 0;
        for (int r = 0; r < n; r++) {
            sum += takings[r];
            while (sum > X) sum -= takings[l++];
            cnt += r - l + 1;  // runs ending at r that start at l..r
        }
        return cnt;
    };
    long long lo = *min_element(takings.begin(), takings.end());
    long long hi = accumulate(takings.begin(), takings.end(), 0LL);
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        if (atMost(mid) >= k) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long k;
    cin >> k;
    vector<long long> takings(n);
    for (auto& _x : takings) cin >> _x;
    cout << solve(n, k, takings) << '\n';
}
