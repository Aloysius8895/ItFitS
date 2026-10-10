import re


def parse_height(height):
    """
    Convert common height formats into centimeters.
    Examples:
    165
    165 cm
    5'5"
    5'5
    """

    if height is None:
        return None

    if isinstance(height, (int, float)):
        return float(height)

    value = str(height).strip().lower()

    # Already centimeters
    match = re.search(r"(\d+(?:\.\d+)?)\s*cm", value)

    if match:
        return float(match.group(1))

    # Feet + inches
    match = re.match(
        r"^\s*(\d+)\s*(?:'|ft)\s*(\d+(?:\.\d+)?)?\s*(?:\"|in)?\s*$",
        value
    )

    if match:
        feet = float(match.group(1))
        inches = float(match.group(2) or 0)

        return round((feet * 30.48) + (inches * 2.54), 2)

    # Plain number
    try:
        return float(value)
    except ValueError:
        return None


def parse_weight(weight):
    """
    Convert common weight formats into kilograms.
    """

    if weight is None:
        return None

    if isinstance(weight, (int, float)):
        return float(weight)

    value = str(weight).strip().lower()

    # Pounds
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)", value)

    if match:
        pounds = float(match.group(1))
        return round(pounds * 0.45359237, 2)

    # Kilograms
    match = re.search(r"(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)", value)

    if match:
        return float(match.group(1))

    try:
        return float(value)
    except ValueError:
        return None


def normalize_input(data):
    """
    Convert frontend input into the exact feature names
    expected by the trained FLOWFIT model.
    """

    return {
        "age": float(data["age"]),
        "height_cm": parse_height(data["height"]),
        "weight_kg": parse_weight(data["weight"]),
        "body_type": str(data["body_type"]).strip().lower(),
        "bust_size": str(data["bust_size"]).strip().lower(),
        "category": str(data["category"]).strip().lower(),
        "size": float(data["size"]),
        "rating": float(data["rating"]),
        "rented_for": str(data["rented_for"]).strip().lower(),
    }