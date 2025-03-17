// src/app/layout.tsx
import './globals.css'; // Import global styles here

export const metadata = {
  title: 'Camera Calibration',
  description: 'Next.js + Flask Camera Calibration Example',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
