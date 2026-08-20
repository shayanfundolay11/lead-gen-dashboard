import './globals.css';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'Lead Gen Dashboard',
  description: 'Live leads, calls, and reporting across Google, LinkedIn, Facebook, Instagram',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}