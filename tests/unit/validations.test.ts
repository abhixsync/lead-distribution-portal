import { LeadFormSchema } from '@/lib/validations/lead'

describe('LeadFormSchema', () => {
  const validLead = {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@acmecorp.com',
    companyName: 'Acme Corp',
    budgetRange: 'UNDER_10K' as const,
  }

  describe('email validation', () => {
    it('accepts a valid corporate email', () => {
      const result = LeadFormSchema.safeParse(validLead)
      expect(result.success).toBe(true)
    })

    it('rejects gmail.com domain', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@gmail.com' })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.email).toBeDefined()
      }
    })

    it('rejects yahoo.com domain', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@yahoo.com' })
      expect(result.success).toBe(false)
    })

    it('rejects outlook.com domain', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@outlook.com' })
      expect(result.success).toBe(false)
    })

    it('rejects hotmail.com domain', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@hotmail.com' })
      expect(result.success).toBe(false)
    })

    it('rejects icloud.com domain', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@icloud.com' })
      expect(result.success).toBe(false)
    })

    it('accepts a subdomain of a blocked domain (e.g. corp subdomain)', () => {
      // corp.gmail.com is a custom company domain, not gmail.com itself
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'user@corp.example.com' })
      expect(result.success).toBe(true)
    })

    it('rejects invalid email format', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: 'not-an-email' })
      expect(result.success).toBe(false)
    })

    it('rejects empty email', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, email: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('required fields', () => {
    it('rejects empty firstName', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, firstName: '' })
      expect(result.success).toBe(false)
    })

    it('rejects empty lastName', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, lastName: '' })
      expect(result.success).toBe(false)
    })

    it('rejects empty companyName', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, companyName: '' })
      expect(result.success).toBe(false)
    })

    it('rejects missing budgetRange', () => {
      const { budgetRange: _b, ...withoutBudget } = validLead
      const result = LeadFormSchema.safeParse(withoutBudget)
      expect(result.success).toBe(false)
    })
  })

  describe('budgetRange validation', () => {
    it.each(['UNDER_10K', 'BETWEEN_10K_50K', 'GREATER_50K'] as const)(
      'accepts %s budget range',
      (range) => {
        const result = LeadFormSchema.safeParse({ ...validLead, budgetRange: range })
        expect(result.success).toBe(true)
      }
    )

    it('rejects invalid budget range', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, budgetRange: 'INVALID' })
      expect(result.success).toBe(false)
    })
  })

  describe('field length limits', () => {
    it('rejects firstName over 100 characters', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, firstName: 'a'.repeat(101) })
      expect(result.success).toBe(false)
    })

    it('rejects companyName over 200 characters', () => {
      const result = LeadFormSchema.safeParse({ ...validLead, companyName: 'a'.repeat(201) })
      expect(result.success).toBe(false)
    })
  })
})
