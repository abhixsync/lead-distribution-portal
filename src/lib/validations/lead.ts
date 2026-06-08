import { z } from 'zod'

/**
 * Public email providers that are blocked.
 * Corporate leads must use a company email address.
 */
const BLOCKED_EMAIL_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.co.uk',
  'googlemail.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
]

export const LeadFormSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must be 100 characters or less')
    .trim(),

  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must be 100 characters or less')
    .trim(),

  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .refine(
      (email) => {
        const domain = email.split('@')[1]?.toLowerCase()
        return domain !== undefined && !BLOCKED_EMAIL_DOMAINS.includes(domain)
      },
      'Please use a corporate email address (personal email providers are not accepted)'
    ),

  companyName: z
    .string()
    .min(1, 'Company name is required')
    .max(200, 'Company name must be 200 characters or less')
    .trim(),

  budgetRange: z.enum(['UNDER_10K', 'BETWEEN_10K_50K', 'GREATER_50K'], {
    required_error: 'Please select an estimated annual budget',
    invalid_type_error: 'Invalid budget range selection',
  }),
})

export type LeadFormValues = z.infer<typeof LeadFormSchema>
