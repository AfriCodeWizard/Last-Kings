import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function HomePage() {
  try {
    const user = await getCurrentUser()
    
    if (user) {
      redirect("/dashboard")
    } else {
      redirect("/auth/login")
    }
  } catch (error) {
    // If Supabase isn't configured, redirect to login anyway
    redirect("/auth/login")
  }
}

