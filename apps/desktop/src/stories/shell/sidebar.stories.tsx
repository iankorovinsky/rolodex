import type { Meta, StoryObj } from '@storybook/react';
import { BookUser, Clock3, Search, Settings } from 'lucide-react';
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
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Input } from '@/components/ui/input';

const meta = {
  title: 'Shell/Sidebar',
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <SidebarProvider defaultOpen defaultWidth="17rem">
      <Sidebar className="border-r border-sidebar-border">
        <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
          <div className="space-y-1">
            <div className="font-display text-2xl leading-none tracking-[-0.4px] text-foreground">
              rolodex
            </div>
            <p className="text-sm text-muted-foreground">Trusted context for the people in your orbit.</p>
          </div>
        </SidebarHeader>
        <SidebarContent className="bg-sidebar px-3 py-4">
          <div className="px-1 pb-4">
            <Input placeholder="Search people" />
          </div>
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                <SidebarMenuItem>
                  <SidebarMenuButton isActive>
                    <BookUser className="h-4 w-4" />
                    <span>Rolodex</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Search className="h-4 w-4" />
                    <span>Scouts</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Clock3 className="h-4 w-4" />
                    <span>Recent activity</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator className="my-4 bg-border" />
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Settings
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton>
                    <Settings className="h-4 w-4" />
                    <span>Preferences</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border bg-card px-4 py-4">
          <div className="rounded-[var(--rdx-radius-card)] border border-border bg-muted p-3">
            <p className="text-sm font-medium text-foreground">Action stays minimal</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Active state uses a tinted blue surface, not a loud full fill.
            </p>
          </div>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-screen bg-background">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="rounded-[var(--rdx-radius-control)] border border-border text-foreground hover:bg-muted" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Page header
              </p>
              <h1 className="font-display text-4xl leading-none tracking-[-1px] text-foreground">
                Calm shell, stronger content.
              </h1>
            </div>
          </div>
        </div>
        <div className="grid gap-6 bg-muted px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="rounded-[var(--rdx-radius-card)] border border-border bg-card p-5 shadow-rdx-card"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                card {index + 1}
              </p>
              <p className="mt-3 text-lg font-medium tracking-[-0.2px] text-foreground">
                Hierarchy comes from rhythm, not noise.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Standard cards stay on white with a whisper border and a restrained shadow.
              </p>
            </div>
          ))}
        </div>
      </SidebarInset>
    </SidebarProvider>
  ),
};
