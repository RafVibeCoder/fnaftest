import json
from dataclasses import dataclass, asdict
from typing import List, Dict


# ===== CORE DATA CLASSES =====

@dataclass
class VoiceLines:
    searching: List[str]
    spotted: List[str]
    kill: List[str]


@dataclass
class Animatronic:
    name: str
    speed: float
    detection_range: float
    chase_range: float
    aggression: float
    patrol_points: List[Dict[str, float]]
    voice_lines: VoiceLines


@dataclass
class HidingSpot:
    id: str
    type: str  # "closet", "bed", "locker", "cabinet"
    x: float
    y: float
    z: float
    effectiveness: float  # how good it is vs detection


@dataclass
class Room:
    id: str
    name: str
    x1: float
    z1: float
    x2: float
    z2: float
    darkness: float  # 0–1
    tension: float   # 0–1


@dataclass
class Scrap:
    id: str
    x: float
    y: float
    z: float
    value: int


@dataclass
class Quest:
    id: str
    title: str
    description: str
    required_scraps: int
    reward_currency: int
    reward_title: str


@dataclass
class GameConfig:
    rooms: List[Room]
    hiding_spots: List[HidingSpot]
    scraps: List[Scrap]
    animatronics: List[Animatronic]
    quests: List[Quest]


# ===== PRESET VOICE LINES =====

def molten_freddy_lines() -> VoiceLines:
    return VoiceLines(
        searching=[
            "I hear you breathing...",
            "You’re close. I can feel it.",
            "Come out… it’s more fun when you scream."
        ],
        spotted=[
            "THERE YOU ARE.",
            "Run. I love when they run.",
            "Found you."
        ],
        kill=[
            "You should’ve stayed hidden.",
            "Game over.",
            "You were never leaving this house."
        ]
    )


def scraptrap_lines() -> VoiceLines:
    return VoiceLines(
        searching=[
            "You can’t hide forever.",
            "I know this house better than you.",
            "Every step you take… I hear it."
        ],
        spotted=[
            "Gotcha.",
            "Found you.",
            "You really thought you were safe?"
        ],
        kill=[
            "You were always meant to be caught.",
            "That’s the end of your little escape.",
            "You’re mine now."
        ]
    )


# ===== PRESET HOUSE / HIDING / SCRAPS / QUESTS =====

def default_rooms() -> List[Room]:
    return [
        Room("living_room", "Living Room", -6, -8, 2, -2, darkness=0.4, tension=0.7),
        Room("hallway", "Hallway", -2, -2, 2, 2, darkness=0.6, tension=0.9),
        Room("bedroom", "Bedroom", 2, 2, 6, 8, darkness=0.7, tension=0.8),
        Room("basement", "Basement", -6, 2, -2, 8, darkness=0.9, tension=1.0),
    ]


def default_hiding_spots() -> List[HidingSpot]:
    return [
        HidingSpot("closet_living", "closet", -4.5, 1.2, -6, effectiveness=0.9),
        HidingSpot("bed_bedroom", "bed", 4.0, 0.4, 6, effectiveness=0.8),
        HidingSpot("locker_basement", "locker", -4.5, 1.0, 6, effectiveness=0.85),
        HidingSpot("cabinet_kitchen", "cabinet", 4.5, 0.8, -6, effectiveness=0.7),
    ]


def default_scraps() -> List[Scrap]:
    return [
        Scrap("scrap_1", -3, 0.2, -3, value=5),
        Scrap("scrap_2", 3, 0.2, -5, value=5),
        Scrap("scrap_3", -1, 0.2, 5, value=5),
        Scrap("scrap_4", 4, 0.2, 2, value=5),
    ]


def default_animatronics() -> List[Animatronic]:
    return [
        Animatronic(
            name="Molten Freddy",
            speed=0.03,
            detection_range=9.0,
            chase_range=3.0,
            aggression=0.8,
            patrol_points=[
                {"x": -3, "y": 0, "z": -5},
                {"x": -1, "y": 0, "z": -1},
                {"x": -4, "y": 0, "z": 3},
            ],
            voice_lines=molten_freddy_lines()
        ),
        Animatronic(
            name="Scraptrap",
            speed=0.035,
            detection_range=10.0,
            chase_range=3.5,
            aggression=0.9,
            patrol_points=[
                {"x": 4, "y": 0, "z": -3},
                {"x": 2, "y": 0, "z": 1},
                {"x": 5, "y": 0, "z": 5},
            ],
            voice_lines=scraptrap_lines()
        )
    ]


def default_quests() -> List[Quest]:
    return [
        Quest(
            id="quest_1",
            title="First Night Scavenger",
            description="Collect 10 scrap pieces without being caught.",
            required_scraps=10,
            reward_currency=25,
            reward_title="Scavenger"
        ),
        Quest(
            id="quest_2",
            title="Basement Run",
            description="Reach the basement and return to the living room alive.",
            required_scraps=0,
            reward_currency=40,
            reward_title="Basement Survivor"
        ),
    ]


# ===== BUILD FULL CONFIG =====

def build_config() -> GameConfig:
    return GameConfig(
        rooms=default_rooms(),
        hiding_spots=default_hiding_spots(),
        scraps=default_scraps(),
        animatronics=default_animatronics(),
        quests=default_quests()
    )


# ===== EXPORT TO JSON =====

def config_to_json(config: GameConfig) -> str:
    def encode(obj):
        if isinstance(obj, VoiceLines):
            return asdict(obj)
        if isinstance(obj, (Animatronic, HidingSpot, Room, Scrap, Quest)):
            d = asdict(obj)
            # VoiceLines inside Animatronic needs manual conversion
            if isinstance(obj, Animatronic):
                d["voice_lines"] = asdict(obj.voice_lines)
            return d
        if isinstance(obj, GameConfig):
            return {
                "rooms": [encode(r) for r in obj.rooms],
                "hiding_spots": [encode(h) for h in obj.hiding_spots],
                "scraps": [encode(s) for s in obj.scraps],
                "animatronics": [encode(a) for a in obj.animatronics],
                "quests": [encode(q) for q in obj.quests],
            }
        raise TypeError(f"Cannot encode type: {type(obj)}")

    return json.dumps(encode(config), indent=2)


if __name__ == "__main__":
    cfg = build_config()
    json_data = config_to_json(cfg)
    # Write to file or print; JS can load this later.
    with open("game_config.json", "w", encoding="utf-8") as f:
        f.write(json_data)
    print("Generated game_config.json")
