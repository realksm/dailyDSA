import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int lo, int hi, long[] profit) {
        // Block (s, r] sums to P[r] - P[s] with s in [r - hi, r - lo]: keep the minimum
        // prefix over that sliding range of starts in a deque.
        long[] P = new long[n + 1];
        for (int i = 0; i < n; i++) P[i + 1] = P[i] + profit[i];
        int[] q = new int[n + 1];  // deque of starts, P increasing
        int head = 0, tail = 0;
        long best = Long.MIN_VALUE;
        for (int r = lo; r <= n; r++) {
            int s = r - lo;  // newest start allowed
            while (tail > head && P[q[tail - 1]] >= P[s]) tail--;
            q[tail++] = s;
            if (q[head] < r - hi) head++;
            best = Math.max(best, P[r] - P[q[head]]);
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int lo = in.nextInt();
        int hi = in.nextInt();
        long[] profit = new long[n];
        for (int _i = 0; _i < profit.length; _i++) profit[_i] = in.nextLong();
        out.println(solve(n, lo, hi, profit));
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
