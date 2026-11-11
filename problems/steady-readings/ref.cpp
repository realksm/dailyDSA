#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long d, vector<long long>& temp) {
    // Two monotonic deques give the window's max and min; every start in [l, r] is steady.
    deque<int> hi, lo;  // indices; temp decreasing in hi, increasing in lo
    long long count = 0;
    int l = 0;
    for (int r = 0; r < n; r++) {
        while (!hi.empty() && temp[hi.back()] <= temp[r]) hi.pop_back();
        while (!lo.empty() && temp[lo.back()] >= temp[r]) lo.pop_back();
        hi.push_back(r);
        lo.push_back(r);
        while (temp[hi.front()] - temp[lo.front()] > d) {
            l++;
            if (hi.front() < l) hi.pop_front();
            if (lo.front() < l) lo.pop_front();
        }
        count += r - l + 1;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long d;
    cin >> d;
    vector<long long> temp(n);
    for (auto& _x : temp) cin >> _x;
    cout << solve(n, d, temp) << '\n';
}
