import { Outlet } from 'react-router-dom';

/** Centered shell for the login / register cards. */
export default function AuthLayout() {
  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-flame">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame text-paper">🏇</span>
            HRM
          </div>
          <p className="mt-1 text-sm text-stone">Horse Racing Management</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
