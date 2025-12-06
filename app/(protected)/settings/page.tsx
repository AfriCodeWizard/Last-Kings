import { createClient } from "@/lib/supabase/server"
import { getCurrentUser, canManageUsers, canAddDistributors } from "@/lib/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Building2, MapPin, Users, Percent } from "lucide-react"
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

export default async function SettingsPage() {
  const supabase = await createClient()
  const user = await getCurrentUser()
  const userRole = user?.role || 'staff'

  // Only fetch data that the user has permission to see
  const [distributorsResult, locationsResult, usersResult, taxRatesResult] = await Promise.all([
    canAddDistributors(userRole)
      ? supabase.from("distributors").select("*").order("name")
      : Promise.resolve({ data: null }),
    supabase.from("inventory_locations").select("*").order("name"),
    canManageUsers(userRole)
      ? supabase.from("users").select("id, email, full_name, role, is_approved, created_at").order("created_at", { ascending: false })
      : Promise.resolve({ data: null }),
    supabase.from("tax_rates").select("*").order("name"),
  ])

  const distributors = distributorsResult?.data || null
  const locations = locationsResult?.data || null
  const users = usersResult?.data || null
  const taxRates = taxRatesResult?.data || null

  return (
    <div className="space-y-6 w-full min-w-0">
      <div>
        <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Manage system configuration</p>
      </div>

      <div className="grid gap-6 w-full min-w-0">
        {canAddDistributors(user?.role || 'staff') && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Building2 className="h-5 w-5 text-gold" />
                    Distributors
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage supplier relationships</CardDescription>
                </div>
                <Link href="/settings/distributors/new" prefetch={true} className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Distributor
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] sm:min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Contact</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Phone</TableHead>
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
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{dist.name}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">{dist.contact_name || "-"}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap truncate max-w-[150px]">{dist.email || "-"}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">{dist.phone || "-"}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm">
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

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <MapPin className="h-5 w-5 text-gold" />
                  Inventory Locations
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Manage storage locations</CardDescription>
              </div>
              {canAddDistributors(user?.role || 'staff') && (
                <Link href="/settings/locations/new" prefetch={true} className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Location
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
              {locations?.map((loc: { id: string; name: string; type: string }) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-lg border border-gold/10"
                >
                  <div className="font-medium text-sm sm:text-base">{loc.name}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{loc.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {canManageUsers(user?.role || 'staff') && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Users className="h-5 w-5 text-gold" />
                    Users
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Manage system users and roles</CardDescription>
                </div>
                <Link href="/settings/users" prefetch={true} className="w-full sm:w-auto">
                  <Button size="sm" variant="outline" className="w-full sm:w-auto">
                    Manage Users
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="min-w-[600px] sm:min-w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Role</TableHead>
                        <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
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
                            <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                              {u.full_name || "-"}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap truncate max-w-[150px]">{u.email}</TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                              <Badge variant="outline" className="text-xs">{u.role}</Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm whitespace-nowrap">
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
                          <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm">
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

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Percent className="h-5 w-5 text-gold" />
                  Tax Rates
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Configure sales and excise tax rates</CardDescription>
              </div>
              {canAddDistributors(user?.role || 'staff') && (
                <Link href="/settings/tax-rates/new" prefetch={true} className="w-full sm:w-auto">
                  <Button size="sm" className="w-full sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tax Rate
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[600px] sm:min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Type</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Rate</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates && taxRates.length > 0 ? (
                      taxRates.map((rate: {
                        id: string
                        name: string
                        type: string
                        rate: number
                        active: boolean
                      }) => (
                        <TableRow key={rate.id}>
                          <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">{rate.name}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{rate.type}</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">{(rate.rate * 100).toFixed(2)}%</TableCell>
                          <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                            {rate.active ? (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs">Inactive</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground text-xs sm:text-sm">
                          No tax rates found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

