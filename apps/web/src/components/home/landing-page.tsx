import {
  panelSnapshots,
  productHighlights,
} from '@cetus/web/shared/home/constants'
import React from 'react'
import { BackgroundEffects } from './background-effects'
import { FeaturesSection } from './features-section'
import { HeroSection } from './hero-section'
import { LandingHeader } from './landing-header'
import { SecuritySection } from './security-section'
import { SiteFooter } from './site-footer'

export function LandingPage() {
  const [panelIndex, setPanelIndex] = React.useState(0)

  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setPanelIndex((prev) => (prev + 1) % panelSnapshots.length)
    }, 5000)

    return () => window.clearInterval(interval)
  }, [])

  const panelData = panelSnapshots[panelIndex]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <BackgroundEffects />
      <LandingHeader />
      <main className="mx-auto w-full max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 lg:px-8">
        <HeroSection panelData={panelData} />
        <SecuritySection />
        <FeaturesSection productHighlights={productHighlights} />
      </main>

      <SiteFooter />
    </div>
  )
}
