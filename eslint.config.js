import js from "@eslint/js";
import nextPlugin from "eslint-plugin-next";

export default [
  js.configs.recommended,
  ...nextPlugin.configs["core-web-vitals"],
  {
    ignores: ["node_modules/", ".next/"],
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    },
  },
];
