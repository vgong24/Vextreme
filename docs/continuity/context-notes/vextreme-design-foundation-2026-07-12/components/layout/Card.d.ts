export interface CardProps {
  eyebrow?: string;
  title?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Use the "raised" surface for cards nested inside another surface. */
  raised?: boolean;
  style?: React.CSSProperties;
}
