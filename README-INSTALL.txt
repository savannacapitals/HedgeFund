SAVANNA CAPITALS — Admin revenue breakdown patch
================================================

Changes:
1. src/lib/admin/metrics.ts
   - Revenue query now selects order `kind`
   - Returns per-product buckets: Academy, AI membership, AI assistance
     (plus Community/Other when present)
   - Overall totals still grouped by currency as before

2. src/app/admin/dashboard/page.tsx
   - Revenue metric shows USD headline + KES in the footnote
   - New "Revenue by product" panel with USD and KES always listed
     for Academy, AI membership, and AI assistance
   - Platform total row lists every currency (USD + KES guaranteed)

Extract into project root, overwrite, then:
  npm run build

No schema or env changes. Only confirmed orders in the current UTC month count.
