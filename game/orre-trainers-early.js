// Orre: Colosseum's other Trainers in the Outskirt Stand, Phenac City (and its Pre Gym) and Pyrite Town, Colosseum's
// parties (altissimo1's guide) and Colosseum's own words (assets/text/colosseum.json: M1_out, M1_gym_1F, M2_out, and
// fight_common/fight for what they say as they lose). Their unnamed lines are theirs by the game's own order: the lines
// just before a Trainer's named one. Generated from those line ids; see game/orre-trainers.js for the format.
// (Also: the Duel Square's and Cail's later parties once their Shadow Pokémon is snagged, as Colosseum gives them.)
"use strict";

(function () {
  const Orre = window.Orre;
  Orre.addTrainers({
   "PhenacCity_EventScript_Colo_DRIG": {
    "name": "Fun Old Man Drig",
    "cls": "Fun Old Man",
    "map": "PhenacCity",
    "x": 12,
    "y": 15,
    "facing": "face_down",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Hoothoot", 25],
       ["Sentret", 25]
      ],
      "intro": [
       "Drig: What fine weather this is! It's\ntruly a perfect sort of day for a\nPokémon battle.",
       "Drig: So, young one, how about\nindulging this old man? Let us\nbattle."
      ],
      "defeat": [
       "Whoa! I've got to concede this\none, lad!"
      ],
      "after": [
       "Drig: You really are just like me\nwhen I was young. You must break a\nlot of hearts!"
      ],
      "won": [
       "Drig: Ah, yes. You're young, but\nyou've got a bit of spine!",
       "Drig: Why, you're just like me when I\nwas young! Well done, indeed!"
      ]
     }
    ]
   },
   "PhenacCity_EventScript_Colo_KAIB": {
    "name": "Roller Boy Kaib",
    "cls": "Roller Boy",
    "map": "PhenacCity",
    "x": 30,
    "y": 24,
    "facing": "face_left",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Wurmple", 25],
       ["Silcoon", 25]
      ],
      "intro": [
       "Kaib: I'm no good at schoolwork, but\nI'm pretty hot stuff at Pokémon\nbattles.",
       "Kaib: You're a trainer, too, aren't\nyou? Let's duke it out! Let's battle!",
       "Kaib: All right! Here we come, and\nthere's no holding back!"
      ],
      "defeat": [
       "Ouch, no! That wasn't supposed\nto happen!"
      ],
      "after": [
       "Kaib: I'm no good at school… And no\ngood at battling… I'm not good at\nanything!"
      ],
      "won": [
       "Kaib: I didn't think I'd lose.",
       "Kaib: Big guy, you're tough. I want\nyou to have this since you're so\ngood."
      ],
      "item": "tm41"
     }
    ]
   },
   "PhenacCity_PreGym_EventScript_Colo_BOTAN": {
    "name": "Cooltrainer Botan",
    "cls": "Cooltrainer",
    "map": "PhenacCity_PreGym",
    "x": 3,
    "y": 5,
    "facing": "face_right",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Sunkern", 27],
       ["Hoppip", 26]
      ],
      "intro": [
       "Botan: Do you feel like taking on\nsome GRASS-type Pokémon? Then I'm the\none you want!"
      ],
      "defeat": [
       "How do you like that? You're\nmore than strong enough."
      ],
      "after": [
       "Botan: I'm going to toughen up some\nmore. I hope you keep working, too!"
      ]
     }
    ]
   },
   "PhenacCity_PreGym_EventScript_Colo_LIQUI": {
    "name": "Cooltrainer Liqui",
    "cls": "Cooltrainer",
    "map": "PhenacCity_PreGym",
    "x": 11,
    "y": 5,
    "facing": "face_left",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Marill", 26],
       ["Surskit", 27]
      ],
      "intro": [
       "Liqui: Leave WATER-type battling to\nme! I'll teach you just how strong\nthe Water type can be."
      ],
      "defeat": [
       "I was impressed by your\nPokémon!"
      ],
      "after": [
       "Liqui: My goal is to become the\nultimate WATER-type battler. Back to\nmore training for me!"
      ]
     }
    ],
    "female": true
   },
   "PhenacCity_PreGym_EventScript_Colo_DUGO": {
    "name": "Rich Boy Dugo",
    "cls": "Rich Boy",
    "map": "PhenacCity_PreGym",
    "x": 3,
    "y": 8,
    "facing": "face_right",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Trapinch", 27],
       ["Swinub", 27]
      ],
      "intro": [
       "Dugo: Is it you? Did you want to\nbattle me? You don't look like a\ntrainer…",
       "Dugo: Well, it doesn't matter. You\ncan learn how a proper trainer\nbattles from me!"
      ],
      "defeat": [
       "You're tough, even though you\ndon't look it!"
      ],
      "after": [
       "Dugo: The way you battle is… Uh…\nInteresting. You might say it's\nunique, or maybe it's just chaotic.",
       "Dugo: Well, I'll wish you the best of\nluck!"
      ]
     }
    ]
   },
   "PhenacCity_PreGym_EventScript_Colo_GWIN": {
    "name": "Lady Gwin",
    "cls": "Lady",
    "map": "PhenacCity_PreGym",
    "x": 11,
    "y": 8,
    "facing": "face_left",
    "stages": [
     {
      "from": 19,
      "team": [
       ["Geodude", 27],
       ["Rhyhorn", 27]
      ],
      "intro": [
       "Gwin: Your challenge is accepted. I\ndo hope you're ready."
      ],
      "defeat": [
       "I must commend you for a battle\nwell played."
      ],
      "after": [
       "Gwin: My battling style must have\nbeen too sophisticated for you."
      ]
     }
    ],
    "female": true
   },
   "PyriteTown_EventScript_Colo_CALDA": {
    "name": "Chaser Calda",
    "cls": "Chaser",
    "map": "PyriteTown",
    "x": 12,
    "y": 27,
    "facing": "face_right",
    "stages": [
     {
      "from": 22,
      "team": [
       ["Sentret", 25],
       ["Taillow", 25],
       ["Slakoth", 26]
      ],
      "intro": [
       "Calda: Yo. Your outfit's kind of\nweird, but you're a trainer, too,\naren't you?",
       "Calda: Good. That's okay, then. I'll\nteach you about one of the few rules\nthis town has.",
       "Calda: Here, we have street battles\nrather than exchanging greetings!"
      ],
      "defeat": [
       "Whoops! You were better than\nme!"
      ],
      "after": [
       "Calda: I tripped myself up, but\nyou're not bad at all. Your Pokémon\nare tops, too."
      ]
     },
     {
      "from": 33,
      "team": [
       ["Furret", 35],
       ["Taillow", 32],
       ["Slakoth", 21]
      ],
      "intro": [
       "Calda: Hey! Behind you! It's Miror\nB.!"
      ],
      "defeat": [
       "I was just joking!"
      ],
      "after": [
       "Calda: Hey! There's $100 by your\nfoot!",
       "Calda: …Heh. You're not about to fall\nfor anything like that again."
      ]
     },
     {
      "from": 44,
      "team": [
       ["Furret", 50],
       ["Swellow", 51],
       ["Vigoroth", 50]
      ],
      "intro": [
       "Calda: Hey! Behind you! It's a\nWailord!",
       "Calda: Tch! No one'd fall for that\none!"
      ],
      "defeat": [
       "Yeah, I admit it. That bogus\nline was weak!"
      ],
      "after": [
       "Calda: Man, isn't there anything\ninteresting going down?",
       "Calda: Ever since Miror B.'s been\ngone, I've been bored silly."
      ]
     }
    ]
   },
   "PyriteTown_EventScript_Colo_EMOK": {
    "name": "Chaser Emok",
    "cls": "Chaser",
    "female": true,
    "map": "PyriteTown",
    "x": 22,
    "y": 24,
    "facing": "face_left",
    "stages": [
     {
      "from": 22,
      "team": [
       ["Gulpin", 27],
       ["Zubat", 27]
      ],
      "intro": [
       "Emok: Oh, look at what we have here.\nYou're quite the hottie.",
       "Emok: Why don't you lose that\nwallflower with you and be my\nsweetie?",
       "Rui: Wait a second! Who are you to\ncall me a wallflower? What about me\nmakes me a wallflower?",
       "Emok: Ahaha! Look at her, she's all\nserious! Uncool!",
       "Emok: I'm only teasing out of\nboredom. A guy like him, he's not to\nmy taste.",
       "Rui: Grrrrr! That's it! I'm furious\nnow!",
       "Rui: {PLAYER}! Be a man; stomp her\ndown!",
       "Emok: Stomp? Who, me? Ahaha! That's a\nlaugh!",
       "Emok: Come on, then. I'll go easy on\nyou!"
      ],
      "defeat": [
       "You got all serious!"
      ],
      "after": [
       "Emok: What kind of a man battles a\nfrail girl like me without easing up?",
       "You're not going to win the hearts of\ngirls that way."
      ]
     },
     {
      "from": 33,
      "team": [
       ["Gulpin", 36],
       ["Golbat", 36]
      ],
      "intro": [
       "Emok: Hi there, aren't you the\nhottie?",
       "Emok: I'll go easy on you. Come on!"
      ],
      "defeat": [
       "You got all serious!"
      ],
      "after": [
       "Emok: What kind of a man battles a\nfrail girl like me without easing up?",
       "You're not going to win the hearts of\ngirls that way."
      ]
     },
     {
      "from": 44,
      "team": [
       ["Swalot", 54],
       ["Golbat", 54]
      ],
      "intro": [
       "Emok: Hi there, aren't you the\nhottie?",
       "Emok: I'll go easy on you. Come on!"
      ],
      "defeat": [
       "You got all serious!"
      ],
      "after": [
       "Emok: What kind of a man battles a\nfrail girl like me without easing up?",
       "You're not going to win the hearts of\ngirls that way."
      ]
     }
    ]
   },
   "PyriteTown_EventScript_Colo_HADER": {
    "name": "Bodybuilder Hader",
    "cls": "Bodybuilder",
    "map": "PyriteTown",
    "x": 25,
    "y": 15,
    "facing": "face_down",
    "stages": [
     {
      "from": 31,
      "team": [
       ["Beldum", 34],
       ["Aron", 35]
      ],
      "intro": [
       "Hader: I got Fateen, Pyrite's Mother,\nto read my fortune.",
       "Hader: She told me that battling\ntoday will bring me good luck!"
      ],
      "defeat": [
       "That's it! I'm never going to\nbelieve in silly fortune-telling\nagain!"
      ],
      "after": [
       "Hader: A battle today would bring\ngood luck, she said… What, to my\nopponent?!"
      ]
     }
    ]
   }
  });
  Orre.addRematches({
   "PyriteTown_EventScript_Shadow_CAIL": [
    {
     "from": 27,
     "team": [
      ["Snubbull", 35],
      ["Kirlia", 35],
      ["Nuzleaf", 35],
      ["Machop", 35]
     ],
     "intro": [
      "Cail: What did you say?! You put the\nboot to Miror B.? That's a surprise.",
      "Cail: But it doesn't matter if that\nclown's here or not.",
      "Cail: Either way, it doesn't change\nthe fact that Pyrite's the town for\nbattling. Get ready for this!"
     ],
     "defeat": [
      "I couldn't do it again!"
     ],
     "after": [
      "Cail: Moan… I've learned how tough\nyou are battling. It's a full-body\nexperience."
     ]
    },
    {
     "from": 31,
     "team": [
      ["Granbull", 40],
      ["Kirlia", 40],
      ["Nuzleaf", 40],
      ["Machoke", 40]
     ],
     "intro": [
      "Cail: Yo, we meet again! How chipper\nare you feeling? Let me see!"
     ],
     "defeat": [
      "I couldn't do it again!"
     ],
     "after": [
      "Cail: Moan… I've learned how tough\nyou are battling. It's a full-body\nexperience."
     ]
    },
    {
     "from": 44,
     "team": [
      ["Granbull", 56],
      ["Gardevoir", 57],
      ["Shiftry", 56],
      ["Machamp", 57]
     ],
     "intro": [
      "Cail: Yo, we meet again! Huh? About\nthe Shadow Pokémon? Oh, yeah, I\nremember battling one, sure.",
      "Cail: I'd be willing to share what I\nknow with you. But only if you can\nbeat me. You ready?"
     ],
     "defeat": [
      "I couldn't do it again!"
     ],
     "after": [
      "Cail: Yo! What I told you was useful\nto you, am I right?"
     ],
     "won": [
      "Cail: That trainer said something\nabout the Snagem Hideout."
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_VANT": [
    {
     "from": 21,
     "team": [
      ["Shuppet", 29],
      ["Skitty", 28],
      ["Zigzagoon", 28]
     ],
     "intro": [
      "Vant: Kyahahahah! You're looking to\nbattle with me?",
      "Vant: That's too funny! Come at me as\nif your life depended on it!\nKyahahahah!"
     ],
     "defeat": [
      "Ggggyooooh!"
     ],
     "after": [
      "Vant: Next time, I get to win and do\nthe laughing! Kyahahahah!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Shuppet", 34],
      ["Skitty", 35],
      ["Linoone", 35]
     ],
     "intro": [
      "Vant: Kyahahahah! You're looking to\nbattle with me?",
      "Vant: That's too funny! Come at me as\nif your life depended on it!\nKyahahahah!"
     ],
     "defeat": [
      "Ggggyooooh!"
     ],
     "after": [
      "Vant: Next time, I get to win and do\nthe laughing! Kyahahahah!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Banette", 50],
      ["Delcatty", 51],
      ["Linoone", 51]
     ],
     "intro": [
      "Vant: Kyahahahah! You're looking to\nbattle with me?",
      "Vant: That's too funny! Come at me as\nif your life depended on it!\nKyahahahah!"
     ],
     "defeat": [
      "Ggggyooooh!"
     ],
     "after": [
      "Vant: Next time, I get to win and do\nthe laughing! Kyahahahah!"
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_NOVER": [
    {
     "from": 21,
     "team": [
      ["Doduo", 26],
      ["Ledyba", 27],
      ["Wingull", 27]
     ],
     "intro": [
      "Nover: This is Duel Square, where\neven crying kids know they'd better",
      "shut up. This is where roughnecks\ngather.",
      "Nover: So, how about it? How would\nyou like to battle with me?",
      "Nover: Excellent! I like a man who\ncan come to a quick decision! Let's\nhave it out!"
     ],
     "defeat": [
      "You're saying I lost?!"
     ],
     "after": [
      "Nover: You're pretty good at this.\nBut I'm not losing the next time!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Doduo", 36],
      ["Ledian", 35],
      ["Wingull", 36]
     ],
     "intro": [
      "Nover: This is Duel Square, where\neven crying kids know they'd better",
      "shut up. This is where roughnecks\ngather.",
      "Nover: So, how about it? How would\nyou like to battle with me?",
      "Nover: Excellent! I like a man who\ncan come to a quick decision! Let's\nhave it out!"
     ],
     "defeat": [
      "You're saying I lost?!"
     ],
     "after": [
      "Nover: You're pretty good at this.\nBut I'm not losing the next time!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Dodrio", 53],
      ["Ledian", 54],
      ["Pelipper", 55]
     ],
     "intro": [
      "Nover: This is Duel Square, where\neven crying kids know they'd better",
      "shut up. This is where roughnecks\ngather.",
      "Nover: So, how about it? How would\nyou like to battle with me?",
      "Nover: Excellent! I like a man who\ncan come to a quick decision! Let's\nhave it out!"
     ],
     "defeat": [
      "You're saying I lost?!"
     ],
     "after": [
      "Nover: You're pretty good at this.\nBut I'm not losing the next time!"
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_DIOGO": [
    {
     "from": 21,
     "team": [
      ["Pichu", 27],
      ["Shroomish", 26]
     ],
     "intro": [
      "Diogo: Hohohoho! Do you feel like\nsticking around for a demonstration\nof my Pokémon's moves?",
      "Diogo: Good, good. I like your\nattitude. Feast your eyes on these!"
     ],
     "defeat": [
      "You outperformed me!"
     ],
     "after": [
      "Diogo: Your Pokémon surpassed my\nlittle darlings. But you won't get to\nwin next time!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Pikachu", 35],
      ["Shroomish", 37]
     ],
     "intro": [
      "Diogo: Hohohoho! Do you feel like\nsticking around for a demonstration\nof my Pokémon's moves?",
      "Diogo: Good, good. I like your\nattitude. Feast your eyes on these!"
     ],
     "defeat": [
      "You outperformed me!"
     ],
     "after": [
      "Diogo: Your Pokémon surpassed my\nlittle darlings. But you won't get to\nwin next time!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Raichu", 52],
      ["Breloom", 53]
     ],
     "intro": [
      "Diogo: Hohohoho! Do you feel like\nsticking around for a demonstration\nof my Pokémon's moves?",
      "Diogo: Good, good. I like your\nattitude. Feast your eyes on these!"
     ],
     "defeat": [
      "You outperformed me!"
     ],
     "after": [
      "Diogo: Your Pokémon surpassed my\nlittle darlings. But you won't get to\nwin next time!"
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_LEBA": [
    {
     "from": 21,
     "team": [
      ["Sunkern", 28],
      ["Oddish", 26],
      ["Dustox", 26]
     ],
     "intro": [
      "Leba: If you try talking to anyone in\nDuel Square, there's only one answer!"
     ],
     "defeat": [
      "Oh, boo! I had to lose?"
     ],
     "after": [
      "Leba: Ooh, that was an incredible\nbattle! I simply love strong guys!\nThat's L-O-V-E!",
      "Leba: If you ever get the urge to\nbattle with me again, I'll always be\nhere for you, honey!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Sunflora", 36],
      ["Oddish", 37],
      ["Dustox", 38]
     ],
     "intro": [
      "Leba: If you try talking to anyone in\nDuel Square, there's only one answer!"
     ],
     "defeat": [
      "Oh, boo! I had to lose?"
     ],
     "after": [
      "Leba: Ooh, that was an incredible\nbattle! I simply love strong guys!\nThat's L-O-V-E!",
      "Leba: If you ever get the urge to\nbattle with me again, I'll always be\nhere for you, honey!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Sunflora", 54],
      ["Gloom", 52],
      ["Dustox", 53]
     ],
     "intro": [
      "Leba: If you try talking to anyone in\nDuel Square, there's only one answer!"
     ],
     "defeat": [
      "Oh, boo! I had to lose?"
     ],
     "after": [
      "Leba: Ooh, that was an incredible\nbattle! I simply love strong guys!\nThat's L-O-V-E!",
      "Leba: If you ever get the urge to\nbattle with me again, I'll always be\nhere for you, honey!"
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_DIVEL": [
    {
     "from": 21,
     "team": [
      ["Horsea", 30],
      ["Psyduck", 29]
     ],
     "intro": [
      "Divel: Huh? You want to battle me?",
      "Divel: Sure thing! Battling fans are\nalways welcome!"
     ],
     "defeat": [
      "Waaah! Whew!"
     ],
     "after": [
      "Divel: You're way tough! We've gotta\nbattle again!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Seadra", 39],
      ["Psyduck", 38]
     ],
     "intro": [
      "Divel: Huh? You want to battle me?",
      "Divel: Sure thing! Battling fans are\nalways welcome!"
     ],
     "defeat": [
      "Waaah! Whew!"
     ],
     "after": [
      "Divel: You're way tough! We've gotta\nbattle again!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Seadra", 55],
      ["Golduck", 56]
     ],
     "intro": [
      "Divel: Huh? You want to battle me?",
      "Divel: Sure thing! Battling fans are\nalways welcome!"
     ],
     "defeat": [
      "Waaah! Whew!"
     ],
     "after": [
      "Divel: You're way tough! We've gotta\nbattle again!"
     ]
    }
   ],
   "PyriteTown_EventScript_Shadow_LON": [
    {
     "from": 21,
     "team": [
      ["Numel", 25],
      ["Azurill", 27],
      ["Igglybuff", 28],
      ["Swablu", 27]
     ],
     "intro": [
      "Lon: Battle, battle, so much fun!\nPokémon battles for everyone!",
      "Lon: Battles bring me so much joy!\nLet's get started, little boy!"
     ],
     "defeat": [
      "I hope you like my show, but now\nit's time for me to go!"
     ],
     "after": [
      "Lon: Okay, everyone! We've all had\nour fun! Until next week, farewell!"
     ]
    },
    {
     "from": 33,
     "team": [
      ["Numel", 33],
      ["Marill", 34],
      ["Jigglypuff", 35],
      ["Swablu", 34]
     ],
     "intro": [
      "Lon: Battle, battle, so much fun!\nPokémon battles for everyone!",
      "Lon: Battles bring me so much joy!\nLet's get started, little boy!"
     ],
     "defeat": [
      "I hope you like my show, but now\nit's time for me to go!"
     ],
     "after": [
      "Lon: Okay, everyone! We've all had\nour fun! Until next week, farewell!"
     ]
    },
    {
     "from": 44,
     "team": [
      ["Camerupt", 49],
      ["Azumarill", 50],
      ["Wigglytuff", 51],
      ["Altaria", 50]
     ],
     "intro": [
      "Lon: Battle, battle, so much fun!\nPokémon battles for everyone!",
      "Lon: Battles bring me so much joy!\nLet's get started, little boy!"
     ],
     "defeat": [
      "I hope you like my show, but now\nit's time for me to go!"
     ],
     "after": [
      "Lon: Okay, everyone! We've all had\nour fun! Until next week, farewell!"
     ]
    }
   ]
  });
  // (Rider Willie's later parties: once you've reached Pyrite, and once all 48 Shadow Pokémon are snagged.)
  Orre.WILLIE_STAGES = [
   {
    "from": 22,
    "team": [
     ["Zigzagoon", 29],
     ["Linoone", 30]
    ],
    "intro": [
     "Willie: Oh, hey, it's you! Just the\nguy I wanted to see!",
     "Willie: You see, I had the urge to\nhave another Pokémon battle with you.\nIt was driving me wonky!",
     "Willie: So, come on. Let's battle.\nI'm not losing this time!"
    ],
    "defeat": [
     "Tch… Wiped out again!"
    ],
    "after": [
     "Willie: But, yeah, you're tough. Real\ntough. You stomped us good."
    ]
   },
   {
    "from": (f) => (f.orreShadowSnagged || []).length >= Orre.SHADOW.length,
    "team": [
     ["Linoone", 53],
     ["Dodrio", 53],
     ["Girafarig", 54]
    ],
    "intro": [
     "Willie: Hey, it's you! I was hoping\nto see you again.",
     "Willie: You see, I was itching for\nanother battle with you. It was\ndriving me wonky!",
     "Willie: All right, let's battle. I'm\nnot losing this time!"
    ],
    "defeat": [
     "Tch… Knocked out yet again!"
    ],
    "after": [
     "Willie: But, yeah, you really are\nseriously tough. I can't keep up!"
    ]
   }
  ];
  // (What the Shadow Pokémon Trainers here say as they lose, in battle.)
  const defeats = {
   "CAIL": [
    "Whaaaat?! My Shadow Pokémon was\nbeaten?!"
   ],
   "VANT": [
    "Ggggyooooh!"
   ],
   "NOVER": [
    "You're saying I lost?!"
   ],
   "DIOGO": [
    "You outperformed me!"
   ],
   "LEBA": [
    "Oh, boo! I had to lose?"
   ],
   "DIVEL": [
    "Waaah! Whew!"
   ],
   "LON": [
    "I hope you like my show, but now\nit's time for me to go!"
   ]
  };
  for (const [key, d] of Object.entries(defeats)) {
    const t = Orre.SHADOW_TRAINERS["PyriteTown_EventScript_Shadow_" + key];
    if (t) t.defeat = d;
  }
})();
