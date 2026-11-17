import type { SVGProps } from 'react'
import { LIB_ICONS } from './libIcons'

// component library 의 svg.icon — 20px, stroke 1.8, 색은 글자색을 따른다
type IconProps = Omit<SVGProps<SVGSVGElement>, 'name'> & { name: string; size?: number | string }

export default function Icon({ name, size = 20, className = '', ...rest }: IconProps) {
  return (
    <svg
      className={`icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: LIB_ICONS[name] ?? '' }}
      {...rest}
    />
  )
}
