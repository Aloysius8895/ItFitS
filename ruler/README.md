# ruler/ — size charts

Every `.csv` file here is one size chart. The backend re-reads this folder on each request, so new or edited charts show up without a restart. Later, charts from shop partners (Taobao, Shopee) can be dropped in the same way.

One row per size. `size` is required, plus at least one of these column groups:

| Columns | Meaning |
| --- | --- |
| `height_min_cm`, `height_max_cm` | Body height range the size is meant for |
| `weight_min_jin`, `weight_max_jin` *or* `weight_min_kg`, `weight_max_kg` | Body weight range (1 斤 = 0.5 kg) |
| `chest_cm` (+ optional `waist_cm`, `hip_cm`, `shoulder_cm`, `length_cm`) | Garment measurements (full circumference for chest/waist/hip) |

If a row has garment measurements, the fit is judged from garment-vs-body ease. Otherwise it is judged from where the person's height and weight fall inside each size's ranges.

The file name (without `.csv`) is the chart's id.
