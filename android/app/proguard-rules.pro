# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add project specific ProGuard rules here.
-dontwarn com.facebook.react.**
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.** { *; }
-keepclassmembers class * {
  @com.facebook.react.uimanager.annotations.ReactProp <methods>;
  @com.facebook.react.uimanager.annotations.ReactPropGroup <methods>;
}

# Expo modules JNI & reflection
-dontwarn expo.modules.**
-keep class expo.modules.** { *; }

# Google Sign In
-dontwarn com.google.android.gms.**
-keep class com.google.android.gms.** { *; }

# Async Storage
-dontwarn com.reactnativecommunity.asyncstorage.**
-keep class com.reactnativecommunity.asyncstorage.** { *; }
