Primary interactive control for a single confirmed action — use `primary` sparingly (one per view), `secondary`/`outline` for supporting actions, `ghost` for low-emphasis or icon-adjacent actions.

```jsx
<Button variant="primary" size="md" onClick={handleSave}>Save Journey</Button>
<Button variant="outline" size="sm">Cancel</Button>
```

Variants: `primary` (solid inverse — black-on-white / white-on-black), `secondary` (raised surface + border), `ghost` (no chrome), `outline` (strong border, transparent fill). Sizes: `sm`, `md`, `lg`. `disabled` dims to 45% opacity and blocks the pointer.
