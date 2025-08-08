import type * as React from "react"
import { MapPinIcon, TagIcon } from "lucide-react"

export const MapPin = (props: React.SVGProps<SVGSVGElement>) => {
  return <MapPinIcon {...props} />
}

export const Tag = (props: React.SVGProps<SVGSVGElement>) => {
  return <TagIcon {...props} />
}
