import next from "eslint-plugin-next";

export default [
  ...next.configs["core-web-vitals"],
  {
    ignores: ["node_modules/", ".next/"],
    rules: {
      "@next/next/no-html-link-for-pages": "off"
    },
  },
];
