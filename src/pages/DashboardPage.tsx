import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Badge, Button, Card } from '../components/ui';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Xin chào, {user?.fullName} 👋</h1>
        <p className="mt-1 text-stone">Đây là khu vực kiểm thử dịch vụ Identity của HRM.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <Row label="Họ tên" value={user?.fullName} />
            <Row label="Email" value={user?.email} />
            <Row label="User ID" value={<code className="text-xs text-stone">{user?.userId}</code>} />
            <div className="flex items-center justify-between">
              <dt className="text-ash">Vai trò</dt>
              <dd className="flex flex-wrap justify-end gap-1.5">
                {user?.roles.map((r) => (
                  <Badge key={r} tone="flame">{r}</Badge>
                ))}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="flex flex-col">
          <h2 className="text-lg font-semibold">Hành động</h2>
          <p className="mt-1 text-sm text-stone">
            {isAdmin
              ? 'Bạn là Admin — có thể quản lý toàn bộ tài khoản người dùng.'
              : 'Tài khoản của bạn không có quyền Admin. Đăng nhập bằng tài khoản Admin để thử quản lý người dùng.'}
          </p>
          <div className="mt-auto pt-4">
            {isAdmin && (
              <Link to="/admin/users">
                <Button>Mở trang quản lý tài khoản →</Button>
              </Link>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-ash">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}
