#include <bits/stdc++.h>
using namespace std;

int solve(int n, int k, vector<int>& bird) {
    // Slide a window of k sightings: count how often each species is inside it and how many species
    // have a count above zero. Each step adds one sighting and removes one: O(n) map updates.
    unordered_map<int, int> inside;
    inside.reserve(2 * k);
    int species = 0, best = 0;
    for (int i = 0; i < n; i++) {
        if (inside[bird[i]]++ == 0) species++;
        if (i >= k && --inside[bird[i - k]] == 0) species--;
        if (i >= k - 1) best = max(best, species);
    }
    return best;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    cin >> n;
    int k;
    cin >> k;
    vector<int> bird(n);
    for (auto& _x : bird) cin >> _x;
    cout << solve(n, k, bird) << '\n';
}
