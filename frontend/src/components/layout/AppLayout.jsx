import { Outlet } from 'react-router-dom';
import Header from './Header.jsx';
import Sidebar from './Sidebar.jsx';

function AppLayout() {
  return (
    <div className="min-h-screen text-slate-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[320px_1fr]">
        <div className="sticky top-0 z-30 h-auto lg:h-screen">
          <Sidebar />
        </div>

        <div className="min-w-0">
          <Header />
          <main className="mx-auto w-full max-w-[1750px] px-4 py-7 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 lg:py-9">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;
