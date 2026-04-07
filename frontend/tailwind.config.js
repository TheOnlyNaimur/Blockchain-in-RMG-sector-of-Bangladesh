/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#13ec5b",
        "primary-hover": "#0fb347",
        "background-light": "#f6f8f6",
        "background-dark": "#102216",
        "surface-dark": "#1a2e22",
        "surface-darker": "#14291c",
        "border-dark": "#28392e",
        "text-secondary": "#9db9a6",
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      backgroundColor: {
        primary: "#13ec5b",
      },
      borderColor: {
        "border-dark": "#28392e",
      },
      textColor: {
        primary: "#13ec5b",
        "text-secondary": "#9db9a6",
      },
    },
  },
  plugins: [],
};
