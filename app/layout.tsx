import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CrossMath - Math Puzzles for Kids',
  description: 'Fun crossword-style math puzzles for grades 1-5',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
