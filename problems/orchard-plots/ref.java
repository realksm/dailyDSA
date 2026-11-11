import java.io.*;
import java.util.*;

public class Main {
    static long[] solve(int rows, int cols, int[][] trees, int q, int[][] plots) {
        // S[i][j] = trees in rows 1..i, columns 1..j; a plot is four corners of S.
        long[][] S = new long[rows + 1][cols + 1];
        for (int i = 1; i <= rows; i++)
            for (int j = 1; j <= cols; j++)
                S[i][j] = trees[i - 1][j - 1] + S[i - 1][j] + S[i][j - 1] - S[i - 1][j - 1];
        long[] ans = new long[q];
        for (int k = 0; k < q; k++) {
            int r1 = plots[k][0], c1 = plots[k][1], r2 = plots[k][2], c2 = plots[k][3];
            ans[k] = S[r2][c2] - S[r1 - 1][c2] - S[r2][c1 - 1] + S[r1 - 1][c1 - 1];
        }
        return ans;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int rows = in.nextInt();
        int cols = in.nextInt();
        int[][] trees = new int[rows][cols];
        for (int[] _row : trees)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        int q = in.nextInt();
        int[][] plots = new int[q][4];
        for (int[] _row : plots)
            for (int _j = 0; _j < _row.length; _j++) _row[_j] = in.nextInt();
        for (long _v : solve(rows, cols, trees, q, plots)) out.println(_v);
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
