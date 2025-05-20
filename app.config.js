module.exports = {
  expo: {
    name: "Wehanda Mobile",
    slug: "wehanda-mobile",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    scheme: "wehanda",
    userInterfaceStyle: "automatic",
    plugins: [
      "expo-router"
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.wehanda.mobile"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.wehanda.mobile"
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png"
    },
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: process.env.EXPO_PROJECT_ID
      }
    }
  }
};