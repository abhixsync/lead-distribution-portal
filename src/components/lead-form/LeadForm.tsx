'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { LeadFormSchema, type LeadFormValues } from '@/lib/validations/lead'
import { BUDGET_RANGE_LABELS } from '@/types'
import { CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react'

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

export function LeadForm() {
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<LeadFormValues>({
    resolver: zodResolver(LeadFormSchema),
  })

  async function onSubmit(data: LeadFormValues) {
    setSubmitState('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()

      if (res.status === 201)  { setSubmitState('success'); reset(); return }
      if (res.status === 409)  { setErrorMessage(result.error ?? 'Email already submitted.'); setSubmitState('error'); return }
      if (res.status === 422)  {
        const msgs = Object.values(result.errors as Record<string, string[]>).flat().join(' ')
        setErrorMessage(msgs || 'Please check your input.'); setSubmitState('error'); return
      }
      setErrorMessage('Something went wrong. Please try again.')
      setSubmitState('error')
    } catch {
      setErrorMessage('Network error. Please check your connection.')
      setSubmitState('error')
    }
  }

  if (submitState === 'success') {
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">You're all set!</h3>
        <p className="mt-1.5 text-sm text-gray-500 max-w-xs">
          We've received your details and will connect you with the right team shortly.
        </p>
        <button
          onClick={() => setSubmitState('idle')}
          className="mt-6 text-sm text-blue-600 underline-offset-4 hover:underline"
        >
          Submit another enquiry
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Error banner */}
      {submitState === 'error' && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="First Name" error={errors.firstName?.message}>
          <Input id="firstName" placeholder="Jane" aria-invalid={!!errors.firstName} {...register('firstName')} />
        </Field>
        <Field label="Last Name" error={errors.lastName?.message}>
          <Input id="lastName" placeholder="Smith" aria-invalid={!!errors.lastName} {...register('lastName')} />
        </Field>
      </div>

      {/* Email */}
      <Field
        label="Corporate Email"
        error={errors.email?.message}
        hint={!errors.email ? 'Personal email providers are not accepted.' : undefined}
      >
        <Input
          id="email"
          type="email"
          placeholder="jane@yourcompany.com"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </Field>

      {/* Company */}
      <Field label="Company Name" error={errors.companyName?.message}>
        <Input id="companyName" placeholder="Acme Corporation" aria-invalid={!!errors.companyName} {...register('companyName')} />
      </Field>

      {/* Budget */}
      <Field label="Estimated Annual Budget" error={errors.budgetRange?.message}>
        <Select onValueChange={(v) => setValue('budgetRange', v as LeadFormValues['budgetRange'], { shouldValidate: true })}>
          <SelectTrigger id="budgetRange" aria-invalid={!!errors.budgetRange}>
            <SelectValue placeholder="Select budget range" />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(BUDGET_RANGE_LABELS) as [LeadFormValues['budgetRange'], string][]).map(
              ([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              )
            )}
          </SelectContent>
        </Select>
      </Field>

      <Button type="submit" className="w-full gap-2" disabled={submitState === 'loading'}>
        {submitState === 'loading' ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
        ) : (
          <>Get in Touch <ArrowRight className="h-4 w-4" /></>
        )}
      </Button>
    </form>
  )
}

/* ── Small helper ─────────────────────────────────────────────────── */
function Field({
  label, children, error, hint,
}: {
  label: string
  children: React.ReactNode
  error?: string
  hint?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label} <span className="text-red-500">*</span>
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-red-500" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400">{hint}</p>
      ) : null}
    </div>
  )
}
