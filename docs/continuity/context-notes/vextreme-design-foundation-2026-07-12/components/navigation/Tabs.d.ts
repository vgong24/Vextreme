export interface TabItem {
  label: string;
  value: string;
}
export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange?: (value: string) => void;
}
