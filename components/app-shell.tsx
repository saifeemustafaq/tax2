"use client"

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
} from "react-icons/hi"

const documentsActive = (pathname: string) =>
  pathname === "/documents/upload" ||
  pathname === "/documents/stored" ||
  pathname === "/duration"

function SidebarFooterWithUser() {
  const { user, logout, isLoading } = useAuth()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (isLoading || !user) return null

  const displayName = getDisplayName(user)
  const initials = getInitials(user)

  return (
    <SidebarFooter>
      <SidebarTooltipProvider>
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
              <SidebarGroupLabel asChild>
                <CollapsibleTrigger className="cursor-pointer text-base font-medium text-sidebar-foreground">
                  <HiOutlineDocumentText />
                  <span>Documents</span>
                  <HiOutlineChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
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
