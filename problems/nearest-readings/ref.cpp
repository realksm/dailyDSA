#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, vector<long long>& a, vector<long long>& b) {
    // Walk both sorted lists together. The smaller of a[i], b[j] can't get any closer to a later
    // value of the other list (those are only bigger), so move its index.
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    long long best = LLONG_MAX;
    int i = 0, j = 0;
    while (i < n && j < m) {
        best = min(best, llabs(a[i] - b[j]));
        if (a[i] < b[j]) i++;
        else j++;
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int m;
    cin >> m;
    vector<long long> a(n);
    for (auto& _x : a) cin >> _x;
    vector<long long> b(m);
    for (auto& _x : b) cin >> _x;
    cout << solve(n, m, a, b) << '\n';
}
