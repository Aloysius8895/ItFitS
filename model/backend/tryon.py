"""Gemini image-model virtual try-on (REST, no extra dependency)."""

import base64
import json
import re
import uuid
import urllib.error
import urllib.request
from typing import Optional

from backend import config


FIT_INSTRUCTIONS = {
    "too_tight": (
        "The garment is clearly TOO SMALL for this person, one or two sizes "
        "too small. Show it stretched taut and straining: strong horizontal "
        "pull wrinkles radiating from the bust and waist, fabric gaping open "
        "between buttons or seams, seams pulling, sleeves and hem too short "
        "(wrists exposed, hem riding up), and fabric clinging tightly to "
        "every curve. It must look uncomfortably tight, not just slim-fit."
    ),
    "fitted": (
        "The garment is the RIGHT SIZE. Show it fitting the body closely and "
        "cleanly, following the person's shape without pulling or sagging."
    ),
    "relaxed": (
        "The garment is a little LOOSE. Show a comfortable, relaxed fit with "
        "slight extra fabric around the torso, not tailored to the body."
    ),
    "oversize": (
        "The garment is clearly TOO BIG for this person (oversize). Show "
        "excess fabric hanging off the body: shoulders dropping, sleeves "
        "and hem too long, fabric bunching and billowing around the waist. "
        "It must look noticeably baggy."
    ),
}


class TryOnError(Exception):
    pass


def build_prompt(body: dict, garment: dict, assessment: dict) -> str:
    ease = ", ".join(
        f"{k} {v:+.1f}%" for k, v in assessment["ease_pct"].items()
    )

    return (
        "Image 1 is a photo of a person. Image 2 is a garment "
        f"(category: {garment['category']}).\n"
        "Task: generate a realistic photo of the SAME person from image 1 "
        "wearing the garment from image 2 in size "
        f"{assessment['size']}.\n\n"
        f"FIT TO SHOW: {FIT_INSTRUCTIONS[assessment['level']]}\n\n"
        "Facts for the fit (circumference of garment vs body): "
        f"{ease}. Person: {body['height']:.0f} cm, {body['weight']:.0f} kg, "
        f"bust {body['bust']:.0f} / waist {body['waist']:.0f} / "
        f"hip {body['hip']:.0f} cm.\n\n"
        "Rules: keep the person's face, skin tone, hair, body shape, pose "
        "and the background unchanged. Keep the garment's colour, pattern, "
        "fabric and design exactly as in image 2. Remove the clothing the "
        "person was wearing in that area. Output a single full-body image, "
        "no text, no borders."
    )


def _split_data_url(data_url: str):
    match = re.match(r"^data:(image/[\w.+-]+);base64,(.+)$", data_url, re.S)

    if not match:
        raise TryOnError("Images must be sent as base64 data URLs.")

    return match.group(1), match.group(2)


# Cloudflare in front of some gateways rejects urllib's default User-Agent.
_UA = {"User-Agent": "Mozilla/5.0 FLOWFIT/1.0"}


def is_configured() -> bool:
    if config.TRYON_PROVIDER == "grafilab":
        return bool(config.GRAFILAB_API_KEY)

    return bool(config.GEMINI_API_KEY)


def missing_key_message() -> str:
    name = "GRAFILAB_API_KEY" if config.TRYON_PROVIDER == "grafilab" else "GEMINI_API_KEY"
    return (f"Set {name} in model/.env and restart the backend "
            "(.env is only read at startup).")


