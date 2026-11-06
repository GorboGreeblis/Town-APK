// Stand-in for the BuildConfig class Gradle generates (tools/android/app/build.gradle), so GameServer compiles on a
// desktop JVM. PAGE_LOG as in the builds the author tests (the /log endpoint on); the final build's APK
// (tools/build.sh --final, -PfinalBuild=true) has it false. test_server.sh --final compiles it false.
package com.montgummery.greeblis;

public final class BuildConfig {
    public static final boolean PAGE_LOG = true;
}
