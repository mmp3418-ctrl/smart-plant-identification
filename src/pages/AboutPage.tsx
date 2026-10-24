import { Card } from '@/components/ui'
import { useSiteContent } from '@/context/ContentContext'
import { cn } from '@/lib/cn'

export function AboutPage() {
  const { content } = useSiteContent()
  const about = content.about

  return (
    <div className="container-app py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          {about.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted sm:text-base">
          {about.intro}
        </p>

        <div className="mt-8 space-y-4">
          {about.blocks.map((block) => (
            <Card
              key={block.id}
              padding="lg"
              className={cn(
                block.tone === 'warning' && 'border-amber-400/30 glass-amber',
              )}
            >
              <h2 className="text-base font-bold text-ink">{block.title}</h2>
              {block.body ? (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {block.body}
                </p>
              ) : null}
              {block.bullets?.length ? (
                <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-relaxed text-muted">
                  {block.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
