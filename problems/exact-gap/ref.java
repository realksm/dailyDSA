import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt();
        long k = in.nextLong();
        // Pack (value, position) into one long so a primitive sort orders by value:
        // values fit in 31 bits after shifting by 1e9, positions in 18 bits.
        long[] packed = new long[n];
        for (int i = 0; i < n; i++) packed[i] = ((in.nextLong() + 1_000_000_000L) << 20) | (i + 1);
        Arrays.sort(packed);
        int lo = 0, hi = 0;
        while (hi < n) {
            if (lo == hi) { hi++; continue; }
            long d = (packed[hi] >> 20) - (packed[lo] >> 20);
            if (d == k) {
                System.out.println((packed[lo] & 0xFFFFF) + " " + (packed[hi] & 0xFFFFF));
                return;
            }
            if (d < k) hi++;
            else lo++;
        }
        System.out.println(-1);
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