# Continuous fit description by fit_index (+1 = at the tight limit, -1 = start
# of relaxed, below about -2.2 = oversize). Sizes past +1 are not rendered.
FIT_LADDER = [
    (0.5, "SNUG: the garment sits close to the body with light tension across "
          "the chest and upper arms; the hem sits at its natural length or "
          "slightly short."),
    (-0.3, "TRUE TO SIZE: a clean regular fit that follows the body without "
           "pulling or sagging; shoulder seams on the shoulder points."),
    (-1.0, "SLIGHTLY RELAXED: a little extra room around the chest and waist; "
           "shoulder seams at or just past the shoulder points."),
    (-1.6, "LOOSE: visible extra fabric around the torso, shoulder seams "
           "dropping past the shoulders, hem and sleeves noticeably longer."),
    (-2.2, "VERY LOOSE: fabric hangs and folds around the body, dropped "
           "shoulders, long sleeves and a long hem."),
    (float("-inf"), "OVERSIZE: clearly too big: shoulder seams far down the "
                    "arms, sleeves covering more of the arm, hem well below the "
                    "hips, baggy folds everywhere."),
]

# Typical change per size step (cm), used until shop partners provide real
# garment measurements for every size.
GRADING_CM = {
    "top": {"chest circumference": 5.0, "body length": 2.0,
            "shoulder width": 1.2, "sleeve length": 1.0},
    "outerwear": {"chest circumference": 6.0, "body length": 2.5,
                  "shoulder width": 1.5, "sleeve length": 1.5},
    "other": {"waist circumference": 4.0, "hip circumference": 4.0,
              "length": 1.5},
}


# Just past the tight limit (rendered when height still fits): tight, not straining.
SLIGHTLY_TOO_TIGHT = (
    "TIGHT: a little too small: the fabric is pulled close over the chest, "
    "shoulders and upper arms with some horizontal tension lines, and the hem "
    "and sleeves sit slightly short. Clearly tighter than a regular fit, but "
    "still wearable."
)


# Height/weight charts: one description per size relative to the height-based
# size, with visible landmarks so neighbouring sizes do not get the same text.
STEP_LADDER = {
    -1: ("ONE SIZE SMALL (snug): the shoulder seams sit slightly inside the "
         "shoulder points, the fabric lies flat against the chest and upper "
         "arms with light pull lines, the hem ends at or just above the "
         "waistband and the sleeves end a little higher up the arm."),
    0: ("TRUE TO SIZE (regular fit): the shoulder seams sit exactly on the "
        "shoulder points, the body follows the torso with a little room, the "
        "hem ends around the top of the hips and the sleeves end at their "
        "natural length."),
    1: ("ONE SIZE UP (relaxed): the shoulder seams sit about 2 cm past the "
        "shoulder points, there is visible spare fabric at the sides of the "
        "torso, the hem reaches a little below the waistband and the sleeves "
        "are slightly longer and wider."),
    2: ("TWO SIZES UP (loose): the shoulder seams have dropped onto the upper "
        "arms, the fabric hangs in soft folds around the waist, the hem covers "
        "the hips and the sleeves are noticeably longer and wider."),
}
STEP_OVERSIZE = ("THREE OR MORE SIZES UP (oversized): the shoulder seams are "
                 "well down the arms, the body is boxy and billowing, the hem "
                 "falls to the upper thighs and the sleeves cover most of the "
                 "arm.")
# Weight outside the size's range, by how far (z in half-range widths).
WEIGHT_FAR_Z = 2.5
WEIGHT_NOTE = {
    ("TIGHT", True): (" The body is clearly fuller than this size is cut for "
                      "(weight well above the brand's range): the fabric is "
                      "pulled across the chest and stomach and the front hem "
                      "rides up."),
    ("TIGHT", False): (" The body is a little fuller than this size is cut for: "
                       "the fabric sits closer around the stomach than "
                       "elsewhere."),
    ("LOOSE", True): (" The body is much slimmer than this size is cut for: "
                      "the fabric hangs straight down from the chest with a lot "
                      "of extra width at the waist."),
    ("LOOSE", False): (" The body is a little slimmer than this size is cut "
                       "for: slightly more width at the waist."),
}


