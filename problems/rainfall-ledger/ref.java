import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        int n = in.nextInt(), q = in.nextInt();
        long[] prefix = new long[n + 1];
        for (int i = 0; i < n; i++) prefix[i + 1] = prefix[i] + in.nextLong();
        StringBuilder sb = new StringBuilder();
        for (int k = 0; k < q; k++) {
            int l = in.nextInt(), r = in.nextInt();
            sb.append(prefix[r] - prefix[l - 1]).append('\n');
        }
        PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));
        out.print(sb);
        out.flush();
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
