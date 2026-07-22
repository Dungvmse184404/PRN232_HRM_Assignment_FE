import { Outlet } from 'react-router-dom';
import OverlayFrame, { useOverlayClose } from '../components/OverlayFrame';
import { HorseshoeIcon } from '../components/icons';

/** Centered shell for the login / register cards — same glass popup as the app shell. */
export default function AuthLayout() {
  const { closing, close } = useOverlayClose('/');

  return (
    <OverlayFrame
      closing={closing}
      onClose={close}
      panelClassName="app-shell h-full max-w-[520px] sm:h-auto sm:max-h-[min(100%,760px)]"
    >
      <div className="grid w-full place-items-center overflow-y-auto px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center gap-2 text-2xl font-bold text-flame">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-flame text-white">
                <HorseshoeIcon className="h-5 w-5" />
              </span>
              HRM
            </div>
            <p className="mt-1 text-sm text-stone">Horse Racing Management</p>
          </div>
          <Outlet />
          <button
            type="button"
            onClick={close}
            className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-parchment px-3.5 py-1.5 text-xs font-semibold text-stone transition hover:border-flame hover:text-ink"
          >
            <span aria-hidden="true">←</span> Về trang chủ
          </button>
        </div>
      </div>
    </OverlayFrame>
  );
}
