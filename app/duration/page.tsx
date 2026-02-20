"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const YEARS = [2023, 2024, 2025] as const

export default function DurationPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          US travel dates to determine SPT
        </h1>
        <p className="text-base text-muted-foreground">
          Enter your dates of arrival and departure in the US for the past
          years. F-1 students typically have a 5-year exemption for the
          Substantial Presence Test; we use these dates for your record and to
          complete Form 8843, which requires the number of days you were in the
          US in the past three years.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {YEARS.map((year) => {
          const minDate = `${year}-01-01`
          const maxDate = `${year}-12-31`
          return (
            <Card key={year} className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold">{year}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label
                    htmlFor={`arrival-${year}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Arrival
                  </label>
                  <Input
                    id={`arrival-${year}`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    aria-label={`Arrival date for ${year}`}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor={`departure-${year}`}
                    className="text-sm font-medium text-foreground"
                  >
                    Departure
                  </label>
                  <Input
                    id={`departure-${year}`}
                    type="date"
                    min={minDate}
                    max={maxDate}
                    aria-label={`Departure date for ${year}`}
                  />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:justify-between">
        <Button variant="outline" size="lg" asChild>
          <Link href="/documents/upload">Back</Link>
        </Button>
        <Button size="lg" type="button">
          Continue
        </Button>
      </div>
    </div>
  )
}