def describe_fit(assessment: dict) -> str:
    steps = assessment.get("size_steps")

    if steps is not None and steps >= -1:
        text = STEP_LADDER.get(steps, STEP_OVERSIZE)
        weight = next((z for z in assessment["zones"] if z["name"] == "WEIGHT"), None)
        if weight and weight["word"] in ("TIGHT", "LOOSE"):
            text += WEIGHT_NOTE[(weight["word"], abs(weight["ease_pct"]) > WEIGHT_FAR_Z)]
        return text

    fit_index = assessment.get("fit_index")

    if fit_index is not None and 1 < fit_index <= 2:
        return SLIGHTLY_TOO_TIGHT

    if fit_index is None or fit_index > 1:
        return FIT_INSTRUCTIONS[assessment["level"]]

    return next(text for limit, text in FIT_LADDER if fit_index > limit)


def build_app_prompt(body: dict, assessment: dict) -> str:
    """
    Prompt for the mobile app's first (anchor) render. The garment comes only
    from the uploaded photo (image 2); no catalog name, colour or category is
    described in text, so nothing can contradict the photo.
    """
    shoulder = (f", shoulder width {body['shoulder']:.0f} cm"
                if body.get("shoulder") else "")

    if assessment.get("facts"):
        # Height/weight range chart (ruler/): no garment measurements exist.
        facts = assessment["facts"]
    else:
        ease = ", ".join(
            f"{k} {v:+.1f}%" for k, v in assessment["ease_pct"].items()
        )
        facts = (
            f"Facts for the fit (garment vs body circumference): {ease}. "
            f"Person: {body['height']:.0f} cm, {body['weight']:.0f} kg, "
            f"chest {body['chest']:.0f} / waist {body['waist']:.0f} cm{shoulder}."
        )

    return (
        "Image 1 is a photo of a person. Image 2 is a photo of the garment to "
        "try on. Image 2 may show the garment laid flat, on a hanger or worn "
        "by someone else: use only that garment, and ignore any person, "
        "background or other clothing in image 2.\n"
        "Task: generate a realistic photo of the SAME person from image 1 "
        f"wearing the garment from image 2 in size {assessment['size']}.\n\n"
        f"FIT TO SHOW: {describe_fit(assessment)}\n\n"
        f"{facts}\n\n"
        "Rules: keep the person's face, skin tone, hair, body shape, pose "
        "and the background unchanged. Copy the garment's type, colour, "
        "pattern, fabric, logos and design exactly from image 2; do not "
        "invent a different garment. Replace only the clothing the person "
        "was wearing in that area. Keep the same framing and crop as image 1 "
        "(do not zoom in or cut off the body). Output a single image, no "
        "text, no borders."
    )


def build_size_edit_prompt(anchor: dict, target: dict, steps: int,
                           group: str) -> str:
    """
    Prompt that turns the anchor render into another size. Every other size is
    edited from the same anchor image so only the fit changes.
    """
    larger = steps > 0
    direction = "larger" if larger else "smaller"
    count = abs(steps)
    changes = []

    for part, cm in GRADING_CM.get(group, GRADING_CM["other"]).items():
        if "length" in part:
            word = "longer" if larger else "shorter"
        elif "width" in part:
            word = "wider" if larger else "narrower"
        else:
            word = "more" if larger else "less"
        changes.append(f"about {cm * count:g} cm {word} {part}")

    return (
        f"Image 1 is a try-on photo of a person wearing a garment in size "
        f"{anchor['size']}. Image 2 is the original photo of that garment, "
        "for reference only.\n"
        f"Task: edit image 1 so the SAME person wears the SAME garment in size "
        f"{target['size']} instead, which is {count} size"
        f"{'s' if count > 1 else ''} {direction}. Change ONLY how the garment "
        "fits.\n\n"
        f"Garment change versus image 1: {', '.join(changes)}.\n"
        f"How size {target['size']} fits this person: {describe_fit(target)}\n"
        f"(For comparison, size {anchor['size']} in image 1 is: "
        f"{describe_fit(anchor).split(':')[0].lower()}.)\n\n"
        "Keep everything else identical to image 1: face, hair, skin, body "
        "shape, pose, hands, camera framing and crop, lighting, background, "
        "the other clothes, and the garment's colour, fabric, pattern, logos "
        "and design. The difference between the two sizes must be clearly "
        "visible. Output a single image with the same framing as image 1, "
        "no text, no borders."
    )


