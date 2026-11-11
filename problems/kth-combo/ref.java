import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, long k, long[] mains, long[] drinks) {
        // The number of combos costing <= X grows with X: binary search the smallest X
        // with at least k of them. Count with two pointers over the sorted lists.
        Arrays.sort(mains);
        Arrays.sort(drinks);
        long lo = mains[0] + drinks[0], hi = mains[n - 1] + drinks[m - 1];
        while (lo < hi) {
            long mid = (lo + hi) / 2;
            long cnt = 0;
            int j = m;  // drinks[0..j) fit with the current main
            for (long a : mains) {
                while (j > 0 && a + drinks[j - 1] > mid) j--;
                if (j == 0) break;
                cnt += j;
            }
            if (cnt >= k) hi = mid;
            else lo = mid + 1;
        }
        return lo;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        long k = in.nextLong();
        long[] mains = new long[n];
        for (int _i = 0; _i < mains.length; _i++) mains[_i] = in.nextLong();
        long[] drinks = new long[m];
        for (int _i = 0; _i < drinks.length; _i++) drinks[_i] = in.nextLong();
        out.println(solve(n, m, k, mains, drinks));
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
