import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long m, long[] change) {
        // Days l..r work when prefixes P[r] and P[l-1] leave the same remainder mod m.
        HashMap<Long, Long> seen = new HashMap<>();
        seen.put(0L, 1L);  // the empty prefix
        long prefix = 0, count = 0;
        for (int i = 0; i < n; i++) {
            prefix += change[i];
            long rem = ((prefix % m) + m) % m;
            long c = seen.getOrDefault(rem, 0L);
            count += c;
            seen.put(rem, c + 1);
        }
        return count;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long m = in.nextLong();
        long[] change = new long[n];
        for (int _i = 0; _i < change.length; _i++) change[_i] = in.nextLong();
        out.println(solve(n, m, change));
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
