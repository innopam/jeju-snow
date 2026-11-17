import { LIB_ICONS } from './libIcons.js'

// component library 의 svg.icon — 20px, stroke 1.8, 색은 글자색을 따른다
export default function Icon({ name, size = 20, className = '', ...rest }) {
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
