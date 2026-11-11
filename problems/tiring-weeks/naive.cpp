// Brute force: every start, extend with a running heavy-minus-light balance. O(n^2).
#include <bits/stdc++.h>
using namespace std;

int main() {
    int n, L;
    scanf("%d %d", &n, &L);
    vector<int> h(n);
    for (auto& x : h) scanf("%d", &x);
    int best = 0;
    for (int s = 0; s < n; s++) {
        long long bal = 0;
        for (int j = s; j < n; j++) {
            bal += h[j] > L ? 1 : -1;
            if (bal > 0 && j - s + 1 > best) best = j - s + 1;
        }
    }
    printf("%d\n", best);
}
