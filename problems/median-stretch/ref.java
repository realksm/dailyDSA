import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int k, long[] reading) {
        // If some stretch has median >= x, it also has median >= anything smaller:
        // binary search the largest x among the readings.
        // Check x: mark days +1 (>= x) / -1 (< x); a stretch works iff its marks sum to > 0.
        long[] vals = reading.clone();
        Arrays.sort(vals);
        int lo = 0, hi = n - 1;  // vals[0] always works
        int[] p = new int[n + 1];
        while (lo < hi) {
            int mid = (lo + hi + 1) / 2;
            if (works(n, k, reading, vals[mid], p)) lo = mid;
            else hi = mid - 1;
        }
        return vals[lo];
    }

    static boolean works(int n, int k, long[] reading, long x, int[] p) {
        for (int i = 0; i < n; i++) p[i + 1] = p[i] + (reading[i] >= x ? 1 : -1);
        int lowest = Integer.MAX_VALUE;  // min of p[0..r-k]
        for (int r = k; r <= n; r++) {
            lowest = Math.min(lowest, p[r - k]);
            if (p[r] > lowest) return true;
        }
        return false;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int k = in.nextInt();
        long[] reading = new long[n];
        for (int _i = 0; _i < reading.length; _i++) reading[_i] = in.nextLong();
        out.println(solve(n, k, reading));
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
