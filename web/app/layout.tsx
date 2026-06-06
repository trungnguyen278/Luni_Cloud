import './luni-styles.css';
import './web-styles.css';
import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Luni Cloud Console',
  description: 'Bảng điều khiển web cho hệ sinh thái Luni — giám sát fleet, phát hành firmware OTA và xem robot theo thời gian thực.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
