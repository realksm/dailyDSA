import java.io.*;
import java.util.*;

public class Main {
    static int solve(int n, int k, int[] bird) {
        // Slide a window of k sightings: count how often each species is inside it and how many species
        // have a count above zero. Species ids are big, so they are first renumbered 0..d-1 by sorting.
        int[] sorted = bird.clone();
        Arrays.sort(sorted);
        int[] id = new int[n];
        for (int i = 0; i < n; i++) id[i] = Arrays.binarySearch(sorted, bird[i]);
        int[] inside = new int[n];
        int species = 0, best = 0;
        for (int i = 0; i < n; i++) {
            if (inside[id[i]]++ == 0) species++;
            if (i >= k && --inside[id[i - k]] == 0) species--;
            if (i >= k - 1) best = Math.max(best, species);
        }
        return best;
    }

    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        int k = in.nextInt();
        int[] bird = new int[n];
        for (int _i = 0; _i < bird.length; _i++) bird[_i] = in.nextInt();
        out.println(solve(n, k, bird));
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
