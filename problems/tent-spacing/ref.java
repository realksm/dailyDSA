import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int k, long[] spot) {
        // If k tents fit D apart, they fit any smaller D apart: binary search the largest D.
        // Check greedily: always pitch on the first spot that is far enough.
        Arrays.sort(spot);
        long lo = 1, hi = spot[n - 1] - spot[0];
        while (lo < hi) {
            long mid = (lo + hi + 1) / 2;  // round up: lo = mid must make progress
            int placed = 1;
            long last = spot[0];
            for (int i = 1; i < n && placed < k; i++)
                if (spot[i] - last >= mid) { placed++; last = spot[i]; }
            if (placed >= k) lo = mid;
            else hi = mid - 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int k = in.nextInt();
        long[] spot = new long[n];
        for (int _i = 0; _i < spot.length; _i++) spot[_i] = in.nextLong();
        out.println(solve(n, k, spot));
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
