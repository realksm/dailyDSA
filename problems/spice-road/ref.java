import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, int kinds, int[] spice) {
        // While [l, r] still has every kind, record it and shrink from the left.
        int[] cnt = new int[kinds + 1];
        int covered = 0, l = 0, best = n;
        for (int r = 0; r < n; r++) {
            if (cnt[spice[r]]++ == 0) covered++;
            while (covered == kinds) {
                best = Math.min(best, r - l + 1);
                if (--cnt[spice[l++]] == 0) covered--;
            }
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int kinds = in.nextInt();
        int[] spice = new int[n];
        for (int _i = 0; _i < spice.length; _i++) spice[_i] = in.nextInt();
        out.println(solve(n, kinds, spice));
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
