import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Service } from "@/types"
import { Briefcase, Building, Monitor, Plane, Truck, Users, FileText } from "lucide-react"

const icons: Record<string, any> = {
    it_helpdesk: Monitor,
    meeting_room: Users,
    business_travel: Plane,
    transportation: Truck,
    building_maintenance: Building,
    media_request: FileText,
    stationery: Briefcase,
}

interface ServiceCardProps {
    service: Service
}

export function ServiceCard({ service }: ServiceCardProps) {
    const Icon = icons[service.key] || Briefcase

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <Icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription className="text-xs">{service.owning_department}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {service.description}
                </p>
                <Button asChild className="w-full" variant="outline">
                    <Link href={`/dashboard/user/requests/new?service=${service.id}`}>
                        تقديم طلب
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
