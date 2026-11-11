import java.io.*;
import java.util.*;

public class Main {
    // days(x) = days the greedy walk needs if no day may exceed x
    static int days(long[] dist, long x) {
        int used = 1;
        long cur = 0;
        for (long v : dist) {
            if (cur + v > x) { used++; cur = 0; }
            cur += v;
        }
        return used;
    }

    static long solve(int n, int d, long[] dist) {
        // If a longest day of x fits in d days, any bigger x does too: binary search the smallest x.
        long lo = 0, hi = 0;
        for (long v : dist) { lo = Math.max(lo, v); hi += v; }
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            if (days(dist, mid) <= d) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int d = in.nextInt();
        long[] dist = new long[n];
        for (int _i = 0; _i < dist.length; _i++) dist[_i] = in.nextLong();
        out.println(solve(n, d, dist));
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
