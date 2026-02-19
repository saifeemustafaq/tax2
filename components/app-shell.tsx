"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { StepProgressBar } from "@/components/step-progress-bar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
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
} from "@/components/ui/sidebar"
import {
  HiOutlineDocumentText,
  HiOutlineCloudUpload,
  HiOutlineArchive,
  HiOutlineChevronRight,
  HiOutlineCalendar,
} from "react-icons/hi"

const documentsActive = (pathname: string) =>
  pathname === "/documents/upload" ||
  pathname === "/documents/stored" ||
  pathname === "/duration"

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
