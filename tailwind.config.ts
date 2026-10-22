import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: { colors: { brand: { 50: "#eaf5ef", 100: "#d5ebdf", 600: "#176b4d", 700: "#12563e", 900: "#0b3829" } }, boxShadow: { soft: "0 8px 30px rgba(17, 45, 35, .06)" } } },
  plugins: []
};
export default config;
