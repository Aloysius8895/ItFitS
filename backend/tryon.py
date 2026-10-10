"""Gemini image-model virtual try-on (REST, no extra dependency)."""

import base64
import json
import re
import uuid
import urllib.error
import urllib.request

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
    return f"Set {name} in .env to render the try-on image."


def generate_tryon(person_image: str, garment_image: str, prompt: str) -> str:
    """Return the generated image as a data URL."""
    if config.TRYON_PROVIDER == "grafilab":
        return _generate_grafilab(person_image, garment_image, prompt)

    return _generate_gemini(person_image, garment_image, prompt)


def _generate_grafilab(person_image: str, garment_image: str, prompt: str) -> str:
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
    for filename, data_url in (("person", person_image), ("garment", garment_image)):
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


def _generate_gemini(person_image: str, garment_image: str, prompt: str) -> str:
    if not config.GEMINI_API_KEY:
        raise TryOnError("GEMINI_API_KEY is not set.")

    person_mime, person_b64 = _split_data_url(person_image)
    garment_mime, garment_b64 = _split_data_url(garment_image)

    payload = {
        "contents": [{
            "parts": [
                {"text": prompt},
                {"inline_data": {"mime_type": person_mime, "data": person_b64}},
                {"inline_data": {"mime_type": garment_mime, "data": garment_b64}},
            ]
        }],
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
