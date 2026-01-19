/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        primary: "#538CFF",
        darkblue: "#0E225C",
      },
      fontFamily: {
        museo: ['Montserrat', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
