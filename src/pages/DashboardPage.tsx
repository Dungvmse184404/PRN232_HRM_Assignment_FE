import { useAuth } from '../auth/AuthContext';
import { Badge, Card } from '../components/ui';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold">Xin chào, {user?.fullName} 👋</h1>
        <p className="mt-1 text-stone">Đây là khu vực kiểm thử dịch vụ Identity của HRM.</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Họ tên" value={user?.fullName} />
          <Row label="Email" value={user?.email} />
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
