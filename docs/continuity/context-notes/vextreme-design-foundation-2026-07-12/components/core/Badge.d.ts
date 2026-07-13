export interface BadgeProps {
  tone?: 'neutral' | 'success' | 'caution' | 'critical' | 'info';
  variant?: 'soft' | 'outline';
  children: React.ReactNode;
}
