// Brute force: pop the k cheapest combos off a heap one by one. O((m + k) log m), k up to 1e10.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, m;
    long long k;
    scanf("%d %d %lld", &n, &m, &k);
    vector<long long> a(n), b(m);
    for (auto& x : a) scanf("%lld", &x);
    for (auto& x : b) scanf("%lld", &x);
    sort(a.begin(), a.end());
    // (price, main index, drink index): each drink starts with the cheapest main.
    priority_queue<tuple<long long, int, int>, vector<tuple<long long, int, int>>, greater<>> pq;
    for (int j = 0; j < m; j++) pq.push({a[0] + b[j], 0, j});
    long long price = 0;
    for (long long t = 0; t < k; t++) {
        auto [p, i, j] = pq.top();
        pq.pop();
        price = p;
        if (i + 1 < n) pq.push({a[i + 1] + b[j], i + 1, j});
    }
    printf("%lld\n", price);
}
