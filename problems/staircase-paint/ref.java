import java.io.*;
import java.util.*;

public class Main {
    static long[] solve(int n, int q, int[][] ops) {
        // Step (l, r, v) adds v * i - v * (l - 1) to column i in [l, r]: keep two
        // difference arrays, one for the slope (times i) and one for the constant.
        long[] slope = new long[n + 2], base = new long[n + 2];
        for (int[] o : ops) {
            long l = o[0], v = o[2];
            int r = o[1];
            slope[(int) l] += v;
            slope[r + 1] -= v;
            base[(int) l] -= v * (l - 1);
            base[r + 1] += v * (l - 1);
        }
        long[] h = new long[n];
        long s = 0, b = 0;
        for (int i = 1; i <= n; i++) {
            s += slope[i];
            b += base[i];
            h[i - 1] = s * i + b;
        }
        return h;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int q = in.nextInt();
        int[][] ops = new int[q][3];
        for (int[] _row : ops)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        long[] _res = solve(n, q, ops);
        for (int _i = 0; _i < _res.length; _i++) {
            if (_i > 0) out.print(' ');
            out.print(_res[_i]);
        }
        out.println();
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
