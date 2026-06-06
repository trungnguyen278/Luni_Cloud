"""
Luni AI — emotion vocabulary + validation + offline fallback.

The robot's S3 display (VariantRegistry) defines 47 emotion categories; Luni uses
all of them as selectable EXCEPT `listening` and `thinking` -> 45 usable keys.
The intended design: the LLM chooses one of these 45 keys for each reply, and the
robot plays that category (S3 picks a random variant within it).

The actual LLM-based selection lives in emotion_select.py. This module only holds
the authoritative key set, a clamp, and a lightweight Vietnamese keyword heuristic
used as an OFFLINE fallback when no picker LLM is available.

Key source: Luni_Robot/esp32-s3/src/ui/emotions/render_*.cpp (CategoryDef `.key`).
Default / resting face: "normal".
"""

DEFAULT_EMOTION = "normal"

# The 45 usable emotion category keys (47 categories minus listening + thinking).
VALID_EMOTIONS = frozenset(
    {
        "normal", "greet", "happy", "wink", "sad", "crying", "angry", "annoyed",
        "disgusted", "surprised", "scared", "nervous", "love", "shy", "embarrassed",
        "smug", "proud", "cool", "mischievous", "suspicious", "sleepy", "sleeping",
        "excited", "confused", "curious", "bored", "hungry", "focused", "determined",
        "loading", "charging", "dizzy", "dead", "error", "mute", "sick", "cold",
        "calm", "playful", "hot", "lonely", "grateful", "brave", "dreamy", "awe",
    }
)

# Sorted list (stable order) — handy for prompts / logging.
EMOTION_LIST = sorted(VALID_EMOTIONS)


# Checked before _RULES — phrases where a bare substring rule would misfire.
_OVERRIDES: list[tuple[str, tuple[str, ...]]] = [
    ("happy", ("buồn cười", "vui tính", "vui nhộn")),
    ("sad", ("muộn phiền", "buồn phiền", "ưu phiền")),
]

# Ordered most-specific / strongest cue first; first match wins. Every target
# here is one of the 45 valid keys.
_RULES: list[tuple[str, tuple[str, ...]]] = [
    ("angry", ("tức giận", "tức quá", "bực mình", "bực bội", "phẫn nộ", "giận")),
    ("annoyed", ("làm phiền", "phiền phức", "phiền quá", "chán thật", "lại nữa", "khó chịu")),
    ("disgusted", ("ghê quá", "kinh quá", "tởm", "ghê tởm")),
    ("scared", ("sợ hãi", "đáng sợ", "kinh hãi", "hoảng")),
    ("surprised", ("ngạc nhiên", "bất ngờ", "ồ ", "ôi trời", "trời ơi", "wow", "ồ!")),
    ("excited", ("tuyệt vời", "quá đã", "hào hứng", "không thể chờ", "tuyệt quá")),
    ("love", ("yêu bạn", "thương bạn", "mình yêu", "dễ thương quá", "đáng yêu")),
    ("grateful", ("biết ơn", "cảm kích", "cảm ơn bạn rất nhiều")),
    ("sad", ("buồn", "đáng tiếc", "tiếc quá", "thất vọng", "xin lỗi", "huhu")),
    ("lonely", ("cô đơn", "một mình", "trống vắng")),
    ("nervous", ("lo lắng", "hồi hộp", "căng thẳng", "lo quá")),
    ("confused", ("không hiểu", "khó hiểu", "là sao", "chưa rõ", "hơi rối")),
    ("curious", ("thú vị", "tò mò", "tại sao", "vì sao")),
    ("sleepy", ("buồn ngủ", "mệt quá", "díu mắt")),
    ("hungry", ("đói bụng", "đói quá")),
    ("bored", ("chán quá", "buồn chán", "nhạt nhẽo")),
    ("focused", ("tập trung", "để mình xem", "phân tích", "theo mình thì")),
    ("calm", ("thư giãn", "bình tĩnh", "yên tâm", "nhẹ nhàng", "đừng lo")),
    ("cool", ("ngầu", "chất", "đỉnh", "cực chất")),
    ("playful", ("nghịch", "đùa chút", "hihi", "trêu")),
    ("happy", ("vui", "tốt quá", "hay quá", "tuyệt", "cảm ơn", "thích", "haha", "😊", "😄")),
]


def infer_emotion(text: str) -> str:
    """Offline fallback: map reply text -> one of VALID_EMOTIONS via VN keywords."""
    t = (text or "").lower()
    for emotion, keywords in _OVERRIDES:
        if any(k in t for k in keywords):
            return emotion
    for emotion, keywords in _RULES:
        if any(k in t for k in keywords):
            return emotion
    return DEFAULT_EMOTION


def clamp_emotion(emotion: str) -> str:
    """Anything outside the 45-key set becomes the default 'normal'."""
    e = (emotion or "").strip().lower()
    return e if e in VALID_EMOTIONS else DEFAULT_EMOTION
