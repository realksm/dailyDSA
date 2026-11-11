import java.io.*;
import java.util.*;

public class Main {
    static long[] solve(int n, int q, int[][] cmds) {
        // Difference array: a command only changes the step at l and at r + 1.
        long[] diff = new long[n + 1];
        for (int[] c : cmds) {
            diff[c[0] - 1] += c[2];
            diff[c[1]] -= c[2];
        }
        long[] lamp = new long[n];
        long cur = 0;
        for (int i = 0; i < n; i++) {
            cur += diff[i];
            lamp[i] = cur;
        }
        return lamp;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int q = in.nextInt();
        int[][] cmds = new int[q][3];
        for (int[] _row : cmds)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        long[] _res = solve(n, q, cmds);
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
