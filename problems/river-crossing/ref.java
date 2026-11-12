import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, int m, int[] strides, String s) {
        // ways[p] = number of ways to stand on spot p. Every jump from a reachable spot either lands on
        // a stone (add ways[p] to it) or passes spot n (add ways[p] to the answer). Spot 0 is the bank.
        final long MOD = 1_000_000_007L;
        long[] ways = new long[n + 1];
        ways[0] = 1;
        long crossings = 0;
        for (int p = 0; p <= n; p++) {
            if (ways[p] == 0) continue;
            for (int d : strides) {
                long q = (long) p + d;
                if (q > n) crossings = (crossings + ways[p]) % MOD;
                else if (s.charAt((int) q - 1) == 'o') ways[(int) q] = (ways[(int) q] + ways[p]) % MOD;
            }
        }
        return (int) crossings;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        int[] strides = new int[m];
        for (int _i = 0; _i < strides.length; _i++) strides[_i] = in.nextInt();
        String s = in.next();
        out.println(solve(n, m, strides, s));
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