def generate_tryon(person_image: str, garment_image: Optional[str], prompt: str) -> str:
    """Return the generated image as a data URL."""
    if config.TRYON_PROVIDER == "grafilab":
        return _generate_grafilab(person_image, garment_image, prompt)

    return _generate_gemini(person_image, garment_image, prompt)


def _generate_grafilab(person_image: str, garment_image: Optional[str], prompt: str) -> str:
    if not config.GRAFILAB_API_KEY:
        raise TryOnError("GRAFILAB_API_KEY is not set.")

    boundary = uuid.uuid4().hex
    crlf = bytes([13, 10])
    parts = []

    for name, value in (("model", config.GRAFILAB_IMAGE_MODEL),
                        ("prompt", prompt), ("n", "1"),
                        ("response_format", "b64_json")):
        parts.append(b"".join([
            f"--{boundary}".encode(), crlf,
            f'Content-Disposition: form-data; name="{name}"'.encode(), crlf, crlf,
            str(value).encode("utf-8"), crlf,
        ]))

    # The gateway takes several inputs as a repeated "image" field
    # (the "image[]" spelling returns HTTP 500).
    images = [("person", person_image)]
    if garment_image:
        images.append(("garment", garment_image))

    for filename, data_url in images:
        mime, b64 = _split_data_url(data_url)
        parts.append(b"".join([
            f"--{boundary}".encode(), crlf,
            f'Content-Disposition: form-data; name="image"; filename="{filename}"'.encode(), crlf,
            f"Content-Type: {mime}".encode(), crlf, crlf,
            base64.b64decode(b64), crlf,
        ]))

    parts.append(f"--{boundary}--".encode() + crlf)

    request = urllib.request.Request(
        f"{config.GRAFILAB_BASE_URL}/images/edits",
        data=b"".join(parts),
        headers={
            **_UA,
            "Authorization": f"Bearer {config.GRAFILAB_API_KEY}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=150) as response:
            result = json.loads(response.read().decode("utf-8"))

        item = (result.get("data") or [{}])[0]

        if item.get("b64_json"):
            return f"data:image/png;base64,{item['b64_json']}"

        if not item.get("url"):
            raise TryOnError("Grafilab returned no image.")

        image_request = urllib.request.Request(item["url"], headers=_UA)

        with urllib.request.urlopen(image_request, timeout=60) as image:
            mime = image.headers.get_content_type() or "image/png"
            encoded = base64.b64encode(image.read()).decode("ascii")

        return f"data:{mime};base64,{encoded}"
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise TryOnError(f"Grafilab API error {error.code}: {detail}")
    except urllib.error.URLError as error:
        raise TryOnError(f"Could not reach Grafilab: {error.reason}")


def _generate_gemini(person_image: str, garment_image: Optional[str], prompt: str) -> str:
    if not config.GEMINI_API_KEY:
        raise TryOnError("GEMINI_API_KEY is not set.")

    parts = [{"text": prompt}]

    for data_url in (person_image, garment_image):
        if data_url:
            mime, b64 = _split_data_url(data_url)
            parts.append({"inline_data": {"mime_type": mime, "data": b64}})

    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE", "TEXT"]},
    }

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{config.GEMINI_IMAGE_MODEL}:generateContent"
    )

    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": config.GEMINI_API_KEY,
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            result = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:300]
        raise TryOnError(f"Gemini API error {error.code}: {detail}")
    except urllib.error.URLError as error:
        raise TryOnError(f"Could not reach Gemini API: {error.reason}")

    for candidate in result.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")

            if inline and inline.get("data"):
                mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                return f"data:{mime};base64,{inline['data']}"

    reason = result.get("promptFeedback", {}).get("blockReason")
    raise TryOnError(
        "Gemini returned no image"
        + (f" (blocked: {reason})." if reason else ".")
    )
