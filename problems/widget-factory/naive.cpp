// Brute force: simulate widget by widget with a heap of next finish times. O(G log m), G up to 1e9.
#include <bits/stdc++.h>
using namespace std;

int main() {
    int m;
    long long goal;
    scanf("%d %lld", &m, &goal);
    priority_queue<pair<long long, long long>, vector<pair<long long, long long>>, greater<>> pq;
    for (int i = 0; i < m; i++) {
        long long s;
        scanf("%lld", &s);
        pq.push({s, s});
    }
    long long t = 0;
    for (long long made = 0; made < goal; made++) {
        auto [at, s] = pq.top();
        pq.pop();
        t = at;
        pq.push({at + s, s});
    }
    printf("%lld\n", t);
}
