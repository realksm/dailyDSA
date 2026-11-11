import java.io.*;
import java.util.*;

public class Main {
    static long solve(int m, long goal, long[] secs) {
        // More time never means fewer widgets: binary search the smallest T.
        // Stop each count at goal, so it can't overflow.
        long fastest = Long.MAX_VALUE;
        for (long s : secs) fastest = Math.min(fastest, s);
        long lo = 1, hi = fastest * goal;
        while (lo < hi) {
            long mid = lo + (hi - lo) / 2;
            long made = 0;
            for (long s : secs) {
                made += mid / s;
                if (made >= goal) break;
            }
            if (made >= goal) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int m = in.nextInt();
        long goal = in.nextLong();
        long[] secs = new long[m];
        for (int _i = 0; _i < secs.length; _i++) secs[_i] = in.nextLong();
        out.println(solve(m, goal, secs));
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
