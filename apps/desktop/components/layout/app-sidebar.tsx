'use client';

import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, ChevronsUpDown, Plug, BookUser } from 'lucide-react';
import type { AvatarIdValue } from '@rolodex/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAuth } from '@/lib/auth/auth-context';
import { getAvatarOption } from '@/lib/user/avatar';

interface NavSubItem {
  href: string;
  label: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  subItems?: NavSubItem[];
}

const navItems: NavItem[] = [
  {
    href: '/app',
    label: 'Rolodex',
    icon: BookUser,
  },
];

interface AppSidebarProps {
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarId: AvatarIdValue | null;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const avatar = getAvatarOption(user.avatarId);

  const handleLogout = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  // Exact match only for active state
  const isActive = (href: string) => {
    return location.pathname === href;
  };

  // Check if category should be expanded (not styled as active)
  const isCategoryExpanded = (item: NavItem) => {
    return location.pathname === item.href || location.pathname.startsWith(item.href + '/');
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/app" className="flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <div className="group-data-[collapsible=icon]:hidden">
            <div className="font-semibold text-sidebar-foreground">rolodex.</div>
            <div className="text-xs text-sidebar-foreground/60">Keep your people in context.</div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-3">
              {navItems.map((item) => {
                const expanded = isCategoryExpanded(item);

                // If item has subItems, render as collapsible
                if (item.subItems && item.subItems.length > 0) {
                  return (
                    <Collapsible
                      key={item.href}
                      asChild
                      defaultOpen={expanded}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            isActive={false}
                            tooltip={item.label}
                            className="[&:hover]:bg-sidebar-accent [&:hover]:text-sidebar-accent-foreground text-base"
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.subItems.map((subItem) => (
                              <SidebarMenuSubItem key={subItem.href}>
                                <Link to={subItem.href} className="block">
                                  <span
                                    className={`inline-flex px-2 py-1 rounded-md text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
                                      isActive(subItem.href)
                                        ? 'bg-sidebar-active text-sidebar-active-foreground'
                                        : ''
                                    }`}
                                  >
                                    {subItem.label}
                                  </span>
                                </Link>
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  );
                }

                // Otherwise, render as direct link
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                      className="text-base"
                    >
                      <Link to={item.href}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={avatar.src} alt={avatar.label} />
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
                  {avatar.label.slice(0, 1)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                <div className="text-sm font-medium text-sidebar-foreground truncate">
                  {user.name || user.email}
                </div>
                <div className="text-xs text-sidebar-foreground/60 truncate">{user.email}</div>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/60 shrink-0 group-data-[collapsible=icon]:hidden" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="top"
            sideOffset={8}
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
          >
            <DropdownMenuItem asChild className="gap-2">
              <Link to="/app/integrations">
                <Plug className="h-4 w-4" />
                Integrations
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
