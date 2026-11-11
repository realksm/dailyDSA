import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long trips, long[] need) {
        // A bigger tanker never needs more trips: binary search the smallest C that fits.
        long lo = 1, hi = 0;
        for (long w : need) hi = Math.max(hi, w);
        while (lo < hi) {
            long mid = (lo + hi) / 2;
            long t = 0;
            for (long w : need) t += (w + mid - 1) / mid;
            if (t <= trips) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long trips = in.nextLong();
        long[] need = new long[n];
        for (int _i = 0; _i < need.length; _i++) need[_i] = in.nextLong();
        out.println(solve(n, trips, need));
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
