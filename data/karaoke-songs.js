// Kamurocho's karaoke box (ui/karaoke.js): Yakuza 0's karaoke, in this game's way: its songs are this game's own,
// words and tunes, played on a Game Boy Advance's kind of sound (two square waves, a triangle and noise) so every
// prompt falls on its note. Each song: its title and singer, its tempo (beats a minute), the bars before the
// singing (`intro`), its chords a bar each ([root as a MIDI note, "maj" | "min" | "7"]), its drums ("ballad",
// "dance", "shuffle") and its lines: each [the beat it starts on, its syllables], a syllable [its words, its note
// (MIDI), how many beats it's held]. A prompt comes with every syllable sung on the beat (ui/karaoke.js).
window.KARAOKE_SONGS = [
  {
    id: "nights", title: "Kamurocho Nights", by: "a lonely salaryman", bpm: 96, intro: 2, drums: "ballad",
    chords: [[57, "min"], [53, "maj"], [48, "maj"], [55, "maj"], [57, "min"], [53, "maj"], [55, "maj"], [52, "7"],
      [53, "maj"], [55, "maj"], [52, "min"], [57, "min"], [53, "maj"], [55, "maj"], [57, "min"], [57, "min"],
      [57, "min"], [57, "min"]],
    lines: [
      [8, [["Ne", 69, 1], ["on ", 69, 0.5], ["lights ", 72, 0.5], ["on ", 74, 1], ["rain", 76, 0.5], ["y ", 74, 0.5], ["streets,", 72, 2]]],
      [16, [["I ", 67, 1], ["walk ", 69, 1], ["the ", 72, 0.5], ["town ", 69, 0.5], ["a", 67, 1], ["lone", 64, 2]]],
      [24, [["Ev", 69, 0.5], ["ery ", 72, 0.5], ["sign ", 74, 1], ["is ", 76, 1], ["call", 79, 0.5], ["ing ", 76, 0.5], ["me", 74, 2]]],
      [32, [["back ", 76, 1], ["to ", 74, 0.5], ["Ka", 72, 0.5], ["mu", 74, 1], ["ro", 72, 1], ["cho", 69, 2]]],
      [40, [["Who ", 72, 1], ["cares ", 72, 1], ["a", 74, 0.5], ["bout ", 76, 0.5], ["to", 76, 1], ["mor", 74, 1], ["row", 72, 1]]],
      [48, [["while ", 74, 1], ["the ", 72, 1], ["night ", 69, 1], ["is ", 67, 1], ["young", 69, 2]]],
      [56, [["Sing ", 76, 1], ["it ", 76, 0.5], ["loud, ", 79, 1.5], ["sing ", 76, 1], ["it ", 76, 0.5], ["proud,", 81, 1.5]]],
      [64, [["Ka", 79, 0.5], ["mu", 76, 0.5], ["ro", 74, 1], ["cho ", 72, 1], ["nights!", 69, 3]]]
    ]
  },
  {
    id: "champion", title: "24-Hour Champion", by: "the dance floor's own", bpm: 136, intro: 2, drums: "dance",
    chords: [[48, "maj"], [57, "min"], [53, "maj"], [55, "maj"], [48, "maj"], [57, "min"], [53, "maj"], [55, "7"],
      [53, "maj"], [55, "maj"], [52, "min"], [57, "min"], [53, "maj"], [55, "maj"], [48, "maj"], [48, "maj"],
      [48, "maj"], [48, "maj"]],
    lines: [
      [8, [["Lights ", 72, 1], ["on, ", 72, 1], ["mu", 74, 0.5], ["sic ", 76, 0.5], ["up,", 72, 3]]],
      [16, [["the ", 67, 0.5], ["par", 72, 0.5], ["ty ", 72, 1], ["nev", 74, 0.5], ["er ", 72, 0.5], ["ends,", 76, 3]]],
      [24, [["Dan", 76, 1], ["cing ", 76, 1], ["till ", 79, 1], ["the ", 77, 1], ["mor", 76, 1], ["ning", 74, 2]]],
      [32, [["with ", 74, 1], ["all ", 74, 1], ["my ", 76, 1], ["clo", 74, 1], ["sest ", 72, 1], ["friends!", 72, 2]]],
      [40, [["Twen", 79, 0.5], ["ty-", 79, 0.5], ["four ", 77, 1], ["hour ", 76, 1], ["cham", 74, 0.5], ["pi", 76, 0.5], ["on,", 72, 2]]],
      [48, [["no", 72, 1], ["bo", 74, 0.5], ["dy ", 76, 0.5], ["can ", 77, 1], ["beat ", 76, 1], ["me!", 74, 2]]],
      [56, [["Twen", 79, 0.5], ["ty-", 79, 0.5], ["four ", 77, 1], ["hour ", 76, 1], ["cham", 74, 0.5], ["pi", 76, 0.5], ["on,", 72, 2]]],
      [64, [["dance ", 74, 1], ["the ", 76, 1], ["night ", 79, 1], ["with ", 77, 1], ["me!", 72, 3]]]
    ]
  },
  {
    id: "blues", title: "Dojima Blues", by: "a man with a dragon on his back", bpm: 104, intro: 2, drums: "shuffle",
    chords: [[52, "7"], [52, "7"], [57, "7"], [52, "7"], [59, "7"], [57, "7"], [52, "7"], [59, "7"],
      [52, "7"], [57, "7"], [52, "7"], [59, "7"], [57, "7"], [52, "7"], [52, "7"], [52, "7"]],
    lines: [
      [8, [["Got ", 64, 0.5], ["a ", 67, 0.5], ["dra", 69, 1], ["gon ", 67, 1], ["on ", 64, 0.5], ["my ", 62, 0.5], ["back", 64, 2]]],
      [16, [["and ", 64, 0.5], ["a ", 67, 0.5], ["debt ", 69, 1], ["I ", 71, 1], ["can't ", 69, 0.5], ["re", 67, 0.5], ["pay.", 64, 2]]],
      [24, [["Ev", 71, 0.5], ["ery ", 71, 0.5], ["punk ", 74, 1], ["in ", 71, 0.5], ["Ka", 69, 0.5], ["mu", 67, 0.5], ["ro", 69, 0.5], ["cho", 71, 2]]],
      [32, [["wants ", 69, 0.5], ["to ", 67, 0.5], ["get ", 64, 1], ["in ", 67, 1], ["my ", 69, 1], ["way.", 64, 2]]],
      [40, [["So ", 76, 0.5], ["I ", 74, 0.5], ["sing ", 71, 1], ["the ", 69, 0.5], ["Do", 71, 0.5], ["ji", 69, 0.5], ["ma ", 67, 0.5], ["blues", 64, 2]]],
      [48, [["till ", 67, 0.5], ["the ", 69, 0.5], ["sun ", 71, 1], ["comes ", 74, 1], ["up ", 71, 0.5], ["a", 69, 0.5], ["gain.", 64, 3]]]
    ]
  }
];
