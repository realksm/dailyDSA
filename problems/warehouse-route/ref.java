import java.io.*;
import java.util.*;

public class Main {
    static int solve(int r, int c, String[] grid) {
        // Breadth-first search from S: cells leave the queue in order of distance, so the first time
        // a cell is reached is along a shortest route. Each cell is visited once: O(r * c).
        int[] dist = new int[r * c], queue = new int[r * c];
        Arrays.fill(dist, -1);
        int head = 0, tail = 0;
        for (int y = 0; y < r; y++)
            for (int x = 0; x < c; x++)
                if (grid[y].charAt(x) == 'S') { dist[y * c + x] = 0; queue[tail++] = y * c + x; }
        int[] dy = {-1, 1, 0, 0}, dx = {0, 0, -1, 1};
        while (head < tail) {
            int cell = queue[head++], y = cell / c, x = cell % c;
            if (grid[y].charAt(x) == 'E') return dist[cell];
            for (int d = 0; d < 4; d++) {
                int ny = y + dy[d], nx = x + dx[d];
                if (ny < 0 || ny >= r || nx < 0 || nx >= c || grid[ny].charAt(nx) == '#') continue;
                if (dist[ny * c + nx] == -1) {
                    dist[ny * c + nx] = dist[cell] + 1;
                    queue[tail++] = ny * c + nx;
                }
            }
        }
        return -1;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int r = in.nextInt();
        int c = in.nextInt();
        String[] grid = new String[r];
        for (int _i = 0; _i < grid.length; _i++) grid[_i] = in.next();
        out.println(solve(r, c, grid));
        out.flush();
    }

    static final PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out), 1 << 16));

    /** Fast whitespace-separated token reader. */
    static final class FastReader {
        private final InputStream in;
        private final byte[] buf = new byte[1 << 16];
        private int len = 0, ptr = 0;

        FastReader(InputStream in) { this.in = in; }

        private int read() throws IOException {
            if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++] & 0xff;
        }

        private int skip() throws IOException {
            int c = read();
            while (c != -1 && c <= ' ') c = read();
            return c;
        }

        String next() throws IOException {
            StringBuilder sb = new StringBuilder();
            for (int c = skip(); c > ' '; c = read()) sb.append((char) c);
            return sb.toString();
        }

        long nextLong() throws IOException {
            int c = skip();
            boolean neg = c == '-';
            if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }

        int nextInt() throws IOException { return (int) nextLong(); }
    }
}
