import { prisma } from "@/lib/prisma";
import { OutletClient } from "./components/outlet-client";

export const dynamic = "force-dynamic";

export default async function OutletsPage() {
    const outlets = await prisma.outlet.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="p-8 space-y-4">
            <OutletClient initialOutlets={outlets} />
        </div>
    );
}
