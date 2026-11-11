import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long[] a) {
        // Build a stack at each end. Equal: they match, start new ones further in. Otherwise the lighter
        // side can only get heavier by merging in its next stack.
        long merges = 0;
        int l = 0, r = n - 1;
        long left = a[l], right = a[r];
        while (l < r) {
            if (left == right) {
                l++;
                r--;
                if (l < r) { left = a[l]; right = a[r]; }
            } else if (left < right) {
                left += a[++l];
                merges++;
            } else {
                right += a[--r];
                merges++;
            }
        }
        return merges;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long[] a = new long[n];
        for (int _i = 0; _i < a.length; _i++) a[_i] = in.nextLong();
        out.println(solve(n, a));
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
