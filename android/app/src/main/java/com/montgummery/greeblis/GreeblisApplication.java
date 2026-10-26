package com.montgummery.greeblis;

import android.app.Application;
import android.util.Log;

import java.io.IOException;

/** Starts the loopback game server as early as possible in the process. */
public class GreeblisApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        try {
            GameServer.ensureStarted(this);
        } catch (IOException e) {
            // LauncherActivity retries; if that fails too it reports the error.
            Log.e("GreeblisApp", "could not start game server", e);
        }
    }
}
