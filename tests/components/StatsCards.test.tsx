import { render, screen } from '@testing-library/react'
import { StatsCards } from '@/components/dashboard/StatsCards'
import type { StatsData } from '@/types'

const mockStats: StatsData = {
  total: 42,
  synced: 35,
  failed: 3,
  pending: 3,
  processing: 1,
  pipeline: 245_000,
}

describe('StatsCards', () => {
  it('shows loading skeletons when loading', () => {
    const { container } = render(<StatsCards stats={null} loading={true} />)
    // Skeletons render as animate-pulse divs
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(4)
  })

  it('displays total lead count', () => {
    render(<StatsCards stats={mockStats} loading={false} />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('displays synced lead count', () => {
    render(<StatsCards stats={mockStats} loading={false} />)
    expect(screen.getByText('35')).toBeInTheDocument()
  })

  it('displays failed lead count', () => {
    render(<StatsCards stats={mockStats} loading={false} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays pipeline value formatted as currency', () => {
    render(<StatsCards stats={mockStats} loading={false} />)
    // $245,000 formatted
    expect(screen.getByText('$245,000')).toBeInTheDocument()
  })

  it('shows $0 pipeline when stats is null', () => {
    render(<StatsCards stats={null} loading={false} />)
    expect(screen.getByText('$0')).toBeInTheDocument()
  })
})
