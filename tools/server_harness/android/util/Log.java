// Stand-in for android.util.Log so GameServer can run on a desktop JVM.
// The real android.jar version throws "Stub!" at runtime.
package android.util;

public final class Log {
    private static int p(String lvl, String tag, String msg, Throwable t) {
        System.err.println(lvl + "/" + tag + ": " + msg + (t != null ? " (" + t + ")" : ""));
        return 0;
    }
    public static int v(String tag, String msg) { return p("V", tag, msg, null); }
    public static int d(String tag, String msg) { return p("D", tag, msg, null); }
    public static int i(String tag, String msg) { return p("I", tag, msg, null); }
    public static int w(String tag, String msg) { return p("W", tag, msg, null); }
    public static int w(String tag, String msg, Throwable t) { return p("W", tag, msg, t); }
    public static int e(String tag, String msg) { return p("E", tag, msg, null); }
    public static int e(String tag, String msg, Throwable t) { return p("E", tag, msg, t); }
}
