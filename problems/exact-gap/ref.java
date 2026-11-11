import java.io.*;
import java.util.*;

public class Main {
    static void solve(int n, long k, long[] a) {
        // Sort the positions by value, then walk two pointers over that order. lo trails hi:
        // moving hi up makes the gap a[hi] - a[lo] bigger, moving lo up makes it smaller.
        Integer[] idx = new Integer[n];
        for (int i = 0; i < n; i++) idx[i] = i;
        Arrays.sort(idx, (x, y) -> Long.compare(a[x], a[y]));
        int lo = 0, hi = 0;
        while (hi < n) {
            if (lo == hi) { hi++; continue; }  // i and j must be different positions
            long gap = a[idx[hi]] - a[idx[lo]];
            if (gap == k) {
                out.println((idx[lo] + 1) + " " + (idx[hi] + 1));
                return;
            }
            if (gap < k) hi++;  // too small: widen
            else lo++;          // too big: narrow
        }
        out.println(-1);
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long k = in.nextLong();
        long[] a = new long[n];
        for (int _i = 0; _i < a.length; _i++) a[_i] = in.nextLong();
        solve(n, k, a);
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
