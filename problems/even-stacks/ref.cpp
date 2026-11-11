#include <bits/stdc++.h>
using namespace std;

long long solve(int n, vector<long long>& a) {
    // Build a stack at each end. Equal: they match, start new ones further in. Otherwise the lighter
    // side can only get heavier by merging in its next stack.
    long long merges = 0;
    int l = 0, r = n - 1;
    long long left = a[l], right = a[r];
    while (l < r) {
        if (left == right) {
            l++, r--;
            if (l < r) left = a[l], right = a[r];
        } else if (left < right) {
            left += a[++l];
            merges++;
        } else {
            right += a[--r];
            merges++;
        }
    }
    return merges;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<long long> a(n);
    for (auto& _x : a) cin >> _x;
    cout << solve(n, a) << '\n';
}
