"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Clock, MapPin, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/actions";


const routes = [
    {
        label: "Dashboard",
        icon: LayoutDashboard,
        href: "/",
        color: "text-sky-500",
    },
    {
        label: "Employees",
        icon: Users,
        href: "/employees",
        color: "text-violet-500",
    },
    {
        label: "Outlets",
        icon: MapPin,
        href: "/outlets",
        color: "text-emerald-500",
    },
    {
        label: "Attendance",
        icon: Clock,
        href: "/attendance",
        color: "text-pink-700",
    },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/" className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold">HRIS AI</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400",
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
            <div className="px-3 pb-4">
                <button
                    onClick={() => logout()}
                    className="text-zinc-400 text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                    <div className="flex items-center flex-1">
                        <LogOut className="h-5 w-5 mr-3 text-red-500" />
                        Logout
                    </div>
                </button>
            </div>
        </div>

    );
}
