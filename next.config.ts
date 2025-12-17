// file: next.config.ts
import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,

  // 開発中はSWが邪魔になりやすいので無効化（本番ビルドで有効）
  disable: process.env.NODE_ENV === "development",

  // デフォルトのruntimeCachingを使う（必要なら後でカスタムする）
  extendDefaultRuntimeCaching: true,

  // ✅ skipWaiting はここ（Workbox側）に書く
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true,
  },
});

const nextConfig: NextConfig = {
  // config options here
};

export default withPWA(nextConfig);
