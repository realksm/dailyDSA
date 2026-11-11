#include <bits/stdc++.h>
using namespace std;

// Segments with at most x genres, counted with a window: ending at r, every start in [l, r].
static long long atMost(const vector<int>& g, int x) {
    if (x <= 0) return 0;
    unordered_map<int, int> cnt;
    cnt.reserve(g.size() * 2);
    long long total = 0;
    int l = 0, distinct = 0;
    for (int r = 0; r < (int)g.size(); r++) {
        if (cnt[g[r]]++ == 0) distinct++;
        while (distinct > x)
            if (--cnt[g[l++]] == 0) distinct--;
        total += r - l + 1;
    }
    return total;
}

long long solve(int n, int lo, int hi, vector<int>& genre) {
    // Between lo and hi genres = (at most hi) - (at most lo - 1).
    return atMost(genre, hi) - atMost(genre, lo - 1);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int lo;
    cin >> lo;
    int hi;
    cin >> hi;
    vector<int> genre(n);
    for (auto& _x : genre) cin >> _x;
    cout << solve(n, lo, hi, genre) << '\n';
}
