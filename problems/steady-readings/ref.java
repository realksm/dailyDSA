import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long d, long[] temp) {
        // Two monotonic deques give the window's max and min; every start in [l, r] is steady.
        int[] hi = new int[n], lo = new int[n];  // deques of indices as arrays
        int hh = 0, ht = 0, lh = 0, lt = 0;
        long count = 0;
        int l = 0;
        for (int r = 0; r < n; r++) {
            while (ht > hh && temp[hi[ht - 1]] <= temp[r]) ht--;
            while (lt > lh && temp[lo[lt - 1]] >= temp[r]) lt--;
            hi[ht++] = r;
            lo[lt++] = r;
            while (temp[hi[hh]] - temp[lo[lh]] > d) {
                l++;
                if (hi[hh] < l) hh++;
                if (lo[lh] < l) lh++;
            }
            count += r - l + 1;
        }
        return count;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long d = in.nextLong();
        long[] temp = new long[n];
        for (int _i = 0; _i < temp.length; _i++) temp[_i] = in.nextLong();
        out.println(solve(n, d, temp));
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
