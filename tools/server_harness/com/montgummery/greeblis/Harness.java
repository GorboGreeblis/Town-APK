package com.montgummery.greeblis;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

/**
 * Runs the APK's GameServer on a desktop JVM, serving any HTML file.
 *
 *   --check   fetch the document back and verify it is byte-identical, plus
 *             HEAD / 404 / 405 / query-string behaviour. Exit 1 on any failure.
 *   --serve   keep serving until killed, so the game can be opened in a desktop
 *             browser exactly as the Quest Browser will see it.
 */
public final class Harness {
    public static void main(String[] args) throws Exception {
        if (args.length < 2) {
            System.err.println("usage: Harness <file.html> --check | --serve");
            System.exit(2);
        }
        byte[] doc = Files.readAllBytes(Path.of(args[0]));
        String print = GameServer.sha256Fingerprint("not a real certificate".getBytes());
        String links = GameServer.assetLinksJson("com.montgummery.greeblis", new String[]{print});
        GameServer server = new GameServer(doc, links);
        System.out.println("URL " + server.url());
        if (args[1].equals("--serve")) {
            Thread.currentThread().join();
            return;
        }
        int failures = 0;
        failures += expect("GET / is byte-identical", Arrays.equals(fetch(server.url(), "GET").body, doc));
        Resp r = fetch(server.url(), "GET");
        failures += expect("GET / status 200", r.status == 200);
        failures += expect("GET / content-type html utf-8", "text/html; charset=utf-8".equals(r.type));
        failures += expect("GET / content-length matches", r.length == doc.length);
        failures += expect("GET /index.html identical", Arrays.equals(fetch(server.url() + "index.html", "GET").body, doc));
        failures += expect("GET /?launch=x ignores query", Arrays.equals(fetch(server.url() + "?launch=x", "GET").body, doc));
        Resp h = fetch(server.url(), "HEAD");
        failures += expect("HEAD / status 200, empty body", h.status == 200 && h.body.length == 0 && h.length == doc.length);
        failures += expect("GET /nope is 404", fetch(server.url() + "nope", "GET").status == 404);
        failures += expect("GET /favicon.ico is 404", fetch(server.url() + "favicon.ico", "GET").status == 404);
        failures += expect("POST / is 405", fetch(server.url(), "POST").status == 405);
        Resp al = fetch(server.url() + ".well-known/assetlinks.json", "GET");
        String alBody = new String(al.body, "UTF-8");
        failures += expect("GET /.well-known/assetlinks.json is 200 application/json", al.status == 200 && "application/json".equals(al.type));
        failures += expect("assetlinks names the package, the handle_all_urls relation and the certificate fingerprint",
                alBody.contains("\"package_name\":\"com.montgummery.greeblis\"")
                && alBody.contains("delegate_permission/common.handle_all_urls")
                && alBody.contains("\"sha256_cert_fingerprints\":[\"" + print + "\"]"));
        failures += expect("fingerprint is 32 colon-separated upper-case hex bytes", print.matches("([0-9A-F]{2}:){31}[0-9A-F]{2}"));
        failures += expect("HEAD /.well-known/assetlinks.json is 200, empty body", fetch(server.url() + ".well-known/assetlinks.json", "HEAD").status == 200);
        failures += expect("POST /.well-known/assetlinks.json is 405", fetch(server.url() + ".well-known/assetlinks.json", "POST").status == 405);
        failures += expect("addressed as http://localhost:" + server.port(), server.url().startsWith("http://localhost:"));
        String et = server.etag();
        failures += expect("GET / carries a strong ETag", et != null && et.startsWith("\"") && rawHead(server.port(), "HEAD / HTTP/1.1\r\nHost: x\r\n\r\n").contains("ETag: " + et));
        failures += expect("GET / is cacheable with revalidation (Cache-Control: no-cache)", rawHead(server.port(), "HEAD / HTTP/1.1\r\nHost: x\r\n\r\n").contains("Cache-Control: no-cache"));
        failures += expect("If-None-Match with the current ETag gets 304", raw(server.port(), "GET / HTTP/1.1\r\nHost: x\r\nIf-None-Match: " + et + "\r\n\r\n").startsWith("HTTP/1.1 304"));
        failures += expect("If-None-Match with a stale ETag gets the document", raw(server.port(), "GET / HTTP/1.1\r\nHost: x\r\nIf-None-Match: \"stale\"\r\n\r\n").startsWith("HTTP/1.1 200"));
        // Ten quick parallel fetches: the server spawns a thread per connection.
        Thread[] ts = new Thread[10];
        final boolean[] ok = new boolean[10];
        for (int i = 0; i < 10; i++) {
            final int k = i;
            ts[i] = new Thread(() -> {
                try { ok[k] = Arrays.equals(fetch(server.url(), "GET").body, doc); } catch (Exception e) { ok[k] = false; }
            });
            ts[i].start();
        }
        for (Thread t : ts) t.join();
        boolean all = true;
        for (boolean b : ok) all &= b;
        failures += expect("10 concurrent fetches identical", all);
        // Robustness: nothing below should take the server down; the real GET afterwards must still work.
        failures += expect("garbage request line gets a response or clean close", rawOk(server.port(), "\u00ff\u00fe garbage\r\n\r\n"));
        failures += expect("empty connection closes cleanly", rawOk(server.port(), ""));
        failures += expect("HTTP/1.0 GET served", raw(server.port(), "GET / HTTP/1.0\r\n\r\n").startsWith("HTTP/1.1 200"));
        failures += expect("path traversal /../index.html is 404", raw(server.port(), "GET /../index.html HTTP/1.1\r\nHost: x\r\n\r\n").startsWith("HTTP/1.1 404"));
        failures += expect("bare GET line answered 400", raw(server.port(), "GET\r\n\r\n").startsWith("HTTP/1.1 400"));
        StringBuilder huge = new StringBuilder("GET /");
        for (int i = 0; i < 200_000; i++) huge.append('a');
        huge.append(" HTTP/1.1\r\n\r\n");
        failures += expect("200 KB request line answered 404", raw(server.port(), huge.toString()).startsWith("HTTP/1.1 404"));
        failures += expect("slow client that never sends headers is dropped (server timeout)", slowClientDropped(server.port()));
        failures += expect("server still serves after abuse", Arrays.equals(fetch(server.url(), "GET").body, doc));
        server.close();
        System.out.println(failures == 0 ? "SERVER TEST PASSED" : "SERVER TEST FAILED (" + failures + ")");
        System.exit(failures == 0 ? 0 : 1);
    }

