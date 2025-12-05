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

  const { data: distributors } = await supabase
    .from("distributors")
    .select("*")
    .order("name")

  const { data: locations } = await supabase
    .from("inventory_locations")
    .select("*")
    .order("name")

  const { data: users } = await supabase
    .from("users")
    .select("id, email, full_name, role, is_approved, created_at")
    .order("created_at", { ascending: false })

  const { data: taxRates } = await supabase
    .from("tax_rates")
    .select("*")
    .order("name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-sans font-bold text-white mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage system configuration</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gold" />
                  Distributors
                </CardTitle>
                <CardDescription>Manage supplier relationships</CardDescription>
              </div>
              {canAddDistributors(user?.role || 'staff') && (
                <Link href="/settings/distributors/new">
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Distributor
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
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
                      <TableCell className="font-medium">{dist.name}</TableCell>
                      <TableCell>{dist.contact_name || "-"}</TableCell>
                      <TableCell>{dist.email || "-"}</TableCell>
                      <TableCell>{dist.phone || "-"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No distributors found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-gold" />
                  Inventory Locations
                </CardTitle>
                <CardDescription>Manage storage locations</CardDescription>
              </div>
              <Link href="/settings/locations/new">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Location
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {locations?.map((loc: { id: string; name: string; type: string }) => (
                <div
                  key={loc.id}
                  className="p-4 rounded-lg border border-gold/10"
                >
                  <div className="font-medium">{loc.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{loc.type}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {canManageUsers(user?.role || 'staff') && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gold" />
                    Users
                  </CardTitle>
                  <CardDescription>Manage system users and roles</CardDescription>
                </div>
                <Link href="/settings/users">
                  <Button size="sm" variant="outline">
                    Manage Users
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
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
                        <TableCell className="font-medium">
                          {u.full_name || "-"}
                        </TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.is_approved ? (
                            <Badge variant="default">Approved</Badge>
                          ) : (
                            <Badge variant="secondary">Pending</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-gold" />
                  Tax Rates
                </CardTitle>
                <CardDescription>Configure sales and excise tax rates</CardDescription>
              </div>
              <Link href="/settings/tax-rates/new">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Rate
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
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
                      <TableCell className="font-medium">{rate.name}</TableCell>
                      <TableCell>{rate.type}</TableCell>
                      <TableCell>{(rate.rate * 100).toFixed(2)}%</TableCell>
                      <TableCell>
                        {rate.active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No tax rates found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

