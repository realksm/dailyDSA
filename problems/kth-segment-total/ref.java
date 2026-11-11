import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long k, long[] takings) {
        // The number of runs with total <= X grows with X: binary search the smallest X
        // with at least k of them. Takings are positive, so count with a sliding window.
        long lo = Long.MAX_VALUE, hi = 0;
        for (long t : takings) { lo = Math.min(lo, t); hi += t; }
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            long cnt = 0, sum = 0;
            int l = 0;
            for (int r = 0; r < n; r++) {
                sum += takings[r];
                while (sum > mid) sum -= takings[l++];
                cnt += r - l + 1;  // runs ending at r that start at l..r
            }
            if (cnt >= k) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long k = in.nextLong();
        long[] takings = new long[n];
        for (int _i = 0; _i < takings.length; _i++) takings[_i] = in.nextLong();
        out.println(solve(n, k, takings));
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
