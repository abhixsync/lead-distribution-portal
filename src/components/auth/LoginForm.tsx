'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LoginSchema, type LoginValues } from '@/lib/validations/auth'
import { Loader2, AlertCircle, ArrowRight } from 'lucide-react'

export function LoginForm() {
  const router = useRouter()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
  })

  async function onSubmit(data: LoginValues) {
    setLoading(true)
    setServerError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (res.ok) { router.push('/dashboard'); router.refresh(); return }
      setServerError(result.error ?? 'Login failed. Please try again.')
    } catch {
      setServerError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {serverError && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-gray-700">Password</Label>
        <Input
          type="password"
          placeholder="Enter admin password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <p className="text-xs text-red-500" role="alert">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full gap-2" disabled={loading}>
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Signing in…</>
          : <>Sign In <ArrowRight className="h-4 w-4" /></>}
      </Button>
    </form>
  )
}
