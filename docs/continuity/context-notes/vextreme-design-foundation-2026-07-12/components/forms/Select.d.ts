export interface SelectOption {
  label: string;
  value: string;
}
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
}
