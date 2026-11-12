#include <bits/stdc++.h>
using namespace std;

int solve(int r, int c, vector<string>& grid) {
    // Breadth-first search from S: cells leave the queue in order of distance, so the first time
    // a cell is reached is along a shortest route. Each cell is visited once: O(r * c).
    vector<int> dist(r * c, -1);
    queue<int> q;
    for (int y = 0; y < r; y++)
        for (int x = 0; x < c; x++)
            if (grid[y][x] == 'S') dist[y * c + x] = 0, q.push(y * c + x);
    const int dy[] = {-1, 1, 0, 0}, dx[] = {0, 0, -1, 1};
    while (!q.empty()) {
        int cell = q.front();
        q.pop();
        int y = cell / c, x = cell % c;
        if (grid[y][x] == 'E') return dist[cell];
        for (int d = 0; d < 4; d++) {
            int ny = y + dy[d], nx = x + dx[d];
            if (ny < 0 || ny >= r || nx < 0 || nx >= c || grid[ny][nx] == '#') continue;
            if (dist[ny * c + nx] == -1) {
                dist[ny * c + nx] = dist[cell] + 1;
                q.push(ny * c + nx);
            }
        }
    }
    return -1;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int r;
    cin >> r;
    int c;
    cin >> c;
    vector<string> grid(r);
    for (auto& _x : grid) cin >> _x;
    cout << solve(r, c, grid) << '\n';
}
