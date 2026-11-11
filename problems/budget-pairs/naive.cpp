// Brute force: try every pair. O(n^2) — must TLE on the max tests.
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
    long long count = 0;
    for (int i = 0; i < n; i++)
        for (int j = i + 1; j < n; j++)
            if (p[i] + p[j] <= budget) count++;
    cout << count << '\n';
}
