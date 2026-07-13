export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Use the monospace evidentiary voice — ids, keys, paths. */
  mono?: boolean;
}
