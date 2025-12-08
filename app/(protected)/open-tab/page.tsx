"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Receipt, X } from "lucide-react"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatCurrency } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Tab {
  id: string
  customer_name: string
  phone: string | null
  total_amount: number
  created_at: string
  status: string
}

export default function OpenTabPage() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [tabToClose, setTabToClose] = useState<string | null>(null)

  const loadTabs = async () => {
    try {
      const { data, error } = await supabase
        .from("tabs")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error
      setTabs(data || [])
    } catch (error: any) {
      toast.error("Error loading tabs")
      console.error(error)
    }
  }

  useEffect(() => {
    loadTabs()
  }, [])

  const handleCloseTab = async (tabId: string) => {
    try {
      // Close the tab by updating its status
      const { error: tabError } = await (supabase.from("tabs") as any)
        .update({
          status: "closed",
          closed_at: new Date().toISOString(),
        })
        .eq("id", tabId)

      if (tabError) throw tabError

      toast.success("Tab closed successfully")
      await loadTabs()
      setShowCloseDialog(false)
      setTabToClose(null)
    } catch (error: any) {
      toast.error("Error closing tab")
      console.error(error)
    }
  }

  const openTabs = tabs.filter((t) => t.status === "open")

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-4xl font-sans font-bold text-white mb-2">Open Tab</h1>
          <p className="text-sm md:text-base text-muted-foreground">Manage customer tabs and payments</p>
        </div>
        <Link href="/open-tab/new" prefetch={true}>
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Open New Tab
          </Button>
        </Link>
      </div>

      {openTabs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-gold" />
              Open Tabs ({openTabs.length})
            </CardTitle>
            <CardDescription>Active customer tabs awaiting payment</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTabs.map((tab) => (
                  <TableRow key={tab.id}>
                    <TableCell className="font-medium">
                      {tab.customer_name}
                    </TableCell>
                    <TableCell>{tab.phone || "-"}</TableCell>
                    <TableCell className="font-semibold text-gold">
                      {formatCurrency(tab.total_amount)}
                    </TableCell>
                    <TableCell>
                      {new Date(tab.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/open-tab/${tab.id}`}>
                          <Button variant="ghost" size="sm">View / Cash Out</Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTabToClose(tab.id)
                            setShowCloseDialog(true)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {openTabs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No open tabs. Create a new tab to get started.</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Tab</DialogTitle>
            <DialogDescription>
              Are you sure you want to close this tab? The tab will be closed and removed from the open tabs area, but sales records will remain in the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCloseDialog(false)
              setTabToClose(null)
            }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => tabToClose && handleCloseTab(tabToClose)}
            >
              Close Tab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
