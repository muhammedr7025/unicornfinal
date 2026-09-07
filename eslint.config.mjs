import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // components/pdf/** renders PDFs via @react-pdf/renderer's <Image>
    // primitive, not the DOM <img> element — it has no `alt` prop, so the
    // web-accessibility rule doesn't apply here.
    files: ["components/pdf/**/*.tsx"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
