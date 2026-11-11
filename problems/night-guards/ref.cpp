#include <bits/stdc++.h>
using namespace std;

long long solve(int n, int m, vector<long long>& guard, vector<long long>& lamp) {
    // More time never hurts: binary search the smallest T that is enough.
    // Check T greedily from the west: the westmost unchecked lamp must be taken by the
    // westmost guard that still can (guards further east would reach it later).
    sort(guard.begin(), guard.end());
    sort(lamp.begin(), lamp.end());
    auto enough = [&](long long T) {
        int j = 0;  // lamps [0, j) are checked
        for (long long h : guard) {
            if (j == m) break;
            long long reach;  // how far east this guard gets
            if (lamp[j] < h) {
                long long d = h - lamp[j];
                if (d > T) return false;  // nobody further east can do better
                // west first then back east, or east first then back west
                reach = h + max(T - 2 * d, (T - d) / 2);
            } else {
                reach = h + T;
            }
            while (j < m && lamp[j] <= reach) j++;
        }
        return j == m;
    };
    long long lo = 0, hi = 2'000'000'000LL;  // one guard can walk the whole quay twice
    while (lo < hi) {
        long long mid = (lo + hi) / 2;
        if (enough(mid)) hi = mid;
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
    vector<long long> guard(n);
    for (auto& _x : guard) cin >> _x;
    vector<long long> lamp(m);
    for (auto& _x : lamp) cin >> _x;
    cout << solve(n, m, guard, lamp) << '\n';
}
