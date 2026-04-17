"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { StepProgressBar } from "@/components/step-progress-bar"
import { useAuth } from "@/components/auth-provider"
import { getDisplayName, getInitials } from "@/lib/display-name"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider as SidebarTooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  HiOutlineDocumentText,
  HiOutlineCloudUpload,
  HiOutlineArchive,
  HiOutlineChevronRight,
  HiOutlineCalendar,
  HiOutlineLogout,
  HiOutlineClipboardList,
  HiOutlineTrash,
  HiOutlineLibrary,
} from "react-icons/hi"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

const documentsActive = (pathname: string) =>
  pathname === "/" ||
  pathname === "/documents/upload" ||
  pathname === "/documents/stored" ||
  pathname === "/duration"

const formsActive = (pathname: string) => pathname.startsWith("/forms")

function SidebarFooterWithUser() {
  const { user, logout, isLoading } = useAuth()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [deleting, setDeleting] = React.useState(false)

  if (isLoading || !user) return null

  const displayName = getDisplayName(user)
  const initials = getInitials(user)

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/documents/reset", { method: "DELETE" })
      if (!res.ok) {
        toast.error("Failed to delete documents. Please try again.")
        return
      }
      const body = await res.json()
      toast.success(`Deleted ${body.deleted} document(s).`)
      window.dispatchEvent(new Event("documents:deleted"))
    } catch {
      toast.error("Failed to delete documents. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <SidebarFooter>
      <SidebarTooltipProvider>
        {!isCollapsed && (
          <div className="px-2 pb-1">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  disabled={deleting}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                >
                  <HiOutlineTrash className="size-4" />
                  <span>{deleting ? "Deleting..." : "Delete all data"}</span>
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all uploaded data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all your uploaded documents
                    (passport, I-20, W-2, etc.) from the database. You can
                    re-upload them at any time. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center pb-1">
            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      disabled={deleting}
                      className="rounded-md p-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      aria-label="Delete all data"
                    >
                      <HiOutlineTrash className="size-4" />
                    </button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">Delete all data</TooltipContent>
              </Tooltip>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete all uploaded data?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove all your uploaded documents
                    (passport, I-20, W-2, etc.) from the database. You can
                    re-upload them at any time. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAll}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete all
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        <div className="flex items-center gap-2 overflow-hidden p-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-accent text-xs font-medium text-sidebar-accent-foreground"
            aria-hidden
          >
            {initials}
          </div>
          {!isCollapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-sm font-medium" title={displayName}>
                {displayName}
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="ml-auto shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    aria-label="Log out"
                  >
                    <HiOutlineLogout className="size-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">Log out</TooltipContent>
              </Tooltip>
            </>
          )}
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="shrink-0 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="Log out"
                >
                  <HiOutlineLogout className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <span className="block font-medium">{displayName}</span>
                <span className="block text-xs text-muted-foreground">Log out</span>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarTooltipProvider>
    </SidebarFooter>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full flex-col">
        <StepProgressBar />
        <div className="flex min-h-0 flex-1 min-w-0">
          <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild>
                <Link href="/">
                  <span className="text-base font-semibold">Tax</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <Collapsible
              defaultOpen={documentsActive(pathname)}
              className="group/collapsible"
            >
              <SidebarGroupLabel className="cursor-pointer text-base font-medium text-sidebar-foreground">
                <Link href="/" className="flex flex-1 items-center gap-2">
                  <HiOutlineDocumentText />
                  <span>Documents</span>
                </Link>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto rounded-sm p-0.5 hover:bg-sidebar-accent"
                    aria-label="Toggle documents menu"
                  >
                    <HiOutlineChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </button>
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/documents/upload"}
                        className="text-base"
                      >
                        <Link
                          href="/documents/upload"
                          aria-current={
                            pathname === "/documents/upload" ? "page" : undefined
                          }
                        >
                          <HiOutlineCloudUpload />
                          <span>Upload</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/documents/stored"}
                        className="text-base"
                      >
                        <Link
                          href="/documents/stored"
                          aria-current={
                            pathname === "/documents/stored" ? "page" : undefined
                          }
                        >
                          <HiOutlineArchive />
                          <span>Stored</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/duration"}
                        className="text-base"
                      >
                        <Link
                          href="/duration"
                          aria-current={
                            pathname === "/duration" ? "page" : undefined
                          }
                        >
                          <HiOutlineCalendar />
                          <span>Duration</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
          <SidebarGroup>
            <Collapsible
              defaultOpen={formsActive(pathname)}
              className="group/forms"
            >
              <SidebarGroupLabel className="cursor-pointer text-base font-medium text-sidebar-foreground">
                <Link href="/forms" className="flex flex-1 items-center gap-2">
                  <HiOutlineClipboardList />
                  <span>Forms</span>
                </Link>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto rounded-sm p-0.5 hover:bg-sidebar-accent"
                    aria-label="Toggle forms menu"
                  >
                    <HiOutlineChevronRight className="size-4 transition-transform duration-200 group-data-[state=open]/forms:rotate-90" />
                  </button>
                </CollapsibleTrigger>
              </SidebarGroupLabel>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenuSub>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton
                        asChild
                        isActive={pathname === "/forms/stored"}
                        className="text-base"
                      >
                        <Link
                          href="/forms/stored"
                          aria-current={
                            pathname === "/forms/stored" ? "page" : undefined
                          }
                        >
                          <HiOutlineArchive />
                          <span>Stored</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === "/bank-details"}
                    className="text-base font-medium"
                  >
                    <Link
                      href="/bank-details"
                      aria-current={
                        pathname === "/bank-details" ? "page" : undefined
                      }
                    >
                      <HiOutlineLibrary />
                      <span>Bank Details</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooterWithUser />
        <SidebarRail />
          </Sidebar>
          <SidebarInset>
            <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear">
              <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar" />
            </header>
            <div className="flex-1 overflow-auto p-4 md:p-6">{children}</div>
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  )
}
