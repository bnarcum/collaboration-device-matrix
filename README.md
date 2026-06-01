# Collaboration Device Matrix

Cisco-first interactive 3D catalog of collaboration endpoints, with **Logitech**, **Poly**, and **Neat** products for side-by-side browsing and comparison.

- **Default view:** Cisco devices (from the official Collaboration Device Product Matrix brochure)
- **Manufacturer toggles:** Turn Cisco, Logitech, Poly, and/or Neat on or off; **All** selects every vendor (URL: `?vendor=cisco,poly` or `?vendor=all`)
- **Modes:** Showroom (3D rings), Aisle (shelves), Finder (guided match)

## Development

```bash
npm ci
npm run dev
```

## Build & deploy

```bash
npm run build
npm run verify:images
npm run verify:product-urls
```

CI (`.github/workflows/ci.yml`) runs build + image + URL checks on every push/PR.

Product photo processing flags (e.g. headset hole-punch) live in `public/devices/_image-processing.json`.

GitHub Pages workflow is included (`.github/workflows/deploy.yml`). Set Pages source to **GitHub Actions**.

## Data & images

| Vendor   | Catalog source        | Images                          |
|----------|------------------------|---------------------------------|
| Cisco    | `src/data/vendors/cisco.ts` | Brochure extract (`public/devices/`) |
| Logitech | `src/data/vendors/logitech.ts` | Datasheets / gallery            |
| Poly     | `src/data/vendors/poly*.ts` | HP/Poly DAM                     |
| Neat     | `src/data/vendors/neat.ts` | Neat CDN                        |

```bash
python3 scripts/import-product-images.py   # partner heroes
python3 scripts/remove-backgrounds.py      # cutouts
```

## Unaffiliated

This project is not affiliated with Cisco, Logitech, Poly (HP), or Neat. Specifications are summarized from public product documentation.
