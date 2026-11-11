import java.io.*;
import java.util.*;

public class Main {
    static long solve(int n, int m, int[][] a, int[][] b) {
        // Compare the current slot of each list. The one that ends first can't overlap any later slot
        // of the other list (those start after the current one), so drop it.
        long total = 0;
        int i = 0, j = 0;
        while (i < n && j < m) {
            int lo = Math.max(a[i][0], b[j][0]), hi = Math.min(a[i][1], b[j][1]);
            if (hi > lo) total += hi - lo;
            if (a[i][1] < b[j][1]) i++;
            else j++;
        }
        return total;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int m = in.nextInt();
        int[][] a = new int[n][2];
        for (int[] _row : a)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        int[][] b = new int[m][2];
        for (int[] _row : b)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
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
