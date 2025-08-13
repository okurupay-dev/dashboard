/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        okuru: {
          primary: "#3B82F6",  // Blue-500
          secondary: "#10B981", // Emerald-500
          accent: "#8B5CF6",   // Violet-500
          muted: "#6B7280",    // Gray-500
          light: "#F3F4F6",    // Gray-100
          dark: "#1F2937",     // Gray-800
        },
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
