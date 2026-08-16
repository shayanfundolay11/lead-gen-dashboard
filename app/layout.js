import './globals.css';
import Sidebar from '../components/Sidebar';

export const metadata = {
  title: 'Lead Gen Dashboard',
  description: 'Live leads, calls, and reporting across Google, LinkedIn, Facebook, Instagram',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <div className="main">{children}</div>
        </div>
      </body>
    </html>
  );
}
