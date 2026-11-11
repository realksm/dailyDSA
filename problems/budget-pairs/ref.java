import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, long budget, long[] price) {
        // After sorting: if the cheapest (l) and the priciest (r) fit, l fits with every index in (l, r].
        Arrays.sort(price);
        long count = 0;
        int l = 0, r = n - 1;
        while (l < r) {
            if (price[l] + price[r] <= budget) { count += r - l; l++; }
            else r--;  // price[r] is too expensive for anything left
        }
        return count;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long budget = in.nextLong();
        long[] price = new long[n];
        for (int _i = 0; _i < price.length; _i++) price[_i] = in.nextLong();
        out.println(solve(n, budget, price));
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
