#include <bits/stdc++.h>
using namespace std;

long long solve(int n, long long budget, vector<long long>& price) {
    // After sorting: if the cheapest (l) and the priciest (r) fit, l fits with every index in (l, r].
    sort(price.begin(), price.end());
    long long count = 0;
    int l = 0, r = n - 1;
    while (l < r) {
        if (price[l] + price[r] <= budget) { count += r - l; l++; }
        else r--;  // price[r] is too expensive for anything left
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    long long budget;
    cin >> budget;
    vector<long long> price(n);
    for (auto& _x : price) cin >> _x;
    cout << solve(n, budget, price) << '\n';
}
