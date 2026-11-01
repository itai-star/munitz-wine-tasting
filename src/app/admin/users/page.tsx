import { CreateUserForm } from "@/components/users/create-user-form"
import { ResetRequests } from "@/components/users/reset-requests"
import { UserCard } from "@/components/users/user-card"
import { listOpenResetRequests, listUsers } from "@/server/actions/user-actions"
import { requireAdmin } from "@/server/auth/guards"

export const dynamic = "force-dynamic"

export default async function UsersPage() {
  const admin = await requireAdmin()
  const [users, requests] = await Promise.all([listUsers(), listOpenResetRequests()])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">ניהול משתמשים</h1>

      {requests.success && <ResetRequests requests={requests.data} />}

      <CreateUserForm />

      {users.success ? (
        <section className="space-y-3" aria-label="המשתמשים">
          <h2 className="font-semibold text-stone-800">משתמשים קיימים ({users.data.length})</h2>
          {users.data.map((user) => (
            <UserCard key={user.id} user={user} isSelf={user.id === admin.id} />
          ))}
        </section>
      ) : (
        <p className="text-red-600">{users.error.message}</p>
      )}
    </div>
  )
}
