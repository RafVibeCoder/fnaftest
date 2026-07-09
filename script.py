# FNAF: House of Predators — script.py
# Advanced config generator for Unreal-style horror

import json
from dataclasses import dataclass, asdict
from typing import List


@dataclass
class Vec3:
    x: float
    y: float
    z: float


@dataclass
class VoiceLines:
    searching: List[str]
    spotted: List[str]


@dataclass
class Animatronic:
    name: str
    speed: float
    detection_range: float
    chase_range: float
    aggression: float
    patrol_points: List[Vec3]
    voice_lines: VoiceLines


@dataclass
class Room:
    name: str
    center: Vec3
    radius: float


@dataclass
class HidingSpot:
    room: str
    x: float
    y: float
    z: float
    type: str


@dataclass
class Scrap:
    x: float
    y: float
    z: float
    value: int


@dataclass
class Quest:
    id: str
    title: str
    description: str
    reward: int


def make_animatronics() -> List[Animatronic]:
    return [
        Animatronic(
            name="Scraptrap",
            speed=0.028,
            detection_range=8.0,
            chase_range=3.0,
            aggression=0.8,
            patrol_points=[
                Vec3(-2.0, 1.0, -5.0),
                Vec3(2.5, 1.0, -3.0),
                Vec3(4.0, 1.0, 2.0),
                Vec3(-3.5, 1.0, 3.5),
            ],
            voice_lines=VoiceLines(
                searching=[
                    "I can hear you breathing...",
                    "You can't hide forever.",
                    "Every step you take echoes.",
                ],
                spotted=[
                    "Found you.",
                    "Run. It won't matter.",
                    "You were never safe.",
                ],
            ),
        ),
        Animatronic(
            name="Rotten Bonnie",
            speed=0.024,
            detection_range=7.0,
            chase_range=2.5,
            aggression=0.7,
            patrol_points=[
                Vec3(-4.5, 1.0, 1.5),
                Vec3(-1.5, 1.0, -2.0),
                Vec3(1.0, 1.0, 4.0),
            ],
            voice_lines=VoiceLines(
                searching=[
                    "Where did you go?",
                    "I remember this house...",
                    "Your fear smells familiar.",
                ],
                spotted=[
                    "There you are.",
                    "Don't blink.",
                    "Stay still. I want to see you.",
                ],
            ),
        ),
    ]


def make_rooms() -> List[Room]:
    return [
        Room("Living Room", Vec3(0.0, 1.0, -4.0), 3.0),
        Room("Kitchen", Vec3(-4.0, 1.0, 0.0), 2.5),
        Room("Hallway", Vec3(0.0, 1.0, 0.0), 2.0),
        Room("Bedroom", Vec3(3.5, 1.0, 3.5), 2.5),
        Room("Basement Entrance", Vec3(-2.5, 1.0, 4.0), 2.0),
    ]


def make_hiding_spots() -> List[HidingSpot]:
    return [
        HidingSpot("Living Room", -1.5, 1.0, -5.5, "behind_sofa"),
        HidingSpot("Kitchen", -4.5, 1.0, 1.0, "under_table"),
        HidingSpot("Bedroom", 3.0, 1.0, 4.5, "inside_closet"),
        HidingSpot("Hallway", 1.0, 1.0, -0.5, "behind_cabinet"),
        HidingSpot("Basement Entrance", -2.0, 1.0, 5.0, "under_stairs"),
    ]


def make_scraps() -> List[Scrap]:
    return [
        Scrap(-1.0, 0.1, -3.5, 5),
        Scrap(2.5, 0.1, -2.0, 10),
        Scrap(-3.5, 0.1, 1.5, 8),
        Scrap(3.5, 0.1, 3.0, 12),
        Scrap(-2.0, 0.1, 4.5, 15),
    ]


def make_quests() -> List[Quest]:
    return [
        Quest(
            id="night1_scrap_intro",
            title="Collect the First Scraps",
            description="Gather at least 3 scraps to keep the flashlight alive.",
            reward=20,
        ),
        Quest(
            id="night1_survive",
            title="Survive Scraptrap",
            description="Avoid Scraptrap until the clock hits 6 AM.",
            reward=50,
        ),
    ]


def main():
    config = {
        "rooms": [asdict(r) for r in make_rooms()],
        "hiding_spots": [asdict(h) for h in make_hiding_spots()],
        "scraps": [asdict(s) for s in make_scraps()],
        "quests": [asdict(q) for q in make_quests()],
        "animatronics": [
            {
                "name": a.name,
                "speed": a.speed,
                "detection_range": a.detection_range,
                "chase_range": a.chase_range,
                "aggression": a.aggression,
                "patrol_points": [asdict(p) for p in a.patrol_points],
                "voice_lines": {
                    "searching": a.voice_lines.searching,
                    "spotted": a.voice_lines.spotted,
                },
            }
            for a in make_animatronics()
        ],
    }

    with open("game_config.json", "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

    print("game_config.json generated.")


if __name__ == "__main__":
    main()

