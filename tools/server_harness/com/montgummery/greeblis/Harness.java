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
        GameServer server = new GameServer(doc);
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
        failures += expect("bound to loopback port " + server.port(), server.url().startsWith("http://127.0.0.1:"));
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
        server.close();
        System.out.println(failures == 0 ? "SERVER TEST PASSED" : "SERVER TEST FAILED (" + failures + ")");
        System.exit(failures == 0 ? 0 : 1);
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
