import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, long p, long[] amount) {
        // The removed block (l, r] must sum to need = total mod p, i.e.
        // P[l] = P[r] - need (mod p): keep the latest index of every prefix remainder.
        long total = 0;
        for (long x : amount) total += x;
        long need = total % p;
        if (need == 0) return 0;
        HashMap<Long, Integer> last = new HashMap<>();
        last.put(0L, 0);
        long pre = 0;
        int best = n;
        for (int r = 1; r <= n; r++) {
            pre = (pre + amount[r - 1]) % p;
            Integer l = last.get((pre - need + p) % p);
            if (l != null) best = Math.min(best, r - l);
            last.put(pre, r);
        }
        return best < n ? best : -1;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long p = in.nextLong();
        long[] amount = new long[n];
        for (int _i = 0; _i < amount.length; _i++) amount[_i] = in.nextLong();
        out.println(solve(n, p, amount));
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
