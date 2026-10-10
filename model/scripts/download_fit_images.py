"""
Download the two FIT image shards referenced by data/training/processed/fit/*.jsonl.

The revision and SHA-256 hashes are pinned to the ones recorded in the ItFitS
training package (base_reports/download_manifest.json), so the images match
the split files exactly. About 1 GB in total.

    python model/scripts/download_fit_images.py
"""

import hashlib
import sys
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "data" / "training" / "raw" / "fit"

REPO = "Yuanhao-Harry-Wang/fitvto-100k"
REVISION = "5563646729edf148ed2b32c4b9c794d51a1bc828"

SHARDS = {
    "train-00000-of-00406.parquet": (
        504216699,
        "3a3219889ac1d43ec2b76ca61e7d11e3e2da861344e589c86d9bad95ae97827a",
    ),
    "eval-00000-of-00020.parquet": (
        499827823,
        "5bfec95d44d0d8ca4ff7674b7dd8e8b1a86c420853150ce5d2df6dd9e71ba235",
    ),
}


def sha256_of(path: Path) -> str:
    digest = hashlib.sha256()

    with path.open("rb") as f:
        while chunk := f.read(1 << 20):
            digest.update(chunk)

    return digest.hexdigest()


def download(name: str, size: int, sha: str):
    target = OUT_DIR / name

    if target.exists() and target.stat().st_size == size and sha256_of(target) == sha:
        print(f"cached      {name}")
        return

    url = f"https://huggingface.co/datasets/{REPO}/resolve/{REVISION}/data/{name}"
    part = target.with_suffix(".part")
    digest = hashlib.sha256()
    done = 0
    request = urllib.request.Request(url, headers={"User-Agent": "ItFitS-data-preparation"})

    with urllib.request.urlopen(request, timeout=120) as response, part.open("wb") as f:
        while chunk := response.read(1 << 20):
            f.write(chunk)
            digest.update(chunk)
            done += len(chunk)

            if done % (50 << 20) < (1 << 20):
                print(f"  {name}: {done / 1e6:.0f} / {size / 1e6:.0f} MB", flush=True)

    if done != size or digest.hexdigest() != sha:
        part.unlink(missing_ok=True)
        raise RuntimeError(f"{name}: size or SHA-256 mismatch")

    part.replace(target)
    print(f"downloaded  {name}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for name, (size, sha) in SHARDS.items():
        download(name, size, sha)

    print("FIT image shards ready in", OUT_DIR)


if __name__ == "__main__":
    sys.exit(main())
