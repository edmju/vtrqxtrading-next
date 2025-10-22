import nextPlugin from "@eslint/next";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  ...nextPlugin.configs["core-web-vitals"],
  {
    ignores: ["node_modules/", ".next/"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
    },
  },
];
