import { createClient } from "@/lib/supabase/server"
import { getCurrentUser, canManageUsers, canAddDistributors } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, MapPin, Users } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { DeleteDistributorAction } from "./distributors/delete-action"

export default async function SettingsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  
  // Redirect staff users - they don't have access to settings
  if (user?.role === 'staff') {
    redirect('/dashboard')
  }
  const userRole = user?.role || 'staff'

  // Only fetch data that the user has permission to see
  const [distributorsResult, locationsResult, usersResult] = await Promise.all([
    canAddDistributors(userRole)
      ? supabase.from("distributors").select("*").order("name")
      : Promise.resolve({ data: null }),
    supabase.from("inventory_locations").select("*").order("name"),
    canManageUsers(userRole)
      ? supabase.from("users").select("id, email, full_name, role, is_approved, created_at").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
  ])

  const distributors = distributorsResult?.data || null
  const locations = locationsResult?.data || null
  const users = usersResult?.data || null

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full overflow-x-hidden">
      <div className="w-full min-w-0">
        <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage system configuration</p>
      </div>

      <div className="grid gap-6 w-full min-w-0 max-w-full">
        {canAddDistributors(user?.role || 'staff') && (
          <Card className="w-full min-w-0 max-w-full overflow-hidden">
            <CardHeader className="w-full min-w-0 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full min-w-0">
                <div className="flex-1 min-w-0 pr-2 sm:pr-0">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-gold flex-shrink-0" />
                    <span className="truncate">Distributors</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">Manage supplier relationships</CardDescription>
                </div>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <Link href="/settings/distributors/new" prefetch={true} className="inline-block w-full sm:w-auto max-w-full">
                    <Button size="sm" className="w-full sm:w-auto max-w-full whitespace-nowrap text-xs sm:text-sm">
                      <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Add Distributor</span>
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="w-full min-w-0 p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <div className="min-w-[500px] sm:min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Phone</TableHead>
                        {userRole === 'admin' && (
                          <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 w-[60px]">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {distributors && distributors.length > 0 ? (
                        distributors.map((dist: {
                          id: string
                          name: string
                          contact_name: string | null
                          email: string | null
                          phone: string | null
                        }) => (
                          <TableRow key={dist.id}>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[120px] truncate">{dist.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[120px] truncate">{dist.contact_name || "-"}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[150px] truncate">{dist.email || "-"}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[120px] truncate">{dist.phone || "-"}</TableCell>
                            {userRole === 'admin' && (
                              <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
                                <DeleteDistributorAction 
                                  distributorId={dist.id}
                                  distributorName={dist.name}
                                  userRole={userRole}
                                />
                              </TableCell>
                            )}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={userRole === 'admin' ? 5 : 4} className="text-center text-muted-foreground text-xs sm:text-sm px-3 sm:px-4">
                            No distributors found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="w-full min-w-0 max-w-full overflow-hidden">
          <CardHeader className="w-full min-w-0 p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full min-w-0">
              <div className="flex-1 min-w-0 pr-2 sm:pr-0">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-gold flex-shrink-0" />
                  <span className="truncate">Inventory Locations</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">Manage storage locations</CardDescription>
              </div>
              {canAddDistributors(user?.role || 'staff') && (
                <div className="w-full sm:w-auto flex-shrink-0">
                  <Link href="/settings/locations/new" prefetch={true} className="inline-block w-full sm:w-auto max-w-full">
                    <Button size="sm" className="w-full sm:w-auto max-w-full whitespace-nowrap text-xs sm:text-sm">
                      <Plus className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="truncate">Add Location</span>
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="w-full min-w-0">
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 w-full min-w-0">
              {locations?.map((loc: { id: string; name: string; type: string }) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-lg border border-gold/10 w-full min-w-0 max-w-full overflow-hidden"
                >
                  <div className="font-medium text-sm sm:text-base truncate w-full">{loc.name}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1 truncate w-full">{loc.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {canManageUsers(user?.role || 'staff') && (
          <Card className="w-full min-w-0 max-w-full overflow-hidden">
            <CardHeader className="w-full min-w-0 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 w-full min-w-0">
                <div className="flex-1 min-w-0 pr-2 sm:pr-0">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg md:text-xl">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-gold flex-shrink-0" />
                    <span className="truncate">Users</span>
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">Manage system users and roles</CardDescription>
                </div>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <Link href="/settings/users" prefetch={true} className="inline-block w-full sm:w-auto max-w-full">
                    <Button size="sm" variant="outline" className="w-full sm:w-auto max-w-full whitespace-nowrap text-xs sm:text-sm">
                      Manage Users
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="w-full min-w-0 p-0 sm:p-6 sm:pt-0">
              <div className="overflow-x-auto">
                <div className="min-w-[500px] sm:min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users && users.length > 0 ? (
                        users.map((u: {
                          id: string
                          full_name: string | null
                          email: string
                          role: string
                          is_approved?: boolean
                        }) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[120px] truncate">
                              {u.full_name || "-"}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4 max-w-[150px] truncate">{u.email}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
                              <Badge variant="outline" className="text-xs">{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap px-3 sm:px-4">
                              {u.is_approved ? (
                                <Badge variant="default" className="text-xs">Approved</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Pending</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm px-3 sm:px-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  )
}

