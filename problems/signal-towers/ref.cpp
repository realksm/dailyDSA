#include <bits/stdc++.h>
using namespace std;

vector<int> solve(int n, vector<int>& h) {
    // Keep a stack of towers still waiting for a taller one; their heights never increase from
    // bottom to top. A new tower answers every waiting tower that is shorter than it.
    vector<int> to(n, 0), waiting;
    for (int j = 0; j < n; j++) {
        while (!waiting.empty() && h[waiting.back()] < h[j]) {
            to[waiting.back()] = j + 1;
            waiting.pop_back();
        }
        waiting.push_back(j);
    }
    return to;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    vector<int> h(n);
    for (auto& _x : h) cin >> _x;
    auto _res = solve(n, h);
    for (size_t _i = 0; _i < _res.size(); _i++) cout << (_i ? " " : "") << _res[_i];
    cout << '\n';
}
