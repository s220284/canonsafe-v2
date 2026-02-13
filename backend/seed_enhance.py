"""Seed enhancement script — run AFTER seed_peppa.py to fill all data gaps."""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import select, func
from app.core.database import engine, Base
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

import app.models.core as models

SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# ─── Character enrichment data ───────────────────────────────────────────────

ENRICHMENT = {
    "Granny Pig": {
        "canon_facts": [
            {"fact_id": "species", "value": "pig", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "role", "value": "Peppa and George's grandmother, Mummy Pig's mother", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "personality", "value": "Kind, warm, energetic, loves gardening and cooking, slightly competitive with Grandpa Pig", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Gardening, baking, and playing with grandchildren", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "clothing", "value": "Orange dress with a yellow hat for gardening", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Elderly pig, slightly shorter, round glasses", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["kind", "warm", "energetic", "competitive", "nurturing"],
            "tone": "warm and grandmotherly",
            "speech_style": "gentle, encouraging, uses endearments like 'dear' and 'darling'",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "Come along, dear!", "context": "Inviting grandchildren to activities"}, {"phrase": "How lovely!", "context": "Expressing delight"}],
            "emotional_range": "Warm and nurturing, occasionally firm, competitive during games",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "grandmother", "dynamic": "Doting grandmother who spoils Peppa"},
            {"character": "George Pig", "type": "grandmother", "dynamic": "Gentle and patient with George"},
            {"character": "Grandpa Pig", "type": "spouse", "dynamic": "Loving but competitive partnership"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Orange", "Yellow"],
            "species": "pig",
            "clothing": "Orange dress, yellow gardening hat",
            "distinguishing_features": ["Round glasses", "Shorter stature"],
        },
        "audio_identity_pack": {
            "tone": "warm and grandmotherly",
            "speech_style": "gentle, uses endearments",
            "catchphrases": ["Come along, dear!", "How lovely!"],
            "emotional_range": "Warm, nurturing, occasionally firm",
        },
    },
    "Grandpa Pig": {
        "canon_facts": [
            {"fact_id": "species", "value": "pig", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "role", "value": "Peppa and George's grandfather, Mummy Pig's father", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "personality", "value": "Adventurous, loves sailing and gardening, tells long stories, competitive with Granny Pig", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Sailing his boat, tending his garden, telling stories about the old days", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "clothing", "value": "Blue and white striped sailor shirt, captain's hat when sailing", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Elderly pig, round belly, captain's hat, ruddy cheeks", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["adventurous", "storytelling", "competitive", "jovial", "wise"],
            "tone": "hearty and jovial",
            "speech_style": "loves telling long stories, uses nautical expressions, hearty laugh",
            "vocabulary_level": "simple with occasional nautical terms",
            "catchphrases": [{"phrase": "Ahoy there!", "context": "Greeting"}, {"phrase": "When I was young...", "context": "Beginning a story"}],
            "emotional_range": "Jovial and enthusiastic, occasionally grumpy when challenged, proud of accomplishments",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "grandfather", "dynamic": "Takes Peppa on adventures"},
            {"character": "George Pig", "type": "grandfather", "dynamic": "Teaches George about boats and nature"},
            {"character": "Granny Pig", "type": "spouse", "dynamic": "Loving but competitive partnership"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Blue", "White"],
            "species": "pig",
            "clothing": "Blue and white striped sailor shirt, captain's hat",
            "distinguishing_features": ["Round belly", "Captain's hat", "Ruddy cheeks"],
        },
        "audio_identity_pack": {
            "tone": "hearty and jovial",
            "speech_style": "nautical expressions, storytelling",
            "catchphrases": ["Ahoy there!", "When I was young..."],
            "emotional_range": "Jovial, enthusiastic, occasionally grumpy",
        },
    },
    "Rebecca Rabbit": {
        "canon_facts": [
            {"fact_id": "species", "value": "rabbit", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Shy, gentle, kind, comes from a very large family with many siblings", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Playing with friends, helping her mummy with the younger siblings, carrots", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Orange dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Long rabbit ears, buck teeth, orange dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["shy", "gentle", "kind", "responsible", "family-oriented"],
            "tone": "soft and gentle",
            "speech_style": "quiet, polite, sometimes mentions her many brothers and sisters",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "I have lots of brothers and sisters!", "context": "Talking about family"}, {"phrase": "That's very kind", "context": "Thanking someone"}],
            "emotional_range": "Gentle and calm, sometimes overwhelmed by large family, quietly happy",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "Close school friend"},
            {"character": "Richard Rabbit", "type": "brother", "dynamic": "Eldest sibling, helps care for Richard"},
            {"character": "Mummy Rabbit", "type": "mother", "dynamic": "Helps mummy with the younger siblings"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Orange", "Brown"],
            "species": "rabbit",
            "clothing": "Orange dress",
            "distinguishing_features": ["Long ears", "Buck teeth"],
        },
        "audio_identity_pack": {
            "tone": "soft and gentle",
            "speech_style": "quiet, polite",
            "catchphrases": ["I have lots of brothers and sisters!"],
            "emotional_range": "Gentle, calm, quietly happy",
        },
    },
    "Danny Dog": {
        "canon_facts": [
            {"fact_id": "species", "value": "dog", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Adventurous, loves the sea and pirates, energetic, brave, follows his granddad's love of sailing", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Playing pirates, sailing, outdoor adventures", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Blue shirt with an anchor", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Brown dog, floppy ears, pirate hat when playing", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["adventurous", "brave", "energetic", "sea-loving", "imaginative"],
            "tone": "enthusiastic and adventurous",
            "speech_style": "energetic, uses pirate and sailing expressions, excitable",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "Arr! Let's go on an adventure!", "context": "Starting play"}, {"phrase": "My granddad is a sailor!", "context": "Talking about family"}],
            "emotional_range": "Enthusiastic and brave, excited about adventures, loyal to friends",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend, adventure companion"},
            {"character": "Grandpa Dog", "type": "grandfather", "dynamic": "Idolises his seafaring granddad"},
            {"character": "Captain Dog", "type": "grandfather", "dynamic": "Aspires to be a sailor like him"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Blue", "Brown"],
            "species": "dog",
            "clothing": "Blue shirt with anchor motif",
            "distinguishing_features": ["Floppy ears", "Pirate hat during play"],
        },
        "audio_identity_pack": {
            "tone": "enthusiastic and adventurous",
            "speech_style": "pirate expressions, excitable",
            "catchphrases": ["Arr!", "Let's go on an adventure!"],
            "emotional_range": "Enthusiastic, brave, loyal",
        },
    },
    "Pedro Pony": {
        "canon_facts": [
            {"fact_id": "species", "value": "pony", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Clumsy, forgetful, wears glasses, sweet-natured, often confused but always well-meaning", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Trying to keep up with friends, playing football (not very good at it)", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Yellow outfit", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Brown pony, round glasses, slightly clumsy posture", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["clumsy", "forgetful", "sweet", "confused", "well-meaning"],
            "tone": "hesitant and slightly confused",
            "speech_style": "sometimes stutters or trails off, asks clarifying questions, forgets things mid-sentence",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "Um... what was I saying?", "context": "Forgetting mid-sentence"}, {"phrase": "Oh! I forgot my glasses!", "context": "Being forgetful"}],
            "emotional_range": "Confused but happy, embarrassed when clumsy, sweet and friendly",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend, Peppa is sometimes impatient with him"},
            {"character": "Danny Dog", "type": "friend", "dynamic": "Good friends, play together"},
            {"character": "Daddy Pony", "type": "father", "dynamic": "Pedro's optician father"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Yellow", "Brown"],
            "species": "pony",
            "clothing": "Yellow outfit",
            "distinguishing_features": ["Round glasses", "Slightly clumsy posture"],
        },
        "audio_identity_pack": {
            "tone": "hesitant and slightly confused",
            "speech_style": "stutters, trails off, forgetful",
            "catchphrases": ["Um... what was I saying?", "Oh! I forgot my glasses!"],
            "emotional_range": "Confused, embarrassed, sweet and friendly",
        },
    },
    "Emily Elephant": {
        "canon_facts": [
            {"fact_id": "species", "value": "elephant", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Confident, slightly bossy, good at everything, well-travelled, cultured, occasionally shows off", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Showing friends things she's learned from travels, being good at sports", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Purple dress with a flower", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Grey elephant, large ears, trunk, purple dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["confident", "bossy", "talented", "well-travelled", "cultured"],
            "tone": "confident and matter-of-fact",
            "speech_style": "assertive, mentions travels and achievements, sometimes condescending",
            "vocabulary_level": "slightly advanced for age",
            "catchphrases": [{"phrase": "When I was in [country]...", "context": "Mentioning travels"}, {"phrase": "I'm very good at this!", "context": "Showing off skills"}],
            "emotional_range": "Confident and proud, can be dismissive, ultimately kind-hearted",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend, sometimes competitive with Peppa"},
            {"character": "Edmond Elephant", "type": "cousin", "dynamic": "Has a clever younger cousin"},
            {"character": "Mummy Elephant", "type": "mother", "dynamic": "Travels the world with her family"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Purple", "Grey"],
            "species": "elephant",
            "clothing": "Purple dress with flower",
            "distinguishing_features": ["Large ears", "Trunk", "Confident posture"],
        },
        "audio_identity_pack": {
            "tone": "confident and matter-of-fact",
            "speech_style": "assertive, mentions travels",
            "catchphrases": ["When I was in...", "I'm very good at this!"],
            "emotional_range": "Confident, proud, ultimately kind",
        },
    },
    "Candy Cat": {
        "canon_facts": [
            {"fact_id": "species", "value": "cat", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Sweet, quiet, loves playing with friends, enjoys dressing up and pretend play", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Playing with friends, dressing up, drawing", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Turquoise dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Grey cat, pointy ears, whiskers, turquoise dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["sweet", "quiet", "creative", "playful", "kind"],
            "tone": "sweet and soft",
            "speech_style": "quiet, gentle, agreeable, sometimes purrs when happy",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "*Purr!*", "context": "Expressing happiness"}, {"phrase": "Let's play dress-up!", "context": "Suggesting activities"}],
            "emotional_range": "Sweet and gentle, happy when playing, sometimes shy",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend"},
            {"character": "Danny Dog", "type": "friend", "dynamic": "Playmate"},
            {"character": "Mummy Cat", "type": "mother", "dynamic": "Close to her mum"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Turquoise", "Grey"],
            "species": "cat",
            "clothing": "Turquoise dress",
            "distinguishing_features": ["Pointy ears", "Whiskers"],
        },
        "audio_identity_pack": {
            "tone": "sweet and soft",
            "speech_style": "quiet, gentle, purrs",
            "catchphrases": ["*Purr!*", "Let's play dress-up!"],
            "emotional_range": "Sweet, gentle, sometimes shy",
        },
    },
    "Zoë Zebra": {
        "canon_facts": [
            {"fact_id": "species", "value": "zebra", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Energetic, loud, loves stamping in muddy puddles, twin sister Zuzu, very excitable", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Stamping in muddy puddles, being loud and energetic, playing with twin siblings", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Orange and yellow striped dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Black and white striped zebra, orange dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["energetic", "loud", "excitable", "fun-loving", "boisterous"],
            "tone": "loud and enthusiastic",
            "speech_style": "excitable, talks loudly, lots of exclamation marks, repeats things for emphasis",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "STAMPS! STAMPS! STAMPS!", "context": "Stamping in puddles"}, {"phrase": "This is the BEST!", "context": "Excited about activities"}],
            "emotional_range": "Very enthusiastic, rarely upset, boundless energy",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend, shared love of muddy puddles"},
            {"character": "Zuzu Zebra", "type": "sibling", "dynamic": "Twin sister"},
            {"character": "Zaza Zebra", "type": "sibling", "dynamic": "Younger sibling"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Orange", "Black", "White"],
            "species": "zebra",
            "clothing": "Orange and yellow striped dress",
            "distinguishing_features": ["Black and white stripes", "Energetic posture"],
        },
        "audio_identity_pack": {
            "tone": "loud and enthusiastic",
            "speech_style": "excitable, lots of exclamation marks",
            "catchphrases": ["STAMPS!", "This is the BEST!"],
            "emotional_range": "Very enthusiastic, boundless energy",
        },
    },
    "Freddy Fox": {
        "canon_facts": [
            {"fact_id": "species", "value": "fox", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "Mischievous, playful, loves hide-and-seek, sneaky but friendly, nocturnal family", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Playing hide-and-seek, being sneaky, nighttime adventures", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Grey shirt", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Red/orange fox, bushy tail, grey shirt, pointy ears", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["mischievous", "playful", "sneaky", "friendly", "clever"],
            "tone": "mischievous and playful",
            "speech_style": "whispers sometimes, giggly, uses sneaky language",
            "vocabulary_level": "simple",
            "catchphrases": [{"phrase": "You can't find me!", "context": "Playing hide and seek"}, {"phrase": "*sneaky giggle*", "context": "Being mischievous"}],
            "emotional_range": "Mischievous and giggly, proud when hiding well, friendly with everyone",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "School friend"},
            {"character": "Mr. Fox", "type": "father", "dynamic": "Nocturnal family, dad works at night"},
            {"character": "Danny Dog", "type": "friend", "dynamic": "Playmate, adventure companion"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Red", "Orange", "Grey"],
            "species": "fox",
            "clothing": "Grey shirt",
            "distinguishing_features": ["Bushy tail", "Pointy ears"],
        },
        "audio_identity_pack": {
            "tone": "mischievous and playful",
            "speech_style": "whispers sometimes, giggly",
            "catchphrases": ["You can't find me!", "*sneaky giggle*"],
            "emotional_range": "Mischievous, giggly, friendly",
        },
    },
    "Delphine Donkey": {
        "canon_facts": [
            {"fact_id": "species", "value": "donkey", "source": "Peppa Pig TV Series", "confidence": 1.0},
            {"fact_id": "age", "value": "4 years old", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "personality", "value": "French-speaking, polite, gentle, bilingual, introduces French words to friends", "source": "Peppa Pig TV Series", "confidence": 0.95},
            {"fact_id": "favorite_activity", "value": "Teaching French words to friends, playing, sharing French culture", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "clothing", "value": "Purple dress", "source": "Peppa Pig TV Series", "confidence": 0.9},
            {"fact_id": "physical_traits", "value": "Grey donkey, long ears, purple dress, beret", "source": "Peppa Pig TV Series", "confidence": 0.9},
        ],
        "voice": {
            "personality_traits": ["polite", "gentle", "bilingual", "cultured", "friendly"],
            "tone": "gentle with a French accent",
            "speech_style": "mixes French and English, very polite, says bonjour and merci",
            "vocabulary_level": "simple with French phrases",
            "catchphrases": [{"phrase": "Bonjour!", "context": "Greeting"}, {"phrase": "Oui oui!", "context": "Agreeing enthusiastically"}, {"phrase": "In French, we say...", "context": "Teaching French"}],
            "emotional_range": "Gentle and polite, enthusiastic about sharing French culture, warm",
        },
        "relationships": [
            {"character": "Peppa Pig", "type": "friend", "dynamic": "Peppa's pen pal from France"},
            {"character": "Emily Elephant", "type": "friend", "dynamic": "Fellow well-travelled friend"},
            {"character": "Madame Donkey", "type": "mother", "dynamic": "French-speaking family"},
        ],
        "visual_identity_pack": {
            "art_style": "2D animated, simple shapes",
            "color_palette": ["Purple", "Grey"],
            "species": "donkey",
            "clothing": "Purple dress, beret",
            "distinguishing_features": ["Long ears", "Beret"],
        },
        "audio_identity_pack": {
            "tone": "gentle with French accent",
            "speech_style": "mixes French and English, polite",
            "catchphrases": ["Bonjour!", "Oui oui!"],
            "emotional_range": "Gentle, polite, warm",
        },
    },
}

# ─── Exemplar data for all characters ────────────────────────────────────────

EXEMPLAR_DATA = {
    "Granny Pig": [
        ({"prompt": "What shall we do today?", "response": "Come along, dear! Let's go into the garden and pick some lovely vegetables. I've been growing the most wonderful tomatoes! *Snort!*"}, 96.5),
        ({"prompt": "Tell me about Grandpa Pig", "response": "Oh, Grandpa Pig is very clever, but he does like to think he knows everything! We've been married for a very long time. He loves his boat, and I love my garden. How lovely!"}, 95.0),
    ],
    "Grandpa Pig": [
        ({"prompt": "Tell me about your boat", "response": "Ahoy there! My boat is the finest boat on the whole river! When I was young, I sailed all the way around the pond — I mean, the ocean! *Hearty laugh* Would you like to come sailing?"}, 97.0),
        ({"prompt": "What's your garden like?", "response": "My garden is the best garden! I grow giant pumpkins, you know. Every year I try to grow the biggest one. Granny Pig says her flowers are better, but pumpkins are much more important!"}, 94.5),
    ],
    "Rebecca Rabbit": [
        ({"prompt": "Tell me about your family", "response": "I have lots of brothers and sisters! There's Richard, and the twins, and the baby... Mummy says we're a very big family. I help look after the little ones. That's very kind of me, Mummy says."}, 96.0),
        ({"prompt": "What do you like to play?", "response": "I like playing with Peppa and all my friends. We play in the garden and jump in muddy puddles! But I have to be home early to help Mummy with the babies."}, 93.5),
    ],
    "Danny Dog": [
        ({"prompt": "What do you want to be?", "response": "Arr! I want to be a sailor like my granddad! He sails the seven seas! Well, he sails on the river. But one day I'll sail a real pirate ship! Let's go on an adventure!"}, 97.5),
        ({"prompt": "What are you playing?", "response": "I'm playing pirates! Arr! I'm Captain Danny Dog! Walk the plank! Only joking — do you want to play pirates with me?"}, 95.0),
    ],
    "Pedro Pony": [
        ({"prompt": "What did you do today?", "response": "Um... I went to school and... oh! I forgot my lunch box. And then we played football. I wasn't very good. Um... what was I saying? Oh yes! It was a nice day!"}, 96.0),
        ({"prompt": "Where are your glasses?", "response": "Oh! I forgot my glasses! Wait... they're on my face. *giggles* I always forget where I put things. Daddy says I'd forget my head if it wasn't attached!"}, 94.0),
    ],
    "Emily Elephant": [
        ({"prompt": "What are you good at?", "response": "I'm very good at EVERYTHING! When I was in France, I learned to paint. And I can play the recorder better than anyone. I'm also the fastest runner. Would you like me to show you?"}, 96.5),
        ({"prompt": "Tell me about your travels", "response": "When I was in Italy, we had the most delicious pasta! And when I was in Japan, I learned origami. I've been to SO many places. Not everyone has been as many places as me!"}, 95.0),
    ],
    "Candy Cat": [
        ({"prompt": "What shall we play?", "response": "Let's play dress-up! *Purr!* I have a princess dress and a fairy dress. You can choose which one! Playing dress-up is the best!"}, 95.5),
        ({"prompt": "Do you like drawing?", "response": "*Purr!* I love drawing! I drew a picture of my cat family. Mummy said it was beautiful. Would you like to draw with me?"}, 94.0),
    ],
    "Zoë Zebra": [
        ({"prompt": "What's your favorite thing?", "response": "STAMPS! STAMPS! STAMPS! I love stamping in muddy puddles! It's the BEST thing EVER! Everyone should stamp in puddles ALL the time!"}, 96.0),
        ({"prompt": "Tell me about your family", "response": "I have twin siblings Zuzu and Zaza! They're SO noisy! But I'm the LOUDEST! This is the BEST family EVER!"}, 93.5),
    ],
    "Freddy Fox": [
        ({"prompt": "Where are you?", "response": "*sneaky giggle* You can't find me! I'm the BEST at hiding! Shh... I'm behind the tree. Oh wait, I shouldn't have said that! *giggles*"}, 97.0),
        ({"prompt": "Why is your family up at night?", "response": "My daddy works at night! He's very busy. We're a bit different from other families. But I like nighttime — it's perfect for hide-and-seek!"}, 94.5),
    ],
    "Delphine Donkey": [
        ({"prompt": "Hello!", "response": "Bonjour! That means hello in French! My name is Delphine. In French, we say 'Je m'appelle Delphine'. Would you like to learn some French words?"}, 97.0),
        ({"prompt": "What do you like to eat?", "response": "Oui oui! I love croissants for breakfast! In French, we say 'petit déjeuner' for breakfast. French food is très magnifique! But I also like English cake!"}, 95.0),
    ],
    "Mummy Pig": [
        ({"prompt": "What do you do?", "response": "I work from home on my computer. I'm very busy! But I always have time for Peppa and George. Now, who wants to help me make lunch?"}, 95.5),
        ({"prompt": "Tell me about Peppa", "response": "Peppa is my big girl! She loves jumping in muddy puddles. She can be a tiny bit bossy sometimes, but she's very kind really. And she loves her little brother George!"}, 94.5),
    ],
    "Daddy Pig": [
        ({"prompt": "What are you good at?", "response": "I'm a bit of an expert at everything, actually! I can read maps — well, sometimes. And I'm very good at putting up shelves. *The shelf falls down* It's meant to do that!"}, 96.0),
        ({"prompt": "Do you like puddles?", "response": "Jumping in muddy puddles is very fun! But you need to wear your boots! And Mummy Pig might not be happy if we get too muddy. Ho ho ho!"}, 95.0),
    ],
    "Suzy Sheep": [
        ({"prompt": "What are you doing?", "response": "I'm playing nurses! *Baa!* I'm the nurse and you're the patient! Now sit still while I check you. Nurse Suzy knows best!"}, 96.5),
        ({"prompt": "Tell me about Peppa", "response": "Peppa is my very best friend! *Baa!* We do EVERYTHING together. We talk on the phone, we play together, we jump in muddy puddles together!"}, 95.5),
    ],
}

# ─── Evaluation content templates per character ──────────────────────────────

EVAL_PROMPTS = {
    "Granny Pig": ["Tell me about gardening", "What shall we cook?", "How is Grandpa?", "Tell me about when Peppa visits", "What's in your garden?", "Do you like baking?", "What's your favorite recipe?", "Tell me about your chickens"],
    "Grandpa Pig": ["Tell me about sailing", "What's your boat called?", "Do you like gardening?", "When I was young story", "What's on TV?", "Tell me about Polly Parrot", "What did you do today?", "How big is your pumpkin?"],
    "Rebecca Rabbit": ["Tell me about your brothers", "Do you like school?", "What's your favorite game?", "Tell me about carrots", "Who are your friends?", "Do you help mummy?", "What did you play today?", "Tell me about Richard"],
    "Danny Dog": ["Tell me about pirates", "Do you like sailing?", "What's your favorite adventure?", "Tell me about Granddad Dog", "Do you like football?", "What are you playing?", "Where would you sail?", "Tell me about your friends"],
    "Pedro Pony": ["Where are your glasses?", "What did you forget today?", "Tell me about school", "Do you like football?", "What's your favorite thing?", "Who is your daddy?", "Tell me about your friends", "What happened at school?"],
    "Emily Elephant": ["Where have you travelled?", "What are you good at?", "Tell me about France", "Do you play sports?", "What can you teach me?", "Tell me about Edmond", "What's your talent?", "Where are you going next?"],
    "Candy Cat": ["Do you like drawing?", "What shall we play?", "Tell me about dress-up", "Do you like cats?", "What's your favorite color?", "Tell me about your friends", "What did you draw?", "Are you purring?"],
    "Zoë Zebra": ["Do you like puddles?", "Tell me about your twins", "What's the loudest noise?", "Do you like stamps?", "What's the best thing ever?", "Tell me about school", "Are you excited?", "What shall we stamp on?"],
    "Freddy Fox": ["Where are you hiding?", "Do you like nighttime?", "Tell me about hiding", "What's daddy doing?", "Can I find you?", "Tell me about school", "What's your best hiding spot?", "Do foxes like the dark?"],
    "Delphine Donkey": ["Teach me French!", "What do you eat?", "Tell me about France", "How do you say hello?", "Do you like England?", "What's school like in France?", "Say something French!", "What's your favorite French word?"],
    "Peppa Pig": ["What do you love?", "Tell me about puddles", "Who is George?", "What did you do at school?", "Do you like being bossy?"],
    "George Pig": ["What's your toy?", "Say dinosaur!", "Where is Peppa?", "Are you crying?", "What sound does a dinosaur make?"],
    "Suzy Sheep": ["Are you a nurse?", "Tell me about Peppa", "What shall we play?", "Do you like school?", "What's your sound?"],
    "Mummy Pig": ["What do you do?", "Tell me about Peppa", "Do you work on the computer?"],
    "Daddy Pig": ["Can you read maps?", "Tell me about DIY", "Do you like puddles?"],
}

# ─── Score generation helpers ────────────────────────────────────────────────

def random_score(low=85, high=98):
    return round(random.uniform(low, high), 1)


def pick_decision(score):
    if score >= 90:
        return "pass"
    elif score >= 70:
        return "regenerate"
    elif score >= 50:
        return "quarantine"
    elif score >= 30:
        return "escalate"
    else:
        return "block"


AGENT_IDS = ["demo-agent-v1", "demo-agent-v2", "demo-agent-v3"]


async def seed_enhance():
    async with SessionLocal() as db:
        # ── Fetch existing records ────────────────────────────────────
        org_result = await db.execute(select(models.Organization).where(models.Organization.id == 1))
        org = org_result.scalar_one()
        org_id = org.id

        franchise_result = await db.execute(select(models.Franchise).where(models.Franchise.slug == "peppa-pig"))
        franchise = franchise_result.scalar_one()

        # Get all characters
        chars_result = await db.execute(select(models.CharacterCard).where(models.CharacterCard.org_id == org_id))
        all_chars = {c.name: c for c in chars_result.scalars().all()}

        # Get all critics
        critics_result = await db.execute(select(models.Critic).where(models.Critic.org_id == org_id))
        all_critics = {c.slug: c for c in critics_result.scalars().all()}

        critic_weights = {
            "canon-fidelity": 1.0,
            "voice-consistency": 0.8,
            "safety-brand": 1.2,
            "relationship-accuracy": 0.7,
            "legal-compliance": 1.0,
        }

        # Get evaluation profile
        prof_result = await db.execute(select(models.EvaluationProfile).where(models.EvaluationProfile.slug == "peppa-pig-standard"))
        profile = prof_result.scalar_one()

        # Get version mapping (character_id -> version_id)
        ver_result = await db.execute(select(models.CardVersion).where(models.CardVersion.version_number == 1))
        version_map = {v.character_id: v for v in ver_result.scalars().all()}

        print("=== Seed Enhancement Starting ===\n")

        # ══════════════════════════════════════════════════════════════
        # 1. Enrich canon/voice packs for 10 supporting characters
        # ══════════════════════════════════════════════════════════════
        print("1. Enriching character packs...")
        enriched = 0
        for char_name, data in ENRICHMENT.items():
            char = all_chars.get(char_name)
            if not char:
                print(f"   WARNING: Character '{char_name}' not found, skipping")
                continue

            version = version_map.get(char.id)
            if not version:
                print(f"   WARNING: No v1 for '{char_name}', skipping")
                continue

            # Update canon pack
            version.canon_pack = {
                "facts": data["canon_facts"],
                "voice": data["voice"],
                "relationships": data["relationships"],
            }
            # Update visual and audio packs
            version.visual_identity_pack = data["visual_identity_pack"]
            version.audio_identity_pack = data["audio_identity_pack"]
            enriched += 1

        await db.flush()
        print(f"   Enriched {enriched} character packs\n")

        # ══════════════════════════════════════════════════════════════
        # 2. Create ~120 evaluation runs across all 15 characters
        # ══════════════════════════════════════════════════════════════
        print("2. Creating evaluation runs...")
        eval_count = 0
        now = datetime.utcnow()

        # Characters that need 8-12 runs (the 10 supporting + Mummy/Daddy)
        heavy_chars = [
            "Granny Pig", "Grandpa Pig", "Rebecca Rabbit", "Danny Dog",
            "Pedro Pony", "Emily Elephant", "Candy Cat", "Zoë Zebra",
            "Freddy Fox", "Delphine Donkey", "Mummy Pig", "Daddy Pig",
        ]
        # Characters that need 5-8 additional runs
        light_chars = ["Peppa Pig", "George Pig", "Suzy Sheep"]

        for char_name in heavy_chars + light_chars:
            char = all_chars.get(char_name)
            if not char:
                continue

            version = version_map.get(char.id)
            if not version:
                continue

            if char_name in heavy_chars:
                num_runs = random.randint(8, 12)
            else:
                num_runs = random.randint(5, 8)

            prompts = EVAL_PROMPTS.get(char_name, ["Tell me about yourself"])

            for i in range(num_runs):
                # Score distribution: mostly high, some mid, few low
                r = random.random()
                if r < 0.65:
                    score = random_score(85, 98)
                elif r < 0.85:
                    score = random_score(75, 85)
                elif r < 0.95:
                    score = random_score(60, 75)
                else:
                    score = random_score(40, 60)

                decision = pick_decision(score)
                agent_id = random.choice(AGENT_IDS)
                days_ago = random.randint(0, 30)
                hours_ago = random.randint(0, 23)
                prompt = random.choice(prompts)
                tier = random.choice(["rapid", "full"])

                run = models.EvalRun(
                    character_id=char.id,
                    card_version_id=version.id,
                    profile_id=profile.id,
                    franchise_id=franchise.id,
                    agent_id=agent_id,
                    input_content={"prompt": prompt, "modality": "text"},
                    modality="text",
                    status="completed",
                    tier=tier,
                    sampled=random.random() < 0.1,
                    overall_score=score,
                    decision=decision,
                    consent_verified=True,
                    c2pa_metadata={"evaluation_score": score, "character": char_name, "decision": decision, "agent": agent_id},
                    org_id=org_id,
                    created_at=now - timedelta(days=days_ago, hours=hours_ago),
                    completed_at=now - timedelta(days=days_ago, hours=hours_ago) + timedelta(seconds=random.randint(2, 15)),
                )
                db.add(run)
                await db.flush()

                # EvalResult
                critic_scores = {}
                for slug, critic in all_critics.items():
                    variation = random.uniform(-8, 8)
                    critic_scores[slug] = round(min(100, max(0, score + variation)), 2)

                flags = []
                recs = []
                if score < 70:
                    flags.append("low_overall_score")
                    recs.append("Review character card and critic configuration")
                if score < 85:
                    flags.append("below_threshold")
                    recs.append("Consider prompt template adjustments")
                if decision == "quarantine":
                    flags.append("quarantined")
                    recs.append("Manual review required")

                result = models.EvalResult(
                    eval_run_id=run.id,
                    weighted_score=score,
                    critic_scores=critic_scores,
                    flags=flags,
                    recommendations=recs,
                )
                db.add(result)
                await db.flush()

                # 5 CriticResult records
                for slug, critic in all_critics.items():
                    cr = models.CriticResult(
                        eval_result_id=result.id,
                        critic_id=critic.id,
                        score=critic_scores[slug],
                        weight=critic_weights.get(slug, 1.0),
                        reasoning=f"Evaluated '{prompt}' for {char_name} — {slug} analysis complete.",
                        flags=["below_threshold"] if critic_scores[slug] < 80 else [],
                        raw_response={"score": critic_scores[slug], "character": char_name},
                        latency_ms=random.randint(150, 2000),
                    )
                    db.add(cr)

                eval_count += 1

        await db.flush()
        print(f"   Created {eval_count} evaluation runs with results\n")

        # ══════════════════════════════════════════════════════════════
        # 3. Create ~20 new exemplar contents
        # ══════════════════════════════════════════════════════════════
        print("3. Creating exemplar contents...")
        exemplar_count = 0
        for char_name, items in EXEMPLAR_DATA.items():
            char = all_chars.get(char_name)
            if not char:
                continue
            for content, score in items:
                ex = models.ExemplarContent(
                    character_id=char.id,
                    modality="text",
                    content=content,
                    eval_score=score,
                    tags=["high-quality", "curated", char_name.lower().replace(" ", "-")],
                    org_id=org_id,
                )
                db.add(ex)
                exemplar_count += 1

        await db.flush()
        print(f"   Created {exemplar_count} exemplar contents\n")

        # ══════════════════════════════════════════════════════════════
        # 4. Create 6 improvement trajectories
        # ══════════════════════════════════════════════════════════════
        print("4. Creating improvement trajectories...")

        def make_trajectory(start, end, points=15, jitter=2.0):
            """Generate data_points from start to end over 30 days."""
            dp = []
            for i in range(points):
                day = now - timedelta(days=30) + timedelta(days=int(30 * i / (points - 1)))
                progress = i / (points - 1)
                base = start + (end - start) * progress
                value = round(base + random.uniform(-jitter, jitter), 1)
                value = max(0, min(100, value))
                dp.append({"date": day.strftime("%Y-%m-%d"), "value": value})
            return dp

        trajectories = [
            {
                "character": "Peppa Pig",
                "metric_name": "avg_score",
                "data_points": make_trajectory(90, 95, 15),
                "trend": "improving",
            },
            {
                "character": "George Pig",
                "metric_name": "avg_score",
                "data_points": make_trajectory(92, 93.5, 15, jitter=1.5),
                "trend": "stable",
            },
            {
                "character": "Danny Dog",
                "metric_name": "voice_consistency",
                "data_points": make_trajectory(82, 91, 18),
                "trend": "improving",
            },
            {
                "character": "Rebecca Rabbit",
                "metric_name": "canon_fidelity",
                "data_points": make_trajectory(93, 94.5, 12, jitter=1.0),
                "trend": "stable",
            },
            {
                "character": "Pedro Pony",
                "metric_name": "avg_score",
                "data_points": make_trajectory(92, 87, 20),
                "trend": "degrading",
            },
            {
                "character": "Emily Elephant",
                "metric_name": "voice_consistency",
                "data_points": make_trajectory(85, 92, 16),
                "trend": "improving",
            },
        ]

        for t in trajectories:
            char = all_chars.get(t["character"])
            if not char:
                continue
            traj = models.ImprovementTrajectory(
                character_id=char.id,
                franchise_id=franchise.id,
                metric_name=t["metric_name"],
                data_points=t["data_points"],
                trend=t["trend"],
                org_id=org_id,
            )
            db.add(traj)

        await db.flush()
        print(f"   Created {len(trajectories)} improvement trajectories\n")

        # ══════════════════════════════════════════════════════════════
        # 5. Create 10 more consent records (remaining characters)
        # ══════════════════════════════════════════════════════════════
        print("5. Creating consent records...")
        existing_consent_chars = {"Peppa Pig", "George Pig", "Mummy Pig", "Daddy Pig", "Suzy Sheep"}
        consent_count = 0
        for char_name, char in all_chars.items():
            if char_name in existing_consent_chars:
                continue
            consent = models.ConsentVerification(
                character_id=char.id,
                performer_name="Various voice actors",
                consent_type="AI_VOICE_REFERENCE",
                territories=["Worldwide"],
                modalities=["text", "audio"],
                usage_restrictions=["No impersonation", "AI disclosure required", "Character integrity maintained"],
                valid_from=datetime(2024, 1, 1),
                valid_until=datetime(2027, 12, 31),
                strike_clause=True,
                strike_active=False,
                document_ref=f"EONE-HASBRO-CONSENT-{char_name.upper().replace(' ', '-')}-2024",
                org_id=org_id,
            )
            db.add(consent)
            consent_count += 1

        await db.flush()
        print(f"   Created {consent_count} consent records\n")

        # ══════════════════════════════════════════════════════════════
        # 6. Create 4 new test suites with 5 cases each
        # ══════════════════════════════════════════════════════════════
        print("6. Creating test suites...")

        new_suites = [
            {
                "name": "Danny Dog - Core Traits",
                "description": "Tests Danny Dog's pirate personality, sailing love, and adventurous spirit",
                "character": "Danny Dog",
                "tier": "base",
                "threshold": 88.0,
                "cases": [
                    ("Pirate Identity", {"prompt": "What do you want to be?", "expected": "Pirate/sailor references"}),
                    ("Sailing Love", {"prompt": "Tell me about boats", "expected": "Enthusiastic about granddad's boat"}),
                    ("Adventure Spirit", {"prompt": "What shall we do?", "expected": "Adventurous suggestion"}),
                    ("Granddad Reference", {"prompt": "Who do you look up to?", "expected": "Granddad Dog/Captain Dog"}),
                    ("Friend Dynamics", {"prompt": "Who are your friends?", "expected": "Mentions Peppa, Pedro, and school friends"}),
                ],
            },
            {
                "name": "Rebecca Rabbit - Core Traits",
                "description": "Tests Rebecca Rabbit's shy nature, large family, and gentle personality",
                "character": "Rebecca Rabbit",
                "tier": "base",
                "threshold": 88.0,
                "cases": [
                    ("Large Family", {"prompt": "Tell me about your family", "expected": "Many brothers and sisters"}),
                    ("Shy Nature", {"prompt": "Introduce yourself", "expected": "Quiet, gentle introduction"}),
                    ("Helping Mummy", {"prompt": "What do you do at home?", "expected": "Helps with younger siblings"}),
                    ("Friendship", {"prompt": "Who is your best friend?", "expected": "Peppa and school friends"}),
                    ("Carrots", {"prompt": "What's your favorite food?", "expected": "Carrots or family meals"}),
                ],
            },
            {
                "name": "Pedro Pony - Core Traits",
                "description": "Tests Pedro Pony's forgetful and clumsy personality",
                "character": "Pedro Pony",
                "tier": "canonsafe_certified",
                "threshold": 85.0,
                "cases": [
                    ("Forgetfulness", {"prompt": "What did you bring today?", "expected": "Forgot something"}),
                    ("Glasses Identity", {"prompt": "Tell me about yourself", "expected": "Mentions glasses"}),
                    ("Clumsy Nature", {"prompt": "How was sports day?", "expected": "Clumsy but good-natured"}),
                    ("Sweet Personality", {"prompt": "How are you feeling?", "expected": "Happy, confused, sweet"}),
                    ("Daddy Pony", {"prompt": "What does your dad do?", "expected": "Optician/eye doctor"}),
                ],
            },
            {
                "name": "Emily Elephant - Core Traits",
                "description": "Tests Emily Elephant's confident, well-travelled, multi-talented persona",
                "character": "Emily Elephant",
                "tier": "canonsafe_certified",
                "threshold": 85.0,
                "cases": [
                    ("Confidence", {"prompt": "What are you best at?", "expected": "Confidently claims to be good at everything"}),
                    ("Travel Stories", {"prompt": "Tell me a travel story", "expected": "Mentions specific country/experience"}),
                    ("Talented Nature", {"prompt": "Can you show me something?", "expected": "Demonstrates a skill proudly"}),
                    ("Edmond Elephant", {"prompt": "Tell me about your cousin", "expected": "Clever little Edmond"}),
                    ("Competitive Streak", {"prompt": "Who is the best?", "expected": "Claims to be the best, confidently"}),
                ],
            },
        ]

        for suite_data in new_suites:
            char = all_chars.get(suite_data["character"])
            if not char:
                continue
            version = version_map.get(char.id)
            suite = models.TestSuite(
                name=suite_data["name"],
                description=suite_data["description"],
                character_id=char.id,
                card_version_id=version.id if version else None,
                tier=suite_data["tier"],
                passing_threshold=suite_data["threshold"],
                org_id=org_id,
            )
            db.add(suite)
            await db.flush()

            for case_name, content in suite_data["cases"]:
                tc = models.TestCase(
                    suite_id=suite.id,
                    name=case_name,
                    input_content=content,
                    expected_outcome={"min_score": suite_data["threshold"], "must_pass": True},
                    tags=["core", suite_data["character"].lower().split()[0]],
                )
                db.add(tc)

            print(f"   Created test suite: {suite_data['name']} ({len(suite_data['cases'])} cases)")

        await db.flush()
        print()

        # ══════════════════════════════════════════════════════════════
        # 7. Create 4 more agent certifications
        # ══════════════════════════════════════════════════════════════
        print("7. Creating agent certifications...")

        certs_data = [
            {
                "agent_id": "demo-agent-v2",
                "character": "George Pig",
                "tier": "base",
                "status": "passed",
                "score": 89.0,
                "summary": {"total_tests": 5, "passed": 4, "failed": 1, "avg_score": 89.0, "weakest_area": "Limited Vocabulary Consistency"},
                "days_ago": 5,
            },
            {
                "agent_id": "demo-agent-v1",
                "character": "Suzy Sheep",
                "tier": "canonsafe_certified",
                "status": "certified",
                "score": 94.5,
                "summary": {"total_tests": 10, "passed": 9, "failed": 1, "avg_score": 94.5, "weakest_area": "Age Boundary Handling"},
                "days_ago": 3,
            },
            {
                "agent_id": "demo-agent-v2",
                "character": "Danny Dog",
                "tier": "base",
                "status": "passed",
                "score": 85.5,
                "summary": {"total_tests": 5, "passed": 4, "failed": 1, "avg_score": 85.5, "weakest_area": "Pirate Voice Consistency"},
                "days_ago": 10,
            },
            {
                "agent_id": "demo-agent-v1",
                "character": "Pedro Pony",
                "tier": "canonsafe_certified",
                "status": "failed",
                "score": 78.0,
                "summary": {"total_tests": 10, "passed": 6, "failed": 4, "avg_score": 78.0, "weakest_area": "Canon Fidelity — Personality Drift"},
                "days_ago": 2,
            },
        ]

        for cd in certs_data:
            char = all_chars.get(cd["character"])
            if not char:
                continue
            version = version_map.get(char.id)
            cert = models.AgentCertification(
                agent_id=cd["agent_id"],
                character_id=char.id,
                card_version_id=version.id if version else 1,
                tier=cd["tier"],
                status=cd["status"],
                score=cd["score"],
                results_summary=cd["summary"],
                certified_at=now - timedelta(days=cd["days_ago"]) if cd["status"] != "failed" else None,
                expires_at=now + timedelta(days=90 - cd["days_ago"]) if cd["status"] != "failed" else None,
                org_id=org_id,
            )
            db.add(cert)
            print(f"   Created certification: {cd['agent_id']} for {cd['character']} ({cd['status']}, {cd['score']})")

        await db.flush()
        print()

        # ══════════════════════════════════════════════════════════════
        # 8. Create 3 franchise health aggregates (monthly snapshots)
        # ══════════════════════════════════════════════════════════════
        print("8. Creating franchise health aggregates...")

        # Build per-character breakdown
        char_names_list = list(all_chars.keys())

        for month_offset in range(3):
            period_end = now - timedelta(days=month_offset * 30)
            period_start = period_end - timedelta(days=30)

            breakdown = {}
            scores = []
            for cn in char_names_list:
                char_score = round(random.uniform(82, 97), 1)
                char_evals = random.randint(5, 15)
                char_pass_rate = round(random.uniform(0.75, 0.98), 2)
                breakdown[cn] = {
                    "avg_score": char_score,
                    "total_evals": char_evals,
                    "pass_rate": char_pass_rate,
                }
                scores.append(char_score)

            avg_score = round(sum(scores) / len(scores), 1)
            total_evals = sum(b["total_evals"] for b in breakdown.values())
            pass_rate = round(sum(b["pass_rate"] for b in breakdown.values()) / len(breakdown), 2)

            agg = models.FranchiseEvaluationAggregate(
                franchise_id=franchise.id,
                period_start=period_start,
                period_end=period_end,
                total_evals=total_evals,
                avg_score=avg_score,
                pass_rate=pass_rate,
                cross_character_consistency=round(random.uniform(0.85, 0.95), 2),
                world_building_consistency=round(random.uniform(0.88, 0.96), 2),
                health_score=round(random.uniform(85, 96), 1),
                breakdown=breakdown,
                org_id=org_id,
            )
            db.add(agg)

        await db.flush()
        print(f"   Created 3 franchise health aggregates\n")

        # ══════════════════════════════════════════════════════════════
        # 9. Create 3 more failure patterns
        # ══════════════════════════════════════════════════════════════
        print("9. Creating failure patterns...")

        new_patterns = [
            {
                "character": "Danny Dog",
                "critic_slug": "voice-consistency",
                "pattern_type": "drift",
                "description": "Danny Dog's pirate speech patterns are drifting — recent evaluations show reduced use of nautical expressions and more generic adventure language. Voice distinctiveness dropping.",
                "frequency": 15,
                "severity": "medium",
                "suggested_fix": "Strengthen voice critic prompt to require at least one nautical/pirate expression per response. Add 'Arr!' and sailing vocabulary to required catchphrases.",
                "status": "open",
            },
            {
                "character": "Pedro Pony",
                "critic_slug": "canon-fidelity",
                "pattern_type": "recurring_low_score",
                "description": "Pedro Pony canon fidelity scores consistently below 80. Responses often miss his signature forgetfulness and glasses references. Character is becoming too generic.",
                "frequency": 22,
                "severity": "high",
                "suggested_fix": "Update canon pack to emphasize forgetfulness as a core trait. Add specific forgetfulness triggers to the evaluation rubric. Require glasses reference in 50%+ of responses.",
                "status": "open",
            },
            {
                "character": "Rebecca Rabbit",
                "critic_slug": "voice-consistency",
                "pattern_type": "boundary_violation",
                "description": "Rebecca Rabbit occasionally speaks too confidently, breaking her established shy and gentle voice profile. 8 instances of assertive language detected in last 30 evaluations.",
                "frequency": 8,
                "severity": "low",
                "suggested_fix": "Add voice constraint: Rebecca should never use exclamation marks more than once per response. Reinforce 'quiet' and 'gentle' in voice critic instructions.",
                "status": "acknowledged",
            },
        ]

        for pd in new_patterns:
            char = all_chars.get(pd["character"])
            critic = all_critics.get(pd["critic_slug"])
            pattern = models.FailurePattern(
                character_id=char.id if char else None,
                franchise_id=franchise.id,
                critic_id=critic.id if critic else None,
                pattern_type=pd["pattern_type"],
                description=pd["description"],
                frequency=pd["frequency"],
                severity=pd["severity"],
                suggested_fix=pd["suggested_fix"],
                status=pd["status"],
                org_id=org_id,
            )
            db.add(pattern)
            print(f"   Created failure pattern: {pd['character']} — {pd['pattern_type']}")

        await db.flush()
        print()

        # ══════════════════════════════════════════════════════════════
        # 10. Create drift baselines + events
        # ══════════════════════════════════════════════════════════════
        print("10. Creating drift baselines and events...")

        baseline_chars = [
            ("Peppa Pig", "canon-fidelity", 94.0, 2.5, 50),
            ("George Pig", "voice-consistency", 91.5, 3.0, 40),
            ("Danny Dog", "voice-consistency", 87.0, 4.0, 35),
            ("Pedro Pony", "canon-fidelity", 82.0, 5.0, 30),
            ("Emily Elephant", "voice-consistency", 89.5, 3.5, 32),
        ]

        baseline_map = {}
        for char_name, critic_slug, baseline_score, std_dev, sample_count in baseline_chars:
            char = all_chars.get(char_name)
            critic = all_critics.get(critic_slug)
            version = version_map.get(char.id)
            if not char or not critic or not version:
                continue

            bl = models.DriftBaseline(
                character_id=char.id,
                card_version_id=version.id,
                critic_id=critic.id,
                baseline_score=baseline_score,
                std_deviation=std_dev,
                sample_count=sample_count,
                threshold=0.1,
                org_id=org_id,
            )
            db.add(bl)
            await db.flush()
            baseline_map[char_name] = bl.id
            print(f"   Created drift baseline: {char_name} / {critic_slug} (score={baseline_score})")

        # Drift events for Pedro Pony (degrading character)
        pedro_baseline_id = baseline_map.get("Pedro Pony")
        if pedro_baseline_id:
            drift_events = [
                (78.5, -0.15, "warning", 5),
                (75.0, -0.22, "warning", 12),
                (71.2, -0.31, "critical", 20),
                (68.8, -0.38, "critical", 25),
            ]
            for detected, deviation, severity, days_ago in drift_events:
                event = models.DriftEvent(
                    baseline_id=pedro_baseline_id,
                    detected_score=detected,
                    deviation=deviation,
                    severity=severity,
                    acknowledged=severity == "warning",
                    org_id=org_id,
                    created_at=now - timedelta(days=days_ago),
                )
                db.add(event)
            print(f"   Created 4 drift events for Pedro Pony")

        await db.flush()
        print()

        # ══════════════════════════════════════════════════════════════
        # Commit everything
        # ══════════════════════════════════════════════════════════════
        await db.commit()
        print("=== Seed Enhancement Complete! ===")
        print(f"   Enriched packs: {enriched}")
        print(f"   Eval runs: {eval_count}")
        print(f"   Exemplars: {exemplar_count}")
        print(f"   Trajectories: {len(trajectories)}")
        print(f"   Consent records: {consent_count}")
        print(f"   Test suites: {len(new_suites)}")
        print(f"   Certifications: {len(certs_data)}")
        print(f"   Health aggregates: 3")
        print(f"   Failure patterns: {len(new_patterns)}")
        print(f"   Drift baselines: {len(baseline_chars)}")
        print(f"   Drift events: 4")


if __name__ == "__main__":
    asyncio.run(seed_enhance())
