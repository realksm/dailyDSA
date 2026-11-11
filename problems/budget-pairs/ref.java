import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long budget = in.nextLong();
        long[] p = new long[n];
        for (int i = 0; i < n; i++) p[i] = in.nextLong();
        Arrays.sort(p);
        long count = 0;
        int l = 0, r = n - 1;
        while (l < r) {
            if (p[l] + p[r] <= budget) { count += r - l; l++; }
            else r--;
        }
        System.out.println(count);
    }

    static final class FastReader {
        private final InputStream in;
        private final byte[] buf = new byte[1 << 16];
        private int len = 0, ptr = 0;

        FastReader(InputStream in) { this.in = in; }

        private int read() throws IOException {
            if (ptr == len) { len = in.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++];
        }

        long nextLong() throws IOException {
            int c = read();
            while (c != '-' && (c < '0' || c > '9')) c = read();
            boolean neg = c == '-';
            if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }

        int nextInt() throws IOException { return (int) nextLong(); }
    }
}
