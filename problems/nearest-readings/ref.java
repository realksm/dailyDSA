import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, long[] a, long[] b) {
        // Walk both sorted lists together. The smaller of a[i], b[j] can't get any closer to a later
        // value of the other list (those are only bigger), so move its index.
        Arrays.sort(a);
        Arrays.sort(b);
        long best = Long.MAX_VALUE;
        int i = 0, j = 0;
        while (i < n && j < m) {
            best = Math.min(best, Math.abs(a[i] - b[j]));
            if (a[i] < b[j]) i++;
            else j++;
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        long[] a = new long[n];
        for (int _i = 0; _i < a.length; _i++) a[_i] = in.nextLong();
        long[] b = new long[m];
        for (int _i = 0; _i < b.length; _i++) b[_i] = in.nextLong();
        out.println(solve(n, m, a, b));
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
