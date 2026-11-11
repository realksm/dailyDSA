import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, long[] guard, long[] lamp) {
        // More time never hurts: binary search the smallest T that is enough.
        Arrays.sort(guard);
        Arrays.sort(lamp);
        long lo = 0, hi = 2_000_000_000L;  // one guard can walk the whole quay twice
        while (lo < hi) {
            long mid = (lo + hi) / 2;
            if (enough(guard, lamp, mid)) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    // Greedy from the west: the westmost unchecked lamp must be taken by the westmost
    // guard that still can (guards further east would reach it later).
    static boolean enough(long[] guard, long[] lamp, long T) {
        int m = lamp.length, j = 0;  // lamps [0, j) are checked
        for (long h : guard) {
            if (j == m) break;
            long reach;  // how far east this guard gets
            if (lamp[j] < h) {
                long d = h - lamp[j];
                if (d > T) return false;  // nobody further east can do better
                // west first then back east, or east first then back west
                reach = h + Math.max(T - 2 * d, (T - d) / 2);
            } else {
                reach = h + T;
            }
            while (j < m && lamp[j] <= reach) j++;
        }
        return j == m;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        long[] guard = new long[n];
        for (int _i = 0; _i < guard.length; _i++) guard[_i] = in.nextLong();
        long[] lamp = new long[m];
        for (int _i = 0; _i < lamp.length; _i++) lamp[_i] = in.nextLong();
        out.println(solve(n, m, guard, lamp));
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
