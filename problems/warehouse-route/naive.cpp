// Brute force: start with dist = infinity everywhere but S, then sweep the whole grid row by row,
// relaxing each cell from its four neighbours, until a sweep changes nothing. Distances that must
// travel left or up advance only one cell per sweep, so a winding corridor needs ~r*c sweeps of
// r*c cells each — must TLE on the 500 x 500 snakes.
#include <bits/stdc++.h>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int r, c;
    cin >> r >> c;
    vector<string> g(r);
    for (auto& row : g) cin >> row;
    const long long INF = LLONG_MAX / 4;
    vector<vector<long long>> dist(r, vector<long long>(c, INF));
    int ey = 0, ex = 0;
    for (int y = 0; y < r; y++)
        for (int x = 0; x < c; x++) {
            if (g[y][x] == 'S') dist[y][x] = 0;
            if (g[y][x] == 'E') ey = y, ex = x;
        }
    const int dy[] = {-1, 1, 0, 0}, dx[] = {0, 0, -1, 1};
    for (bool changed = true; changed;) {
        changed = false;
        for (int y = 0; y < r; y++)
            for (int x = 0; x < c; x++) {
                if (g[y][x] == '#') continue;
                for (int d = 0; d < 4; d++) {
                    int ny = y + dy[d], nx = x + dx[d];
                    if (ny < 0 || ny >= r || nx < 0 || nx >= c || g[ny][nx] == '#') continue;
                    if (dist[ny][nx] + 1 < dist[y][x]) dist[y][x] = dist[ny][nx] + 1, changed = true;
                }
            }
    }
    cout << (dist[ey][ex] >= INF ? -1 : dist[ey][ex]) << '\n';
}
