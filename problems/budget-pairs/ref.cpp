#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    long long budget;
    cin >> n >> budget;
    vector<long long> p(n);
    for (auto& x : p) cin >> x;
    sort(p.begin(), p.end());
    long long count = 0;
    int l = 0, r = n - 1;
    while (l < r) {
        if (p[l] + p[r] <= budget) {
            count += r - l;  // p[l] pairs with every index in (l, r]
            l++;
        } else {
            r--;  // p[r] is too expensive for anything left
        }
    }
    cout << count << '\n';
}
