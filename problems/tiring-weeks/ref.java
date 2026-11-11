import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, int limit, int[] hours) {
        // Heavy = +1, light = -1. Steps of 1 from 0 mean the first prefix below P[r]
        // is the first P[r] - 1, so that is the best start.
        int[] first = new int[2 * n + 2];  // first index of prefix value v, at v + n + 1
        Arrays.fill(first, -1);
        int P = 0, best = 0;
        for (int r = 1; r <= n; r++) {
            P += hours[r - 1] > limit ? 1 : -1;
            if (P > 0) best = r;
            else if (first[P - 1 + n + 1] >= 0) best = Math.max(best, r - first[P - 1 + n + 1]);
            if (first[P + n + 1] < 0) first[P + n + 1] = r;
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int limit = in.nextInt();
        int[] hours = new int[n];
        for (int _i = 0; _i < hours.length; _i++) hours[_i] = in.nextInt();
        out.println(solve(n, limit, hours));
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
