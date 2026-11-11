import java.io.*;
import java.util.*;

public class Main {
    static int[] solve(int n, int[] h) {
        // Keep a stack of towers still waiting for a taller one; their heights never increase from
        // bottom to top. A new tower answers every waiting tower that is shorter than it.
        int[] to = new int[n], waiting = new int[n];
        int top = 0;
        for (int j = 0; j < n; j++) {
            while (top > 0 && h[waiting[top - 1]] < h[j]) to[waiting[--top]] = j + 1;
            waiting[top++] = j;
        }
        return to;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int[] h = new int[n];
        for (int _i = 0; _i < h.length; _i++) h[_i] = in.nextInt();
        int[] _res = solve(n, h);
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
