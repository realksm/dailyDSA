import java.io.*;
import java.util.*;

public class Main {
    static long solve(int na, int nb, int nc, long[] a, long[] b, long[] c) {
        // Sort the three lists and keep one index in each. The wait is decided by the earliest and the
        // latest of the three; only moving the earliest one can shrink it, so always move that one.
        Arrays.sort(a);
        Arrays.sort(b);
        Arrays.sort(c);
        long best = Long.MAX_VALUE;
        int i = 0, j = 0, k = 0;
        while (i < na && j < nb && k < nc) {
            long lo = Math.min(a[i], Math.min(b[j], c[k])), hi = Math.max(a[i], Math.max(b[j], c[k]));
            best = Math.min(best, hi - lo);
            if (best == 0) break;
            if (a[i] == lo) i++;
            else if (b[j] == lo) j++;
            else k++;
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int na = in.nextInt();
        int nb = in.nextInt();
        int nc = in.nextInt();
        long[] a = new long[na];
        for (int _i = 0; _i < a.length; _i++) a[_i] = in.nextLong();
        long[] b = new long[nb];
        for (int _i = 0; _i < b.length; _i++) b[_i] = in.nextLong();
        long[] c = new long[nc];
        for (int _i = 0; _i < c.length; _i++) c[_i] = in.nextLong();
        out.println(solve(na, nb, nc, a, b, c));
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
