import java.io.*;
import java.util.*;

public class Main {
    static long[] solve(int n, int k, int[] score) {
        // Keep the board as a min-heap of at most k scores with its running total. A new score joins;
        // if the board then holds k + 1 scores, the smallest one drops off. O(n log k).
        PriorityQueue<Integer> board = new PriorityQueue<>();
        long total = 0;
        long[] shown = new long[n];
        for (int i = 0; i < n; i++) {
            board.add(score[i]);
            total += score[i];
            if (board.size() > k) total -= board.poll();
            shown[i] = total;
        }
        return shown;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int k = in.nextInt();
        int[] score = new int[n];
        for (int _i = 0; _i < score.length; _i++) score[_i] = in.nextInt();
        long[] _res = solve(n, k, score);
        for (int _i = 0; _i < _res.length; _i++) {
            if (_i > 0) out.print(' ');
            out.print(_res[_i]);
        }
        out.println();
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
