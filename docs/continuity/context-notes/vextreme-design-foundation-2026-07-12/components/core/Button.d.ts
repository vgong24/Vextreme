export interface ButtonProps {
  /** Visual weight. primary = solid inverse fill; secondary = raised surface; ghost = no chrome; outline = strong border only. */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
