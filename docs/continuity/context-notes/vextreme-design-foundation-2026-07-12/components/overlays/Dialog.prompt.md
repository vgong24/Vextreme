Centered modal for a confirmation or a focused edit. Requires a positioned (relative/absolute) ancestor to contain it.

```jsx
<Dialog open={open} title="Delete Journey?" footer={<><Button variant="ghost" onClick={close}>Cancel</Button><Button variant="primary" onClick={confirm}>Delete</Button></>}>
  This removes the journey and its replay history.
</Dialog>
```