    /** Like raw() but reads up to 2 KB, enough for the whole header block. */
    static String rawHead(int port, String request) throws IOException {
        try (java.net.Socket s = new java.net.Socket("127.0.0.1", port)) {
            s.setSoTimeout(15000);
            s.getOutputStream().write(request.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1));
            s.getOutputStream().flush();
            byte[] head = new byte[2048];
            int n = 0, r;
            while (n < head.length && (r = s.getInputStream().read(head, n, head.length - n)) > 0) n += r;
            return new String(head, 0, n, java.nio.charset.StandardCharsets.ISO_8859_1);
        } catch (java.net.SocketTimeoutException e) {
            return "TIMEOUT";
        }
    }

    static String raw(int port, String request) throws IOException {
        try (java.net.Socket s = new java.net.Socket("127.0.0.1", port)) {
            s.setSoTimeout(15000);
            s.getOutputStream().write(request.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1));
            s.getOutputStream().flush();
            byte[] head = new byte[64];
            int n = 0, r;
            while (n < head.length && (r = s.getInputStream().read(head, n, head.length - n)) > 0) n += r;
            return new String(head, 0, n, java.nio.charset.StandardCharsets.ISO_8859_1);
        } catch (java.net.SocketTimeoutException e) {
            return "TIMEOUT";
        }
    }

    static boolean rawOk(int port, String request) {
        try { String r = raw(port, request); return !r.equals("TIMEOUT"); } catch (IOException e) { return true; }
    }

    static boolean slowClientDropped(int port) throws IOException {
        try (java.net.Socket s = new java.net.Socket("127.0.0.1", port)) {
            s.setSoTimeout(20000);
            s.getOutputStream().write("GET / HTTP/1.1\r\nHost: x\r\n".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
            s.getOutputStream().flush();
            long t0 = System.currentTimeMillis();
            int r = s.getInputStream().read();          // server should close after its 10 s read timeout
            long dt = System.currentTimeMillis() - t0;
            return r == -1 && dt >= 5000 && dt < 20000;
        } catch (java.net.SocketTimeoutException e) {
            return false;
        } catch (IOException e) {
            return true;                                   // reset by the server also counts as dropped
        }
    }

    static int expect(String what, boolean cond) {
        System.out.println((cond ? "  PASS  " : "  FAIL  ") + what);
        return cond ? 0 : 1;
    }

    static final class Resp { int status; int length; String type; byte[] body; }

    static Resp fetch(String url, String method) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setRequestMethod(method);
        c.setConnectTimeout(5000);
        c.setReadTimeout(10000);
        Resp r = new Resp();
        r.status = c.getResponseCode();
        r.length = c.getContentLength();
        r.type = c.getContentType();
        try (var in = r.status >= 400 ? c.getErrorStream() : c.getInputStream()) {
            r.body = in == null ? new byte[0] : in.readAllBytes();
        }
        return r;
    }
}
