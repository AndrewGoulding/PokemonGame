# Pep Quiz and Striaton Trainers' School

The Icirrus Pep Quiz House replaces the outdoor three-question placeholder with
all 31 source questions, hints and answer-word IDs. The importer reads
`src/ov036/scrcmd_pep_quiz.c`, the Icirrus text bank and the PMS word categories;
Pokémon and move answers use the original species/move word offsets. No guessed
answer strings or new Python build dependency are used.

As in the source, the ordinary pool has 22 questions before the Hall of Fame and
30 afterward. The 31st is the birthday question. Aha can register a birthday once
for the game's existing thirty-day-month calendar. The active question is saved;
leaving or reloading cannot reroll it. Correct answers award an Antidote, wrong
answers a Parlyz Heal. A full Bag locks the answered result and keeps the prize
claimable, even across midnight. Old `quizDay` records still prevent a second
attempt on a day completed in an earlier build. Canceling the local answer menu
leaves the same question available. The native menu uses the 31 source answer
words rather than recreating the DS's entire Easy Chat editor.

Striaton's school includes the original status-condition blackboard, residents,
two-question Persim Berry/Swagger quiz and three advice stages about overcoming
Levitate. All three answers offered at each advice stage are valid in the source.
Completing the advice unlocks Ace Trainer Dusty's original four level-64 Pokémon:
Rotom, Weezing, Gengar and Eelektross, all with Levitate. Losing or declining the
battle preserves the completed advice; winning finishes the quest. The student
awards three Persim Berries once after both correct answers, with full-Bag retry.

References: `icirrus_city_4.s`, `striaton_city_9.s`, their event/text banks,
`src/system/pms_word.c`, `tools/text/pms_words.py` and the source Dusty trainer
record. Both rooms and the blackboard use native authored 2D art and controls.
