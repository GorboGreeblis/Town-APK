package com.gorbogreeblis.greeblistown;

import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.browser.customtabs.CustomTabsCallback;

import java.io.IOException;

/**
 * Launches the bundled game in the Meta Quest Browser's immersive WebXR activity.
 *
 * The heavy lifting (binding the browser's Custom Tabs service, forcing the
 * {@code com.oculus.browser.WebXRCustomTabActivity} component when
 * {@code horizonos.pwa.APP_MODE} is "immersive") is done by Meta's
 * android-browser-helper fork, the same library behind Meta's PWA packager.
 * This subclass only swaps the hosted URL for the loopback server's URL.
 */
public class LauncherActivity extends com.meta.androidbrowserhelper.trusted.LauncherActivity {
    private static final String TAG = "GreeblisLauncher";

    private String mGameUrl;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // The server must be up before the parent class builds the launch intent.
        try {
            mGameUrl = GameServer.ensureStarted(this);
        } catch (IOException e) {
            Log.e(TAG, "game server failed to start", e);
            Toast.makeText(this, "Greeblis Town could not start its game server.",
                    Toast.LENGTH_LONG).show();
            finish();
            return;
        }
        super.onCreate(savedInstanceState);
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Ignore the manifest placeholder and any incoming intent data: the only
        // thing this app ever opens is its own bundled game.
        return Uri.parse(mGameUrl);
    }

    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        return new CustomTabsCallback() {
            @Override
            public Bundle extraCallbackWithResult(String callbackName, Bundle args) {
                if ("finishAndRemoveTask".equals(callbackName)) {
                    // The Quest Browser asks us to close when the player exits the game.
                    Log.i(TAG, "browser requested finishAndRemoveTask");
                    finishAndRemoveTask();
                } else if ("quality_enforcement.crash".equals(callbackName)) {
                    // Trusted Web Activity "quality enforcement" crashes the app when
                    // Digital Asset Links cannot be verified. A loopback origin can
                    // never publish assetlinks.json, so log it instead of dying.
                    Log.w(TAG, "ignoring quality_enforcement.crash: "
                            + (args != null ? args.getString("crash_reason") : "?"));
                }
                return null;
            }
        };
    }
}
