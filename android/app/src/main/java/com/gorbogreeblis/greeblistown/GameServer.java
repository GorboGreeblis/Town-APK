package com.gorbogreeblis.greeblistown;

import android.content.Context;
import android.util.Log;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;

/**
 * Tiny loopback-only HTTP server that hands the bundled game to the Meta Quest
 * Browser. It exists so the APK is fully self-contained: no website, no CDN.
 *
 * <ul>
 *   <li>Binds to 127.0.0.1 only; nothing outside the headset can reach it.</li>
 *   <li>Serves exactly one document (assets/index.html) which is loaded into
 *       memory once. Everything else is a 404.</li>
 *   <li>The game makes no further requests after the first load, so the server
 *       only has to live for the first few seconds. It is a daemon thread that
 *       dies with the process.</li>
 *   <li>Tries a fixed port first so the game's origin, and therefore its
 *       localStorage save data, stays stable between launches.</li>
 * </ul>
 */
public final class GameServer {
    private static final String TAG = "GreeblisServer";
    static final String ASSET = "index.html";
    static final int PREFERRED_PORT = 17777;
    private static final int PORT_ATTEMPTS = 10;

    private static GameServer sInstance;

    private final byte[] mDocument;
    private final ServerSocket mSocket;
    private final int mPort;

    /** Starts the server if needed and returns the URL the browser should open. */
    public static synchronized String ensureStarted(Context context) throws IOException {
        if (sInstance == null || sInstance.mSocket.isClosed()) {
            sInstance = new GameServer(context.getApplicationContext());
        }
        return sInstance.url();
    }

    /** Package-private so the JVM test harness can drive it without Android. */
    GameServer(byte[] document) throws IOException {
        mDocument = document;
        mSocket = bind();
        mPort = mSocket.getLocalPort();
        Thread t = new Thread(this::acceptLoop, "greeblis-http");
        t.setDaemon(true);
        t.start();
        Log.i(TAG, "Serving " + document.length + " bytes on " + url());
    }

    private GameServer(Context context) throws IOException {
        this(readAsset(context));
    }

    public String url() {
        return "http://127.0.0.1:" + mPort + "/";
    }

    public int port() {
        return mPort;
    }

    public void close() {
        try {
            mSocket.close();
        } catch (IOException ignored) {
        }
    }

    private static byte[] readAsset(Context context) throws IOException {
        try (InputStream in = context.getAssets().open(ASSET)) {
            return readFully(in);
        }
    }

    static byte[] readFully(InputStream in) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 20);
        byte[] buf = new byte[64 * 1024];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
        }
        return out.toByteArray();
    }

    private static ServerSocket bind() throws IOException {
        InetAddress loopback = InetAddress.getByName("127.0.0.1");
        IOException last = null;
        for (int i = 0; i < PORT_ATTEMPTS; i++) {
            try {
                return new ServerSocket(PREFERRED_PORT + i, 16, loopback);
            } catch (IOException e) {
                last = e;
            }
        }
        // Everything in the preferred range is busy; let the OS pick.
        try {
            return new ServerSocket(0, 16, loopback);
        } catch (IOException e) {
            throw last != null ? last : e;
        }
    }

    private void acceptLoop() {
        while (!mSocket.isClosed()) {
            final Socket client;
            try {
                client = mSocket.accept();
            } catch (IOException e) {
                if (!mSocket.isClosed()) {
                    Log.w(TAG, "accept failed", e);
                }
                return;
            }
            Thread t = new Thread(() -> handle(client), "greeblis-http-conn");
            t.setDaemon(true);
            t.start();
        }
    }

    private void handle(Socket client) {
        try (Socket c = client) {
            c.setSoTimeout(10_000);
            BufferedReader reader = new BufferedReader(
                    new InputStreamReader(c.getInputStream(), StandardCharsets.ISO_8859_1));
            String requestLine = reader.readLine();
            if (requestLine == null) {
                return;
            }
            // Drain headers; we do not need any of them.
            String line;
            while ((line = reader.readLine()) != null && !line.isEmpty()) {
                // ignore
            }
            String[] parts = requestLine.split(" ");
            String method = parts.length > 0 ? parts[0] : "";
            String target = parts.length > 1 ? parts[1] : "/";
            int q = target.indexOf('?');
            if (q >= 0) {
                target = target.substring(0, q);
            }
            OutputStream out = c.getOutputStream();
            boolean isDoc = target.equals("/") || target.equals("/index.html");
            boolean methodOk = method.equals("GET") || method.equals("HEAD");
            if (isDoc && methodOk) {
                writeHead(out, "200 OK", "text/html; charset=utf-8", mDocument.length);
                if (method.equals("GET")) {
                    out.write(mDocument);
                }
            } else if (!methodOk) {
                byte[] body = "Method Not Allowed".getBytes(StandardCharsets.US_ASCII);
                writeHead(out, "405 Method Not Allowed", "text/plain", body.length);
                out.write(body);
            } else {
                byte[] body = "Not Found".getBytes(StandardCharsets.US_ASCII);
                writeHead(out, "404 Not Found", "text/plain", body.length);
                out.write(body);
            }
            out.flush();
        } catch (IOException e) {
            Log.d(TAG, "connection ended: " + e.getMessage());
        }
    }

    private static void writeHead(OutputStream out, String status, String type, int length)
            throws IOException {
        String head = "HTTP/1.1 " + status + "\r\n"
                + "Content-Type: " + type + "\r\n"
                + "Content-Length: " + length + "\r\n"
                + "Cache-Control: no-store\r\n"
                + "X-Content-Type-Options: nosniff\r\n"
                + "Connection: close\r\n"
                + "\r\n";
        out.write(head.getBytes(StandardCharsets.US_ASCII));
    }
}
