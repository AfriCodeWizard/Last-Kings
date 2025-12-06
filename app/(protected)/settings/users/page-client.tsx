"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Check, Trash2 } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string | null
  role: string
  is_approved: boolean
  created_at: string
}

export default function UsersManagementPageClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error("Error loading users:", error)
      toast.error("Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: string) => {
    try {
      const { error } = await (supabase
        .from("users") as any)
        .update({ is_approved: true })
        .eq("id", userId)

      if (error) throw error

      toast.success("User approved successfully")
      loadUsers()
    } catch (error) {
      console.error("Error approving user:", error)
      toast.error("Failed to approve user")
    }
  }

  const handleRemove = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to remove ${userEmail}? This action cannot be undone.`)) {
      return
    }

    try {
      // Delete from auth.users (requires admin client, but we'll try)
      // Note: This requires service role key, so we'll just delete from users table
      // The auth user will remain but won't have access
      const { error } = await supabase
        .from("users")
        .delete()
        .eq("id", userId)

      if (error) throw error

      toast.success("User removed successfully")
      loadUsers()
    } catch (error) {
      console.error("Error removing user:", error)
      toast.error("Failed to remove user")
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-4 sm:p-0 w-full min-w-0 overflow-x-hidden">
        <div>
          <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">User Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const pendingUsers = users.filter((u) => !u.is_approved)

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0 w-full min-w-0 overflow-x-hidden">
      <div>
        <h1 className="text-2xl sm:text-4xl font-sans font-bold text-white mb-2">User Management</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Approve and manage system users</p>
      </div>

      {pendingUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              Pending Approval ({pendingUsers.length})
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Users waiting for admin approval</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
              <div className="min-w-[600px] sm:min-w-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Role</TableHead>
                      <TableHead className="text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                          {user.full_name || "-"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap truncate max-w-[150px]">{user.email}</TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                          <Badge variant="outline" className="text-xs">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(user.id)}
                              className="h-8 text-xs"
                            >
                              <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Approve</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRemove(user.id, user.email)}
                              className="h-8 text-xs"
                            >
                              <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                              <span className="hidden sm:inline">Remove</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">All Users ({users.length})</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage all system users</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
            <div className="min-w-[700px] sm:min-w-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Name</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Role</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-xs sm:text-sm whitespace-nowrap">
                        {user.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap truncate max-w-[150px]">{user.email}</TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        <Badge variant="outline" className="text-xs">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {user.is_approved ? (
                          <Badge variant="default" className="text-xs">Approved</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                        {!user.is_approved ? (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(user.id)}
                            className="h-8 text-xs"
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Approve</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRemove(user.id, user.email)}
                            className="h-8 text-xs"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            <span className="hidden sm:inline">Remove</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

