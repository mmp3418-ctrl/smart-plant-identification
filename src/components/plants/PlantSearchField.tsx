import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui'
import { useState, type FormEvent } from 'react'

interface PlantSearchFieldProps {
  initialQuery?: string
  placeholder?: string
  navigateOnSubmit?: boolean
  onQueryChange?: (query: string) => void
  autoFocus?: boolean
}

export function PlantSearchField({
  initialQuery = '',
  placeholder = 'ابحث باسم النبات أو الاسم العلمي…',
  navigateOnSubmit = true,
  onQueryChange,
  autoFocus = false,
}: PlantSearchFieldProps) {
  const [query, setQuery] = useState(initialQuery)
  const navigate = useNavigate()

  function handleChange(value: string) {
    setQuery(value)
    onQueryChange?.(value)
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = query.trim()
    if (navigateOnSubmit) {
      navigate(trimmed ? `/directory?q=${encodeURIComponent(trimmed)}` : '/directory')
    }
  }

  return (
    <form onSubmit={handleSubmit} role="search" className="w-full">
      <Input
        value={query}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label="بحث عن نبات"
        leftAddon={<Search className="size-4" aria-hidden />}
      />
    </form>
  )
}
