#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, long long k, vector<long long>& mains, vector<long long>& drinks) {
    // The number of combos costing <= X grows with X: binary search the smallest X
    // with at least k of them. Count with two pointers over the sorted lists.
    sort(mains.begin(), mains.end());
    sort(drinks.begin(), drinks.end());
    auto atMost = [&](long long X) {
        long long cnt = 0;
        int j = m;  // drinks[0..j) fit with the current main
        for (long long a : mains) {
            while (j > 0 && a + drinks[j - 1] > X) j--;
            if (j == 0) break;
            cnt += j;
        }
        return cnt;
    };
    long long lo = mains[0] + drinks[0], hi = mains[n - 1] + drinks[m - 1];
    while (lo < hi) {
        long long mid = (lo + hi) / 2;
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
    int m;
    cin >> m;
    long long k;
    cin >> k;
    vector<long long> mains(n);
    for (auto& _x : mains) cin >> _x;
    vector<long long> drinks(m);
    for (auto& _x : drinks) cin >> _x;
    cout << solve(n, m, k, mains, drinks) << '\n';
}
