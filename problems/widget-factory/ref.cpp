#include <bits/stdc++.h>
using namespace std;

long long solve(int m, long long goal, vector<long long>& secs) {
    // More time never means fewer widgets: binary search the smallest T.
    // Stop each count at goal, so it can't overflow.
    long long lo = 1, hi = *min_element(secs.begin(), secs.end()) * goal;
    while (lo < hi) {
        long long mid = lo + (hi - lo) / 2;
        long long made = 0;
        for (long long s : secs) {
            made += mid / s;
            if (made >= goal) break;
        }
        if (made >= goal) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int m;
    cin >> m;
    long long goal;
    cin >> goal;
    vector<long long> secs(m);
    for (auto& _x : secs) cin >> _x;
    cout << solve(m, goal, secs) << '\n';
}
