import java.io.*;
import java.util.*;

public class Main {
    // Segments with at most x genres, counted with a window: ending at r, every start in [l, r].
    static long atMost(int[] g, int x) {
        if (x <= 0) return 0;
        HashMap<Integer, Integer> cnt = new HashMap<>();
        long total = 0;
        int l = 0, distinct = 0;
        for (int r = 0; r < g.length; r++) {
            if (cnt.merge(g[r], 1, Integer::sum) == 1) distinct++;
            while (distinct > x)
                if (cnt.merge(g[l++], -1, Integer::sum) == 0) distinct--;
            total += r - l + 1;
        }
        return total;
    }

    static long solve(int n, int lo, int hi, int[] genre) {
        // Between lo and hi genres = (at most hi) - (at most lo - 1).
        return atMost(genre, hi) - atMost(genre, lo - 1);
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int lo = in.nextInt();
        int hi = in.nextInt();
        int[] genre = new int[n];
        for (int _i = 0; _i < genre.length; _i++) genre[_i] = in.nextInt();
        out.println(solve(n, lo, hi, genre));
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
