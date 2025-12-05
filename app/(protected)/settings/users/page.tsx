import { getCurrentUser, canManageUsers } from "@/lib/auth"
import { redirect } from "next/navigation"
import UsersManagementPageClient from "./page-client"

export default async function UsersManagementPage() {
  const user = await getCurrentUser()
  
  if (!canManageUsers(user?.role || 'staff')) {
    redirect("/settings")
  }
  
  return <UsersManagementPageClient />
}

