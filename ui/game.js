// Game flow: title screen, new game, the overworld and its story events, the
// Start menu (party, bag, Pokédex, trainer card, save, debug), and what
// happens after battles (prize money, catching, blacking out, evolution).
// Depends on: game/*.js, ui/screen.js, ui/battle-screen.js
//
// The player saves manually to this browser, with reminders during exploration,
// and can download / load a save file as a backup.

(function () {
  "use strict";

  // Scene modules share live bindings, including replacement saves and transient state.
  // Getters defer access until a scene runs, after game initialization is complete.
  const storyEnv = {
    get $() { return $; },
    get BIG_MON_SIZES() { return BIG_MON_SIZES; },
    get BRAILLE_SIGNS() { return BRAILLE_SIGNS; },
    get BT_ENTRY() { return BT_ENTRY; },
    get BT_NURSE() { return BT_NURSE; },
    get BT_RECEPTION() { return BT_RECEPTION; },
    get BT_SIGN() { return BT_SIGN; },
    get CELADON_TMS() { return CELADON_TMS; },
    get CELIO() { return CELIO; },
    get CHAMPION_TEAM() { return CHAMPION_TEAM; },
    get CHANSEY_DANCE() { return CHANSEY_DANCE; },
    get CINNABAR_BILL() { return CINNABAR_BILL; },
    get CINNABAR_QUIZ() { return CINNABAR_QUIZ; },
    get CINNABAR_SEAGALLOP() { return CINNABAR_SEAGALLOP; },
    get CROWD_FACING() { return CROWD_FACING; },
    get CROWD_SAYS() { return CROWD_SAYS; },
    get CROWD_SPRITES() { return CROWD_SPRITES; },
    get CRUSH_NAMES() { return CRUSH_NAMES; },
    get DAY_CARES() { return DAY_CARES; },
    get DC() { return DC; },
    get DOJO_MASTER() { return DOJO_MASTER; },
    get DOJO_REMATCH() { return DOJO_REMATCH; },
    get DOJO_SECOND_LEVEL() { return DOJO_SECOND_LEVEL; },
    get DRINKS() { return DRINKS; },
    get ELEVATOR_SHAKES() { return ELEVATOR_SHAKES; },
    get ELITE_FOUR_SCRIPTS() { return ELITE_FOUR_SCRIPTS; },
    get EMBER_GRUNTS() { return EMBER_GRUNTS; },
    get FISHING_LEVELS_EXPLAINED() { return FISHING_LEVELS_EXPLAINED; },
    get FOSSILS() { return FOSSILS; },
    get FUCHSIA_SIGN_MONS() { return FUCHSIA_SIGN_MONS; },
    get G() { return G; },
    get GC_BIKER() { return GC_BIKER; },
    get GC_DADDY() { return GC_DADDY; },
    get GC_LOSTELLE() { return GC_LOSTELLE; },
    get HIDEOUT_GIOVANNI_EXTRA() { return HIDEOUT_GIOVANNI_EXTRA; },
    get HIDEOUT_LEAF() { return HIDEOUT_LEAF; },
    get ICEFALL_GRUNT2() { return ICEFALL_GRUNT2; },
    get ICEFALL_LORELEI() { return ICEFALL_LORELEI; },
    get ITEM_BALLS() { return ITEM_BALLS; },
    get KANTO_REMATCH() { return KANTO_REMATCH; },
    get LAB_OAK() { return LAB_OAK; },
    get LAB_RIVAL() { return LAB_RIVAL; },
    get LAB_RIVAL_NAME() { return LAB_RIVAL_NAME; },
    get LEAF() { return LEAF; },
    get LEAGUE_IDS() { return LEAGUE_IDS; },
    get LEAGUE_TEXT() { return LEAGUE_TEXT; },
    get M() { return M; },
    get MAHJONG_BUY_IN() { return MAHJONG_BUY_IN; },
    get MAHJONG_CHAIRS() { return MAHJONG_CHAIRS; },
    get MAX_COINS() { return MAX_COINS; },
    get MEGA_AIDE() { return MEGA_AIDE; },
    get MEGA_ARENA() { return MEGA_ARENA; },
    get MEGA_CAST() { return MEGA_CAST; },
    get MEGA_PLACES() { return MEGA_PLACES; },
    get MEGA_RIVALS() { return MEGA_RIVALS; },
    get MEGA_SPOT() { return MEGA_SPOT; },
    get MEMORIAL_MAN() { return MEMORIAL_MAN; },
    get OAK() { return OAK; },
    get ONE_BILL() { return ONE_BILL; },
    get OUTDOORS() { return OUTDOORS; },
    get P5() { return P5; },
    get PC_BILL() { return PC_BILL; },
    get PEWTER_FOSSIL_SCIENTIST() { return PEWTER_FOSSIL_SCIENTIST; },
    get POWDER_PRIZES() { return POWDER_PRIZES; },
    get PRIZES() { return PRIZES; },
    get PRIZE_MENU() { return PRIZE_MENU; },
    get RED_SILPH_PICK() { return RED_SILPH_PICK; },
    get RED_SILPH_ROSTER() { return RED_SILPH_ROSTER; },
    get RIVAL_PICK() { return RIVAL_PICK; },
    get ROUTE23_BADGES() { return ROUTE23_BADGES; },
    get SAFARI_EXIT() { return SAFARI_EXIT; },
    get SAFARI_GATE() { return SAFARI_GATE; },
    get sinnohParkExit() { return () => sinnohStory.run("pt:park-retire"); },
    get sinnohMarshExit() { return () => sinnohStory.run("pt:daily-marsh-exit"); },
    get SIGN_LADY() { return SIGN_LADY; },
    get SILPH_DOORS() { return SILPH_DOORS; },
    get SILPH_FLOORS() { return SILPH_FLOORS; },
    get SILPH_GIOVANNI_EXTRA() { return SILPH_GIOVANNI_EXTRA; },
    get SILPH_RED() { return SILPH_RED; },
    get SILPH_RIVAL_TEAM() { return SILPH_RIVAL_TEAM; },
    get SILPH_WORKERS() { return SILPH_WORKERS; },
    get SPECIAL() { return SPECIAL; },
    get STAGE_TWO() { return STAGE_TWO; },
    get STARTER_BALLS() { return STARTER_BALLS; },
    get STARTER_LEVEL() { return STARTER_LEVEL; },
    get ST_CASTLE() { return ST_CASTLE; },
    get ST_CUPS() { return ST_CUPS; },
    get ST_NURSE() { return ST_NURSE; },
    get ST_SIGN() { return ST_SIGN; },
    get T() { return T; },
    get TANOBY_KEY() { return TANOBY_KEY; },
    get TB() { return TB; },
    get TEAM_SWAPS() { return TEAM_SWAPS; },
    get TERA_AIDE() { return TERA_AIDE; },
    get TERA_GATE_DOORS() { return TERA_GATE_DOORS; },
    get TOWER() { return TOWER; },
    get TRADES() { return TRADES; },
    get TRAINER_SCRIPTS() { return TRAINER_SCRIPTS; },
    get TUTOR_PRICE() { return TUTOR_PRICE; },
    get TWO_ISLAND_STOCK() { return TWO_ISLAND_STOCK; },
    get VICTORY_ROAD_RIVAL_TEAM() { return VICTORY_ROAD_RIVAL_TEAM; },
    get addCaught() { return addCaught; },
    get addCoins() { return addCoins; },
    get afterRocket() { return afterRocket; },
    get agateShrine() { return agateShrine; },
    get aideGift() { return aideGift; },
    get antiBiker() { return antiBiker; },
    get applyPatches() { return applyPatches; },
    get apricornTree() { return apricornTree; },
    get article() { return article; },
    get ask() { return ask; },
    get avatarMusic() { return avatarMusic; },
    get azaleaRide() { return azaleaRide; },
    get back() { return back; },
    get badgeGuard() { return badgeGuard; },
    get bagPockets() { return bagPockets; },
    get ballOf() { return ballOf; },
    get battle() { return battle; },
    get battleCount() { return battleCount; },
    set battleCount(value) { battleCount = value; },
    get battleTerrain() { return battleTerrain; },
    get battleTowerEntry() { return battleTowerEntry; },
    get battleTowerReception() { return battleTowerReception; },
    get battleTowerSign() { return battleTowerSign; },
    get berryCrushRankings() { return berryCrushRankings; },
    get berryFarm() { return berryFarm; },
    get berryForestLostelle() { return berryForestLostelle; },
    get berryPowderMan() { return berryPowderMan; },
    get berryPowderOf() { return berryPowderOf; },
    get bigGuy() { return bigGuy; },
    get bikerArgument() { return bikerArgument; },
    get bikerBattles() { return bikerBattles; },
    get bikerBossIntro() { return bikerBossIntro; },
    get bill() { return bill; },
    get billInTeleporter() { return billInTeleporter; },
    set billInTeleporter(value) { billInTeleporter = value; },
    get billJustOut() { return billJustOut; },
    set billJustOut(value) { billJustOut = value; },
    get billToCelio() { return billToCelio; },
    get billsComputer() { return billsComputer; },
    get blackjackTable() { return blackjackTable; },
    get blaine() { return blaine; },
    get bpEggTutor() { return bpEggTutor; },
    get bpShop() { return bpShop; },
    get bpTutor() { return bpTutor; },
    get braille() { return braille; },
    get brock() { return brock; },
    get canBattle() { return canBattle; },
    get canDouble() { return canDouble; },
    get capeBrinkJustTaught() { return capeBrinkJustTaught; },
    set capeBrinkJustTaught(value) { capeBrinkJustTaught = value; },
    get capeBrinkTutor() { return capeBrinkTutor; },
    get catchTutorial() { return catchTutorial; },
    get celio() { return celio; },
    get ceruleanGrunt() { return ceruleanGrunt; },
    get ceruleanRival() { return ceruleanRival; },
    get chanseyDance() { return chanseyDance; },
    get chooseMoveToForget() { return chooseMoveToForget; },
    get choosePartyFor() { return choosePartyFor; },
    get chooseQuantity() { return chooseQuantity; },
    get cinnabarBill() { return cinnabarBill; },
    get cinnabarCenterBill() { return cinnabarCenterBill; },
    get cinnabarQuiz() { return cinnabarQuiz; },
    get clearMenu() { return clearMenu; },
    get coins() { return coins; },
    get coinsBox() { return coinsBox; },
    get coinsClerk() { return coinsClerk; },
    get confirm() { return confirm; },
    get crowdCache() { return crowdCache; },
    set crowdCache(value) { crowdCache = value; },
    get cry() { return cry; },
    get cutTree() { return cutTree; },
    get dayCareMan() { return dayCareMan; },
    get deltaDue() { return deltaDue; },
    get deltaScene() { return deltaScene; },
    get deltaTalk() { return deltaTalk; },
    get deltaVisible() { return deltaVisible; },
    get dinerWillie() { return dinerWillie; },
    get directCorner() { return directCorner; },
    get dojoAfter() { return dojoAfter; },
    get dojoBall() { return dojoBall; },
    get dojoDenDoor() { return dojoDenDoor; },
    get dojoMaster() { return dojoMaster; },
    get dojoMasterRematchWon() { return dojoMasterRematchWon; },
    get dojoRematch() { return dojoRematch; },
    get dottedHoleDoor() { return dottedHoleDoor; },
    get dottedHoleSapphire() { return dottedHoleSapphire; },
    get dukingsHouse() { return dukingsHouse; },
    get eagunsHouse() { return eagunsHouse; },
    get eagunsHouseScene() { return eagunsHouseScene; },
    get eggGentleman() { return eggGentleman; },
    get elevator() { return elevator; },
    get eliteFour() { return eliteFour; },
    get emberGrunt() { return emberGrunt; },
    get emberPassword() { return emberPassword; },
    get emberSpa() { return emberSpa; },
    get enterText() { return enterText; },
    get erika() { return erika; },
    get esCade() { return esCade; },
    get evolve() { return evolve; },
    get faceBack() { return faceBack; },
    get faceEachOther() { return faceEachOther; },
    get fanfare() { return fanfare; },
    get farawaySailor() { return farawaySailor; },
    get fill() { return fill; },
    get findMew() { return findMew; },
    get fishingLevelTalk() { return fishingLevelTalk; },
    get fishingXp() { return fishingXp; },
    get floorNumber() { return floorNumber; },
    get follower() { return follower; },
    get fossilScientist() { return fossilScientist; },
    get fourIslandDayCareLady() { return fourIslandDayCareLady; },
    get fourIslandDayCareMan() { return fourIslandDayCareMan; },
    get fourIslandRival() { return fourIslandRival; },
    get fuchsiaMoveDeleter() { return fuchsiaMoveDeleter; },
    get gambler() { return gambler; },
    get gameCornerHelp() { return gameCornerHelp; },
    get gear() { return gear; },
    get gideon() { return gideon; },
    get giftMon() { return giftMon; },
    get giovanniGym() { return giovanniGym; },
    get giovanniHideout() { return giovanniHideout; },
    get giovanniKangaskhanite() { return giovanniKangaskhanite; },
    get giovanniSilph() { return giovanniSilph; },
    get giveFishingRod() { return giveFishingRod; },
    get giveHoennTicket() { return giveHoennTicket; },
    get goldenrodPanel() { return goldenrodPanel; },
    get gymCans() { return gymCans; },
    set gymCans(value) { gymCans = value; },
    get gymGuide() { return gymGuide; },
    get harborSailor() { return harborSailor; },
    get hasBadge() { return hasBadge; },
    get hasBerry() { return hasBerry; },
    get hasFishingRod() { return hasFishingRod; },
    get heracrossChart() { return heracrossChart; },
    get heracrossFan() { return heracrossFan; },
    get hiddenCoins() { return hiddenCoins; },
    get hidePicture() { return hidePicture; },
    get hideoutLeafFrom() { return hideoutLeafFrom; },
    set hideoutLeafFrom(value) { hideoutLeafFrom = value; },
    get hoenn() { return hoenn; },
    get hoennBerries() { return hoennBerries; },
    get hoennSafari() { return hoennSafari; },
    get hoennScriptFor() { return hoennScriptFor; },
    get hoennVisible() { return hoennVisible; },
    get icefallFall() { return icefallFall; },
    get icefallIce() { return icefallIce; },
    set icefallIce(value) { icefallIce = value; },
    get icefallLorelei() { return icefallLorelei; },
    get ilexShrineCelebi() { return ilexShrineCelebi; },
    get inGameTrade() { return inGameTrade; },
    get inPurifiedZone() { return inPurifiedZone; },
    set inPurifiedZone(value) { inPurifiedZone = value; },
    get isGirl() { return isGirl; },
    get isHoenn() { return isHoenn; },
    get isSinnoh() { return isSinnoh; },
    get itemJingle() { return itemJingle; },
    get johto() { return johto; },
    get johtoField() { return johtoField; },
    get johtoLeague() { return johtoLeague; },
    get johtoSafari() { return johtoSafari; },
    get koga() { return koga; },
    get kogaTeam() { return kogaTeam; },
    get labArrival() { return labArrival; },
    get labEin() { return labEin; },
    get labTroop() { return labTroop; },
    get labObject() { return labObject; },
    get labDoor() { return labDoor; },
    get labDoorShut() { return labDoorShut; },
    get realgamTournament() { return realgamTournament; },
    get leaderRematch() { return leaderRematch; },
    get leafMegaTeam() { return leafMegaTeam; },
    get leafPewter() { return leafPewter; },
    get leafPewterDue() { return leafPewterDue; },
    get leafT() { return leafT; },
    get leafVermilion() { return leafVermilion; },
    get leagueEnter() { return leagueEnter; },
    get learnMove() { return learnMove; },
    get leaveOneIsland() { return leaveOneIsland; },
    get legendaryBird() { return legendaryBird; },
    get lobbyText() { return lobbyText; },
    get lookOf() { return lookOf; },
    get lostSelphy() { return lostSelphy; },
    get lostellesDaddy() { return lostellesDaddy; },
    get ltSurge() { return ltSurge; },
    get machineFor() { return machineFor; },
    get magikarpInches() { return magikarpInches; },
    get magikarpRecord() { return magikarpRecord; },
    get magikarpSize() { return magikarpSize; },
    get magikarpSizeHash() { return magikarpSizeHash; },
    get magnetTrainBoard() { return magnetTrainBoard; },
    get mahjongCrowd() { return mahjongCrowd; },
    set mahjongCrowd(value) { mahjongCrowd = value; },
    get mahjongTable() { return mahjongTable; },
    get mansionSwitch() { return mansionSwitch; },
    get marowakGhost() { return marowakGhost; },
    get mart() { return mart; },
    get mayorScene() { return mayorScene; },
    get meetCelio() { return meetCelio; },
    get megaAide() { return megaAide; },
    get megaAideDue() { return megaAideDue; },
    get megaReady() { return megaReady; },
    get megaStoneGift() { return megaStoneGift; },
    get megaTower() { return megaTower; },
    get megaTowerDue() { return megaTowerDue; },
    get memorial() { return memorial; },
    get memorialMan() { return memorialMan; },
    get mewFound() { return mewFound; },
    get miguelBattle() { return miguelBattle; },
    get mirorBHideout() { return mirorBHideout; },
    get misty() { return misty; },
    get monInches() { return monInches; },
    get monSign() { return monSign; },
    get monSize() { return monSize; },
    get monSizeHash() { return monSizeHash; },
    get money() { return money; },
    get moneyBox() { return moneyBox; },
    get moveDeleter() { return moveDeleter; },
    get moveManiac() { return moveManiac; },
    get moveManiacMet() { return moveManiacMet; },
    set moveManiacMet(value) { moveManiacMet = value; },
    get moveRelearner() { return moveRelearner; },
    get moveTutor() { return moveTutor; },
    get mtBattleArrival() { return mtBattleArrival; },
    get mtBattleChallenge() { return mtBattleChallenge; },
    get mtBattleSummit() { return mtBattleSummit; },
    get multichoice() { return multichoice; },
    get music() { return music; },
    get nameRater() { return nameRater; },
    get needBike() { return needBike; },
    get networkMachine() { return networkMachine; },
    get nuggetBridgeRocket() { return nuggetBridgeRocket; },
    get nurse() { return nurse; },
    get oakGsBall() { return oakGsBall; },
    get oakOrre() { return oakOrre; },
    get oakWalksYouToTheLab() { return oakWalksYouToTheLab; },
    get oneIslandCenterBill() { return oneIslandCenterBill; },
    get openQuizDoor() { return openQuizDoor; },
    get orreArrival() { return orreArrival; },
    get orreBartender() { return orreBartender; },
    get orreJukebox() { return orreJukebox; },
    get orrePilot() { return orrePilot; },
    get orreStandStory() { return orreStandStory; },
    get orreTournament() { return orreTournament; },
    get orreTrainer() { return orreTrainer; },
    get coloTrainer() { return coloTrainer; },
    get dayCareLady() { return dayCareLady; },
    get pyriteExtra() { return pyriteExtra; },
    get preGymJusty() { return preGymJusty; },
    get orreTravel() { return orreTravel; },
    get orreMail() { return orreMail; }, get orreMailDue() { return orreMailDue; }, get orreMailWaiting() { return !!(orreMailPending && orreMailPending.length); },
    get outOfCenterHeal() { return outOfCenterHeal; },
    get outOfDoorway() { return outOfDoorway; },
    get outskirtLena() { return outskirtLena; },
    get overlayCanvas() { return overlayCanvas; },
    get pairBattle() { return pairBattle; },
    get pathTo() { return pathTo; },
    get pc() { return pc; },
    get persist() { return persist; },
    get phenacFT() { return phenacFT; },
    get phenacFTBattle() { return phenacFTBattle; },
    get phenacKodo() { return phenacKodo; },
    get phenacTruck() { return phenacTruck; },
    get phenacTroop() { return phenacTroop; },
    get plainCoins() { return plainCoins; },
    get player() { return player; },
    set player(value) { player = value; },
    get playersPc() { return playersPc; },
    get pokedexScene() { return pokedexScene; },
    get pokerTable() { return pokerTable; },
    get powerPlantElectrode() { return powerPlantElectrode; },
    get prizeClerk() { return prizeClerk; },
    get pyriteArrival() { return pyriteArrival; },
    get pyriteNore() { return pyriteNore; },
    get pyriteTopFloor() { return pyriteTopFloor; },
    get quizDoorOpen() { return quizDoorOpen; },
    get raidDen() { return raidDen; },
    get realgamArrival() { return realgamArrival; },
    get realgamEvice() { return realgamEvice; },
    get realgamGonzap() { return realgamGonzap; },
    get realgamNascour() { return realgamNascour; },
    get realgamAdmin() { return realgamAdmin; },
    get realgamDoor() { return realgamDoor; },
    get realgamDoorShut() { return realgamDoorShut; },
    get rejuvenator() { return rejuvenator; },
    get relearnable() { return relearnable; },
    get relicForestShrine() { return relicForestShrine; },
    get cologneGirl() { return cologneGirl; },
    get agateMart() { return agateMart; },
    get relicStone() { return relicStone; },
    get rivalLabBattle() { return rivalLabBattle; },
    get rockSmash() { return rockSmash; },
    get rodGift() { return rodGift; },
    get route22LateRival() { return route22LateRival; },
    get route22LateRivalDue() { return route22LateRivalDue; },
    get route22LeafTeam() { return route22LeafTeam; },
    get route22Rival() { return route22Rival; },
    get route23Scene() { return route23Scene; },
    get ruinValleyScientist() { return ruinValleyScientist; },
    get runHoenn() { return runHoenn; },
    get runJohto() { return runJohto; },
    get sabrina() { return sabrina; },
    get sabrinaAlakazite() { return sabrinaAlakazite; },
    get safariEntry() { return safariEntry; },
    get safariGateArrival() { return safariGateArrival; },
    get safariOn() { return safariOn; },
    get sailToHoenn() { return sailToHoenn; },
    get savePromptAt() { return savePromptAt; },
    set savePromptAt(value) { savePromptAt = value; },
    get say() { return say; },
    get sayWithJingle() { return sayWithJingle; },
    get scene() { return scene; },
    get seaCottageReturn() { return seaCottageReturn; },
    set seaCottageReturn(value) { seaCottageReturn = value; },
    get seafoamFall() { return seafoamFall; },
    get seafoamFell() { return seafoamFell; },
    set seafoamFell(value) { seafoamFell = value; },
    get selphy() { return selphy; },
    get selphyHome() { return selphyHome; },
    get sfx() { return sfx; },
    get shadowTrainer() { return shadowTrainer; },
    get show() { return show; },
    get showPicture() { return showPicture; },
    get signLady() { return signLady; },
    get signLadyAside() { return signLadyAside; },
    set signLadyAside(value) { signLadyAside = value; },
    get signLadyPlace() { return signLadyPlace; },
    get signLadyShowSign() { return signLadyShowSign; },
    get signLadyVisit() { return signLadyVisit; },
    set signLadyVisit(value) { signLadyVisit = value; },
    get silphDoor() { return silphDoor; },
    get silphDoorFlag() { return silphDoorFlag; },
    get silphFreed() { return silphFreed; },
    get silphRival() { return silphRival; },
    get sinnohBerries() { return sinnohBerries; },
    get sinnohStory() { return sinnohStory; },
    get unovaStory() { return unovaStory; },
    get sinnohFerry() { return sinnohFerry; },
    get sinnohSailor() { return sinnohSailor; },
    get sixIslandRival() { return sixIslandRival; },
    get slateportSailor() { return slateportSailor; },
    get sleep() { return sleep; },
    get slotMachine() { return slotMachine; },
    get snagemGuard() { return snagemGuard; },
    get snagemTarget() { return snagemTarget; },
    get snorlax() { return snorlax; },
    get southernIsland() { return southernIsland; },
    get ssAnneCaptain() { return ssAnneCaptain; },
    get ssAnneDeparting() { return ssAnneDeparting; },
    get ssAnneDeparts() { return ssAnneDeparts; },
    get ssAnneRed() { return ssAnneRed; },
    get ssAquaBoard() { return ssAquaBoard; },
    get ssAquaToOlivine() { return ssAquaToOlivine; },
    get stadiumCastle() { return stadiumCastle; },
    get stadiumCups() { return stadiumCups; },
    get stadiumSailor() { return stadiumSailor; },
    get stadiumSign() { return stadiumSign; },
    get stadiumSpectator() { return stadiumSpectator; },
    get stickerMan() { return stickerMan; },
    get strengthBoulder() { return strengthBoulder; },
    get swappedTeam() { return swappedTeam; },
    get tanobyKeySwitch() { return tanobyKeySwitch; },
    get tempFlags() { return tempFlags; },
    get teraAide() { return teraAide; },
    get teraAideDue() { return teraAideDue; },
    get thirstyGirl() { return thirstyGirl; },
    get tick() { return tick; },
    get ticketChecked() { return ticketChecked; },
    set ticketChecked(value) { ticketChecked = value; },
    get tmText() { return tmText; },
    get toward() { return toward; },
    get towerBP() { return towerBP; },
    get towerBattle() { return towerBattle; },
    get towerElevator() { return towerElevator; },
    get towerEntry() { return towerEntry; },
    get towerFloor() { return towerFloor; },
    get towerFloorNo() { return towerFloorNo; },
    get towerLook() { return towerLook; },
    get towerLost() { return towerLost; },
    get towerOwner() { return towerOwner; },
    get towerPerson() { return towerPerson; },
    get towerRival() { return towerRival; },
    get towerTimeBoard() { return towerTimeBoard; },
    get towerTrainerTalk() { return towerTrainerTalk; },
    get tradeScene() { return tradeScene; },
    get trainerBattle() { return trainerBattle; },
    get trainerRematch() { return trainerRematch; },
    get trainerTeam() { return trainerTeam; },
    get trainerWaiting() { return trainerWaiting; },
    get trashCan() { return trashCan; },
    get twoIslandClerk() { return twoIslandClerk; },
    get underArrival() { return underArrival; },
    get underKloak() { return underKloak; },
    get underVenus() { return underVenus; },
    get junkShopOwner() { return junkShopOwner; }, get junkShopPerr() { return junkShopPerr; }, get underBitt() { return underBitt; },
    get nettsHideout() { return nettsHideout; }, get nettsHideoutPerson() { return nettsHideoutPerson; }, get subwayDue() { return subwayDue; },
    get subwayEnter() { return subwayEnter; }, get subwayElevator() { return subwayElevator; }, get subwayStation() { return subwayStation; }, get subwayB1() { return subwayB1; },
    get subwayFan() { return subwayFan; }, get shadowLiner() { return shadowLiner; }, get nettsDoorShut() { return nettsDoorShut; }, get nettsDoor() { return nettsDoor; },
    get usedMove() { return usedMove; },
    get vendingMachine() { return vendingMachine; },
    get vermilionSeagallop() { return vermilionSeagallop; },
    get victoryRoadRival() { return victoryRoadRival; },
    get victoryRoadRivalDue() { return victoryRoadRivalDue; },
    get viridianGymOpen() { return viridianGymOpen; },
    get walkIn() { return walkIn; },
    get walkOut() { return walkOut; },
    get walkTo() { return walkTo; },
    get warden() { return warden; },
    get warehouseAdmin() { return warehouseAdmin; },
    get warehouseDoor() { return warehouseDoor; },
    get wildMon() { return wildMon; },
  };
  const {
    berryPowderMan,
    directCorner,
    chooseCrushBerry,
    berryCrush,
    berryCrushRankings,
    coinsClerk,
    gambler,
    hiddenCoins,
    slotMachine,
    voltorbFlip,
    tableStars,
    starNotice,
    pokerTable,
    blackjackTable,
    crowdLooks,
    cardRoomCrowd,
    mahjongPlayers,
    mahjongTable,
    prizeClerk
  } = KantoActivities.create(storyEnv);
  const {
    visible,
    story,
    special
  } = StoryEvents.create(storyEnv);
  const {
    oakWalksYouToTheLab,
    rivalLabBattle,
    pokedexScene,
    catchTutorial,
    rateDex,
    aideGift,
    leafWaiting,
    leafPewterDue,
    leafVermilionStep,
    leafComesOver,
    leafPewter,
    leafLeaves,
    leafVermilion,
    signLadyPlace,
    signLadyShowSign,
    signLady,
    megaAideDue,
    megaAideRoute,
    stepOutOfDoor,
    megaAide,
    teraAide,
    megaTowerPeople,
    megaLeaves,
    megaTower,
    marowakGhost,
    nuggetBridgeRocket,
    ceruleanGrunt,
    dayCareMan,
    bill,
    billsComputer,
    miguelBattle,
    elevator,
    setDynamicWarp,
    giftMon,
    faceBack,
    thirstyGirl,
    vendingMachine,
    surfingPikachu,
    ssAnneRed,
    ssAnneCaptain,
    ssAnneDeparting,
    ssAnneDeparts
  } = KantoTowns.create(storyEnv);
  const {
    gymGuide,
    brockTeam,
    mistyTeam,
    brock,
    misty,
    surgeTeam,
    ltSurge,
    erikaTeam,
    erika,
    sabrina,
    koga,
    giovanniGym,
    leaderTeam,
    leaderRematch,
    blaineTeam,
    blaine,
    openQuizDoor,
    cinnabarQuiz,
    fossilScientist,
    mansionSwitch,
    hideVermilionSwitches,
    trashCan
  } = KantoGyms.create(storyEnv);
  const {
    besideYou,
    giovanniHideout,
    afterRocket,
    dojoBall,
    dojoRematch,
    dojoMaster,
    dojoDenDoor,
    silphDoor,
    silphRival,
    giovanniSilph
  } = KantoRocket.create(storyEnv);
  const {
    monSign,
    snorlax,
    rodGift,
    giveFishingRod,
    fishingLevelTalk,
    monSizeHash,
    monSize,
    magikarpRecord,
    fuchsiaMoveDeleter,
    warden,
    kogaTeam,
    seafoamFall,
    powerPlantElectrode,
    safariStep,
    safariEntry,
    safariGateArrival,
    safariOver,
    safariBattle
  } = KantoField.create(storyEnv);
  const {
    route22LateRival,
    victoryRoadRival,
    badgeGuard,
    victoryRoadSwitch,
    leagueEnter,
    swappedTeam,
    johtoEliteFour,
    eliteFour,
    championTeam,
    championsRoom,
    johtoChampion,
    hallOfFame,
    creditsRoll
  } = KantoLeague.create(storyEnv);
  const {
    setSail,
    seagallopMenu,
    harborSailor,
    vermilionSeagallop,
    ferry,
    cinnabarBill,
    cinnabarSailWithBill,
    cinnabarCenterBill,
    cinnabarBillReturns,
    oneIslandArrival,
    billToCelio,
    meetCelio,
    celio,
    celioRuby,
    celioSapphire,
    giveOldSeaMap,
    oneIslandCenterBill,
    leaveOneIsland,
    networkMachine,
    twoIslandShop,
    twoIslandClerk,
    gameCornerHelp,
    gameCornerLostelleHome,
    lostellesDaddy,
    capeBrinkTutor,
    moveManiac,
    bikerArgument,
    antiBiker,
    bikerBossIntro,
    bikerBattles,
    berryForestLostelle,
    emberPassword,
    emberGrunt,
    emberSpa,
    seviiTransition,
    cinnabarBillStep,
    fourIslandRival,
    yesNo,
    fourIslandDayCareLady,
    fourIslandDayCareMan,
    stickerMan,
    icefallStep,
    icefallFall,
    icefallLorelei,
    warehouseDoor,
    warehouseAdmin,
    gideon,
    memorialMan,
    memorialTM,
    memorial,
    sixIslandRival,
    ruinValleyScientist,
    dottedHoleDoor,
    cutDottedHoleDoor,
    dottedHoleSapphire,
    heracrossFan,
    heracrossChart,
    chanseyDance,
    tanobySwitch,
    tanobyKeySwitch,
    towerPerson,
    towerEntry,
    towerLost,
    towerTimeBoard,
    towerBattle,
    towerTrainerTalk,
    towerOwner
  } = KantoSevii.create(storyEnv);


  const STARTER_LEVEL = 5;

  const { message, ask, escapeHtml, clearMenu, spriteTag } = window.Screen;
  const $ = (sel) => document.querySelector(sel);
  const field = $("#field"), scene = $("#scene"), world = $("#world"), fileInput = $("#file-input");

  let player = null;
  let lastTick = Date.now();
  let saveProblem = null;   // set when saving fails, so it's reported once

  // ---------- Helpers ----------

  const partyLevel = () => Math.max(1, ...player.party.filter((r) => !r.egg).map((r) => r.level));
  const canBattle = () => player.party.some(Party.canFight);
  // Two Pokémon that can fight, for a double battle (FireRed's GetMonsStateToDoubles).
  const canDouble = () => player.party.filter(Party.canFight).length >= 2;
  const money = (n) => "₽" + Math.floor(n).toLocaleString("en-US");
  const article = (word) => (/^[AEIOU]/i.test(word) ? "an " : "a ") + word;

  // ---------- Sound (ui/audio.js) ----------
  const GA = window.GameAudio;
  const music = (name) => { if (GA) GA.music(name); };
  // In Johto, HGSS's music (ui/audio.js plays FireRed's battle, victory,
  // "eyes meet" and jingle songs as HGSS's there).
  // (Is a map in Johto: `map`, or where you are.)
  const inJohto = (map) => !!(map || (player && player.location)) && (window.WORLD_MAPS[map || player.location.map] || {}).region === "johto";
  if (GA && GA.setRegion) GA.setRegion(() => (inJohto() ? "johto" : ((window.WORLD_MAPS[player && player.location && player.location.map] || {}).region === "hoenn" ? "hoenn" : null)));
  const fanfare = (name) => (GA ? GA.fanfare(name) : Promise.resolve());
  const cry = (species, opts) => { if (GA) GA.cry(species, opts); };
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // Cycling Road: Route 16's and Route 18's gates, and the maps you ride in between.
  const CYCLING_ROAD_GATES = ["Route16_NorthEntrance_1F", "Route18_EastEntrance_1F"];
  const CYCLING_ROAD_MAPS = ["Route16", "Route17", "Route18"].concat(CYCLING_ROAD_GATES);
  // The jingle for getting an item: TMs and HMs, key items, or anything else.
  const itemJingle = (item) => (Bag.isMachine(item) ? "mus_obtain_tmhm" : Bag.isKeyItem(item) ? "mus_obtain_key_item" : "mus_obtain_item");
  // A message with a jingle under it; carries on once both are done.
  async function sayWithJingle(jingle, pages) {
    const j = fanfare(jingle);
    await say(pages);
    await j;
  }
  const plural = (n, word) => n + " " + word + (n === 1 ? "" : "s");
  // (More than one of an item: "Berries", not "Berrys"; a name already ending in "s" as it is.)
  const itemPlural = (name) => (/s$/i.test(name) ? name : /[^aeiou]y$/i.test(name) ? name.slice(0, -1) + "ies" : name + "s");
  const back = (label) => ({ label: label || "Back", value: "back", className: "action", wide: true });

  function playTime(ms) {
    const mins = Math.floor(ms / 60000);
    return Math.floor(mins / 60) + ":" + String(mins % 60).padStart(2, "0");
  }

  function show(which) {
    if (which !== "world") Overworld.hide();
    if (which !== "intro" && window.Intro) Intro.stop();
    $("#world-pic").classList.add("hidden");
    field.classList.toggle("hidden", which !== "field");
    scene.classList.toggle("hidden", which !== "scene");
    world.classList.toggle("hidden", which !== "world");
    // (A scene leaves the map as it was showing in the screen's top 32 lines.)
    world.classList.toggle("behind", which === "scene");
  }

  // Shows `html` in the scene and a menu; resolves with a menu value, or
  // { pick } when something with a data-pick attribute in the scene is clicked.
  function pick(text, html, options) {
    show("scene");
    scene.innerHTML = html;
    return new Promise((resolve) => {
      let done = false;
      const finish = (v) => { if (done) return; done = true; clearMenu(); resolve(v); };
      for (const el of scene.querySelectorAll("[data-pick]")) {
        el.addEventListener("click", () => finish({ pick: el.dataset.pick }));
      }
      ask(text, options).then(finish);
      // A list (bag, Mart, PC items, the Pokédex): the cursor starts on its
      // first row (or the one marked data-focus), not on Back.
      const row = ["[data-pick][data-focus]", ".rows .row[data-pick]", ".dex [data-pick]"].map((q) => scene.querySelector(q)).find(Boolean);
      if (row) { row.focus(); row.scrollIntoView({ block: "nearest" }); }
    });
  }

  const confirm = (text) => Screen.yesNo(text);
  // Wild Tera Pokémon (in battle()): how often, and the Tera Shards one knocked out gives.
  const WILD_TERA_CHANCE = 0.1, WILD_TERA_SHARDS = 3;
  const TYPES18 = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground", "Flying", "Psychic", "Bug",
    "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"];
  // A wild Pokémon met in the grass, on the water, on a rod, under a rock or in
  // the Safari Zone, holding what it rolls (Encounters.withHeldItem; your lead
  // Pokémon's Compound Eyes helps). (Not the legendaries waiting on the map.)
  // (Your lead Pokémon: Compound Eyes for what it holds, Synchronize for its nature, Cute Charm for its gender.)
  const leadMon = () => player.party.find((r) => !r.egg && r.hp > 0);
  const wildMon = (record) => Unova.sourceWild(player,Encounters.leadRecord(Encounters.withHeldItem(window.UnovaPost?UnovaPost.charmWild(player,record):record, leadMon()), leadMon()));
  let continued = false;   // (just continued a saved game: the area's name shows)
  const sfx = (name) => { if (window.GameAudio && window.GameAudio.se) window.GameAudio.se(name); };

  // ---------- Saving ----------

  function tick() {
    const now = Date.now();
    if (player) player.playTimeMs += now - lastTick;
    // (Trainer Tower's clock, while a challenge is on.)
    if (player) TrainerTower.tick(player.flags, now - lastTick);
    lastTick = now;
  }

  // (No autosave: the game is saved when you choose to, from the START menu
  // or your trainer card, or when it asks every 5 minutes of play
  // (saveReminderStep). `persist` only keeps the play time up to date.)
  async function persist() { tick(); }
  // Saving, when you've chosen to: "{PLAYER} saved the game."
  async function saveGame() {
    tick();
    const r = Save.write(player);
    savePromptAt = player.playTimeMs;
    if (!r.ok && saveProblem !== r.error) saveProblem = r.error;
    await message(r.ok ? player.name + " saved the game." : r.error + " Use “Download save file” on your trainer card to keep your progress.");
    return r.ok;
  }
  // Every 5 minutes of play, out in the overworld (not in the Safari Zone or
  // the Bug-Catching Contest, where you can't save), the game offers to save.
  const SAVE_PROMPT_MS = 5 * 60 * 1000;
  let savePromptAt = null;
  function saveReminderStep() {
    tick();
    if (savePromptAt == null) savePromptAt = player.playTimeMs;
    if (player.playTimeMs - savePromptAt < SAVE_PROMPT_MS) return null;
    if (player.flags.safari || bugContest.here(player.location.map)) return null;
    return { type: "save-prompt" };
  }
  async function savePrompt() {
    savePromptAt = player.playTimeMs;
    if (await confirm("It's been a while since you saved.\nWould you like to save the game?")) await saveGame();
    else Screen.say("");
  }

  function downloadSave() {
    tick();
    const blob = new Blob([Save.toFile(player)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "pokemon-save-" + player.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Lets the player pick a save file. Resolves with a loaded player, or null.
  async function loadSaveFile() {
    fileInput.value = "";
    const chosen = new Promise((resolve) => {
      fileInput.onchange = () => resolve(fileInput.files[0] || null);
    });
    fileInput.click();
    const file = await Promise.race([chosen, ask("Choose a save file to load.", [back("Cancel")]).then(() => null)]);
    clearMenu();
    if (!file) return null;
    try {
      const loaded = Save.fromFile(await file.text());
      for (const w of loaded.warnings) await message(w);
      return loaded.player;
    } catch (e) {
      await message(e.message);
      return null;
    }
  }

  function renderSprite(species, extraClass, form, shiny) {
    show("scene");
    scene.innerHTML = '<div class="spotlight">' + spriteTag(species, form,
      'class="big-sprite ' + (extraClass || "") + '" alt="' + escapeHtml(species) + '"', shiny) + "</div>";
    return scene.querySelector(".big-sprite");
  }

  const itemRow = (id, right, key) => '<button type="button" class="row" data-pick="' + (key || id) + '">' +
    (Bag.sprite(id) ? '<img src="' + Bag.sprite(id) + '" alt="">' : '<span class="no-sprite"></span>') +
    '<span class="row-main"><b>' + escapeHtml(Bag.name(id)) + "</b><small>" + escapeHtml(Bag.description(id)) + "</small></span>" +
    '<span class="row-right">' + right + "</span></button>";

  // ---------- Title / new game ----------

  // FireRed's main menu (CONTINUE / NEW GAME, and OPTION where FireRed has
  // MYSTERY GIFT). Returns "back" when B goes back to the title screen.
  async function title() {
    for (;;) {
      const saved = Save.read();
      if (saved.error) await message(saved.error);
      const p = saved.player;
      Screen.say("");
      clearMenu();
      show("intro");
      const v = await GbaMenus.mainMenu($("#intro"), {
        save: p && { name: p.name, timeMs: p.playTimeMs, dex: p.flags.pokedex ? Player.dexCount(p, "caught", !Player.nationalDex(p)) : null, badges: p.badges.length },
        frame: GameOptions.get().frame
      });
      if (v === "back") return "back";
      if (v === "continue") {
        player = p;
        for (const w of saved.warnings) await message(w);
        continued = true;
        return "play";
      }
      if (v === "option") {
        if ((await optionScreen(true)) !== "load") continue;
        const loaded = await loadSaveFile();
        if (loaded && (!p || await confirm("Replace the game saved in this browser with this file?"))) {
          player = loaded;
          savePromptAt = null;
          tick();
          Save.write(player);   // (the game you loaded is the one saved now)
          return "play";
        }
        continue;
      }
      // (NEW GAME + : from the game saved, what Player.newGamePlus keeps.)
      const plus = v === "newplus" && !!p;
      if (plus && !(await confirm("New Game + keeps your Bag (but not\nthe story's key items or HMs), your\nmoney, your skills and your PC boxes,\nwith your party put in them.\nStart over with New Game +?"))) continue;
      if (p && !plus && !(await confirm("Start a new game? Your saved game\nin this browser will be overwritten."))) continue;
      await newGame(plus ? p : null);
      return "play";
    }
  }

  // FireRed's Option screen (GameOptions keeps the settings). From the main
  // menu it also has SAVE FILE: LOAD, to load a downloaded save; returns "load"
  // when that's picked. In a game it has this game's SAVE NOW, DOWNLOAD SAVE,
  // LOAD SAVE FILE and DEBUG too (once on the Trainer Card): returns "save",
  // "download", "load" or "debug" (optionActions does them).
  async function optionScreen(fromTitle) {
    const o = GameOptions.get();
    const rows = [
      { name: "TEXT SPEED", key: "textSpeed", values: ["SLOW", "MID", "FAST"], value: o.textSpeed },
      { name: "BATTLE SCENE", key: "battleScene", values: ["ON", "OFF"], value: o.battleScene },
      { name: "BATTLE STYLE", key: "battleStyle", values: ["SHIFT", "SET"], value: o.battleStyle },
      { name: "SOUND", key: "sound", values: ["MONO", "STEREO", "OFF"], value: o.sound },
      { name: "VOLUME", key: "volume", values: [...Array(11).keys()].map(String), value: o.volume },
      { name: "FRAME", key: "frame", frame: true, values: [...Array(10).keys()].map((i) => "TYPE" + (i + 1)), value: o.frame },
      // (HGSS's walking Pokémon: in Johto, as in HGSS, everywhere, or not at all.)
      { name: "FOLLOWER", key: "follower", values: ["ON", "OFF"], value: o.follower | 0 },
      // (The Pokégear's phone ringing with Johto's trainers' chatter: off keeps the story's calls.)
      { name: "GEAR CALLS", key: "calls", values: ["ON", "OFF"], value: o.calls | 0 }
    ];
    if (fromTitle) rows.push({ name: "SAVE FILE", values: ["LOAD"], value: 0, action: "load" });
    else rows.push({ name: "SAVE NOW", action: "save" }, { name: "DOWNLOAD SAVE", action: "download" },
      { name: "LOAD SAVE FILE", action: "load" }, { name: "DEBUG", action: "debug" });
    rows.push({ name: "CANCEL" });
    const wasShowing = !$("#scene").classList.contains("hidden") ? "scene" : null;
    Screen.say("");
    clearMenu();
    show("intro");
    const r = await GbaMenus.optionMenu($("#intro"), rows, (i, value) => { if (rows[i].key) GameOptions.set({ [rows[i].key]: value }); });
    if (wasShowing) show(wasShowing);
    return r;
  }
  // The Start menu's OPTION: the screen, then what was picked on it; "battled" if the debug menu started a battle.
  async function optionActions() {
    const v = await optionScreen(false);
    if (v === "debug") return debugMenu();
    if (v === "save") await saveGame();
    else if (v === "download") {
      downloadSave();
      await message("Your save file is downloading.");
    } else if (v === "load") {
      const loaded = await loadSaveFile();
      if (loaded && await confirm("Load " + loaded.name + "'s game? Your current game will be replaced.")) {
        player = loaded;
        savePromptAt = null;
        tick();
        Save.write(player);   // (the game you loaded is the one saved now)
        await message("Loaded " + player.name + "'s game.");
      }
    }
    return null;
  }

  // A new game starts with FireRed's intro: the controls guide, then Prof. Oak
  // asks whether you're a boy or a girl and names you and your rival.
  // (New Game +: from `old`, what Player.newGamePlus keeps.)
  async function newGame(old) {
    show("intro");
    const r = await Intro.oakSpeech();
    player = old ? Player.newGamePlus(old, r.name, r.look) : Player.create(r.name, r.look);   // the rival is Gary (Player.RIVAL_NAME)
    await persist();
  }

  // ---------- Battles ----------

  const randomMove = (battle) => {
    const req = battle.getRequest("p2");
    const choose = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (req.phase === "switch") return { type: "switch", index: choose(req.switches) };
    if (req.active.forced) return { type: "move", move: 0 };
    if (req.active.struggle) return { type: "move", move: "Struggle" };
    return { type: "move", move: choose(req.active.moves.filter((m) => !m.disabled)).index };
  };

  // kind: "wild" or "trainer". opts: { foe: { name, team }, noBlackout, noExp, noPrize (Trainer Tower's battles) }
  // FireRed's battle background (BattleSetup_GetTerrainId): tall grass for
  // grass encounters, else by the kind of map you're on.
  // A map's own battle scene (a Gym) comes before its kind of map.
  function battleTerrain(opts) {
    if (opts.terrain) return opts.terrain;
    const here = player.location && window.WORLD_MAPS[player.location.map];
    if (here && here.battleScene) return here.battleScene;
    const type = here ? here.type : "";
    return type === "indoor" ? "building" : type === "underground" ? "cave" : "plain";
  }

  // Johto's battle music, as HGSS picks it (its trainer classes' themes,
  // unk_020517A4.s, and victories, battle_controller_player.c): Silver's,
  // Team Rocket's (grunts, Executives, Giovanni), the Gym Leaders' and the
  // Elite Four's, the Champion's, and the legendary Pokémon's own.
  const JOHTO_LEGEND_MUSIC = { Suicune: "gs_vs_suicune", Entei: "gs_vs_entei", Raikou: "gs_vs_raikou", "Ho-Oh": "gs_vs_houou",
    Lugia: "gs_vs_lugia", Groudon: "gs_vs_kodai", Kyogre: "gs_vs_kodai", Rayquaza: "gs_vs_kodai" };
  function johtoBattleMusic(wild, foe, opts) {
    if (wild) return { vs: JOHTO_LEGEND_MUSIC[foe.team[0] && foe.team[0].species] || "gs_vs_norapoke", win: "gs_win2" };
    const t = window.WORLD_TRAINERS[opts.trainerId] || {}, cls = t.className || foe.name.split(" ")[0];
    if (cls === "Rival" || t.pic === "hgss_silver") return { vs: "gs_vs_rival", win: "gs_win1" };
    if (/^(Team Rocket|Executive|Rocket Boss)/.test(cls) || /^Team Rocket|^Executive|^Rocket Boss/.test(foe.name)) return { vs: "gs_vs_rocket", win: "gs_win1" };
    if (cls === "Champion" || foe.name === "Pokémon Trainer Red") return { vs: "gs_vs_champ", win: "gs_win3" };
    if (/^(Leader|Elite Four)/.test(cls) || /^(Leader|Elite Four) /.test(foe.name)) return { vs: "gs_vs_gymreader", win: "gs_win3" };
    return { vs: "gs_vs_trainer", win: "gs_win1" };
  }
  // A Johto trainer's "eyes meet" theme, by class (HGSS's field_bgm.c, Johto's
  // column); Silver's is his own.
  const JOHTO_EYES = { Lass: "k_shoujo", Picnicker: "k_shoujo", Twins: "k_shoujo", Hiker: "k_ayashii", Fisherman: "k_ayashii",
    "Black Belt": "k_ayashii", Gentleman: "k_ayashii", Policeman: "k_shounen", "Swimmer♂": "k_ayashii", Sailor: "k_ayashii",
    Guitarist: "k_ayashii", Firebreather: "k_ayashii", Biker: "k_ayashii", Boarder: "k_ayashii", "Double Team": "k_shounen",
    Beauty: "j_shoujo", "Swimmer♀": "j_shoujo", Skier: "j_shoujo", Teacher: "j_shoujo", "Young Couple": "j_shoujo",
    Juggler: "j_ayashii", Burglar: "j_ayashii", "Poké Maniac": "j_ayashii", "Super Nerd": "j_ayashii",
    "Kimono Girl": "maiko", Sage: "bouzu", Medium: "bouzu", "Team Rocket": "rocket", Scientist: "rocket", Executive: "rocket" };
  function johtoEyes(data) {
    const cls = data.className;
    if (cls === "Rival") return "gs_e_rival1";
    // (Pokéfans and Ace Trainers: the men's, or the women's.)
    if (cls === "Pokéfan" || cls === "Ace Trainer") return data.music === "mus_encounter_girl" ? "gs_eye_j_shoujo" : "gs_eye_k_ayashii";
    return "gs_eye_" + (JOHTO_EYES[cls] || "j_shounen");
  }

  // opts.safari: a Safari Zone battle (engine/safari.js), with the Safari
  // Balls you have left (player.flags.safari). opts.bag: the Bag in the
  // battle, if not yours (the Bug-Catching Contest's Sport Balls);
  // opts.keepCaught(record): where a Pokémon caught goes, if not to you.
  // Double battles: opts.double (FireRed's trainerbattle_double: the whole
  // party, two at a time). A tag battle: opts.partner = { name, team (party
  // records), pic (their back picture) }: you choose three of yours first
  // (FireRed's party screen, ENTER / CONFIRM; or opts.chosen, party indexes),
  // and only those are changed by the battle. opts.foe2 = { name, team, pic,
  // defeatText, prizeClass }: a second opposing trainer beside the first.
  // Returns the outcome ("cancelled" when you back out of choosing).
  let lastRecord = null;   // (the last battle's record, if it was asked for: the Battle Frontier's, for the Frontier Pass)
  let battleCount = 0;   // (how many battles so far: whether a script battled)
  async function battle(kind, opts) {
    SinnohLegends.syncForms(player);
    opts = opts || {};
    if (WORLD_MAPS[player.location.map]?.unovaSandstorm && !opts.weather) opts = {...opts,weather:"sandstorm"};
    battleCount++;
    const wild = kind === "wild";
    const cheryl = Sinnoh.forestPartner(player);
    if (cheryl) {
      if (wild && !opts.foe) opts = { ...opts, foe: { name: "Wild", team: [wildMon(Encounters.wild(partyLevel()))] } };
      opts = Sinnoh.forestBattle(player, kind, opts, () => { const m = WORLD_MAPS[player.location.map], e = m && m.wild ? World.pickWild(m, Math.random) : null; return wildMon(e ? Party.create(e.species, e.level) : Encounters.wild(partyLevel())); });
    }
    const unovaPartner=Unova.sewerPartner(player);
    if(unovaPartner){if(wild&&!opts.foe)opts={...opts,foe:{name:'Wild',team:[wildMon(Encounters.wild(partyLevel()))]}};opts=Unova.escortBattle(player,kind,opts,()=>{const m=WORLD_MAPS[player.location.map],e=m.wild&&World.pickWild(m,Math.random);return wildMon(e?Party.create(e.species,e.level):Encounters.wild(partyLevel()));});}
    const foe = opts.foe || (wild ? { name: "Wild", team: [wildMon(Encounters.wild(partyLevel()))] } : Encounters.trainer(partyLevel()));
    if(wild&&foe.team.length===1)foe.team[0]=Sinnoh.roamerRecord(player,foe.team[0]);
    if(wild && foe.team.length === 1 && SinnohRoamers.eligible(player.location.map) && Sinnoh.isRoamer(player,foe.team[0].species)) opts = {...opts,roamer:true};
    const foe2 = !wild && opts.foe2 || null;
    // (Two wild Pokémon, opts.wildDouble: Black and White's wild double battle, this game's own way: game/hordes.js.)
    const wildDouble = wild && !!opts.wildDouble && foe.team.length > 1;
    const double = wildDouble || (!wild && !opts.safari && !!(opts.double || opts.partner || foe2));
    if (!wild) for (const r of foe.team.concat(foe2 ? foe2.team : [])) delete r.shiny;   // trainers' Pokémon are never shiny
    // (This game's own: one wild Pokémon in ten is a Tera Pokémon, of a random
    // Tera Type, already Terastallized when it appears; beat it for Tera Shards,
    // or catch it and it keeps its Tera Type. Not in the Safari Zone, a raid
    // or Pokémon Tower's unidentified Ghost.)
    // (A horde, opts.horde: X and Y's horde battle, the wild team all out at once.)
    const horde = wild && !!opts.horde && foe.team.length > 1;
    const wildTera = wild && !opts.noGimmicks && !horde && !wildDouble && !opts.safari && !opts.raid && !opts.ghost && Math.random() < WILD_TERA_CHANCE
      ? TYPES18[Math.floor(Math.random() * TYPES18.length)] : null;
    if (wildTera) Object.assign(foe.team[0], { teraType: wildTera, teraAce: true });
    // (Only some of your party: a tag battle's three you choose; a Tera Raid's one, opts.chosen.)
    let chosen = opts.chosen || null;
    if (opts.partner) {
      chosen = opts.chosen || await chooseBattleTeam(3);
      if (!chosen) return "cancelled";
    }
    const own = DoubleBattle.team(player.party, chosen);
    // The battle theme (wild, trainer, or Gym Leader), and the one for winning
    // (in Johto, HGSS's: johtoBattleMusic).
    const leader = !wild && /^Leader /.test(foe.name);
    const johtoMusic = inJohto() ? johtoBattleMusic(wild, foe, opts) : {};
    music(opts.music || johtoMusic.vs || (wild ? "mus_vs_wild" : leader ? "mus_vs_gym_leader" : "mus_vs_trainer"));
    // From the map: FireRed's flash-and-slice into battle.
    if (!world.classList.contains("hidden")) await Overworld.battleTransition();
    show("field");
    const here = player.location && player.location.map;
    // A Gym Leader, the Elite Four or the Champion: the whole party is pleased
    // to be in a battle that matters (FireRed's FRIENDSHIP_EVENT_LEAGUE_BATTLE).
    if (!wild && /^TRAINER_(LEADER|ELITE_FOUR|CHAMPION)/.test(opts.trainerId || "")) {
      for (const r of player.party) if (!r.egg) Party.adjustFriendship(r, "leagueBattle", here);
    }
    // (The Tera Orb: it lets a Pokémon Terastallize once a battle, and
    // recharges itself after every battle.)
    const teraOrb = !opts.noGimmicks && Player.itemCount(player, "tera-orb") > 0;
    // (A Tera Raid's Pokémon: more HP the more stars, RaidDens.HP, and already Terastallized.)
    const foeSets = (f) => f.team.map((r) => Object.assign(Party.toBattleSet(r), opts.ghost ? { name: "Ghost" } : {},
      opts.raid ? { raidHp: RaidDens.HP[opts.raid] * (opts.raidAllies && opts.raidAllies.length ? RaidDens.ALLY_HP : 1), teraStart: true } : {},
      wildTera ? { teraStart: true } : {}));
    const result = await BattleScreen.run({
      p1: Object.assign({ name: player.name, team: own.map((r) => Party.toBattleSet(r, here)), dynamax: !opts.noGimmicks && Player.itemCount(player, "dynamax-band") > 0, tera: teraOrb },
        opts.partner ? { partner: { name: opts.partner.name, team: opts.partner.team.map((r) => Party.toBattleSet(r)) } } : {}),
      // (Pokémon Tower's unidentified Ghost goes by "Ghost".)
      p2: Object.assign({ name: foe.name, team: foeSets(foe), tera: !!foe.tera || !!wildTera }, foe2 ? { partner: { name: foe2.name, team: foeSets(foe2) } } : {}),
      format: double ? "doubles" : horde ? "horde" : undefined,
      partnerTrainer: opts.partner && opts.partner.pic,
      foeTrainer2: foe2 && foe2.pic, defeatText2: foe2 && foe2.defeatText && foe2.defeatText.map((p) => fill(p)),
      ghost: !!opts.ghost, noCatch: !!opts.noCatch, snag: opts.snag || null, raid: opts.raid || 0, raidAllies: opts.raidAllies || null, raidTurns: opts.raid ? RaidDens.TURNS[opts.raid] : 0,
      // (A Tera Raid won: the Balls you could catch it in; not the Master Ball,
      // as in Scarlet and Violet, where a raid's catch never fails anyway.)
      raidBalls: opts.raid ? () => Object.keys(player.bag).filter((id) => Bag.isBall(id) && id !== "master-ball" && Player.itemCount(player, id) > 0).slice(0, 8)
        .map((id) => ({ id, name: Bag.name(id) })) : null,
      megaRing: !opts.noGimmicks && Player.itemCount(player, "mega-ring") > 0,
      zRing: !opts.noGimmicks && Player.itemCount(player, "z-ring") > 0,
      dynamaxBand: !opts.noGimmicks && Player.itemCount(player, "dynamax-band") > 0,
      teraOrb,
      safari: opts.safari ? Object.assign({ balls: player.flags.safari.balls,park:!!player.flags.safari.park, hgss: !!(player.flags.safari.hgss || player.flags.safari.sinnoh), ...(player.flags.safari.sinnoh ? { fleeRate: PLATINUM_DATA.daily.flee[foe.team[0].species] || 0 } : {}) },
        player.flags.safari.hoenn ? { hoenn: true, pokeblocks: () => hoennPokeblock.blocks().map(HoennPokeblock.name), usePokeblock: (i) => hoennPokeblock.blocks().splice(i, 1)[0] } : {}) : undefined,
      wild, roamer: !!opts.roamer, weather: opts.weather, trickRoom: !!opts.trickRoom,
      exp: !opts.safari && !opts.noExp, levelCap: Player.levelCap(player),
      arena: !!opts.arena, palace: !!opts.palace,   // (the Battle Frontier's Arena and Palace rules: engine/battle.js)
      record: !!opts.record,   // (the choices and seed kept, to play it back: a Frontier battle's)
      expShare: expShareOn(),
      trainer: Player.LOOKS[player.look].back,
      foeTrainer: foe.pic, defeatText: opts.defeatText && opts.defeatText.map((p) => fill(p)),
      victoryMusic: opts.victoryMusic || johtoMusic.win || (wild ? "mus_victory_wild" : leader ? "mus_victory_gym_leader" : "mus_victory_trainer"),
      terrain: battleTerrain(opts),
      bag: opts.noBag ? null : opts.bag || player.bag,
      // (The Bag screen: its pockets, and the bag's colours.)
      // (Another bag: only its Poké Balls pocket, and the others it has anything in.)
      bagPockets: opts.bag ? () => bagPockets(opts.bag).filter((p) => p.items.length || p.name === "Poké Balls") : bagPockets, bagFemale: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      catchContext: { night: Evolution.timeOfDay() === "night", caughtBefore: (s) => Player.hasCaught(player, s), fishing: !!opts.fishing },
      // (A Tera Raid's Pokémon, or a wild Tera Pokémon, battles as a trainer's does, and Terastallizes.)
      opponent: opts.roamer ? (b) => OpponentAI.choose(b,"p2") : horde || wildDouble ? (b) => b.randomChoice("p2") : wild && !opts.raid && !wildTera ? randomMove : (b) => OpponentAI.choose(b, "p2"),
      // A new move with four known: the Summary screen picks the one to forget
      // (the record caught up with the battle first: level, moves, PP).
      forgetMove: (i, mon, move) => chooseMoveToForget(Party.syncFromBattle(own[i], mon), move),
      // The Summary screen from the party screen in battle: each Pokémon as it
      // is now (HP, status, PP, Exp.), from copies, so nothing changes.
      // A Mega Evolved Pokémon (or one in a forme its Ability brought about,
      // Gen 7's Minior Core or Ash-Greninja) shows that form: the picture, the stats the
      // battle worked out for it, its ability and types (the record itself
      // goes back to its own form after the battle).
      summary: (i, mons) => {
        const now = own.map((r, k) => (mons[k] ? Party.syncFromBattle(JSON.parse(JSON.stringify(r)), mons[k]) : r));
        cry(now[i].species);
        const views = now.map((r, k) => battleSummaryView(r, mons[k]));
        return SummaryScreen.open(views, i, { frame: GameOptions.get().frame, cry: (sp) => cry(sp) });
      }
    });
    const b = result.battle;
    if(opts.onResult)opts.onResult({turns:b.turn,outcome:result.outcome});
    if(wild&&foe.team.length===1)Sinnoh.finishRoamer(player,b.sides.p2.pokemon[0],result.outcome);
    lastRecord = result.record || null;
    if (opts.raid) opts.raidBall = result.raidBall || null;   // (the Ball its Pokémon was caught in, if it was)
    for (const e of b.events) {
      if (opts.ghost) break;   // (an unidentified Ghost isn't seen)
      if ((e[0] === "switch" || e[0] === "drag") && String(e[1]).startsWith("p2")) {Player.markSeen(player, String(e[2]).split(", L")[0]);SinnohLeisure.seen(player,foe.team[+e[5]]);}
    }
    // (A tag battle: only the three you chose; your partner's are theirs.)
    const leveledUp = [], critical = [];
    const opened = [];
    DoubleBattle.syncBack(player.party, chosen, b.sides.p1.pokemon, (record, mon) => {
      Party.syncFromBattle(record, mon);
      // (Colosseum's heart gauge: a Shadow Pokémon's heart opens by its nature's amount once for a battle it's sent out
      // in, for each time it's called out of Hyper Mode, and for each Scent used on it; Hyper Mode lasts from one battle
      // to the next (not past fainting); the Exp. Points it earns, once they're kept for it, go to record.shadowExp.)
      if (record.shadow && record.heart != null) {
        OrreHeart.migrate(record);
        const was = record.heart | 0;
        if (mon.wasOut) OrreHeart.open(record, "battle");
        if (mon.calls) OrreHeart.open(record, "call", mon.calls);
        if (mon.scents) OrreHeart.open(record, "scent", mon.scents);
        record.hyper = !!mon.hyper && !mon.fainted;
        if (was > 0 && !(record.heart > 0)) opened.push(record);
        if (mon.storedExp) record.shadowExp = (record.shadowExp || 0) + mon.storedExp;
      }
      if (mon.leveledUp) leveledUp.push(record);
      if (mon.critsLanded) critical.push([record, mon.critsLanded]);
    });

    if (result.outcome === "won" && opts.trainerId) {
      player.flags[opts.trainerId] = true;
      // (The League's trainers' flags are cleared each time it starts over: League.reset. This keeps
      // that you've beaten them, for the raids' invitations: game/raid-dens.js.)
      if (/^TRAINER_(ELITE_FOUR|CHAMPION)_/.test(opts.trainerId)) (player.flags.leagueEverBeaten || (player.flags.leagueEverBeaten = {}))[opts.trainerId] = true;
    }
    if (result.outcome === "won" && !wild && !opts.noPrize) {
      // (Each opposing trainer's, doubled in a double battle, as FireRed's.)
      let prize = opts.prize != null ? opts.prize : DoubleBattle.prize([foe].concat(foe2 ? [foe2] : []),
        (f) => Player.prizeMoney(f.name, f.team, f === foe ? opts.prizeClass : f.prizeClass), double);
      // An Amulet Coin held by a Pokémon that battled doubles it (FireRed's moneyMultiplier).
      if (b.sides.p2.pokemon.some((m) => [...(m.expParticipants || [])].some((p) => p.item === "amulet-coin"))) prize *= 2;
      Player.addMoney(player, prize);
      await message("You got " + money(prize) + " for winning!");
      Player.addMoney(player, -gear.savePrize(prize));   // (a quarter for Mom to save, while she is: ui/pokegear.js)
    }
    // (This game's own: a wild Pokémon you knock out drops what it was holding,
    // and it goes in your Bag.)
    const dropped = wild && result.outcome === "won" && b.sides.p2.pokemon[0];
    // (A horde: each one knocked out drops its own.)
    for (const d of wild && (result.outcome === "won" || result.outcome === "caught") ? (horde || wildDouble ? b.sides.p2.pokemon : [dropped]) : []) {
      if (!d || !d.fainted || !d.item || !window.ITEMS[d.item]) continue;
      const item = d.item, name = Bag.name(item);
      Player.addItem(player, item);
      await message("The wild " + d.name + " dropped\n" + article(name) + "!");
      await message(player.name + " put the " + name + "\nin the Bag.");
    }
    // (Pickup, after any battle but a Safari Game's: Encounters.pickup. The
    // games say nothing; this one does.)
    if (!opts.safari && result.outcome !== "lost") {
      for (const [r, item] of Encounters.pickup(player.party)) await message(Party.displayName(r) + " picked up\n" + article(Bag.name(item)) + "!");
    }
    // (A wild Tera Pokémon knocked out, or caught: its Tera Type's Tera Shards.)
    if (wildTera && ((dropped && dropped.fainted) || result.outcome === "caught")) {
      const shard = wildTera.toLowerCase() + "-tera-shard", n = WILD_TERA_SHARDS;
      Player.addItem(player, shard, n);
      await message(player.name + " got " + n + " " + Bag.name(shard) + "s!");
    }
    if (opts.safari && player.flags.safari) player.flags.safari.balls = b.safari.balls;
    // (Snagged from a trainer with the Snag Machine, opts.snag: yours, unless you lost; opts.snagged says which.)
    opts.snagged = [];
    if (b.snagged && b.snagged.length && result.outcome !== "lost") {
      const balls = b.events.filter((e) => e[0] === "caught" && e[3] === "snag").map((e) => e[2]);
      // (In a tag battle the partner's Pokémon follow the trainer's, three each: engine/battle.js's side.pokemon.)
      const foeTeam = foe2 && double ? foe.team.slice(0, 3).concat(foe2.team.slice(0, 3)) : foe.team;
      for (let i = 0; i < b.snagged.length; i++) {
        const m = b.snagged[i], record = Party.caught(foeTeam[m.teamIndex], m, balls[i] || "poke-ball");
        // (A Shadow Pokémon's heart starts shut tight: Orre's heart gauge, heartStep and the Relic Stone.)
        if (record.shadow) OrreHeart.snagged(record);
        delete record.teraAce;
        opts.snagged.push(record.species);
        await addCaught(record, opts.keepCaught);
      }
    }
    if (result.outcome === "caught") {
      if (player.flags.johtoRoamers) delete player.flags.johtoRoamers[foe.team[0].species];   // (a roaming beast caught: it roams no more)
      if (player.flags.hoennRoamer === foe.team[0].species) delete player.flags.hoennRoamer;   // (and Hoenn's Latias or Latios)
      // (A horde's: the last one left, whichever of them it is.)
      const record = Party.caught(foe.team[(horde || wildDouble) && b.caught ? b.caught.teamIndex : 0] || foe.team[0], b.caught, ballUsed(b));
      delete record.teraAce;   // (a Tera Pokémon keeps its Tera Type)
      await addCaught(record, opts.keepCaught);
    }
    if (opts.safari) {
      // (No one fought: no blacking out, no evolving.)
    } else if ((result.outcome === "lost" || !canBattle()) && opts.noBlackout) {
      player.party.forEach(Party.heal);
    } else if (result.outcome === "lost" || !canBattle()) {
      await blackout(wild ? null : foe);
    } else {
      // (Colosseum's Summary words for a heart about to open.)
      for (const r of opened) await message("The door to " + Party.displayName(r) + "'s heart is\nabout to open. Undo the final lock!");
      for (const record of leveledUp) {
        const evo = Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
        if (evo) await evolve(record, evo, true);
      }
      // (Galarian Farfetch'd: three critical hits in the battle, levelled up or not.)
      for (const [record, crits] of critical) {
        const evo = Evolution.find(record, { trigger: "battle", crits, party: player.party });
        if (evo) await evolve(record, evo, true);
      }
    }
    if ((cheryl||unovaPartner) && result.outcome !== "lost") player.party.forEach(Party.heal);
    SinnohRadar.finish(player,result.outcome,!!opts.radar);
    await persist();
    SinnohLegends.syncForms(player);
    return result.outcome;
  }

  // Choosing `max` of your Pokémon for a battle (a tag battle's three):
  // FireRed's party screen for choosing several. A on a Pokémon: ENTER (or NO
  // ENTRY to take it back) / SUMMARY / CANCEL; each chosen one says FIRST,
  // SECOND, THIRD; the last one chosen takes the cursor to CONFIRM ("OK",
  // also START). B or CANCEL: "Cancel the battle?". Returns the party
  // indexes in order, or null.
  async function chooseBattleTeam(max, rules) {
    const party = player.party;
    let order = [], cursor = 0, note = null;
    for (;;) {
      Screen.say("");
      clearMenu();
      // (What went wrong shows in the screen's own message box, as FireRed's
      // DisplayPartyMenuStdMessage, until the next choice.)
      const shown = note;
      note = null;
      const r = await PartyMenu.open({ mons: partyMons(DoubleBattle.descs(party, order)), cursor, chooseMultiple: true,
        frame: GameOptions.get().frame, message: shown || "Choose POKéMON and confirm.",
        actions: (slot) => {
          const st = DoubleBattle.entryStatus(party, order, slot);
          return (st === "able" ? [{ label: "Enter", value: "enter" }] : st === "selected" ? [{ label: "No Entry", value: "noentry" }] : [])
            .concat([{ label: "Summary", value: "summary" }, { label: "Cancel", value: "cancel" }]);
        } });
      if (!r) {
        PartyMenu.close();
        if (await confirm("Cancel the battle?")) return null;
        continue;
      }
      cursor = r.cursor;
      if (r.action === "confirm") {
        const err = rules ? (order.length < max ? ["", "One", "Two", "Three", "Four"][max] + " POKéMON are needed." : null) : DoubleBattle.confirmError(party, order, max);
        if (err) { sfx("se_failure"); note = err; continue; }
        PartyMenu.close();
        return order;
      }
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
      if (r.action === "noentry") { order = DoubleBattle.noEntry(order, r.slot); continue; }
      if (r.action === "enter") {
        // (A challenge's own rules: not a kind twice, not an item twice ...)
        const rule = rules && !order.includes(r.slot) && order.length < max && rules.check(party, order, r.slot);
        if (rule) { sfx("se_failure"); if (/\n/.test(rule)) await message(rule); else note = rule; continue; }
        const res = DoubleBattle.enter(party, order, r.slot, max);
        if (res.error) { sfx("se_failure"); if (/\n/.test(res.error)) await message(res.error); else note = res.error; continue; }
        order = res.order;
        if (order.length === max) cursor = "confirm";
      }
    }
  }

  function ballUsed(b) {
    const ev = b.events.find((e) => e[0] === "caught");
    return ev ? ev[2] : "poke-ball";
  }

  async function addCaught(record, keep) {
    JohtoAlph.recordCaught(player.flags, record);   // (an Unown's letter, for the Unown Report)
    // A new kind: "…'s data was added to the Pokédex." and its page (once you have one).
    if (!Player.hasCaught(player, record.species) && player.flags.pokedex) {
      Player.markCaught(player, record.species);
      await message(Party.speciesName(record.species) + "'s data was\nadded to the Pokédex.");
      Screen.say("");
      await PokedexScreen.open(dexOptions({ register: record.species }));
    }
    if (keep) { await keep(record); return; }   // (not yours yet: the Bug-Catching Contest's)
    const where = Player.receive(player, record);
    const name = Party.displayName(record);
    if (where === "party") await message(name + " was added to your party!");
    else if (where) await message(name + " was sent to " + where.replace("box", "Box") + " on the PC.");
    else await message("There's no room left in your PC... " + name + " was released.");
  }

  // Losing (FireRed's BattleScript_LocalBattleLost, then
  // Task_RushInjuredPokemonToCenter and EventScript_AfterWhiteOutHeal): in
  // the battle's text box, "… is out of usable Pokémon!" and the money lost
  // (to a trainer: "… lost against …!" and the prize money paid); the screen
  // fades to black, and on the black screen you scurry to the last Pokémon
  // Center you used (or Red's house before you've used one). There, the
  // nurse heals your Pokémon at the counter, or Red's Mom does at home.
  // (`foe`: the trainer you lost to; null in a wild battle.)
  async function blackout(foe) {
    const lost = Player.blackoutLoss(player);
    Player.addMoney(player, -lost);
    await message(fill("{PLAYER} is out of\nusable Pokémon!"));
    if (foe) await message(fill("{PLAYER} lost against\n" + foe.name + "!"));
    if (lost) {
      await message(fill(foe ? "{PLAYER} paid " + money(lost) + " as the prize\nmoney…" : "{PLAYER} panicked and lost " + money(lost) + "…"));
      await message("… … … …");
    }
    await say("{PLAYER} blacked out!");
    // (DoWhiteOut runs EventScript_ResetEliteFourEnd: the League starts over
    // from Lorelei.)
    League.reset(player.flags);
    // (DoWhiteOut heals the party as you go.)
    player.party.forEach(Party.heal);
    // (In Hoenn: its last Pokémon Center, or, before you've used one, your bedroom: setrespawn.)
    const inHoennNow = isHoenn(player.location.map);
    // (In Sinnoh: its last Pokémon Center, or Sandgem Town's.)
    const sinnoh = (map) => (window.WORLD_MAPS[map] || {}).region === "sinnoh", inSinnohNow = sinnoh(player.location.map);
    const inUnovaNow=Unova.owns(player.location.map);
    const center = inUnovaNow ? centerOf(Unova.owns(player.flags.lastCenter)?player.flags.lastCenter:"UnovaAspertiaCity_PokemonCenter_1F") : inSinnohNow ? centerOf(sinnoh(player.flags.lastCenter) ? player.flags.lastCenter : "SandgemTown_PokemonCenter_1F")
      : player.flags.lastCenter && (!inHoennNow || isHoenn(player.flags.lastCenter)) && centerOf(player.flags.lastCenter);
    const hoennHome = inHoennNow && !center ? (player.flags.hoennRespawn || hoennBedroom()) : null;
    const to = Object.assign({}, center || hoennHome || Player.HOME);
    music(null);
    Screen.say("");
    await GbaMenus.blackScreen($("#overlay"), fill(center
      ? "{PLAYER} scurried to a Pokémon Center,\nprotecting the exhausted and fainted\nPokémon from further harm‥"
      : "{PLAYER} scurried back home, protecting\nthe exhausted and fainted Pokémon from\nfurther harm‥"));
    // Back on the map, faded in from black where you wake up.
    show("world");
    await Overworld.resume();
    await Overworld.fadeToBlack();
    $("#overlay").classList.add("hidden");
    await Overworld.teleport(to);
    if (center) await afterBlackoutNurse(to.map);
    else if (hoennHome) player.party.forEach(Party.heal);
    else await afterBlackoutMom();
  }
  // EventScript_AfterWhiteOutHeal: the nurse behind the counter heals them
  // (the machine, as when you ask her), with the advice about Potions until
  // you've beaten Brock.
  async function afterBlackoutNurse(mapName) {
    const nurseDef = ((window.WORLD_MAPS[mapName] || {}).people || []).find((p) => /_EventScript_Nurse$/.test(p.script || ""));
    const id = nurseDef && nurseDef.localId;
    await say(T("Text_FirstShouldRestoreMonsHealth"));
    Screen.say("");
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await Overworld.pokecenterHeal(player.party.length, () => fanfare("mus_heal"));
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    player.party.forEach(Party.heal);
    await say(T(player.flags.TRAINER_LEADER_BROCK ? "Text_MonsHealed" : "Text_MonsHealedShouldBuyPotions"));
  }
  // EventScript_AfterWhiteOutMomHeal: (Red's) Mom turns to you, and heals them.
  async function afterBlackoutMom() {
    const mom = (p) => [].concat(p).map((t) => t.replace(/^Mom: /, "Red's Mom: ").replace("Welcome home.", "Welcome back.").replace("Make me proud, honey!", "Make us proud!"));
    await Overworld.act([{ who: "LOCALID_MOM", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await say(mom(T("Text_HadQuiteAnExperienceTakeRest")));
    await outOfCenterHeal();
    await say(mom(T("Text_MomExplainHPGetPotions")));
  }

  // ---------- Evolution and moves ----------

  // FireRed's evolution scene (ui/evolution-scene.js). As in FireRed, holding
  // B while the two shapes trade places stops it (when it can be stopped).
  async function evolve(record, evo, canStop) {
    const name = Party.displayName(record);
    const url = (r) => Screen.spriteUrl(r.species, Party.form(r), false, r.shiny);
    show("scene");
    Screen.say("");
    clearMenu();
    const evoScene = await EvolutionScene.open(scene, { from: url(record), into: url(Object.assign({}, record, { species: evo.into })) });
    try {
      music(null);
      await evoScene.fadeIn();
      Screen.say("What? " + name + " is evolving!");
      await Screen.printed();
      cry(record.species);
      await sleep(1000);
      const intro = GA && GA.se("mus_evolution_intro");
      await sleep(intro ? intro * 1000 : 1700);
      music("mus_evolution");
      const evolved = await evoScene.run({ canStop, onStop: () => music(null), onEvolved: () => music(null) });
      if (!evolved) {
        cry(record.species);
        await message("Huh? " + name + " stopped evolving!");
        return;
      }
      const oldSpecies = record.species;
      const shed = Evolution.shedinja(record);
      const newMoves = Evolution.evolve(record, evo.into, evo);
      cry(record.species);
      await sleep(600);
      const jingle = fanfare("mus_evolved");
      await message("Congratulations! Your " + (record.nickname || Party.speciesName(oldSpecies)) + " evolved into " +
        Party.speciesName(record.species) + "!");
      await jingle;
      Player.markCaught(player, record.species);
      for (const move of newMoves) await learnMove(record, move);
      if (shed && evo.into === "Ninjask" && player.party.length < Player.PARTY_SIZE && Player.removeItem(player, "poke-ball")) {
        Player.receive(player, shed);
        await evoScene.show(url(shed));
        await message("Something appeared in the empty Poké Ball... It's Shedinja!");
      }
    } finally {
      evoScene.close();
    }
  }

  async function learnMove(record, move) {
    const name = Party.displayName(record);
    if (Party.teachMove(record, move)) {
      await message(name + " learned " + move + "!");
      return;
    }
    // FireRed's way: the Summary screen's move list to pick one to forget.
    for (;;) {
      await message(name + " is trying to learn " + move + ".");
      await message("But " + name + " can't learn more than four moves.");
      if (await confirm("Delete an older move to make room for " + move + "?")) {
        await say("Which move should be forgotten?");
        const slot = await chooseMoveToForget(record, move);
        if (slot != null) {
          const old = record.moves[slot].name;
          Party.teachMove(record, move, slot);
          await message("1, 2, and… … … Poof!");
          await message(name + " forgot " + old + ".");
          await message("And… " + name + " learned " + move + "!");
          return;
        }
      }
      if (await confirm("Stop learning " + move + "?")) { await message(name + " did not learn " + move + "."); return; }
    }
  }

  // ---------- Using and giving items ----------

  // Uses `item` from the bag on `record`, with whatever follows (evolving, new moves).
  async function useItemOn(record, item) {
    const name = Party.displayName(record);
    if (record.egg) { await message("It won't have any effect."); return; }
    if(item==="gracidea"){await message(SinnohLegends.gracidea(record,player)?Party.displayName(record)+" changed into Sky Forme!":"It won’t have any effect now.");return;}
    if (item in SCENT_HEART) { await scentOn(record, item); return; }
    if (Bag.isStone(item)) {
      const evo = Evolution.find(record, { trigger: "item", item, party: player.party });
      if (!evo) { await message("It won't have any effect."); return; }
      // (Milcery: it spins with the Sweet, this way or that, a little or a
      // lot; that and the time of day make Alcremie's cream.)
      if (evo.into === "Alcremie") {
        const way = await multichoice("Which way will " + name + " spin?", 0, 0, ["Clockwise", "Counterclockwise", "Cancel"]);
        if (way !== 0 && way !== 1) return;
        const long = await multichoice("For how long?", 0, 0, ["A little", "A lot", "Cancel"]);
        if (long !== 0 && long !== 1) return;
        record.alcremie = Party.alcremieCream(way === 0, long === 1, Player.gameTime().hour) + "-" + item;
      }
      Player.removeItem(player, item);
      await evolve(record, evo, false);
      return;
    }
    if (Bag.isMachine(item)) {
      // TMs and HMs are reusable, so nothing leaves the bag.
      const move = Bag.machineMove(item);
      if (Party.knowsMove(record, move)) { await message(name + " already knows " + move + "."); return; }
      if (!Party.canLearnMachine(record, move)) { await message(name + " can't learn " + move + "."); return; }
      await message("You booted up the " + Bag.name(item).split(" ")[0] + ".");
      await learnMove(record, move);
      // (Learning from a TM or HM pleases it a little, as in FireRed.)
      if (Party.knowsMove(record, move)) Party.adjustFriendship(record, "tm", player.location && player.location.map);
      return;
    }
    if (Bag.mintNature(item)) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item);
      await message(name + "'s nature changed from " + r.oldNature + " to " + r.nature + "!");
      return;
    }
    if (item === "ability-capsule" || item === "ability-patch") {
      // (Gen 6: it asks first.)
      const to = item === "ability-patch" ? Bag.patchAbility(record) : Bag.capsuleAbility(record);
      if (!to) { await message("It won't have any effect."); return; }
      if (!(await confirm("Do you want to change " + name + "'s Ability from " + record.ability + " to " + to + "?"))) return;
      Player.removeItem(player, item);
      Bag.useOn(record, item);
      await message(name + "'s Ability changed to " + to + "!");
      return;
    }
    if (item === "dynamax-candy" || item === "max-mushrooms") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item);
      await message(item === "dynamax-candy" ? name + "'s Dynamax Level rose to " + r.level + "!"
        : r.gmax ? name + " ate the Max Soup and gained the G-Max Factor!" : name + " ate the Max Soup and lost the G-Max Factor.");
      return;
    }
    if (item === "zygarde-cube") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      const v = await multichoice("What would you like to do?", 0, 0, ["Change Forme", "Change Ability", "Cancel"]);
      if (v === 0) {
        const r = Bag.zygardeCube(record, "forme");
        await message(name + " transformed into its " + (r.species === "Zygarde-10%" ? "10%" : "50%") + " Forme!");
      } else if (v === 1) {
        const r = Bag.zygardeCube(record, "ability");
        await message(name + "'s Ability changed to " + r.ability + "!");
      }
      return;
    }
    if (item === "bottle-cap" || item === "gold-bottle-cap") {
      // Hyper Training: a stat's IV acts as 31 (a Gold Bottle Cap: all of them).
      if (record.level < Bag.HYPER_TRAINING_LEVEL) { await message(name + " must be at least Lv. " + Bag.HYPER_TRAINING_LEVEL + " for Hyper Training."); return; }
      if (!Bag.canUseOn(record, item)) { await message(name + " can't be trained any more."); return; }
      let stat;
      if (item === "bottle-cap") {
        const can = Bag.trainableStats(record);
        const v = await multichoice("Which stat should be Hyper Trained?", 21, 0, can.map((k) => STAT_NAMES[k]).concat(["Cancel"]));
        Screen.say("");
        if (v < 0 || v >= can.length) return;
        stat = can[v];
      }
      Player.removeItem(player, item);
      const r = Bag.useOn(record, item, { stat });
      await message(item === "gold-bottle-cap" ? name + " was Hyper Trained in all its stats!"
        : name + "'s " + STAT_NAMES[r.trained[0]] + " was Hyper Trained!");
      return;
    }
    if (item === "tin-bottle-cap") {
      // (A stat's IV down to 0.)
      const can = Bag.lowerableStats(record);
      if (!can.length) { await message("It won't have any effect."); return; }
      const v = await multichoice("Which stat's IV should go down to 0?", 21, 0, can.map((k) => STAT_NAMES[k]).concat(["Cancel"]));
      Screen.say("");
      if (v < 0 || v >= can.length) return;
      Player.removeItem(player, item);
      Bag.useOn(record, item, { stat: can[v] });
      await message(name + "'s " + STAT_NAMES[can[v]] + " IV went down to 0!");
      return;
    }
    // (At the level cap, Rare Candies and Exp. Candies do nothing: Player.levelCap.)
    if ((item === "rare-candy" || (ItemUse.effect(item) || {}).expCandy) && record.level >= Player.levelCap(player)) {
      await message(name + " is at the level cap (Lv. " + Player.levelCap(player) + ").\nIt won't have any effect.");
      return;
    }
    if (item === "rare-candy") {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      if (!player.flags.debugCandy) Player.removeItem(player, item);   // the debug menu makes them infinite
      const newMoves = Bag.levelUp(record, { here: player.location && player.location.map });
      await message(name + " grew to Lv. " + record.level + "!");
      for (const move of newMoves) await learnMove(record, move);
      const evo = Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
      if (evo) await evolve(record, evo, true);
      return;
    }
    // Tera Shards: fifty of a type change its Tera Type to that type.
    const shardType = Bag.teraShardType(item);
    if (shardType) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      const need = Bag.TERA_SHARDS_NEEDED, have = Player.itemCount(player, item);
      if (have < need) { await message("It takes " + need + " " + Bag.name(item) + "s to change\na Pokémon's Tera Type. (You have " + have + ".)"); return; }
      if (!(await confirm(name + "'s Tera Type: " + Party.teraType(record) + "\nChange it to " + shardType + "? (" + need + " Shards)"))) return;
      Player.removeItem(player, item, need);
      record.teraType = shardType;
      await message(name + "'s Tera Type changed to " + shardType + "!");
      return;
    }
    if ((ItemUse.effect(item) || {}).expCandy) {
      if (!Bag.canUseOn(record, item)) { await message("It won't have any effect."); return; }
      Player.removeItem(player, item);
      const r = Bag.expCandy(record, item, { here: player.location && player.location.map, cap: Player.levelCap(player) });
      await message(name + " gained " + r.exp.toLocaleString("en-US") + " Exp. Points!");
      for (const lv of r.levels) {
        await message(name + " grew to Lv. " + lv.level + "!");
        for (const move of lv.moves) await learnMove(record, move);
      }
      const evo = r.levels.length && Evolution.find(record, { trigger: "level", party: player.party, coins: coins() });
      if (evo) await evolve(record, evo, true);
      return;
    }
    let move;
    const eff = ItemUse.effect(item);
    if (eff && eff.oneMove) {
      // FireRed's: the question in the text box (gText_BoostPp... "Boost PP of
      // which move?", "Restore which move?") and the moves in a window at the
      // right (ShowMoveSelectWindow); B goes back.
      const v = await multichoice(eff.ppUp ? "Boost PP of which move?" : "Restore which move?", 29, 5, record.moves.map((m) => m.name));
      Screen.say("");
      if (v < 0) return;
      move = v;
    }
    if (!Bag.canUseOn(record, item, { move })) { await message(eff && eff.evDown ? "It would have no effect." : "It won't have any effect."); return; }
    Player.removeItem(player, item);
    const r = Bag.useOn(record, item, { move, here: player.location && player.location.map });
    if (r.revived) await message(name + " was revived!");
    if (r.healed) await message(name + "'s HP was restored by " + plural(r.healed, "point") + ".");
    if (r.cured) await message(name + " was cured of its " + ({ psn: "poisoning", tox: "poisoning", par: "paralysis", slp: "sleep", brn: "burn", frz: "freezing" }[r.cured] || "status") + ".");
    if (r.pp) await message(name + "'s PP was restored.");
    if (r.ppUp) await message(record.moves[move].name + "'s PP increased.");
    if (r.ev) await message(name + "'s base " + STAT_NAMES[eff.ev] + "\nrose.");
    // (An EV-lowering Berry, as Gen 4 says it.)
    if (r.evStat) await message(name + " turned friendly.\nIts base " + STAT_NAMES[r.evStat] + " fell!");
  }

  async function giveItem(record, item) {
    if (record.egg) { await message("An Egg can't hold items."); return; }
    Player.removeItem(player, item);
    const old = Bag.give(record, item);
    if (old) {
      Player.addItem(player, old);
      await message("Swapped " + Party.displayName(record) + "'s " + Bag.name(old) + " for the " + Bag.name(item) + ".");
    } else {
      await message(Party.displayName(record) + " is now holding the " + Bag.name(item) + ".");
    }
  }

  // ---------- FireRed's party screen (ui/party-menu.js) ----------

  // The Egg's pictures (tools/build-eggs.js).
  const EGG_ICON = "assets/sprites/icons/egg.png", EGG_PIC = "assets/sprites/egg.png";
  const iconOf = (r) => (r.egg ? EGG_ICON : Screen.iconUrl(r.species, Party.form(r)));
  const partyMons = (notes) => player.party.map((r, i) => ({
    name: Party.displayNameOrEgg(r), egg: !!r.egg, icon: iconOf(r), level: r.level, gender: r.egg ? "" : r.gender,
    hp: r.hp, maxhp: Party.maxHp(r), status: r.status, item: !!r.item, desc: notes ? notes[i] : null
  }));
  // Opens it on the party (Screen.say("") first: no old text over it).
  function openParty(opts) {
    Screen.say("");
    clearMenu();
    return PartyMenu.open(Object.assign({ mons: partyMons(opts.notes), frame: GameOptions.get().frame }, opts));
  }

  // Choosing a Pokémon for something (an item, a trade, a tutor): FireRed's
  // party screen with `message` ("Use on which POKéMON?"). For a TM or an
  // evolution stone each box says whether it can be used (ABLE / NOT ABLE /
  // LEARNED), as in FireRed. Resolves with the record, or null (B).
  // (A move tutor passes its own notes instead of an item.)
  async function choosePartyFor(message, item, notes) {
    const note = (r) => (Bag.isMachine(item) && Party.knowsMove(r, Bag.machineMove(item)) ? "LEARNED"
      : Bag.canUseOn(r, item, { party: player.party }) ? "ABLE" : "NOT ABLE");
    if (!notes) notes = item && (Bag.isMachine(item) || Bag.isStone(item)) ? player.party.map(note) : null;
    const r = await openParty({ message, notes });
    PartyMenu.close();
    return r ? player.party[r.slot] : null;
  }

  const RODS = ["fishing-rod"];
  const KEY_ITEM_USES = ["unova-cgear", "unova-medal-box","dna-splicers","reveal-glass","white-flute", "black-flute","vs-recorder","poffin-case","seal-case","poketch","poke-radar","gracidea","eon-flute", "exp-share", "town-map", "explorer-kit", "berry-pouch", "itemfinder", "bicycle", "poke-flute", "coin-case", "powder-jar", "unown-report", "apricorn-box", "pokeblock-case"].concat(RODS);
  // Key items Select can use (registered from the Bag, as in FireRed).
  const REGISTERABLE = ["eon-flute", "bicycle", "itemfinder", "town-map", "berry-pouch", "explorer-kit"].concat(RODS);
  const STAT_NAMES = { hp: "HP", atk: "Attack", def: "Defense", spa: "Sp. Atk", spd: "Sp. Def", spe: "Speed" };
  const usableFromBag = (item) => item === "gracidea" || Bag.isStone(item) || Bag.isMachine(item) || !!Bag.mintNature(item) ||
    item === "ability-capsule" || item === "ability-patch" || item === "bottle-cap" || item === "gold-bottle-cap" || item === "tin-bottle-cap" || item === "zygarde-cube" ||
    item === "dynamax-candy" || item === "max-mushrooms" || !!Bag.teraShardType(item) ||
    item === "rare-candy" || !!ItemUse.effect(item) || KEY_ITEM_USES.includes(item) || item in REPEL_STEPS || item in LURE_STEPS || item === "escape-rope" ||
    item === "joy-scent" || item === "excite-scent" || item === "vivid-scent";
  // TMs and HMs work like key items: they can't be held, tossed or sold.
  const holdable = (item) => !Bag.isBall(item) && !Bag.isMachine(item) && !Bag.isKeyItem(item);
  const expShareOn = () => Player.itemCount(player, "exp-share") > 0 && !player.flags.expShareOff;

  // Key items used from the bag: the Exp. Share switches on and off; the Town
  // Map opens the map of Kanto; the Explorer Kit digs in a cave wall (and
  // closes the bag afterwards, back to the map: "escaped").
  async function useKeyItem(item) {
    if(item==="unova-cgear"||item==="unova-medal-box"||item==="town-map"&&Unova.owns(player.location.map)){fieldAction=async()=>{Screen.say("");show("scene");clearMenu();try{await UnovaDevice.open(scene,player,item==="unova-medal-box"?"medals":item==="town-map"?"map":"gear");}finally{tick();Save.write(player);show("world");await Overworld.resume();}};return "escaped";}
    if(item==="dna-splicers"||item==="reveal-glass"){fieldAction=async()=>{Screen.say("");show("world");await Overworld.resume();await unovaStory.run(item==="dna-splicers"?"bw:use-splicers":"bw:use-reveal-glass");};return "escaped";}
    if(item==="white-flute"||item==="black-flute"){if(SinnohCompletion.flute(player,item)){await message("The "+Bag.name(item)+" sounded.\nWild Pokémon will appear "+(item==="white-flute"?"more":"less")+" often here.");}return;}
    if(item==="vs-recorder"){fieldAction=async()=>{Screen.say("");show("world");await Overworld.resume();const rec=(Unova.owns(player.location.map)&&player.flags.unova?.subwayRecord)||player.flags.sinnoh?.frontier?.lastRecord||player.flags.hoennBattleRecord;if(rec)await playRecord(rec);else await say("No local battle has been recorded yet.");};return "escaped";}
    if(item==="poffin-case"){fieldAction=async()=>{Screen.say("");show("scene");clearMenu();try{await SinnohPoffinDevice.openCase(scene,player);}finally{show("world");await Overworld.resume();await persist();}};return "escaped";}
    if(item==="seal-case"){fieldAction=async()=>{show("scene");clearMenu();try{await SinnohCapsules.open(scene,{player});}finally{show("world");await Overworld.resume();await persist();}};return "escaped";}
    if(item==="poke-radar"){fieldAction=async()=>{show("world");await Overworld.resume();const text=SinnohRadar.use(player,Overworld.avatar());sfx("se_m_reflect");await say(text);};return "escaped";}
    if(item==="poketch"){fieldAction=async()=>{show("scene");clearMenu();try{await SinnohPoketch.open(scene,{player,sfx});}finally{show("world");await Overworld.resume();await persist();}};return "escaped";}
    if(item==="gracidea"){const mon=await choosePartyFor("Use on which {PKMN}?",item);if(mon)await useItemOn(mon,item);return;}
    if (item === "explorer-kit") return (await explorerKit()) ? "escaped" : null;
    if (item === "pokeblock-case") { await hoennPokeblock.menu(); return null; }   // (Hoenn's Pokéblocks: ui/hoenn-pokeblock.js)
    if (item === "berry-pouch") return (await berryPouch()) ? "escaped" : null;
    if (item === "itemfinder") { fieldAction = itemfinder; return "escaped"; }
    if (item === "bicycle") { fieldAction = bicycle; return "escaped"; }
    if (item === "eon-flute") {
      // (Outdoors in Hoenn, with your Latias or Latios: soaring, ui/soaring.js.)
      const here = window.WORLD_MAPS[player.location.map] || {};
      if (!isHoenn(player.location.map) || !OUTDOORS.includes(here.type)) { await message("You can't soar here."); return; }
      if (!eonLati()) { await message("You play the Eon Flute…\nbut nothing answers."); return; }
      fieldAction = soar;
      return "escaped";
    }
    if (RODS.includes(item)) {
      // (Only facing water: FireRed's FieldUseFunc_Rod.)
      if (!Overworld.ahead().fishable) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return; }
      fieldAction = () => fish();
      return "escaped";
    }
    if (item === "poke-flute") {
      // FireRed's Poké Flute outside battle: it wakes your sleeping Pokémon.
      const asleep = player.party.filter((r) => r.status === "slp");
      asleep.forEach((r) => { r.status = ""; });
      await message(asleep.length ? "Played the Poké Flute.\nAll sleeping Pokémon woke up." : "Played the Poké Flute.\nNow, that's a catchy tune!");
      return;
    }
    if (item === "exp-share") {
      player.flags.expShareOff = !player.flags.expShareOff;
      await message(expShareOn() ? "The Exp. Share was turned on. Your whole party will gain Exp. Points from battles."
        : "The Exp. Share was turned off. Only Pokémon that battle will gain Exp. Points.");
    } else if (item === "town-map") await townMap();
    else if (item === "coin-case") await message(Sinnoh.owns(player.location.map)?"Sinnoh Coins:\n"+plainCoins(SinnohServices.coins(player)):"Your Coins:\n"+plainCoins(coins()));
    // (The Unown Report: the letters caught, ui/johto-alph.js.)
    else if (item === "unown-report") await alphOverlay((c) => JohtoAlph.report(c, player.flags.unownCaught, { frame: GameOptions.get().frame, sfx,
      level: +johto.getVar("VAR_UNOWN_REPORT_LEVEL") || 0, name: player.name }));
    // (HGSS's Apricorn Box: your Apricorns, ui/apricorn-box.js.)
    else if (item === "apricorn-box") await apricornBox("view");
    // (FieldUseFunc_PowderJar: how much Berry Powder you have.)
    else if (item === "powder-jar") await message("Berry Powder:\n" + (player.flags.berryPowder | 0).toLocaleString("en-US"));
  }

  // Something to do on the map once the menus close (the Itemfinder).
  let fieldAction = null;
  let afterScript = null;   // (run once the event's script is over: sailToSinnoh)
  // The Itemfinder (FireRed's src/itemfinder.c): a hidden item within 7 steps
  // across and 5 up or down makes it respond, and you turn toward the nearest;
  // one right underfoot is dug up.
  async function itemfinder() {
    const at = Overworld.position(), m = window.WORLD_MAPS[at.map] || {};
    const hidden = (m.hidden || []).filter((h) => !player.flags[h.flag]);
    const under = hidden.find((h) => h.x === at.x && h.y === at.y);
    if (under) {
      await say(["Oh!\nThe Itemfinder's shaking wildly!", "There's an item buried underfoot!", "‥ ‥ ‥ ‥ ‥ ‥"]);
      const before=Player.itemCount(player,under.item),quantity=under.quantity||1;
      Player.addItem(player, under.item, quantity);
      if(Player.itemCount(player,under.item)!==before+quantity){if(Player.itemCount(player,under.item)>before)Player.removeItem(player,under.item,Player.itemCount(player,under.item)-before);await say("Your Bag is full.");return;}
      player.flags[under.flag] = true;
      await sayWithJingle(itemJingle(under.item), "{PLAYER} found " + (under.quantity > 1 ? under.quantity + " " : "a ") + Bag.name(under.item) + "!");
      return;
    }
    let best = null;
    for (const h of hidden) {
      const dx = h.x - at.x, dy = h.y - at.y;
      if (Math.abs(dx) <= 7 && Math.abs(dy) <= 5 && (!best || Math.abs(dx) + Math.abs(dy) < Math.abs(best.dx) + Math.abs(best.dy))) best = { dx, dy };
    }
    if (!best) { await say("‥ ‥ ‥ ‥Nope!\nThere's no response."); return; }
    const face = Math.abs(best.dx) >= Math.abs(best.dy) ? (best.dx > 0 ? "right" : "left") : (best.dy > 0 ? "down" : "up");
    await Overworld.act([{ who: "player", moves: ["face_" + face] }]);
    await say(["Huh?\nThe Itemfinder's responding!", "There's an item buried around here!"]);
  }

  // Every 200 steps, each Pokémon in the party grows a little friendlier
  // (FireRed's UpdateFriendshipStepCounter is every 128 steps, half the time).
  const FRIENDSHIP_STEPS = 200;
  function friendshipStep() {
    const f = player.flags;
    f.friendshipSteps = ((f.friendshipSteps | 0) + 1) % FRIENDSHIP_STEPS;
    if (f.friendshipSteps) return;
    for (const r of player.party) if (!r.egg) Party.adjustFriendship(r, "walking", player.location.map);
  }


  // Johto's Town Map (window.JOHTO_TOWN_MAP, at the end of data/johto-maps.js:
  // tools/build-johto-town-map.js): HGSS's Pokégear map drawn in FireRed's
  // region-map tiles, on its own grid (x0, y0: where its first square is).
  // Its maps' sections, their names and its Fly spots join Kanto's in
  // window.TOWN_MAP (Johto's sections are its own: ROUTE_29, VIOLET_CITY, ...),
  // so whatever asks TOWN_MAP where a map is (the area's name as you arrive,
  // the Trainer Memo's "met in", a Pokémon's friendship where it was met, Fly)
  // knows Johto's too.
  const JOHTO_MAP = window.JOHTO_TOWN_MAP || null;
  if (JOHTO_MAP && window.TOWN_MAP && !window.TOWN_MAP.johto) {
    const T = window.TOWN_MAP;
    T.johto = JOHTO_MAP;
    Object.assign(T.mapSections, JOHTO_MAP.mapSections);
    Object.assign(T.names, JOHTO_MAP.names);
    T.fly = Object.assign({}, T.fly, JOHTO_MAP.fly);
  }
  // Hoenn's (window.HOENN_TOWN_MAP, in data/emerald-maps.js: tools/lib/hoenn-town-map.js): Emerald's region map,
  // its maps' sections and names, and Fly's spots (outside each town's Pokémon Center), as Johto's join them.
  const HOENN_MAP = window.HOENN_TOWN_MAP || null;
  if (HOENN_MAP && window.TOWN_MAP && !window.TOWN_MAP.hoenn) {
    const T = window.TOWN_MAP;
    T.hoenn = HOENN_MAP;
    Object.assign(T.mapSections, HOENN_MAP.mapSections);
    Object.assign(T.names, HOENN_MAP.names);
    T.fly = Object.assign({}, T.fly, HOENN_MAP.fly);
  }
  // (Have you been to Hoenn: any of its sections visited.)
  const beenToHoenn = () => !!HOENN_MAP && (player.flags.visitedSections || []).some((sec) => sec in HOENN_MAP.names);
  // (And Kanto's Victory Road, once you've been inside: outside its entrance
  // on Route 23. This game's own; FireRed has no Fly to caves.)
  if (window.TOWN_MAP && window.TOWN_MAP.fly && !window.TOWN_MAP.fly.KANTO_VICTORY_ROAD)
    window.TOWN_MAP.fly.KANTO_VICTORY_ROAD = { map: "Route23", x: 5, y: 29 };
  // (Have you been to Johto: any of its sections visited.)
  const beenToJohto = () => !!JOHTO_MAP && (player.flags.visitedSections || []).some((sec) => sec in JOHTO_MAP.names);

  // The Town Map (with { fly: true }, for Fly: the places you can fly to are
  // marked, and A on one resolves with where Fly lands there; B, null): FireRed's Kanto map (tools/build-town-map.js) with your
  // icon where you are. Move the cursor with the arrow keys, or tap a place,
  // to see its name. With the Sevii Islands' pages (One Island's Pokémon
  // Center: FLAG_SYS_SEVII_MAP_123, then _4567 with the Rainbow Pass), SWITCH
  // (or R) turns to the Sevii Islands' maps, as FireRed's switch menu does:
  // Kanto, Sevii 1-2-3, 4-5 and 6-7. It opens on the map you're on. In Johto
  // it's Johto's map (JOHTO_MAP), and once you've been to Johto SWITCH turns to
  // it from Kanto's too; and Hoenn's once you've been there. Fly goes to any
  // of them, the region you're in first.
  async function townMap(opts) {
    if(opts?.fly&&!opts.otherRegions&&Unova.owns(player.location.map)){
      Unova.visit(player,player.location.map);
      const pick=await ask("Fly to which town?",Unova.flySpots(player).map(spot=>({label:spot.name,value:spot})).concat([{label:"Other regions",value:"other"},{label:"Cancel",value:null}]));
      if(pick!=="other")return pick;
    }
    if (opts && opts.fly && !opts.otherRegions && Sinnoh.owns(player.location.map)) {
      Sinnoh.visit(player, player.location.map);
      const spots = Sinnoh.flySpots(player);
      const pick = await ask("Fly to which town?", spots.map(spot => ({label: spot.name, value: spot})).concat([{label: "Other regions", value: "other"}, {label: "Cancel", value: null}]));
      if (pick !== "other") return pick;
    }
    const T = window.TOWN_MAP, flying = !!(opts && opts.fly), f = player.flags;
    const pct = (n, of) => (n / of * 100) + "%";
    const map = player.location && player.location.map, johtoHere = !!JOHTO_MAP && inJohto(map);
    // The maps you can turn to: Kanto, and the Sevii pages you have; Johto's.
    // (Kanto's grid starts 32 pixels in and down, as FireRed's: src/region_map.c.)
    const kanto = [{ id: "KANTO", label: "Kanto", image: "assets/town-map/kanto.png", map: T.map, dungeon: T.dungeon }]
      .concat((T.sevii || []).filter((r) => r.id === "SEVII_123" ? f.seviiMap123 || f.seviiMap4567 : f.seviiMap4567)
        .map((r) => Object.assign({ label: { SEVII_123: "Sevii Islands 1-2-3", SEVII_45: "Sevii Islands 4-5", SEVII_67: "Sevii Islands 6-7" }[r.id] }, r)))
      .map((r) => Object.assign({ x0: 32, y0: 32, width: T.width, height: T.height, towns: T.towns }, r));
    // (Flying too: every map you have, the region you're in first, and SELECT
    // turns through them, so you can fly between Kanto, the Sevii Islands and Johto.)
    const johto = JOHTO_MAP && (johtoHere || beenToJohto()) ? [JOHTO_MAP] : [];
    // (Hoenn's too, once you've been: first when you're there, and to fly to from anywhere, and from it back home.)
    const hoennHere = !!HOENN_MAP && isHoenn(map);
    const hoennMaps = HOENN_MAP && !hoennHere && beenToHoenn() ? [HOENN_MAP] : [];
    const regions = hoennHere ? [HOENN_MAP].concat(kanto, JOHTO_MAP && beenToJohto() ? [JOHTO_MAP] : []) : (johtoHere ? johto.concat(kanto) : kanto.concat(johto)).concat(hoennMaps);
    const sprite = (R, x, y) => "left:" + pct(R.x0 - 4 + 8 * x, 240) + ";top:" + pct(R.y0 - 4 + 8 * y, 160);
    const cellIn = (R, sec) => {
      if (!sec) return null;
      for (const layer of [R.map, R.dungeon]) for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) if (layer[y][x] === sec) return [x, y];
      return null;
    };
    const find = (sec) => { for (let i = 0; i < regions.length; i++) { const c = cellIn(regions[i], sec); if (c) return { region: i, cell: c }; } return null; };
    // (In Johto, the square you're on: HGSS's world matrix has a square every
    // 32 tiles of a map outdoors; inside, where the building or cave is.)
    const johtoAt = (name, x, y) => {
      // (Hoenn's: the square of its section, or, for a cave with none, of the place it's by.)
      if (HOENN_MAP && HOENN_MAP.at[name] && regions.indexOf(HOENN_MAP) >= 0) return { region: regions.indexOf(HOENN_MAP), cell: HOENN_MAP.at[name].slice(0, 2) };
      const at = JOHTO_MAP && JOHTO_MAP.at[name], R = JOHTO_MAP;
      if (!at || regions.indexOf(R) < 0) return null;
      const cell = at[2] ? [at[0] + Math.floor((x | 0) / 32), at[1] + Math.floor((y | 0) / 32)] : [at[0], at[1]];
      return { region: regions.indexOf(R), cell: [Math.max(0, Math.min(R.width - 1, cell[0])), Math.max(0, Math.min(R.height - 1, cell[1]))] };
    };
    // (Somewhere with no square of its own, the Underground Path or the S.S. Anne:
    // where you came in from outdoors.)
    const loc = player.location || {}, esc = f.escapeWarp || {};
    const here = johtoAt(loc.map, loc.x, loc.y) || find(T.mapSections[loc.map]) || johtoAt(esc.map, esc.x, esc.y) || find(T.mapSections[esc.map]) ||
      (hoennHere ? { region: 0, cell: cellIn(regions[0], "LITTLEROOT_TOWN") } : johtoHere ? { region: 0, cell: cellIn(regions[0], "NEW_BARK_TOWN") } : { region: 0, cell: cellIn(regions[0], "PALLET_TOWN") });
    let region = here.region, [cx, cy] = here.cell;
    visitSection(player.location && player.location.map);
    const visited = f.visitedSections || [];
    // Places not on the map yet (GetDungeonMapsecUnderCursor): Cerulean Cave until it's open.
    const hiddenSection = (sec) => sec === "CERULEAN_CAVE" && !f.canLinkWithRS;
    // Fly's places: visited, with somewhere to land.
    const flyTo = (sec) => (flying && sec && visited.includes(sec) && (T.fly || {})[sec]) || null;
    // (A square's place to fly to: its town's, or else its cave's, Victory Road.)
    const flySec = (R, x, y) => (flyTo(R.map[y][x]) || !R.dungeon || !flyTo(R.dungeon[y][x]) ? R.map[y][x] : R.dungeon[y][x]);
    show("scene");
    const render = () => {
      const R = regions[region];
      // FireRed's small icons on the caves and forests (CreateDungeonIcons): lit
      // once you've been there. Cerulean Cave's shows only once Celio has the
      // Sapphire (FLAG_SYS_CAN_LINK_WITH_RS), as its entrance opens then. On a
      // town's square the icon sits 2 pixels lower and to the right.
      let icons = "";
      for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) {
        const sec = R.dungeon[y][x];
        if (!sec || hiddenSection(sec)) continue;
        const off = R.towns.includes(R.map[y][x]) ? 2 : 0;
        icons += '<div class="tm-dungeon' + (visited.includes(sec) ? " visited" : "") + '" style="left:' + pct(R.x0 + 8 * x + off, 240) +
          ";top:" + pct(R.y0 + 8 * y + off, 160) + '"></div>';
      }
      if (flying) {
        const marked = new Set();
        for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) {
          const sec = flySec(R, x, y);
          if (!flyTo(sec) || marked.has(sec)) continue;
          marked.add(sec);
          icons += '<div class="tm-fly" style="' + sprite(R, x, y) + '"></div>';
        }
      }
      scene.innerHTML = '<div class="town-map' + (flying ? " flying" : "") + '"><img class="tm-map" src="' + R.image + '" alt="Map of ' + R.label + '">' + icons +
        '<div class="tm-name"><b></b><small></small></div>' +
        (region === here.region ? '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + sprite(R, here.cell[0], here.cell[1]) + '">' : "") +
        '<div class="tm-cursor"></div></div>';
      draw();
    };
    const draw = () => {
      const R = regions[region], place = hiddenSection(R.map[cy][cx]) ? null : R.map[cy][cx], cave = hiddenSection(R.dungeon[cy][cx]) ? null : R.dungeon[cy][cx];
      scene.querySelector(".tm-name b").textContent = T.names[place] || T.names[cave] || (flying ? "Where do you want to fly?" : "");
      scene.querySelector(".tm-name small").textContent = place && cave ? T.names[cave] : "";
      scene.querySelector(".tm-cursor").setAttribute("style", sprite(R, cx, cy));
    };
    render();
    const move = (dx, dy) => { const R = regions[region]; cx = Math.max(0, Math.min(R.width - 1, cx + dx)); cy = Math.max(0, Math.min(R.height - 1, cy + dy)); draw(); };
    // SWITCH: the next map, the cursor on the place you're at there (or the
    // map's first town).
    const switchMap = () => {
      if (regions.length < 2) return;
      sfx("se_select");
      region = (region + 1) % regions.length;
      const R = regions[region];
      const at = region === here.region ? here.cell : (() => {
        for (let y = 0; y < R.height; y++) for (let x = 0; x < R.width; x++) if (R.towns.includes(R.map[y][x])) return [x, y];
        return [Math.min(cx, R.width - 1), Math.min(cy, R.height - 1)];
      })();
      [cx, cy] = at;
      render();
    };
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (flying && ["z", "Z", " ", "Enter"].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        const spot = flyTo(flySec(regions[region], cx, cy));
        if (spot) { sfx("se_select"); picked(spot); }
        return;
      }
      // (Flying: no buttons under the map, as in FireRed: B goes back, SELECT
      // or R changes region.)
      if (flying && ["x", "X", "Escape"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); picked(null); return; }
      if (e.key === "r" || e.key === "R" || (flying && (e.key === "Select" || e.key === "Backspace"))) {
        e.preventDefault(); e.stopPropagation();
        if (regions.length > 1) switchMap();
        return;
      }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      move(d[0], d[1]);
    };
    document.addEventListener("keydown", onKey, true);
    // (no text over the map)
    const buttons = (regions.length > 1 ? [{ label: "Switch", value: "switch", className: "action" }] : []).concat([back("Close")]);
    let r;
    if (flying) r = await choose;
    else for (;;) {
      r = await Promise.race([ask("", buttons).then((v) => (v === "switch" ? "switch" : null)), choose]);
      if (r !== "switch") break;
      switchMap();
    }
    clearMenu();
    document.removeEventListener("keydown", onKey, true);
    if (flying) show("world");
    return r;
  }

  // Diamond and Pearl's Underground digging (game/mining.js, ui/mining.js), in
  // any cave. Whatever is fully dug out goes in the bag. Digging earns mining
  // XP (flags.miningXp): your mining level decides your energy and what can be
  // buried.
  const miningXp = () => {
    const f = player.flags;
    // Saves from when the level counted treasures (each worth 20 XP now: the same level).
    if (f.miningXp == null && f.miningDug) f.miningXp = f.miningDug * 20;
    delete f.miningDug;
    return f.miningXp | 0;
  };
  // Fishing XP (flags.fishingXp, game/fishing.js): every Pokémon hooked earns
  // some, and your fishing level decides what bites.
  const fishingXp = () => player.flags.fishingXp | 0;
  async function explorerKit() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    if(SinnohUnderground.owns(player.location.map)){fieldAction=async()=>{show("world");await Overworld.resume();await sinnohStory.run("pt:ug-menu");await persist();};return true;}
    if(Sinnoh.owns(player.location.map)&&here&&["city","town","route"].includes(here.type)){fieldAction=async()=>{show("world");await Overworld.resume();const to=SinnohUnderground.enter(player);if(to){Overworld.setAvatar("walk");await Overworld.teleport(to);}else await say("You can’t use the Explorer Kit here.");await persist();};return true;}
    if (!here || here.type !== "underground") { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    show("scene");
    clearMenu();
    const f = player.flags, xp = miningXp(), before = Mining.level(xp);
    const dig = Mining.create(Math.random, before, player.location.map);
    const found = await MiningScreen.run(scene, dig, xp);
    f.miningXp = xp + dig.xp;
    // (In the dig's text box, under the screen.)
    for (const id of found) {
      Player.addItem(player, id);
      await MiningScreen.message(player.name + " obtained " + article(Bag.name(id)) + "!");
    }
    if (!found.length) await MiningScreen.message("Nothing was dug up…");
    await MiningScreen.message("Gained " + dig.xp + " mining XP.");
    const after = Mining.level(f.miningXp);
    if (after > before) await MiningScreen.message("Your mining level rose to " + after + "! You have more energy, and rarer treasures may turn up now.");
    // (A new tool: the Hammer at 5, the Bomb at 10, the Survey Kit at 20.)
    for (const t of Mining.TOOLS) if (t.level > before && t.level <= after) await MiningScreen.message("You can use the " + t.name + " now! SELECT changes tools.");
    MiningScreen.clear();
    await persist();
    return true;
  }

  // Picking berries with the Berry Pouch (game/berry-picking.js,
  // ui/berry-picking.js), in a forest: shake a tree and catch what falls.
  // Playing earns farming XP (flags.farmingXp): your farming level adds
  // berries and decides which kinds you can pick.
  const FORESTS = ["ViridianForest", "ThreeIsland_BerryForest", "SixIsland_PatternBush", "PetalburgWoods"];
  const farmingXp = () => player.flags.farmingXp | 0;
  async function berryPouch() {
    if (!FORESTS.includes(player.location && player.location.map)) {
      await message("There are no berry trees to pick from here. Try using the Berry Pouch in a forest!");
      return false;
    }
    await pickingGame();
    return true;
  }
  // The picking game itself, and what it brings home: the forest's berries by your farming level (the Berry Pouch),
  // or, at a tree of Hoenn's with berries on it (`tree`: its berry, and how many it bore), that tree's berries, as many
  // as you caught and never fewer than it bore, and a gold berry's catch from the best tier you can pick.
  async function pickingGame(tree) {
    show("scene");
    clearMenu();
    const f = player.flags, xp = farmingXp(), before = BerryPicking.level(xp);
    const game = await BerryPickingScreen.run(scene, BerryPicking.create(Math.random, before), xp, player.look || "custom");
    const r = BerryPicking.result(game);
    const berries = tree ? Array(Math.max(tree.n, r.berries + Math.floor(r.berries * Math.min(before, 100) / 100))).fill(tree.berry)
      .concat(Array.from({ length: r.gold }, () => BerryPicking.pickBerry(before, Math.random, true))) : BerryPicking.rewards(r, before);
    f.farmingXp = xp + r.xp;
    const berriesOf = (n, what) => n + " " + what + (n === 1 ? "y" : "ies");
    await BerryPickingScreen.message("Score " + r.score + ": " + berriesOf(r.ripe, "ripe berr") +
      (r.gold ? " and " + berriesOf(r.gold, "gold berr") : "") + " caught" +
      (r.bestCombo > 1 ? ", best combo ×" + r.bestCombo : "") + ".");
    const counts = {};
    for (const id of berries) counts[id] = (counts[id] || 0) + 1;
    for (const [id, n] of Object.entries(counts)) {
      Player.addItem(player, id, n);
      await BerryPickingScreen.message(player.name + " put " + (n > 1 ? n + " " + Bag.name(id).replace(/y$/, "ies") : article(Bag.name(id))) + " in the Berry Pouch!");
    }
    await BerryPickingScreen.message("Gained " + r.xp + " farming XP.");
    const after = BerryPicking.level(f.farmingXp);
    if (after > before) await BerryPickingScreen.message(farmingLevelRose(before, after));
    BerryPickingScreen.clear();
    show("world");
    await Overworld.resume();
    await persist();
  }
  function farmingLevelRose(before, after) {
    const tier = BerryPicking.TIERS.find((t) => t.from > before && t.from <= after);
    return "Your farming level rose to " + after + "!" + (tier ? " " + tier.name + " berries can be picked now." : " More berries will come home now.");
  }
  // Celadon's Berry Farm (ui/berry-farm.js): Emerald's berry trees, grown on
  // the step clock, faster the higher your farming level; planting and
  // picking earn farming XP.
  const berryEnv = {
    choose: (title,list)=>ask(title,list.map(label=>({label,value:label})).concat([{label:"Cancel",value:null}])),
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q), jingle: (song, pages) => sayWithJingle(song, pages),
    farmingLevel: () => BerryPicking.level(farmingXp()),
    addFarmingXp: async (n) => {
      const before = BerryPicking.level(farmingXp());
      player.flags.farmingXp = farmingXp() + n;
      const after = BerryPicking.level(player.flags.farmingXp);
      if (after > before) await say(farmingLevelRose(before, after));
    },
    chooseBerry: async (label) => {
      Screen.say("");
      clearMenu();
      const r = await BagScreen.open({
        pockets: () => bagPockets().filter((p) => p.name === "Berries"), fresh: true, select: player.flags.lastPlanted,
        female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl), frame: GameOptions.get().frame,
        actions: () => [{ label: label || "Plant", value: "plant" }]
      });
      BagScreen.close();
      if (r) player.flags.lastPlanted = r.id;   // (the Bag opens on it next time)
      return r ? r.id : null;
    },
    refresh: () => Overworld.refreshPeople(), here: () => player.location && player.location.map
  };
  const berryFarm = BerryFarm.create(berryEnv);
  // Hoenn's trees, along its routes (Emerald's own: the ones its new game starts with are grown): the same engine, another place to keep them.
  // (Picked as the Berry Farm's are, straight into the Bag, for farming XP: no Berry Pouch game.)
  const hoennBerries = BerryFarm.create(berryEnv,
    { key: "hoennBerries", owns: (map) => isHoenn(map), spotRe: /^HoennBerry_Tree_(\d+)$/, initial: () => window.HOENN_SCRIPTS.berryTrees });
  // Sinnoh's (the Essentials project's: tools/build-sinnoh.js), the same again.
  const isSinnoh = (map) => ((window.WORLD_MAPS[map] || {}).region === "sinnoh");
  const sinnohBerries = BerryFarm.create(berryEnv,
    { key: "sinnohBerries", platinum:true, owns: isSinnoh, spotRe: /^SinnohBerry_Tree_(\d+)$/, initial: () => window.SINNOH_BERRY_TREES || {} });
  // Hoenn's decorations (ui/hoenn-decor.js): the ones you own, and those out in your Secret Base and your room.
  const hoennDecor = HoennDecor.create({
    player: () => player, say: (p) => say(p), confirm: (q) => confirm(q), sfx,
    choose: async (q, texts) => { const i = await multichoice(q, 0, 0, texts); Screen.say(""); return i; },
    canvas: () => overlayCanvas(), baseMap: () => (player.flags.secretBase || {}).map || null,
    // (Someone else's base, while you're in it: its decorations, not yours.)
    visitMap: () => { const v = hoennVisiting(); return v && player.location.map === v.room ? v.room : null; }, visitPlaced: () => (hoennVisiting() || {}).placed || [],
    refresh: () => { hoennDecorApply(player.location.map); Overworld.refreshPeople(); }, persist: () => persist(),
    money: () => player.money, addMoney: (n) => Player.addMoney(player, n)
  });
  // ---------- Your Secret Base (src/secret_base.c; the Decoration menu: ui/hoenn-decor.js) ----------
  //
  // A spot in a rock wall, a tree or a bush, found with Secret Power: once it's yours (player.flags.secretBase: { map:
  // the base room it opens on, spot: { map, x, y, id } }) it stands open and A on it takes you in; the base's PC
  // decorates it and packs it up. Other people's bases: hoennNpcBases below.
  const secretBase = () => player.flags.secretBase || null;
  const hoennOwnSpot = (sign) => { const b = secretBase(); return !!b && b.spot.id === sign.spot && b.spot.map === player.location.map; };
  const BASE_ROOM = (id) => "SecretBase_" + id.replace(/^SECRET_BASE_/, "").replace(/_\d+$/, "").split("_").map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join("");
  // The spot you're facing.
  function spotAhead() {
    const L = player.location, m = window.WORLD_MAPS[L.map], at = Overworld.position(), d = World.DIRS[Overworld.ahead().facing] || [0, 0];
    return m && (m.signs || []).find((s) => s.spot && s.x === at.x + d[0] && s.y === at.y + d[1]) || null;
  }
  // Your spot opened, when you're on its map; the other people's too.
  function hoennSpotOpen(map) {
    const signs = window.WORLD_MAPS[map].signs || [], open = (id) => { const s = signs.find((q) => q.spot === id); if (s && s.open) hoennMetatileId(map, s.x, s.y, s.open, true); };
    const b = secretBase();
    if (b && b.spot.map === map) open(b.spot.id);
    for (const n of hoennNpcBases()) if (n.map === map) open(n.id);
  }
  // In to a base (room, from its spot), or back out to the spot.
  async function baseGo(room, spot, into) {
    Screen.say("");
    await Overworld.fadeToBlack();
    if (into) {
      const w = (window.WORLD_MAPS[room].warps || [])[0] || { x: 5, y: 7 };
      setDynamicWarp({ map: spot.map, x: spot.x, y: spot.y + 1 });
      await Overworld.teleport({ map: room, x: w.x, y: w.y, facing: "up" });
    } else await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y + 1, facing: "down" });
    await Overworld.fadeFromBlack();
  }
  async function secretBaseGo(into) { const b = secretBase(); if (b) await baseGo(b.map, b.spot, into); }

  // ---------- Other people's Secret Bases (this game's own: Emerald only has them through record mixing) ----------
  // A dozen of Hoenn's spots are taken. Each base has an owner of one of Emerald's ten kinds (sSecretBaseOwnerGfxIds and
  // sSecretBaseFacilityClasses: five boys, five girls), named after one of the Frontier's trainers, with decorations set out
  // as the rules allow (ui/hoenn-decor.js furnish) and a party of the Frontier's Pokémon at the level you were when you
  // first came to Hoenn's spots, raised to your level each time you battle them (npcBaseBattle). The owner talks and battles as Emerald's record-mixed owners do
  // (SecretBase_EventScript_RecordMixTrainer: once a day, after the Hall of Fame), and the base's PC registers the base.
  // Made once from your trainer ID, and kept: player.flags.hoennNpcBases.
  const NPC_BASE_LOOKS = ["OBJ_EVENT_GFX_YOUNGSTER", "OBJ_EVENT_GFX_BUG_CATCHER", "OBJ_EVENT_GFX_RICH_BOY", "OBJ_EVENT_GFX_CAMPER", "OBJ_EVENT_GFX_MAN_3",
    "OBJ_EVENT_GFX_LASS", "OBJ_EVENT_GFX_GIRL_3", "OBJ_EVENT_GFX_WOMAN_2", "OBJ_EVENT_GFX_PICNICKER", "OBJ_EVENT_GFX_WOMAN_5"];
  const NPC_BASE_CLASSES = ["youngster", "bug_catcher", "rich_boy", "camper", "cooltrainer_m", "lass", "school_kid_f", "lady", "picnicker", "cooltrainer_f"];
  const NPC_BASE_SKIP = ["Route116"], NPC_BASES_ON = false;
  const NPC_BASE_COUNT = 12, GIRL_CLASS = /_f$|^(aroma_lady|beauty|lass|hex_maniac|parasol_lady|battle_girl|picnicker|lady)$/;
  function seededRandom(seed) {
    let a = seed | 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function hoennNpcBases() {
    const f = player.flags;
    // (Off for now: no one's bases but the one you make. A save that had them loses them.)
    if (!NPC_BASES_ON) { delete f.hoennNpcBases; return []; }
    // (None on Route 116, by Rustboro: a save that has one there loses it.)
    if (f.hoennNpcBases) return (f.hoennNpcBases = f.hoennNpcBases.filter((b) => !NPC_BASE_SKIP.includes(b.map)));
    const rng = seededRandom((player.trainerId || 0) + 0x5B), F = window.HOENN_FRONTIER || {};
    const trainers = (F.trainers || []).filter(Boolean), mons = (F.mons || []).filter(Boolean), spots = [];
    for (const [map, m] of Object.entries(window.WORLD_MAPS)) if (m.region === "hoenn" && !NPC_BASE_SKIP.includes(map)) for (const s of m.signs || []) if (s.spot) spots.push({ map, x: s.x, y: s.y, id: s.spot });
    const level = Math.max(10, Math.min(100, Math.round(partyLevel()))), bases = [];
    while (bases.length < NPC_BASE_COUNT && spots.length && trainers.length && mons.length) {
      const spot = spots.splice(Math.floor(rng() * spots.length), 1)[0];
      if (secretBase() && secretBase().spot.id === spot.id) continue;
      const t = trainers[Math.floor(rng() * trainers.length)], type = Math.floor(rng() * 5) + (GIRL_CLASS.test(t.cls) ? 5 : 0), party = [];
      const n = 2 + Math.floor(rng() * 3);
      for (let tries = 0; party.length < n && tries < 60; tries++) {
        const fm = mons[Math.floor(rng() * mons.length)];
        if (!fm || !window.DEX[fm.species] || party.some((p) => p.species === fm.species)) continue;
        party.push({ species: fm.species, level, moves: fm.moves.slice(0, 4), item: (fm.item && F.heldItems[fm.item]) || "" });
      }
      const room = BASE_ROOM(spot.id);
      bases.push({ id: spot.id, map: spot.map, x: spot.x, y: spot.y, room, name: t.name, type, party, placed: hoennDecor.furnish(room, rng, 3 + Math.floor(rng() * 6)), registered: false, battledDay: null });
    }
    f.hoennNpcBases = bases;
    return bases;
  }
  const hoennNpcBaseAt = (map, spotId) => hoennNpcBases().find((b) => b.map === map && b.id === spotId) || null;
  // The base you came in to (player.flags.hoennVisit: its spot's id), until you go in to your own.
  const hoennVisiting = () => { const v = player.flags.hoennVisit; return v ? hoennNpcBases().find((b) => b.id === v) || null : null; };
  const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  const npcBaseClass = (type) => NPC_BASE_CLASSES[type].replace(/_[mf]$/, "").split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  // The owner's battle (DoSpecialTrainerBattle, SPECIAL_BATTLE_SECRET_BASE): their party, their class's picture, Emerald's words
  // for the loss; no money, and no blacking out, as CB2_EndTrainerBattle has it. VAR_RESULT: 1 won, 2 lost, 3 drew.
  async function npcBaseBattle(api) {
    const v = hoennVisiting(), F = window.HOENN_FRONTIER || {}, T = window.HOENN_SCRIPTS.t, cls = NPC_BASE_CLASSES[v.type];
    // Their party keeps pace with yours: each is raised to your party's level when you meet it (never lowered).
    const lvl = Math.max(10, Math.min(100, Math.round(partyLevel())));
    for (const p of v.party) p.level = Math.max(p.level, lvl);
    const team = v.party.map((p) => { const r = Party.create(p.species, p.level, { moves: p.moves.filter((m) => window.MOVES[m]) }); r.item = p.item || ""; return r; });
    const pic = ((F.trainers || []).find((t) => t && t.cls === cls) || {}).pic || null;
    const outcome = await battle("trainer", { foe: { name: npcBaseClass(v.type) + " " + v.name, team, pic }, defeatText: T["SecretBase_Text_Trainer" + v.type + "Defeated"] || ["…"], noBlackout: true, noPrize: true });
    api.set(outcome === "won" ? 1 : outcome === "lost" ? 2 : 3);
    show("world");
    await Overworld.resume();
  }
  // Packing up: everything back in your inventory, the spot closed.
  function secretBaseClear() {
    const b = secretBase();
    if (!b) return;
    const D = hoennDecor.state();
    for (const p of D.base.splice(0)) D.have[p.id] = (D.have[p.id] || 0) + 1;
    const m = window.WORLD_MAPS[b.spot.map], s = (m.signs || []).find((q) => q.spot === b.spot.id);
    if (s && s.closed) hoennMetatileId(b.spot.map, s.x, s.y, s.closed, true);
    delete player.flags.secretBase;
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { decor: hoennDecor });
  // The ones out on a map keep you out of their tiles.
  function hoennDecorApply(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || m.region !== "hoenn" || !m.decorKind) return;
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice());
    m.collision = base.slice();
    for (const [x, y] of hoennDecor.overlay(map).solid) if (x >= 0 && y >= 0 && x < m.width && y < m.height) m.collision[y * m.width + x] = 1;
  }

  // ---------- Summary ----------
  //
  // FireRed's Summary screen (ui/summary-screen.js): POKéMON INFO, POKéMON
  // SKILLS and KNOWN MOVES for each of `records` (up / down go through them).

  // Where a Pokémon was met, for the Trainer Memo: the Town Map's name for
  // the place (Route 1, Viridian Forest, ..., and Johto's: Route 29, ...).
  const placeName = (map) => {
    const T = window.TOWN_MAP, sec = T && T.mapSections[map];
    return (sec && T.names[sec]) || null;
  };
  function summaryView(r) {
    if (r.egg) {
      // An Egg (FireRed's summary of one): "EGG", the Egg Watch, where it came from.
      return { egg: true, name: "Egg", species: "Egg", level: 0, gender: "", types: [], memo: Breeding.eggOrigin(r),
        eggWatch: Breeding.eggWatch(r), hp: 1, maxhp: 1, status: "", shiny: false, moves: [], stats: {},
        pic: EGG_PIC, picEmpty: 0, icon: EGG_ICON, ball: "assets/sprites/items/ball/poke.png" };
    }
    const dex = DEX[r.species], stats = Party.stats(r), E = Experience, rate = E.growthRate(r.species);
    const here = E.expForLevel(rate, r.level), next = r.level >= 100 ? here : E.expForLevel(rate, r.level + 1);
    const ot = r.ot || { name: player.name, id: player.trainerId };
    const met = r.met || null, place = met && placeName(met.map);
    // (Colosseum's: a Shadow Pokémon's nature isn't known till under three bars of its heart are left.)
    const natureShown = OrreHeart.natureShown(r);
    const memo = (natureShown ? r.nature : "?????") + " nature." + (met && met.traded ? "\nMet in a trade." :
      met ? "\nMet in " + (place || "a faraway place") + " at {LV}" + met.level + "." : "");
    const ability = (window.ABILITIES[r.ability] || {}).name || r.ability;
    return {
      name: Party.displayName(r), species: Party.speciesName(r.species), dexNo: (DEX[Party.speciesName(r.species)] || dex).id,
      level: r.level, gender: r.gender, types: Party.types(r), ot: ot.name, otId: ot.id & 0xffff,
      item: r.item ? Bag.name(r.item) : "", memo, hp: r.hp, maxhp: stats.hp,
      evs: Object.assign({}, r.evs), ivs: Object.assign({}, Party.trainedIvs(r)), nature: natureShown ? r.nature : null, happiness: r.happiness,
      stats: { atk: stats.atk, def: stats.def, spa: stats.spa, spd: stats.spd, spe: stats.spe },
      exp: r.exp, toNext: Math.max(0, next - r.exp), expFrac: next > here ? (r.exp - here) / (next - here) : 0,
      // (A Shadow Pokémon's heart gauge, Colosseum's, in place of its EXP: the bars of its heart left, of five, and
      // the Summary's words for it.)
      shadow: !!r.shadow && r.heart != null, heart: r.shadow && r.heart != null ? OrreHeart.bars(r) : 0,
      heartDoor: r.shadow && r.heart != null ? OrreHeart.door(r) : "",
      ability, abilityText: (window.SUMMARY_SCREEN.abilityText || {})[ability] || "",
      // (A Shadow Pokémon's own moves still sealed by its heart show as Colosseum shows them: "????".)
      moves: (() => {
        let own = 0;
        const back = r.shadow && r.heart != null ? OrreHeart.moves(r) : 4;
        return r.moves.map((m) => (m.name !== "Shadow Rush" && ++own > back ? { name: "????", pp: 0, maxpp: 0, sealed: true }
          : { name: m.name, pp: m.pp, maxpp: Party.maxPp(m) }));
      })(),
      status: r.status, shiny: !!r.shiny, teraType: Party.teraType(r),
      pic: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny),
      picEmpty: ((window.SPRITE_METRICS || {}).front || {})[dex.id] || 0,
      icon: Screen.iconUrl(r.species, Party.form(r)),
      ball: "assets/sprites/items/ball/" + (r.ball || "poke-ball").replace(/-ball$/, "") + ".png"
    };
  }
  // summaryView() of a record as it is in battle (`mon`: the battle's
  // Pokémon): its HP and status now, and, Mega Evolved, its Mega form.
  function battleSummaryView(r, mon) {
    const v = summaryView(r);
    if (!mon) return v;
    v.hp = mon.fainted ? 0 : mon.hp;
    v.status = mon.fainted ? "" : mon.status;
    if ((mon.mega || mon.formeChanged) && DEX[mon.species]) {
      const ability = (window.ABILITIES[mon.ability] || {}).name || mon.ability;
      Object.assign(v, {
        maxhp: mon.maxhp, types: DEX[mon.species].types.slice(),
        stats: { atk: mon.stats.atk, def: mon.stats.def, spa: mon.stats.spa, spd: mon.stats.spd, spe: mon.stats.spe },
        ability, abilityText: (window.SUMMARY_SCREEN.abilityText || {})[ability] || "",
        pic: Screen.spriteUrl(mon.species, undefined, false, r.shiny),
        picEmpty: ((window.SPRITE_METRICS || {}).front || {})[DEX[mon.species].id] || 0
      });
    }
    return v;
  }
  // Swapping two moves on KNOWN MOVES' details changes their order in battle.
  function summaryContext(records) {
    return {
      frame: GameOptions.get().frame,
      cry: (species) => cry(species),
      swapMoves: (i, a, b) => {
        const r = records[i];
        [r.moves[a], r.moves[b]] = [r.moves[b], r.moves[a]];
        persist();
        return summaryView(r);
      }
    };
  }
  async function summary(index, records) {
    records = records || player.party;
    Screen.say("");
    clearMenu();
    if (!records[index].egg) cry(records[index].species);
    return SummaryScreen.open(records.map(summaryView), index, summaryContext(records));
  }

  // ---------- Bag ----------

  // FireRed's Bag screen (ui/bag-screen.js), with this game's nine pockets.
  // USE and GIVE close it for the party screen or the text box and open it
  // again after; TOSS happens on the bag screen itself.
  let bagPocket = "Medicine";
  BagScreen.setRegistered(() => player && player.flags.registered);
  // (Berries can be sorted by their tiers, BerryPicking.TIERS, as the berry
  // tree gives them: the Bag's "Sort" on a berry, flags.berrySort "tier".)
  const BERRY_TIER_ORDER = () => BerryPicking.TIERS.flatMap((t) => t.berries);
  const berryTier = (id) => BerryPicking.TIERS.find((t) => t.berries.includes(id));
  // (`bag`: another than yours, as the Bug-Catching Contest's.)
  function bagPockets(bag) {
    bag = bag || player.bag;
    const tiers = player.flags.berrySort === "tier" ? BERRY_TIER_ORDER() : null;
    const order = (id) => (Bag.isMachine(id) ? Bag.machines().indexOf(id)
      : tiers && /-berry$/.test(id) ? (tiers.includes(id) ? tiers.indexOf(id) : tiers.length) : 0);
    // (A pocket you've rearranged (SELECT in the Bag: bagReorder) keeps its
    // order, new items after; sorting the Berries forgets theirs.)
    const kept = (bag === player.bag && player.flags.bagOrder) || {};
    const at = (p, id) => (kept[p] ? (kept[p].indexOf(id) + 1 || kept[p].length + 1) : 0);
    return Bag.POCKETS.map((p) => ({
      name: p,
      items: Object.keys(bag).filter((id) => Bag.pocket(id) === p)
        .sort((a, b) => at(p, a) - at(p, b) || order(a) - order(b) || Bag.name(a).localeCompare(Bag.name(b)))
        .map((id) => ({
          id, name: Bag.name(id), icon: Bag.sprite(id),
          qty: Bag.isMachine(id) || Bag.isKeyItem(id) ? null : bag[id],
          desc: Bag.description(id) + (id === "exp-share" ? (expShareOn() ? "\nIt's on." : "\nIt's off.") : "")
        }))
    }));
  }
  function bagReorder(pocketName, ids) {
    player.flags.bagOrder = Object.assign({}, player.flags.bagOrder, { [pocketName]: ids });
  }
  async function bagScreen() {
    if(WORLD_MAPS[player.location.map]?.unovaTower){await say("Items cannot be used during this challenge.");return;}
    for (;;) {
      Screen.say("");
      clearMenu();
      const r = await BagScreen.open({
        pockets: bagPockets, pocketName: bagPocket, reorder: bagReorder,
        // (START in the Berries pocket: by their tiers or by name, as A's "Sort" does: flags.berrySort.)
        sortBerries: (mode) => { player.flags.berrySort = mode; if (player.flags.bagOrder) delete player.flags.bagOrder.Berries; },
        female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
        frame: GameOptions.get().frame,
        actions: (it) => {
          const a = [];
          if (usableFromBag(it.id)) a.push({ label: "Use", value: "use" });
          if (holdable(it.id)) a.push({ label: "Give", value: "give" });
          if (!Bag.isMachine(it.id) && !Bag.isKeyItem(it.id)) a.push({ label: "Toss", value: "toss" });
          if (REGISTERABLE.includes(it.id)) a.push({ label: player.flags.registered === it.id ? "Deselect" : "Register", value: "register" });
          if (/-berry$/.test(it.id)) a.push({ label: "Sort", value: "sort" });
          return a;
        },
        toss: (id, n) => { Player.removeItem(player, id, n); persist(); }
      });
      if (!r) { BagScreen.close(); return; }
      bagPocket = r.pocket;
      const id = r.id, what = r.action;
      BagScreen.close();
      if (what === "register") {
        const on = player.flags.registered !== id;
        player.flags.registered = on ? id : undefined;
        await message(on ? "The " + Bag.name(id) + " was registered to Select." : "The " + Bag.name(id) + " is no longer registered.");
      }
      else if (what === "sort") {
        // Berries: by their tiers (Basic, Restoring, Contest, ...), or back to A to Z.
        const byTier = player.flags.berrySort !== "tier";
        player.flags.berrySort = byTier ? "tier" : "name";
        if (player.flags.bagOrder) delete player.flags.bagOrder.Berries;
        await message("The berries are now sorted.");
      }
      else if (what === "use" && Bag.isKeyItem(id)) { if ((await useKeyItem(id)) === "escaped") return "escaped"; }
      else if (what === "use" && (id in REPEL_STEPS || id in LURE_STEPS)) await useRepel(id);
      else if (what === "use" && id === "escape-rope") { if (await useEscapeRope()) return "escaped"; }
      // (A Water Stone in front of the Ruins of Alph's wall that says WATER opens it.)
      else if (what === "use" && id === "water-stone" && alphReaction("water-stone")) return "escaped";
      else if (what === "use") {
        const t = await choosePartyFor(Bag.isMachine(id) ? "Teach which {PKMN}?" : "Use on which {PKMN}?", id);
        if (t) await useItemOn(t, id);
      } else if (what === "give") {
        const t = await choosePartyFor("Give to which {PKMN}?");
        if (t) await giveItem(t, id);
      }
      await persist();
    }
  }

  // FireRed's "How many?": the question in the text box and the quantity
  // window over the screen (D-pad up / down by one, left / right by ten).
  // Returns the number chosen, or 0.
  async function chooseQuantity(text, max, unitPrice, inBag) {
    Screen.say(text);
    clearMenu();
    return GbaMenus.quantity($("#overlay"), { max, unitPrice, inBag, frame: GameOptions.get().frame });
  }

  // ---------- Cerulean City: the Berry Powder man ----------
  //
  // CeruleanCity_House5_EventScript_BerryPowderMan: interested in Berries,
  // and with some in your Bag (FireRed asks for the Berry Pouch, which this
  // game's Bag has in its place), you get the Powder Jar. Then he trades
  // medicine for Berry Powder, at FireRed's prices. FireRed's powder comes
  // from the Berry Crush, a link game this game hasn't got: here (this
  // game's own) he crushes your Berries himself, each giving what it does in
  // the Berry Crush (gBerryCrush_BerryData's powder).
  const BERRY_POWDER = {
    cheri: 20, chesto: 20, pecha: 20, rawst: 20, aspear: 20, leppa: 30, oran: 30, persim: 30, lum: 30, sitrus: 30,
    figy: 50, wiki: 50, mago: 50, aguav: 50, iapapa: 50, razz: 70, bluk: 70, nanab: 70, wepear: 70, pinap: 70,
    pomeg: 100, kelpsy: 100, qualot: 100, hondew: 100, grepa: 100, tamato: 150, cornn: 150, magost: 150, rabuta: 150, nomel: 150,
    spelon: 250, pamtre: 250, watmel: 250, durin: 250, belue: 250, liechi: 500, ganlon: 500, salac: 500, petaya: 500, apicot: 500,
    lansat: 750, starf: 750, enigma: 200
  };
  // (Berries FireRed hasn't got: the Berry Crush's middle amount.)
  const berryPowderOf = (id) => BERRY_POWDER[id.replace(/-berry$/, "")] || 30;
  // FireRed's exchange list (LISTMENU_BERRY_POWDER) and prices.
  const POWDER_PRIZES = [["energy-powder", 50], ["energy-root", 80], ["heal-powder", 50], ["revival-herb", 300], ["protein", 1000],
    ["iron", 1000], ["carbos", 1000], ["calcium", 1000], ["zinc", 1000], ["hp-up", 1000], ["pp-up", 3000]];

  // ---------- The Berry Crush (game/berry-crush.js, ui/berry-crush.js) ----------
  //
  // FireRed's Direct Corner (CableClub_EventScript_DirectCornerAttendant): once
  // you have the Powder Jar it offers the Berry Crush. FireRed plays it with 2
  // to 5 people over the Wireless Adapter; here you choose how many play and
  // the others are the computer. Each puts in a Berry (yours from the Bag,
  // used up), the lid drops, "3 2 1 START", and everyone presses A to push
  // it down; the powder made goes into your Powder Jar, and the pressing
  // speed is kept as a record for that many players (the rankings in the
  // Berry Powder man's house).
  const CRUSH_NAMES = ["Lucas", "Kim", "Chris", "Jody", "Max", "Erin", "Toby", "Mia", "Seth", "Ivy"];
  const hasBerry = () => Object.keys(player.bag).some((id) => /-berry$/.test(id) && player.bag[id] > 0);

  // ---------- Poké Mart ----------

  // A Poké Mart (src/shop.c), selling `stock` (its FireRed list of item ids):
  // "Hi, there! May I help you?" with Buy / Sell / See ya! in a window at the
  // top left; Buy opens FireRed's buy screen (ui/shop-screen.js), Sell the Bag.
  async function mart(stock) {
    let text = T("Text_MayIHelpYou")[0];
    for (;;) {
      Screen.say(fill(text));
      await Screen.printed();
      clearMenu();
      const { index } = await pcMenu(["Buy", "Sell", "See ya!"], { left: 2, top: 1, width: 12 });
      if (index === 0) await martBuy(stock);
      else if (index === 1) await martSell();
      else { await say("Please come again!"); return; }
      await persist();
      text = "Is there anything else I can do?";
    }
  }

  // The buy screen: the map round you shows at its left.
  function martBuy(stock) {
    Screen.say("");
    const at = Overworld.position(), d = World.DIRS ? World.DIRS[at.facing] : null;
    const [dx, dy] = d || ({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] })[at.facing] || [0, -1];
    return ShopScreen.open({
      frame: GameOptions.get().frame,
      items: Bag.martStock(stock).map((x) => ({ id: x.item, name: Bag.name(x.item), price: x.price, desc: Bag.description(x.item), icon: Bag.sprite(x.item) })),
      // (A counter of only TMs and HMs, Celadon's 2F: every name in the small
      // font, as the long ones must be, so the list looks the same all down.)
      smallNames: stock.length > 0 && stock.every((id) => /^(tm|hm)\d/.test(id)),
      money: () => player.money,
      inBag: (id) => Player.itemCount(player, id),
      // (TMs and HMs: one each, and never twice; one you have shows "-----" for its price.)
      soldOut: (id) => Bag.isMachine(id) && Player.itemCount(player, id) > 0,
      limit: (id) => (!Bag.isMachine(id) ? { max: 99 }
        : Player.itemCount(player, id) > 0 ? { max: 0, why: "You already have that " + Bag.name(id).split(" ")[0] + ".\nTMs and HMs never run out." } : { max: 1 }),
      buy: (id, n) => {
        const price = Bag.price(id) * n;
        if (Player.itemCount(player, id) + n > 999) return { error: "You have no more room for this\nitem." };
        Player.addMoney(player, -price);
        Player.addItem(player, id, n);
        persist();
        // (A Premier Ball with ten Poké Balls, as from Ruby and Sapphire on.)
        if (id === "poke-ball" && n >= 10) {
          Player.addItem(player, "premier-ball");
          return { bonus: "I'll throw in a Premier Ball,\ntoo." };
        }
        return null;
      },
      map: { canvas: $("#world"), x: 112 + 16 * dx, y: 96 + 16 * dy }
    });
  }

  // SELL: the Bag, A on an item to sell it (half its price).
  function martSell() {
    Screen.say("");
    return BagScreen.open({
      pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame,
      female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      actions: () => [],
      sell: {
        price: (id) => (Bag.isMachine(id) || Bag.isKeyItem(id) ? 0 : Bag.sellPrice(id)),
        sell: (id, n) => { Player.removeItem(player, id, n); Player.addMoney(player, n * Bag.sellPrice(id)); persist(); },
        money: () => player.money
      }
    }).then((r) => { BagScreen.close(); return r; });
  }

  // ---------- PC ----------
  //
  // FireRed's PC (data/scripts/pc.inc): "Which PC should be accessed?" with
  // SOMEONE'S PC (BILL'S PC once you've met him: the Pokémon Storage System),
  // {PLAYER}'s PC (item storage), PROF. OAK's PC (once you have a Pokédex) and
  // LOG OFF, in a window at the top left with the question in the text box.
  const overlayCanvas = () => $("#overlay");
  const instant = (text) => { Screen.say(text, text.length); clearMenu(); };
  const pcMenu = (items, opts) => GbaMenus.listMenu(overlayCanvas(), Object.assign({ left: 1, top: 1, frame: GameOptions.get().frame, items }, opts));
  // A script's multichoice (FireRed's `multichoice left, top, ...`) after
  // `question` (message + waitmessage, its last two lines staying up):
  // -> the index chosen, or -1 (B).
  async function multichoice(question, left, top, items, opts) {
    if (question != null) await Screen.prompt(fill(question));
    clearMenu();
    return GbaMenus.multichoice(overlayCanvas(), Object.assign({ left, top, items, frame: GameOptions.get().frame }, opts));
  }
  // The money box and coins box (showmoneybox / showcoinsbox x, y; null takes it down).
  const moneyBox = (x, y) => GbaMenus.fieldWindow("money", x == null ? null : { x, y, amount: player.money });
  const coinsBox = (x, y) => GbaMenus.fieldWindow("coins", x == null ? null : { x, y, amount: coins() });

  async function pc() {
    const f = player.flags;
    for (;;) {
      Screen.say("Which PC should be accessed?");
      await Screen.printed();
      clearMenu();
      const items = [f.billHelped ? "Bill's PC" : "Someone's PC", player.name + "'s PC"]
        .concat(f.pokedex ? ["Prof. Oak's PC"] : [], (f.gameClear || f.sinnohLeagueClear) ? ["Hall of Fame"] : [], ["Log off"]);
      const { index } = await pcMenu(items, { width: f.pokedex || player.name.length > 6 ? 14 : 13 });
      const v = index < 0 ? "Log off" : items[index];
      if (v === "Log off") { sfx("se_pc_off"); Screen.say(""); return; }
      sfx("se_pc_login");
      if (index === 0) {
        await say(f.billHelped ? "Accessed Bill's PC." : "Accessed Someone's PC.");
        await say("Pokémon Storage System opened.");
        await billsPc();
      } else if (index === 1) {
        await say("Accessed {PLAYER}'s PC.");
        await playersPc();
      } else if (items[index] === "Hall of Fame") {
        // (FireRed's PC: the Hall of Fame's records, the newest first.)
        Screen.say("");
        await HallOfFame.pc($("#overlay"), f.hallOfFame || [], { cry, sfx });
        $("#overlay").classList.add("hidden");
      } else {
        await say(["Accessed Prof. Oak's PC…", "Accessed the Pokédex Rating\nSystem…"]);
        if (await confirm("Would you like to have your\nPokédex rated?")) await rateDex();
        await say("Closed link to Prof. Oak's PC.");
      }
    }
  }

  // Bill's PC (src/pokemon_storage_system_menu.c): what each choice does, in the
  // text box, as the ▶ moves.
  let billsPcCursor = 0, lastBox = 0;
  const BILLS_PC = [
    ["Withdraw Pokémon", "withdraw", "You can withdraw a Pokémon if you\nhave any in a box."],
    ["Deposit Pokémon", "deposit", "You can deposit your party\nPokémon in any box."],
    ["Move Pokémon", "move", "You can move Pokémon that are\nstored in any box."],
    ["Move items", "items", "You can move items held by any\nPokémon in a box or your party."],
    ["See ya!", null, "See you later!"]
  ];
  async function billsPc() {
    for (;;) {
      const { index, cursor } = await pcMenu(BILLS_PC.map((x) => x[0]), {
        width: 17, cursor: billsPcCursor, wrap: true, onMove: (c) => instant(BILLS_PC[c][2])
      });
      billsPcCursor = cursor;
      const mode = index < 0 ? null : BILLS_PC[index][1];
      if (!mode) { Screen.say(""); return; }
      if (mode === "withdraw" && player.party.length >= Player.PARTY_SIZE) { await say("Can't take any more Pokémon."); continue; }
      if (mode === "deposit" && player.party.length <= 1) { await say("Can't deposit the last Pokémon!"); continue; }
      Screen.say("");
      lastBox = await storage(mode);
      Player.healBoxes(player);
      await persist();
    }
  }

  // The Pokémon Storage System (ui/storage-screen.js).
  function storage(mode) {
    return StorageScreen.open({
      mode, boxes: player.boxes, names: player.boxNames, wallpapers: player.boxWallpapers, party: player.party,
      box: lastBox, frame: GameOptions.get().frame,
      view: (r) => (r.egg ? { egg: true, name: "Egg", species: "Egg", level: 0, gender: "", item: "", icon: EGG_ICON, pic: EGG_PIC, picEmpty: 0 } : {
        name: Party.displayName(r), species: Party.speciesName(r.species), level: r.level, gender: r.gender,
        item: r.item ? Bag.name(r.item) : "", icon: Screen.iconUrl(r.species, Party.form(r)),
        pic: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny),
        picEmpty: ((window.SPRITE_METRICS || {}).front || {})[(window.DEX[r.species] || {}).id] || 0
      }),
      heal: (r) => Party.heal(r),   // (Pokémon in the PC are fully healed)
      itemIcon: (id) => Bag.sprite(id), itemName: (id) => Bag.name(id), itemDesc: (id) => Bag.description(id),
      summary: (records, i) => SummaryScreen.open(records.map(summaryView), i, summaryContext(records)),
      pickItem: async () => {
        const r = await BagScreen.open({
          pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame,
          female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
          actions: (it) => (holdable(it.id) ? [{ label: "Give", value: "give" }] : [])
        });
        BagScreen.close();
        if (!r) return null;
        Player.removeItem(player, r.id);
        return r.id;
      },
      toBag: (id) => {
        if (Player.itemCount(player, id) >= 999) return false;
        Player.addItem(player, id);
        return true;
      },
      // (FireRed's naming screen, "BOX NAME?", with the box's name to start with: ui/naming-screen.js.)
      rename: async (name) => {
        const c = Object.assign(document.createElement("canvas"), { width: 480, height: 320, className: "naming-canvas" });
        $(".gba").appendChild(c);
        try { return await NamingScreen.run(c, { title: "BOX NAME?", maxChars: 8, value: name, fallback: name, pc: true }); } finally { c.remove(); }
      },
      changed: () => persist()
    });
  }

  // A line of text typed in the text box (Enter: done, Esc: never mind).
  function enterText(prompt, value, max) {
    Screen.say(prompt, prompt.length);
    const menu = $("#menu");
    // (In a window on the screen, over the text box, in your frame.)
    Screen.frameMenu();
    menu.innerHTML = '<div class="intro-name"><input id="enter-text" maxlength="' + max + '" autocomplete="off" aria-label="' + escapeHtml(prompt) + '"></div>';
    const input = $("#enter-text");
    input.value = value || "";
    input.focus(); input.select();
    return new Promise((resolve) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== "Escape") return;
        e.preventDefault(); e.stopPropagation();
        const v = input.value.trim();
        menu.innerHTML = "";
        Screen.say("");
        resolve(e.key === "Enter" && v ? v.slice(0, max) : null);
      });
    });
  }

  // {PLAYER}'s PC (src/player_pc.c): ITEM STORAGE / MAILBOX / TURN OFF.
  async function playersPc() {
    for (;;) {
      Screen.say("What would you like to do?");
      await Screen.printed();
      clearMenu();
      // (In Hoenn, your room's PC puts out your dolls and cushions too.)
      const room = isHoenn(player.location.map) && hoennDecor.contextOf(player.location.map) === "room";
      const { index } = await pcMenu(room ? ["Item storage", "Mailbox", "Decoration", "Turn off"] : ["Item storage", "Mailbox", "Turn off"], { width: 13 });
      if (index === 0) await itemStorage();
      else if (index === 1) await say("There's no mail here.");
      else if (room && index === 2) { Screen.say(""); await hoennDecor.menu("room", player.location.map); }
      else { Screen.say(""); return; }
    }
  }

  // ITEM STORAGE: WITHDRAW ITEM (the item list, ui/item-pc-screen.js) and
  // DEPOSIT ITEM (the Bag), each said in the text box under the ▶.
  const ITEM_STORAGE = [["Withdraw item", "Take out items from the PC."], ["Deposit item", "Store items in the PC."],
    ["Cancel", "Go back to the\nprevious menu."]];
  async function itemStorage() {
    let cursor = 0;
    for (;;) {
      const r = await pcMenu(ITEM_STORAGE.map((x) => x[0]), { width: 14, cursor, onMove: (c) => instant(ITEM_STORAGE[c][1]) });
      cursor = r.cursor;
      if (r.index === 0) {
        if (!Object.keys(player.pcItems).length) { await say("There are no items."); continue; }
        await withdrawItems();
      } else if (r.index === 1) await depositItems();
      else return;
      await persist();
    }
  }
  async function withdrawItems() {
    Screen.say("");
    for (;;) {
      sfx("se_pc_login");
      const r = await ItemPcScreen.open({
        frame: GameOptions.get().frame,
        items: () => Object.keys(player.pcItems).map((id) => ({ id, name: Bag.name(id), qty: player.pcItems[id], desc: Bag.description(id), icon: Bag.sprite(id) })),
        withdraw: (id, n) => {
          if (Player.itemCount(player, id) + n > 999) return "There is no more\nroom in the Bag.";
          Player.withdrawItem(player, id, n);
          persist();
          return null;
        }
      });
      ItemPcScreen.close();
      if (!r) return;
      // GIVE: straight from the PC to a Pokémon.
      if (!player.party.length) { await say("There is no\nPokémon."); continue; }
      const mon = await choosePartyFor("Give to which {PKMN}?");
      if (mon) {
        Player.withdrawItem(player, r.id, 1);
        await giveItem(mon, r.id);
      }
      await persist();
      if (!Object.keys(player.pcItems).length) return;
    }
  }
  function depositItems() {
    Screen.say("");
    return BagScreen.open({
      pockets: bagPockets, pocketName: "Items", frame: GameOptions.get().frame,
      female: !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl),
      actions: () => [],
      deposit: (id, n) => {
        if ((player.pcItems[id] || 0) + n > 999) return "There's no room to\nstore items.";
        Player.depositItem(player, id, n);
        persist();
        return null;
      }
    }).then(() => BagScreen.close());
  }

  // ---------- Debug ----------
  //
  // For testing: add any Pokémon at any level, infinite Rare Candies, every TM and HM.

  // Species you can add: everything in the Pokédex data except battle-only forms.
  const debugSpecies = () => Object.keys(DEX).filter((s) => !/-(Mega|Primal)/.test(s)).sort();

  // The debug menu asks for a password the first time it's opened each session.
  const DEBUG_PASSWORD = "1324";
  let debugUnlocked = false;
  async function debugPassword() {
    show("scene");
    scene.innerHTML = '<div class="spotlight"><label class="name-entry">Password' +
      '<input id="debug-password" type="password" inputmode="numeric" autocomplete="off"></label></div>';
    const input = $("#debug-password");
    const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); resolve("ok"); } }));
    const asked = ask("The debug menu needs a password.", [{ label: "OK", value: "ok", className: "action" }, back("Cancel")]);
    input.focus();
    const v = await Promise.race([typed, asked]);
    clearMenu();
    if (v !== "ok") return false;
    if (input.value !== DEBUG_PASSWORD) { await message("That's not the password."); return false; }
    return (debugUnlocked = true);
  }

  async function debugMenu() {
    if (!debugUnlocked && !(await debugPassword())) return;
    for (;;) {
      const v = await ask("Debug menu.", [
        { label: "Add a Pokémon", value: "add", className: "action" },
        { label: "Infinite Rare Candies: " + (player.flags.debugCandy ? "On" : "Off"), value: "candy", className: "action" },
        { label: "Give all TMs and HMs", value: "tms", className: "action" },
        { label: "Give Max Repels", value: "repels", className: "action" },
        { label: "Give Master Balls", value: "master", className: "action" },
        { label: "Wild battle", value: "wild", className: "action" },
        { label: "Double battle", value: "double", className: "action" },
        { label: "Tag battle", value: "tag", className: "action" },
        { label: "Go to the last Pokémon Center", value: "center", className: "action" },
        { label: "Visit Johto (New Bark Town)", value: "johto", className: "action" },
        { label: "Visit Hoenn (the moving truck)", value: "hoenn", className: "action" },
        { label: "Visit Sinnoh (Twinleaf Town)", value: "sinnoh", className: "action" },
        { label: Orre.inOrre(player.location) ? "Leave Orre" : "Visit Orre (the Air Strip)", value: "orre", className: "action" },
        back()]);
      if (v === "back") return;
      if (v === "add") await debugAddPokemon();
      else if (v === "candy") {
        player.flags.debugCandy = !player.flags.debugCandy;
        if (player.flags.debugCandy) player.bag["rare-candy"] = Math.max(Player.itemCount(player, "rare-candy"), 999);
        await message(player.flags.debugCandy ? "Rare Candies are infinite: using one no longer uses it up."
          : "Rare Candies are used up again.");
      } else if (v === "wild") {
        // A random wild Pokémon near your party's level (back to the map after).
        if (!canBattle()) { await message("Your Pokémon are too tired to battle."); continue; }
        await battle("wild");
        return "battled";
      } else if (v === "double" || v === "tag") {
        // A double battle against one of FireRed's double battle trainers,
        // or a tag battle with Leaf against two trainers (you choose three).
        if (!canBattle()) { await message("Your Pokémon are too tired to battle."); continue; }
        if (v === "double" && !canDouble()) { await message("You need two Pokémon that can fight for a double battle."); continue; }
        if ((v === "double" ? await debugDoubleBattle() : await debugTagBattle()) === "cancelled") continue;
        return "battled";
      } else if (v === "center") {
        // In front of the counter of the Center you last used (home before
        // you've used one), as blacking out takes you.
        const center = player.flags.lastCenter && centerOf(player.flags.lastCenter);
        Orre.leave(player);   // (from Orre: an older save's Wes back to yourself)
        player.location = Object.assign({}, center || Player.HOME);
        await persist();
        return "battled";   // (back to the map, at the new place)
      } else if (v === "orre") {
        // Orre: Prof. Oak's plane to the Air Strip, without his briefing (game/orre.js); and back.
        if (Orre.inOrre(player.location)) await leaveOrre();
        else fieldAction = visitOrre;
        return "battled";
      } else if (v === "johto") {
        // Johto isn't joined to Kanto yet (data/johto-maps.js): outside your
        // house in New Bark Town; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = Object.assign({ facing: "down" }, window.JohtoCoords ? window.JohtoCoords.toMap("NewBarkTown", 23, 13) : { map: "NewBarkTown", x: 23, y: 13 });
        await persist();
        return "battled";
      } else if (v === "hoenn") {
        // Hoenn isn't joined to anywhere yet (data/emerald-maps.js, tools/build-hoenn.js):
        // in the moving truck, as Emerald begins; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = { map: "InsideOfTruck", x: 2, y: 2, facing: "right" };
        await persist();
        return "battled";
      } else if (v === "sinnoh") {
        // Sinnoh's first maps (data/orre-maps.js, tools/build-sinnoh.js), not joined to anywhere yet: Twinleaf
        // Town's crossroads; the debug menu's Pokémon Center trip brings you back.
        Orre.leave(player);
        player.location = { map: "TwinleafTown", x: 17, y: 13, facing: "down" };
        await persist();
        return "battled";
      } else if (v === "repels") {
        Player.addItem(player, "max-repel", 99);
        await message("Added 99 Max Repels to your bag.");
      } else if (v === "master") {
        Player.addItem(player, "master-ball", 99);
        await message("Added 99 Master Balls to your bag.");
      } else if (v === "tms") {
        for (const id of Bag.machines()) if (!Player.itemCount(player, id)) Player.addItem(player, id);
        await message("Added all " + Bag.machines().length + " TMs and HMs to your bag.");
      }
      await persist();
    }
  }

  // FireRed's trainers on the maps built so far: [person's trainer, data].
  function mapTrainers(pick) {
    const out = [], seen = new Set();
    for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) {
      const t = p.trainer, data = t && window.WORLD_TRAINERS[t.id];
      if (!data || seen.has(t.id) || !pick(t, data)) continue;
      seen.add(t.id);
      out.push([t, data]);
    }
    return out;
  }
  const randomOf = (arr) => arr[Math.floor(Math.random() * arr.length)];
  async function debugDoubleBattle() {
    const [t, data] = randomOf(mapTrainers((t) => t.double));
    await say(t.intro || []);
    return battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(t.id), pic: data.pic },
      defeatText: t.defeat, prizeClass: data.className, double: true, music: "mus_vs_trainer" });
  }
  // Leaf's team as it is about now: her starter (grown with your party),
  // Jigglypuff (Wigglytuff from Vermilion on) and Butterfree, at your
  // party's level.
  function leafTagTeam() {
    const f = player.flags, level = Math.max(10, Math.min(100, partyLevel()));
    const base = RIVAL_PICK[f.starter] || "Bulbasaur";
    const FINAL = { Bulbasaur: "Venusaur", Charmander: "Charizard", Squirtle: "Blastoise" };
    const starter = level >= 32 ? FINAL[base] : level >= 16 ? STAGE_TWO[base] : base;
    return [Party.create(starter, level), Party.create(f.leafVermilion || level >= 20 ? "Wigglytuff" : "Jigglypuff", level - 1),
      Party.create("Butterfree", level - 2)];
  }
  async function debugTagBattle() {
    // Two trainers whose teams are nearest your party's level.
    const lvl = partyLevel(), top = (d) => Math.max(...d.party.map((m) => m.level));
    const all = mapTrainers((t, d) => !t.double && !/^(Leader|Rival|Boss|Pokémon Trainer)/.test(d.className) && /^TRAINER_/.test(t.id))
      .sort((a, b) => Math.abs(top(a[1]) - lvl) - Math.abs(top(b[1]) - lvl)).slice(0, 12);
    const one = randomOf(all), two = randomOf(all.filter((x) => x !== one));
    const foeOf = ([t, d]) => ({ name: d.className + " " + d.name, team: trainerTeam(t.id).slice(0, 3), pic: d.pic,
      defeatText: t.defeat, prizeClass: d.className });
    const foe = foeOf(one), foe2 = foeOf(two);
    await say(["Leaf: {PLAYER}! Two Trainers want\nto battle us together!", "Let's team up! Choose three\nPokémon to bring!"]);
    return battle("trainer", { foe, foe2, defeatText: foe.defeatText, prizeClass: foe.prizeClass, music: "mus_vs_trainer",
      partner: { name: LAB_RIVAL_NAME, team: leafTagTeam(), pic: "leaf" } });
  }

  async function debugAddPokemon() {
    show("scene");
    scene.innerHTML = '<div class="spotlight debug-add">' +
      '<label class="name-entry">Pokémon<input id="debug-species" list="debug-species-list" autocomplete="off" placeholder="e.g. Charizard"></label>' +
      '<datalist id="debug-species-list">' + debugSpecies().map((s) => '<option value="' + escapeHtml(s) + '">').join("") + "</datalist>" +
      '<label class="name-entry">Level<input id="debug-level" type="number" min="1" max="100" value="50"></label>' +
      '<label class="name-entry debug-shiny"><input id="debug-shiny" type="checkbox"> Shiny</label></div>';
    const input = $("#debug-species");
    for (;;) {
      const typed = new Promise((resolve) => scene.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); resolve("add"); } }));
      const asked = ask("Which Pokémon, and at what level?", [
        { label: "Add", value: "add", className: "action" }, back("Done")]);
      input.focus();   // ask() highlights its first button; keep typing in the box
      const v = await Promise.race([typed, asked]);
      clearMenu();
      if (v === "back") return;
      const want = input.value.trim().toLowerCase();
      const species = debugSpecies().find((s) => s.toLowerCase() === want);
      if (!species) { await message(input.value.trim() ? "There's no Pokémon called " + input.value.trim() + "." : "Type a Pokémon's name first."); continue; }
      const level = Math.max(1, Math.min(100, parseInt($("#debug-level").value, 10) || 50));
      const record = Party.create(species, level, $("#debug-shiny").checked ? { shiny: true } : {});
      const where = Player.receive(player, record);
      if (!where) { await message("Your party and PC boxes are full."); continue; }
      await message((record.shiny ? "Shiny " : "") + species + " (Lv" + level + ") was added to " + (where === "party" ? "your party." : where.replace("box", "Box") + " in the PC."));
      await persist();
      input.select();
    }
  }

  // ---------- Pokédex ----------

  let dexEntries = null;
  function dexList() {
    if (!dexEntries) {
      const byId = {};
      for (const [name, d] of Object.entries(DEX)) if (d.id < 10000 && !byId[d.id]) byId[d.id] = name;
      dexEntries = Object.keys(byId).map(Number).sort((a, b) => a - b).map((id) => ({ id, species: byId[id] }));
    }
    return dexEntries;
  }

  // FireRed's Pokédex (ui/pokedex-screen.js).
  function dexOptions(extra) {
    const seen = new Set(player.pokedex.seen), caught = new Set(player.pokedex.caught);
    return Object.assign({
      entries: dexList().map((e) => ({ id: e.id, species: e.species, seen: seen.has(e.species), caught: caught.has(e.species) })),
      areas: speciesAreas,
      areaRegions: dexAreaRegions(),
      trainer: "assets/sprites/trainers/front/" + Player.LOOKS[player.look].front + ".png",
      cry: (sp) => cry(sp),
      // (The National Pokédex from the start: Player.nationalDex.)
      national: Player.nationalDex(player)
    }, extra);
  }
  function pokedex() {
    Screen.say("");
    clearMenu();
    return PokedexScreen.open(dexOptions());
  }
  // AREA MODE's places: each map section with wild Pokémon, in the order the
  // maps come in (the order you reach them), with the species found there
  // (in the grass or cave, with a rod, and surfing) and whether you've been.
  const AREA_KINDS = [["Grass", "wild"], ["Fishing", "fishing"], ["Surfing", "water"]];
  // (Not the S.S. Anne: it only has the fishing and surfing of Vermilion's dock,
  // the same Pokémon as Vermilion City's.)
  const AREA_SKIP = ["S_S_ANNE"];
  // (Kanto's, then Johto's and Hoenn's, each with its Town Map for the menu's picture.)
  function dexAreaRegions() {
    const pic = (R) => R && { src: R.image, x: R.x0, y: R.y0, w: 8 * R.width, h: 8 * R.height };
    return [{ label: "Kanto", places: dexAreaList("kanto") }]
      .concat(JOHTO_MAP ? [{ label: "Johto", places: dexAreaList("johto"), map: pic(JOHTO_MAP) }] : [],
        HOENN_MAP ? [{ label: "Hoenn", places: dexAreaList("hoenn"), map: pic(HOENN_MAP) }] : []);
  }
  function dexAreaList(region) {
    const secs = (window.TOWN_MAP || {}).mapSections || {}, names = (window.TOWN_MAP || {}).names || {};
    const visited = player.flags.visitedSections || [], bySec = new Map();
    const walk = (o, out) => {
      if (!o || typeof o !== "object") return;
      // (a slot's LeafGreen Pokémon, as likely as its FireRed one; Johto's by the time of day, and SoulSilver's)
      for (const sp of [o.species, o.alt, o.morning, o.night, o.altMorning, o.altNight]) if (typeof sp === "string") out.add(sp);
      for (const v of Object.values(o)) walk(v, out);
    };
    for (const [name, m] of Object.entries(window.WORLD_MAPS)) {
      const sec = secs[name];
      // (The region's own: Johto's and Hoenn's maps have their sections too, for their Town Maps.)
      if (!sec || (m.region || "kanto") !== region || AREA_SKIP.includes(sec) || !AREA_KINDS.some(([, k]) => m[k])) continue;
      if (!bySec.has(sec)) bySec.set(sec, AREA_KINDS.map(() => new Set()));
      AREA_KINDS.forEach(([, k], i) => walk(m[k], bySec.get(sec)[i]));
    }
    return [...bySec].map(([sec, sets]) => ({
      name: names[sec] || sec, visited: visited.includes(sec),
      groups: AREA_KINDS.map(([title], i) => ({ title, species: [...sets[i]] })).filter((gr) => gr.species.length)
    }));
  }
  // Where a species can be found: the map sections of the maps whose wild
  // Pokémon (grass, water, fishing, rocks) include it.
  let areaIndex = null;
  function speciesAreas(species) {
    if (!areaIndex) {
      areaIndex = {};
      const secs = (window.TOWN_MAP || {}).mapSections || {};
      const walk = (o, sec) => {
        if (!o || typeof o !== "object") return;
        for (const sp of [o.species, o.alt, o.morning, o.night, o.altMorning, o.altNight]) if (sp) (areaIndex[sp] = areaIndex[sp] || new Set()).add(sec);
        for (const v of Object.values(o)) walk(v, sec);
      };
      for (const [name, m] of Object.entries(window.WORLD_MAPS)) if (secs[name] && m.wild) walk(m.wild, secs[name]);
    }
    return [...(areaIndex[species] || [])];
  }

  // ---------- Trainer card ----------

  // The Trainer Card: FireRed's in Kanto (and, for now, Johto, the Sevii Islands and Orre), Emerald's in Hoenn
  // (tools/build-trainer-cards.js: assets/trainer-card/), drawn as src/trainer_card.c lays them out. Its colour
  // goes by its stars; the front has your name, ID No., money, Pokédex, play time and that region's Badges, the
  // back your Battle Points (Kanto's, or the Battle Frontier's on Hoenn's card), your skills and the Hall of Fame.
  // A turns it over, B puts it away. (Saving and loading are on the Option screen.)
  const cardImages = {};
  function cardImage(src) {
    if (!cardImages[src]) {
      const img = new Image();
      img.loaded = new Promise((r) => { img.onload = img.onerror = () => r(img); });
      img.src = src;
      cardImages[src] = img;
    }
    return cardImages[src];
  }
  function cardStars(region) {
    const f = player.flags;
    if (region === "hoenn") {
      const sym = (c) => ["TOWER", "DOME", "PALACE", "ARENA", "FACTORY", "PIKE", "PYRAMID"].every((F) => hoenn.flag("FLAG_SYS_" + F + "_" + c));
      return [hoennCleared(), hoennDexCount("caught", true) >= 202, sym("SILVER") || sym("GOLD"), sym("GOLD")].filter(Boolean).length;
    }
    // (FireRed's: the Hall of Fame, Kanto's Pokédex complete, the Sevii Islands' story done, and the National Pokédex.)
    return [f.gameClear, Player.dexRating(player).complete, f.canLinkWithRS, Player.dexCount(player, "caught", false) >= 386].filter(Boolean).length;
  }
  async function trainerCard() {
    tick();
    if(Unova.owns(player.location.map)){Screen.say("");show("scene");clearMenu();try{await UnovaDevice.open(scene,player,"card");}finally{tick();Save.write(player);show("world");await Overworld.resume();}return null;}
    if(WORLD_MAPS[player.location.map]?.region==='sinnoh'){Screen.say("");show('scene');clearMenu();try{await SinnohOptionalDevice.card(scene,player);}finally{tick();Save.write(player);show('world');await Overworld.resume();}return null;}
    const map = player.location && window.WORLD_MAPS[player.location.map];
    const region = map && map.region === "hoenn" ? "hoenn" : "kanto", K = region === "kanto";
    const stars = cardStars(region);
    const dir = "assets/trainer-card/" + region;
    const pics = { front: cardImage(dir + "-front-" + stars + ".png"), back: cardImage(dir + "-back-" + stars + ".png"),
      badges: cardImage(dir + "-badges.png"), star: cardImage(dir + "-star.png"),
      me: cardImage("assets/sprites/trainers/front/" + Player.LOOKS[player.look].front + ".png") };
    await Promise.all(Object.values(pics).map((p) => p.loaded));
    const ok = (img) => img.complete && img.naturalWidth > 0;
    const BADGES = { kanto: ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"],
      hoenn: ["stone", "knuckle", "dynamo", "heat", "balance", "feather", "mind", "rain"] }[region];
    const DARK = [96, 96, 96], LIGHT = [208, 208, 200], RED = [224, 8, 8], PINK = [248, 184, 184];
    const time = (ms) => { const m = Math.floor((ms || 0) / 60000); return Math.min(999, Math.floor(m / 60)) + ":" + String(m % 60).padStart(2, "0"); };
    const lv = (xp, skill) => "Lv. " + skill.level(xp);
    const debut = (player.flags.hallOfFame || []).find((e) => e.number === 1);
    const bp = K ? player.flags.bp || 0 : (player.flags.hoennFrontier || {}).bp || 0;
    // (This game's own: every Badge you hold, all regions'; the front shows this region's.)
    const allBadges = Object.values(Player.REGION_BADGES).flat().filter((b) => player.badges.includes(b)).length;
    const rows = [
      ["TOTAL BADGES", String(allBadges)],
      ["BATTLE POINTS", bp + " BP"],
      // (With Four Island's sticker man's Hall of Fame sticker after it: one of four by entries.)
      ["HALL OF FAME DEBUT", debut ? time(debut.playTimeMs) + (player.flags.hofBragState ? " " + "*".repeat(player.flags.hofBragState) : "") : "---"],
      ["MINING", lv(miningXp(), Mining)],
      ["FARMING", lv(farmingXp(), BerryPicking)],
      ["FISHING", lv(fishingXp(), Fishing)]
    ];
    // (Over the whole 240x192 screen: the card in its middle, the pattern round it carried on above and below.)
    const canvas = $("#overlay-full");
    let side = "front";
    function draw() {
      const s = GbaMenus.Surface();
      const right = (str, x, y, fg, sh) => s.text(str, x - s.textWidth(str), y, fg, sh);
      if (side === "front") {
        const x = K ? 28 : 24, y = K ? 0 : 1, r = K ? 152 : 136;
        const id = "IDNo." + String(player.trainerId).padStart(5, "0");
        s.text(id, 140 + ((80 - s.textWidth(id)) >> 1), 17, DARK, LIGHT);
        s.text(player.name, x, K ? 36 : 41, DARK, LIGHT);
        s.text("MONEY", x, 64 + y, DARK, LIGHT); right("¥" + player.money, r, 64 + y, DARK, LIGHT);
        s.text("POKéDEX", x, 80 + y, DARK, LIGHT); right(String(Player.dexCount(player, "caught", K && !Player.nationalDex(player))), r, 80 + y, DARK, LIGHT);
        s.text("TIME", x, 96 + y, DARK, LIGHT); right(time(player.playTimeMs), r, 96 + y, DARK, LIGHT);
      } else {
        if (K) s.text(player.name, 144, 17, DARK, LIGHT); else right(player.name, 224, 17, DARK, LIGHT);
        // (Kanto's panel is a row shorter than Hoenn's: its six rows closer together.)
        const step = K ? 13 : 16, top0 = K ? 39 : 41;
        rows.forEach(([label, value], i) => {
          s.text(label, K ? 16 : 24, top0 + i * step, DARK, LIGHT);
          right(value, 224, top0 + i * step, RED, PINK);
        });
      }
      const g = canvas.getContext("2d");
      g.save();
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.imageSmoothingEnabled = false;
      g.clearRect(0, 0, canvas.width, canvas.height);
      const k = canvas.width / 240, top = (canvas.height / k - 160) / 2;
      g.scale(k, k);
      if (ok(pics[side])) {
        for (let y = top - 4; y > -4; y -= 4) g.drawImage(pics[side], 0, 0, 240, 4, 0, y, 240, 4);
        for (let y = top + 160; y < canvas.height / k; y += 4) g.drawImage(pics[side], 0, 156, 240, 4, 0, y, 240, 4);
      }
      g.translate(0, top);
      if (ok(pics[side])) g.drawImage(pics[side], 0, 0);
      if (side === "front") {
        if (ok(pics.me)) g.drawImage(pics.me, K ? 165 : 153, K ? 44 : 40);
        BADGES.forEach((b, i) => { if (player.badges.includes(b) && ok(pics.badges)) g.drawImage(pics.badges, i * 16, 0, 16, 16, 32 + i * 24, K ? 128 : 120, 16, 16); });
        for (let i = 0; i < stars && ok(pics.star); i++) g.drawImage(pics.star, 120 + i * 8, 56);
      }
      g.drawImage(s.canvas(), 0, 0);
      g.restore();
    }
    canvas.classList.remove("hidden");
    try {
      for (;;) {
        draw();
        const k = await GbaMenus.keys((key) => (key === "a" || key === "b" ? key : undefined));
        sfx("se_select");
        if (k === "b") return;
        side = side === "front" ? "back" : "front";
      }
    } finally { canvas.classList.add("hidden"); Screen.say(""); }
  }

  // ---------- The Start menu's screens ----------

  // The Start menu's POKéMON: FireRed's party screen. A on a Pokémon opens
  // SUMMARY (and this game's EVOLVE, when it could), its field moves, SWITCH / ITEM / CANCEL; SWITCH asks "Move to
  // where?" and swaps the two; ITEM gives or takes a held item. The field
  // moves are the HM moves it knows or could learn (game/field-moves.js);
  // one that works here closes the menus and is used ("escaped").
  async function partyMenu() {
    if (!player.party.length) { await message("You don't have any Pokémon yet."); return; }
    let cursor = 0;
    for (;;) {
      // (An Egg: SUMMARY, SWITCH and CANCEL only. EVOLVE, this game's, under SUMMARY: a Pokémon that could
      // evolve by its level, friendship or the like now, as levelling up would, that didn't: stopped, or kept back.)
      const canEvolve = (r) => !r.egg && Evolution.find(r, { trigger: "level", party: player.party, coins: coins() });
      const r = await openParty({ cursor, actions: (slot) => [{ label: "Summary", value: "summary" }]
        .concat(canEvolve(player.party[slot]) ? [{ label: "Evolve", value: "evolve" }] : [])
        .concat(FieldMoves.forMon(player.party[slot]).map((m) =>
          ({ label: m, value: "field:" + m, field: true, desc: FieldMoves.info(m).desc })))
        .concat([{ label: "Switch", value: "switch" }].concat(player.party[slot].egg ? [] : [{ label: "Item", value: "item" }]), [{ label: "Cancel", value: "cancel" }]) });
      if (!r) { PartyMenu.close(); return; }
      cursor = r.cursor;
      const mon = player.party[r.slot];
      if (r.action === "summary") { PartyMenu.close(); await summary(r.slot); continue; }
      if (r.action === "evolve") {
        const evo = canEvolve(mon);
        PartyMenu.close();
        if (evo) { await evolve(mon, evo, true); await persist(); }
        continue;
      }
      if (r.action.startsWith("field:")) {
        const move = r.action.slice(6);
        const blocked = fieldMoveBlocked(mon, move);
        const act = blocked || fieldMoveHere(move, mon);
        if (typeof act === "string") { await message(act); continue; }
        PartyMenu.close();
        fieldAction = act;
        return "escaped";
      }
      if (r.action === "switch") {
        if (r.to !== r.slot && player.party[r.to]) {
          [player.party[r.slot], player.party[r.to]] = [player.party[r.to], player.party[r.slot]];
          await persist();
        }
        continue;
      }
      if (r.action === "take") {
        if (!mon.item) { await message(Party.displayName(mon) + " isn't holding anything."); continue; }
        const old = Bag.take(mon);
        Player.addItem(player, old);
        await message("Received the " + Bag.name(old) + " from " + Party.displayName(mon) + ".");
        continue;
      }
      if (r.action === "give") {
        PartyMenu.close();
        const items = Object.keys(player.bag).filter(holdable);
        if (!items.length) { await message("You don't have anything to give."); continue; }
        const choice = await pick("Give which item?",
          '<div class="rows">' + items.map((id) => itemRow(id, "×" + player.bag[id])).join("") + "</div>", [back()]);
        if (choice && choice.pick) await giveItem(mon, choice.pick);
      }
    }
  }

  // FireRed's Start menu: a window over the map (GbaMenus.startMenu), with
  // the help bar along the bottom. The cursor stays where it was, as in
  // FireRed. Each choice opens its screen and comes back to the menu.
  let startCursor = 0;
  const START_HELP = {
    dex: "A device that records Pokémon secrets\nupon meeting or catching them.",
    party: "Check and organize Pokémon that are\ntraveling with you in your party.",
    bag: "Equipped with pockets for storing items\nyou bought, received, or found.",
    card: "Check your money and other game data.",
    gear: "Use the Pokégear's phone, map and radio.",   // (the PokéNav's, once it is one: navName)
    mail: "Read received e-mail.",   // (Colosseum's P★DA: pda_menu #14040)
    save: "Save your game with a complete record\nof your progress to take a break.",
    option: "Adjust various game settings such as text\nspeed, game rules, etc.",
    exit: "Close this menu window.",
    retire: "Retire from the Safari Game and return to\nthe registration counter.",
    retirePyramid: "Give up your Battle Pyramid challenge\nand go back to the lobby."
  };
  // The Frontier Pass (Emerald's frontier_pass.c, as a menu): your Battle Points and Symbols, the Trainer Card, and
  // the battle recorded on it played back (PlayRecordedBattle): the same battle, the same choices, from the same seed.
  async function frontierPass() {
    const s = player.flags.hoennFrontier || {}, rec = player.flags.hoennBattleRecord;
    const FACS = ["TOWER", "DOME", "PALACE", "ARENA", "FACTORY", "PIKE", "PYRAMID"];
    const sym = (F) => (hoenn.flag("FLAG_SYS_" + F + "_GOLD") ? "gold" : hoenn.flag("FLAG_SYS_" + F + "_SILVER") ? "silver" : null);
    const have = FACS.filter(sym).map((F) => F.charAt(0) + F.slice(1).toLowerCase() + " (" + sym(F) + ")");
    await message("FRONTIER PASS\nBATTLE PTS: " + (s.bp || 0));
    await message(have.length ? "SYMBOLS: " + have.join(", ") : "No Symbols yet.");
    if (rec) await message("Recorded: " + rec.cfg.p2.name + " at the " + rec.facility.charAt(0) + rec.facility.slice(1).toLowerCase() + ", Lv. " + (rec.lvl ? "Open" : "50") + ".");
    const labels = ["TRAINER CARD"].concat(rec ? ["VIEW RECORDED BATTLE"] : []).concat(["CANCEL"]);
    const i = await multichoice(null, 0, 0, labels);
    Screen.say("");
    if (labels[i] === "TRAINER CARD") return trainerCard();
    if (labels[i] === "VIEW RECORDED BATTLE") await playRecord(rec);
    return null;
  }
  async function playRecord(rec) {
    music("mus_vs_trainer");
    show("field");
    const cfg = JSON.parse(JSON.stringify(rec.cfg));
    try {
      await BattleScreen.run(Object.assign(cfg, { replay: rec.choices, seed: rec.seed, exp: false, bag: {}, bagPockets: () => [], opponent: () => null,
        summary: () => null, forgetMove: () => 0 }));
    } catch (e) { console.error(e); }
    show("world");
    await Overworld.resume();
  }
  async function startMenu() {
    player.flags.openedMenu = true;   // (FireRed's FLAG_OPENED_START_MENU: the Sign Lady's scene)
    for (;;) {
      show("world");
      Screen.say("");
      clearMenu();
      // POKéDEX once Prof. Oak has given you one, POKéMON once you have one.
      // In the Safari Zone: RETIRE first, and no SAVE (SetUpStartMenu_SafariZone).
      const items = [], safari = player.flags.safari;
      // (In the Bug-Catching Contest's park: RETIRE too, and no BAG or SAVE.)
      const contest = bugContest.here(player.location.map);
      // (In the Battle Pyramid: RETIRE, Emerald's own (SetUpStartMenu_BattlePyramid), before anything else.)
      const pyramid = player.location.map === PYRAMID_FLOOR;
      if (pyramid) items.push({ key: "retirePyramid", label: "Retire" });
      if (safari) items.push({ key: "retire", label: "Retire" });
      if (contest) items.push({ key: "retire", label: "Retire", help: "Finish the Bug-Catching Contest now and\nwait for the judging." });
      if (player.flags.pokedex) items.push({ key: "dex", label: "Pokédex" });
      if (player.party.length) items.push({ key: "party", label: "Pokémon" });
      if (!contest) items.push({ key: "bag", label: "Bag" });
      if (gear.has()) items.push({ key: "gear", label: hasPokenav() ? "PokéNav" : "Pokégear" });   // (HGSS's, once you have it: ui/pokegear.js)
      // (In Orre, once an e-mail's come: Colosseum's P★DA e-mail, to read again.)
      if (Orre.inOrre(player.location) && Orre.mailList && Orre.mailList(player.flags).length) items.push({ key: "mail", label: "E-mail" });
      // (Emerald's Frontier Pass, once Scott's gate has issued it: it holds the Trainer Card, your Battle Points,
      // Symbols and the battle recorded on it; opened from your name, as the Trainer Card is.)
      const pass = isHoenn(player.location.map) && hoenn.flag("FLAG_SYS_FRONTIER_PASS");
      items.push({ key: "card", label: player.name, help: pass ? "Check your FRONTIER PASS: your Trainer Card,\nBattle Points, Symbols and recorded battle." : undefined });
      if (!safari && !contest) items.push({ key: "save", label: "Save" });
      items.push({ key: "option", label: "Option" }, { key: "exit", label: "Exit" });
      for (const it of items) it.help = it.help || START_HELP[it.key];
      const stats = safari ? (safari.park?["Found  "+SinnohPark.count(player)+"/6"]:safari.hgss ? [] : [String(safari.steps).padStart(3, " ") + "/" + (safari.hoenn || safari.sinnoh ? 500 : Safari.STEPS)]).concat("Balls  " + String(safari.balls).padStart(2, " ")) : bugContest.menuStats();
      const r = await GbaMenus.startMenu($("#overlay"), { items, cursor: startCursor, frame: GameOptions.get().frame, stats });
      startCursor = r.cursor;
      const v = r.key;
      if (v === "exit") return;
      if (v === "retire" && contest) { await runJohto(johtoStd("std_bug_contest_retire"), null); return; }
      // (gText_BattlePyramidConfirmRetire, then BattlePyramid_Retire: the challenge lost, back to the lobby.)
      if (v === "retirePyramid") {
        if (!(await confirm("Are you sure you want to quit your\nPYRAMID quest?"))) continue;
        await runHoenn("BattlePyramid_Retire");
        return;
      }
      if (v === "retire") {
        if (safari.hgss) { if (await johtoSafari.retire()) return; continue; }   // (Johto's: std_safari_exit)
        if (safari.hoenn) { await runHoenn("SafariZone_EventScript_RetirePrompt"); return; }   // (Hoenn's: SafariZoneRetirePrompt)
        if (await confirm(fill(T("SafariZone_Text_WouldYouLikeToExit")[0]))) { await safariOver(null, false); return; }
        continue;
      }
      if (v === "party") { if ((await partyMenu()) === "escaped") return; }
      else if (v === "bag") { if ((await bagScreen()) === "escaped") return; }
      else if (v === "dex") await pokedex();
      else if (v === "gear") await gear.open();
      else if (v === "mail") await mailbox();
      else if (v === "card") { if ((await (pass ? frontierPass() : trainerCard())) === "battled") return; }
      else if (v === "option") { if ((await optionActions()) === "battled") return; continue; }
      else if (v === "save") {
        if (!(await confirm("Would you like to save the game?"))) continue;
        await saveGame();
      }
      await persist();
    }
  }


  // ---------- Pallet Town story ----------
  //
  // Most signs and people in the overworld just say their FireRed text. These
  // scripts do more, so the overworld hands them to us.

  const STARTER_BALLS = {
    PalletTown_ProfessorOaksLab_EventScript_BulbasaurBall: { species: "Bulbasaur", kind: "Grass", flag: "FLAG_HIDE_BULBASAUR_BALL", x: 8, id: "LOCALID_BULBASAUR_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_SquirtleBall: { species: "Squirtle", kind: "Water", flag: "FLAG_HIDE_SQUIRTLE_BALL", x: 9, id: "LOCALID_SQUIRTLE_BALL" },
    PalletTown_ProfessorOaksLab_EventScript_CharmanderBall: { species: "Charmander", kind: "Fire", flag: "FLAG_HIDE_CHARMANDER_BALL", x: 10, id: "LOCALID_CHARMANDER_BALL" }
  };
  // Leaf, in the lab, takes the starter that's weak against yours, leaving the
  // one that beats yours for Red (in Viridian Forest).
  const RIVAL_PICK = { Bulbasaur: "Squirtle", Charmander: "Bulbasaur", Squirtle: "Charmander" };
  const ballOf = (species) => Object.values(STARTER_BALLS).find((b) => b.species === species);

  // Silph Co.'s staff: one thing to say while Team Rocket holds the building
  // and another once Giovanni's gone (VAR_MAP_SCENE_SILPH_CO_11F), and the
  // Saffron Center's boy, who hopes for the Elite Four.
  const SILPH_WORKERS = {
    SilphCo_3F_EventScript_WorkerM: ["SilphCo_3F_Text_WhatAmIToDo", "SilphCo_3F_Text_YouAndYourMonsSavedUs"],
    SilphCo_4F_EventScript_WorkerM: ["SilphCo_4F_Text_CantYouSeeImHiding", "SilphCo_4F_Text_TeamRocketIsGone"],
    SilphCo_5F_EventScript_WorkerM: ["SilphCo_5F_Text_RocketsInUproarAboutIntruder", "SilphCo_5F_Text_YoureOurHeroThankYou"],
    SilphCo_6F_EventScript_WorkerM1: ["SilphCo_6F_Text_HelpMePlease", "SilphCo_6F_Text_WeGotEngaged"],
    SilphCo_6F_EventScript_WorkerM2: ["SilphCo_6F_Text_TargetedSilphForOurMonProducts", "SilphCo_6F_Text_ComeWorkForSilphWhenYoureOlder"],
    SilphCo_6F_EventScript_WorkerM3: ["SilphCo_6F_Text_RocketsTookOverBuilding", "SilphCo_6F_Text_BetterGetBackToWork"],
    SilphCo_6F_EventScript_WorkerF1: ["SilphCo_6F_Text_ThatManIsSuchACoward", "SilphCo_6F_Text_NeedsMeToLookAfterHim"],
    SilphCo_6F_EventScript_WorkerF2: ["SilphCo_6F_Text_RocketsTryingToConquerWorld", "SilphCo_6F_Text_RocketsRanAwayBecauseOfYou"],
    SilphCo_7F_EventScript_WorkerM1: ["SilphCo_7F_Text_RocketsAfterMasterBall", "SilphCo_7F_Text_CanceledMasterBallProject"],
    SilphCo_7F_EventScript_WorkerM2: ["SilphCo_7F_Text_BadIfTeamRocketTookOver", "SilphCo_7F_Text_WowYouChasedOffTeamRocket"],
    SilphCo_7F_EventScript_WorkerF: ["SilphCo_7F_Text_ReallyDangerousHere", "SilphCo_7F_Text_ThankYouSoMuch"],
    SilphCo_8F_EventScript_WorkerM: ["SilphCo_8F_Text_WonderIfSilphIsFinished", "SilphCo_8F_Text_ThanksForSavingUs"],
    SilphCo_10F_EventScript_WorkerF: ["SilphCo_10F_Text_WaaaImScared", "SilphCo_10F_Text_KeepMeCryingASecret"],
    SaffronCity_PokemonCenter_1F_EventScript_Youngster: ["SaffronCity_PokemonCenter_1F_Text_GreatIfEliteFourCameBeatRockets",
      "SaffronCity_PokemonCenter_1F_Text_TeamRocketTookOff"]
  };
  // Silph Co.'s card-key doors (the bg events on their barriers).
  const SILPH_DOORS = [];
  for (const [name, m] of Object.entries(window.WORLD_MAPS)) {
    if (/^SilphCo_\d+F$/.test(name)) for (const sg of m.signs) if (/_EventScript_Door\d*$/.test(sg.script) && !SILPH_DOORS.includes(sg.script)) SILPH_DOORS.push(sg.script);
  }
  // Fuchsia City's signs by its Pokémon statues: the Pokémon's picture (and
  // it's seen in the Pokédex) with the sign.
  const FUCHSIA_SIGN_MONS = {
    FuchsiaCity_EventScript_ChanseySign: "Chansey", FuchsiaCity_EventScript_VoltorbSign: "Voltorb",
    FuchsiaCity_EventScript_KangaskhanSign: "Kangaskhan", FuchsiaCity_EventScript_SlowpokeSign: "Slowpoke",
    FuchsiaCity_EventScript_LaprasSign: "Lapras"
  };

  // The Ruby Path's Braille (MtEmber_RubyPath_B4F/B5F): FireRed's braille
  // messages, in Braille (Unicode's Braille patterns).
  const BRAILLE = { A: 1, B: 3, C: 9, D: 25, E: 17, F: 11, G: 27, H: 19, I: 10, J: 26, K: 5, L: 7, M: 13, N: 29, O: 21, P: 15, Q: 31,
    R: 23, S: 14, T: 30, U: 37, V: 39, W: 58, X: 45, Y: 61, Z: 53, ".": 50, ",": 2, " ": 0 };
  const braille = (s) => [...s.toUpperCase()].map((c) => (c === "\n" ? c : String.fromCharCode(0x2800 + (BRAILLE[c] || 0)))).join("");
  const BRAILLE_SIGNS = {
    MtEmber_RubyPath_B4F_EventScript_BrailleABC: ["ABC"], MtEmber_RubyPath_B4F_EventScript_BrailleDEF: ["DEF"],
    MtEmber_RubyPath_B4F_EventScript_BrailleGHI: ["GHI"], MtEmber_RubyPath_B4F_EventScript_BrailleJKL: ["JKL"],
    MtEmber_RubyPath_B4F_EventScript_BrailleMNO: ["MNO"], MtEmber_RubyPath_B4F_EventScript_BraillePQRS: ["PQRS"],
    MtEmber_RubyPath_B4F_EventScript_BrailleTUV: ["TUV"], MtEmber_RubyPath_B4F_EventScript_BrailleWXYZ: ["WXYZ"],
    MtEmber_RubyPath_B4F_EventScript_BraillePeriod: ["."], MtEmber_RubyPath_B4F_EventScript_BrailleComma: [","],
    MtEmber_RubyPath_B5F_EventScript_BrailleMessage: ["EVERYTHING", "HAS MEANING", "EXISTENCE", "HAS MEANING", "BEING ALIVE",
      "HAS MEANING", "HAVE DREAMS", "USE POWER."]
  };

  // The Badges in order, as Route 23's guards (and the League gate's) check them.
  const ROUTE23_BADGES = LeagueRoad.NAMES;
  const SPECIAL = new Set([
    "PalletTown_PlayersHouse_1F_EventScript_Mom",
    "PalletTown_PlayersHouse_2F_EventScript_PC",
    "PalletTown_EventScript_OakTriggerLeft", "PalletTown_EventScript_OakTriggerRight",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerLeft",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerMid",
    "PalletTown_ProfessorOaksLab_EventScript_RivalBattleTriggerRight",
    "Route1_EventScript_MartClerk", "PalletTown_RivalsHouse_EventScript_Daisy", "PalletTown_ProfessorOaksLab_EventScript_LeaveStarterSceneTrigger",
    "PalletTown_ProfessorOaksLab_EventScript_Rival", "PalletTown_ProfessorOaksLab_EventScript_ProfOak",
    "PalletTown_EventScript_SignLady", "PalletTown_EventScript_SignLadyTrigger", "PalletTown_EventScript_TrainerTips",
    "CenterUpstairs_EventScript_MoveRelearner", "CenterUpstairs_EventScript_MoveDeleter",
    "ViridianCity_EventScript_RoadBlocked",
    "ViridianCity_EventScript_TutorialTriggerLeft", "ViridianCity_EventScript_TutorialTriggerRight",
    "ViridianCity_EventScript_TutorialOldMan", "ViridianCity_EventScript_Woman", "ViridianCity_EventScript_Youngster",
    "ViridianCity_EventScript_DreamEaterTutor",
    "enter:ViridianCity_Mart", "ViridianCity_Mart_EventScript_Clerk",
    "ViridianCity_PokemonCenter_1F_EventScript_Nurse",
    "Common_EventScript_UnionRoomAttendant", "Common_EventScript_WirelessClubAttendant", "Common_EventScript_DirectCornerAttendant",
    "Route2_House_EventScript_Reyley", "Route2_EastBuilding_EventScript_Aide",
    "Route22_EventScript_EarlyRivalTriggerTop", "Route22_EventScript_EarlyRivalTriggerMid", "Route22_EventScript_EarlyRivalTriggerBottom",
    "Route22_NorthEntrance_EventScript_BoulderBadgeGuardTrigger", "Route22_NorthEntrance_EventScript_BoulderBadgeGuard",
    "PewterCity_EventScript_GymGuideTriggerTop", "PewterCity_EventScript_GymGuideTriggerMid", "PewterCity_EventScript_GymGuideTriggerBottom",
    "PewterCity_EventScript_GymGuide", "PewterCity_EventScript_MuseumGuide", "PewterCity_EventScript_BugCatcher",
    "PewterCity_Museum_1F_EventScript_EntranceTriggerLeft", "PewterCity_Museum_1F_EventScript_EntranceTriggerMid",
    "PewterCity_Museum_1F_EventScript_EntranceTriggerRight", "PewterCity_Museum_1F_EventScript_Scientist1",
    "PewterCity_Museum_1F_EventScript_OldAmberScientist", "PewterCity_Museum_1F_EventScript_SeismicTossTutor",
    "PewterCity_Museum_1F_EventScript_AerodactylFossil", "PewterCity_Museum_1F_EventScript_KabutopsFossil",
    "PewterCity_Gym_EventScript_Brock", "PewterCity_Gym_EventScript_GymGuy", "PewterCity_Gym_EventScript_GymStatue",
    "PewterCity_Mart_EventScript_Clerk", "PewterCity_PokemonCenter_1F_EventScript_Nurse", "MysteryEventClub_EventScript_Woman",
    "Route4_EventScript_MegaPunchTutor", "Route4_EventScript_MegaKickTutor",
    "Route4_PokemonCenter_1F_EventScript_Nurse", "Route4_PokemonCenter_1F_EventScript_MagikarpSalesman",
    "MtMoon_B2F_EventScript_MiguelTrigger", "MtMoon_B2F_EventScript_Miguel",
    "MtMoon_B2F_EventScript_DomeFossil", "MtMoon_B2F_EventScript_HelixFossil",
    "CeruleanCity_EventScript_RivalTriggerLeft", "CeruleanCity_EventScript_RivalTriggerMid", "CeruleanCity_EventScript_RivalTriggerRight",
    "CeruleanCity_PokemonCenter_1F_EventScript_Nurse",
    "CeruleanCity_Gym_EventScript_Misty", "CeruleanCity_Gym_EventScript_GymGuy", "CeruleanCity_Gym_EventScript_GymStatue",
    "CeruleanCity_Mart_EventScript_Clerk", "CeruleanCity_House1_EventScript_BadgeGuy", "CeruleanCity_House3_EventScript_Dontae",
    "CeruleanCity_BikeShop_EventScript_Clerk", "CeruleanCity_House5_EventScript_BerryPowderMan",
    "CeruleanCity_House5_EventScript_BerryCrushRankings",
    "Route24_EventScript_Rocket", "Route24_EventScript_RocketTriggerLeft", "Route24_EventScript_RocketTriggerRight",
    "Route25_SeaCottage_EventScript_Bill", "Route25_SeaCottage_EventScript_Computer",
    "CeruleanCity_EventScript_Grunt", "CeruleanCity_EventScript_GruntTriggerTop", "CeruleanCity_EventScript_GruntTriggerBottom",
    "EventScript_CutTree", "EventScript_RockSmash", "EventScript_StrengthBoulder", "Route5_PokemonDayCare_EventScript_DaycareMan", "UndergroundPath_NorthEntrance_EventScript_Saige",
    "Route5_SouthEntrance_EventScript_GuardTriggerLeft", "Route5_SouthEntrance_EventScript_GuardTriggerMid",
    "Route5_SouthEntrance_EventScript_GuardTriggerRight",
    "Game_EventScript_Leaf", "Game_EventScript_TradebackGuy", "Game_EventScript_Rejuvenator", "Game_EventScript_SSAquaSailor", "Game_EventScript_PokerDealer", "Game_EventScript_BlackjackDealer",
    "Game_EventScript_PokerTable", "Game_EventScript_BlackjackTable", "Game_EventScript_MahjongPlayer",
    "Route11_EastEntrance_2F_EventScript_Aide", "Route11_EastEntrance_2F_EventScript_Turner",
    "SSAnne_2F_Corridor_EventScript_RivalTriggerLeft", "SSAnne_2F_Corridor_EventScript_RivalTriggerMid",
    "SSAnne_2F_Corridor_EventScript_RivalTriggerRight", "SSAnne_CaptainsOffice_EventScript_Captain",
    "SSAnne_2F_Room1_EventScript_Gentleman", "SSAnne_1F_Room3_EventScript_Wigglytuff", "SSAnne_B1F_Room5_EventScript_Machoke",
    "SSAnne_Kitchen_EventScript_Chef1", "SSAnne_Kitchen_EventScript_Chef2", "SSAnne_Kitchen_EventScript_Chef3",
    "SSAnne_Kitchen_EventScript_Chef4", "Route6_NorthEntrance_EventScript_GuardTriggerLeft", "Route6_NorthEntrance_EventScript_GuardTriggerMid",
    "Route6_NorthEntrance_EventScript_GuardTriggerRight",
    "VermilionCity_EventScript_CheckTicketLeft", "VermilionCity_EventScript_CheckTicketRight",
    "VermilionCity_EventScript_ExitedTicketCheck", "VermilionCity_EventScript_OaksAide",
    "VermilionCity_PokemonCenter_1F_EventScript_Nurse", "VermilionCity_Mart_EventScript_Clerk",
    "VermilionCity_Gym_EventScript_LtSurge", "VermilionCity_Gym_EventScript_GymGuy", "VermilionCity_Gym_EventScript_GymStatue",
    "VermilionCity_House1_EventScript_FishingGuru", "VermilionCity_House2_EventScript_Elyssa",
    "VermilionCity_House3_EventScript_Pidgey", "VermilionCity_PokemonFanClub_EventScript_Pikachu",
    "VermilionCity_PokemonFanClub_EventScript_Seel", "VermilionCity_PokemonFanClub_EventScript_Chairman",
    "SSAnne_1F_Room6_EventScript_Woman", "VermilionCity_PokemonCenter_1F_EventScript_VSSeekerWoman",
    "Route10_PokemonCenter_1F_EventScript_Nurse", "Route10_PokemonCenter_1F_EventScript_Aide", "RockTunnel_B1F_EventScript_RockSlideTutor",
    "LavenderTown_PokemonCenter_1F_EventScript_Nurse", "LavenderTown_Mart_EventScript_Clerk", "LavenderTown_EventScript_LittleGirl",
    "LavenderTown_House2_EventScript_NameRater", "LavenderTown_House1_EventScript_Cubone",
    "LavenderTown_VolunteerPokemonHouse_EventScript_Nidorino", "LavenderTown_VolunteerPokemonHouse_EventScript_Psyduck",
    "PokemonTower_2F_EventScript_RivalTriggerRight", "PokemonTower_2F_EventScript_RivalTriggerDown",
    "PokemonTower_5F_EventScript_PurifiedZone", "PokemonTower_6F_EventScript_MarowakGhost", "PokemonTower_7F_EventScript_MrFuji",
    "LavenderTown_VolunteerPokemonHouse_EventScript_MrFuji",
    "Route8_WestEntrance_EventScript_GuardTriggerTop", "Route8_WestEntrance_EventScript_GuardTriggerMid",
    "Route8_WestEntrance_EventScript_GuardTriggerBottom",
    "CeladonCity_Condominiums_1F_EventScript_Clefairy", "CeladonCity_Condominiums_1F_EventScript_Meowth",
    "CeladonCity_Condominiums_1F_EventScript_Nidoran", "CeladonCity_Condominiums_1F_EventScript_TeaWoman",
    "CeladonCity_Condominiums_3F_EventScript_Designer", "CeladonCity_Condominiums_RoofRoom_EventScript_Blackboard",
    "CeladonCity_Condominiums_RoofRoom_EventScript_EeveeBall", "CeladonCity_DepartmentStore_2F_EventScript_ClerkItems",
    "CeladonCity_DepartmentStore_2F_EventScript_ClerkTMs", "CeladonCity_DepartmentStore_3F_EventScript_CounterTutor",
    "CeladonCity_DepartmentStore_4F_EventScript_Clerk", "CeladonCity_DepartmentStore_5F_EventScript_ClerkVitamins",
    "CeladonCity_DepartmentStore_5F_EventScript_ClerkXItems", "CeladonCity_DepartmentStore_Elevator_EventScript_FloorSelect",
    "CeladonCity_DepartmentStore_Roof_EventScript_ThirstyGirl", "CeladonCity_DepartmentStore_Roof_EventScript_VendingMachine",
    "CeladonCity_EventScript_Poliwrath", "CeladonCity_EventScript_SoftboiledTutor", "CeladonCity_GameCorner_EventScript_BaldingMan",
    "CeladonCity_GameCorner_EventScript_CoinsClerk", "CeladonCity_GameCorner_EventScript_Fisher", "CeladonCity_GameCorner_EventScript_Gentleman",
    "CeladonCity_GameCorner_EventScript_GymGuy", "CeladonCity_GameCorner_EventScript_OldMan", "CeladonCity_GameCorner_EventScript_Poster",
    "CeladonCity_GameCorner_EventScript_Scientist", "CeladonCity_GameCorner_EventScript_Woman1", "CeladonCity_GameCorner_EventScript_Woman2",
    "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkItems", "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkMons",
    "CeladonCity_GameCorner_PrizeRoom_EventScript_PrizeClerkTMs", "CeladonCity_Gym_EventScript_GymStatue",
    "CeladonCity_PokemonCenter_1F_EventScript_Nurse", "CeladonCity_Restaurant_EventScript_CoinCaseMan", "RocketHideout_B4F_EventScript_Giovanni",
    "RocketHideout_B4F_EventScript_LiftKey", "RocketHideout_B4F_EventScript_SilphScope", "RocketHideout_Elevator_EventScript_FloorSelect",
    "Route7_EastEntrance_EventScript_GuardTriggerBottom", "Route7_EastEntrance_EventScript_GuardTriggerMid",
    "Route7_EastEntrance_EventScript_GuardTriggerTop", "CeladonCity_Gym_EventScript_Erika",
    "SaffronCity_EventScript_DoorGuardGrunt", "SaffronCity_EventScript_Pidgeot", "SaffronCity_PokemonCenter_1F_EventScript_Nurse",
    "SaffronCity_PokemonCenter_1F_EventScript_Youngster", "SaffronCity_Mart_EventScript_Clerk", "SaffronCity_House_EventScript_Pidgey",
    "SaffronCity_CopycatsHouse_1F_EventScript_Chansey", "SaffronCity_CopycatsHouse_2F_EventScript_Doduo",
    "SaffronCity_CopycatsHouse_2F_EventScript_Copycat", "SaffronCity_MrPsychicsHouse_EventScript_MrPsychic",
    "SaffronCity_Gym_EventScript_Sabrina", "SaffronCity_Gym_EventScript_GymGuy", "SaffronCity_Gym_EventScript_GymStatue",
    "SaffronCity_Dojo_EventScript_HitmonleeBall", "SaffronCity_Dojo_EventScript_HitmonchanBall",
    "SaffronCity_Dojo_EventScript_TriggerMasterBattleLeft", "SaffronCity_Dojo_EventScript_TriggerMasterBattleRight",
    "SaffronCity_PokemonTrainerFanClub_EventScript_CrushGirl", "SaffronCity_PokemonTrainerFanClub_EventScript_LittleGirl",
    "SaffronCity_PokemonTrainerFanClub_EventScript_Youngster", "SaffronCity_PokemonTrainerFanClub_EventScript_Gentleman",
    "SilphCo_Elevator_EventScript_FloorSelect", "SilphCo_2F_EventScript_ThunderWaveTutor", "SilphCo_7F_EventScript_LaprasGuy",
    "SilphCo_7F_EventScript_RivalTriggerTop", "SilphCo_7F_EventScript_RivalTriggerBottom", "SilphCo_9F_EventScript_HealWoman",
    "SilphCo_11F_EventScript_President", "SilphCo_11F_EventScript_GiovanniTriggerLeft", "SilphCo_11F_EventScript_GiovanniTriggerRight"
  ].concat(Object.keys(STARTER_BALLS)).concat(Array.from({ length: 15 }, (_, i) => "VermilionCity_Gym_EventScript_TrashCan" + (i + 1)))
    .concat(Array.from({ length: 22 }, (_, i) => "CeladonCity_GameCorner_EventScript_SlotMachine" + i))
    .concat(Object.keys(SILPH_WORKERS)).concat(SILPH_DOORS)
    .concat(Object.keys(FUCHSIA_SIGN_MONS)).concat([
      "Route12_EventScript_Snorlax", "Route12_NorthEntrance_2F_EventScript_Lass",
      "Route12_FishingHouse_EventScript_FishingGuruBrother", "Route12_FishingHouse_EventScript_MagikarpRecordSign",
      "Route15_WestEntrance_2F_EventScript_Aide", "Route15_WestEntrance_2F_EventScript_LeftBinoculars",
      "FuchsiaCity_EventScript_FossilMonSign", "FuchsiaCity_EventScript_SubstituteTutor",
      "FuchsiaCity_PokemonCenter_1F_EventScript_Nurse", "FuchsiaCity_Mart_EventScript_Clerk",
      "FuchsiaCity_WardensHouse_EventScript_Warden", "FuchsiaCity_House2_EventScript_FishingGurusBrother",
      "FuchsiaCity_House3_EventScript_MoveDeleter", "FuchsiaCity_Gym_EventScript_GymGuy", "FuchsiaCity_Gym_EventScript_GymStatue",
      "FuchsiaCity_SafariZone_Entrance_EventScript_InfoAttendant", "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerMid",
      "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerRight", "FuchsiaCity_SafariZone_Entrance_EventScript_EntryTriggerLeft",
      "enter:FuchsiaCity_SafariZone_Entrance", "SafariZone_SecretHouse_EventScript_Attendant",
      "Route16_EventScript_Snorlax", "Route16_NorthEntrance_2F_EventScript_Aide", "Route16_House_EventScript_Woman",
      "Route16_House_EventScript_Fearow", "Route18_EastEntrance_2F_EventScript_Haden",
      "enter:SeafoamIslands_B3F", "enter:SeafoamIslands_B4F", "SeafoamIslands_B4F_EventScript_Articuno",
      "CinnabarIsland_EventScript_GymDoorLocked", "CinnabarIsland_PokemonCenter_1F_EventScript_Nurse", "CinnabarIsland_Mart_EventScript_Clerk",
      "CinnabarIsland_Gym_EventScript_Blaine", "CinnabarIsland_Gym_EventScript_GymGuy", "CinnabarIsland_Gym_EventScript_GymStatue",
      "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_Garett", "CinnabarIsland_PokemonLab_ExperimentRoom_EventScript_FossilScientist",
      "CinnabarIsland_PokemonLab_Lounge_EventScript_Clifton", "CinnabarIsland_PokemonLab_Lounge_EventScript_Norma",
      "CinnabarIsland_PokemonLab_ResearchRoom_EventScript_MetronomeTutor",
      "PokemonMansion_1F_EventScript_Statue", "PokemonMansion_2F_EventScript_Statue", "PokemonMansion_3F_EventScript_Statue",
      "PokemonMansion_B1F_EventScript_Statue",
      "PowerPlant_EventScript_Zapdos", "PowerPlant_EventScript_Electrode1", "PowerPlant_EventScript_Electrode2",
      "ViridianCity_EventScript_GymDoorLocked", "ViridianCity_EventScript_OldMan",
      "ViridianCity_Gym_EventScript_Giovanni", "ViridianCity_Gym_EventScript_GymGuy", "ViridianCity_Gym_EventScript_GymStatue",
      "Route22_EventScript_LateRivalTriggerTop", "Route22_EventScript_LateRivalTriggerMid", "Route22_EventScript_LateRivalTriggerBottom",
      "VictoryRoad_2F_EventScript_DoubleEdgeTutor", "enter:IndigoPlateau_PokemonCenter_1F",
      "IndigoPlateau_PokemonCenter_1F_EventScript_Nurse", "IndigoPlateau_PokemonCenter_1F_EventScript_Clerk",
      "IndigoPlateau_PokemonCenter_1F_EventScript_DoorGuard",
      "PokemonLeague_LoreleisRoom_EventScript_Lorelei", "PokemonLeague_BrunosRoom_EventScript_Bruno",
      "PokemonLeague_AgathasRoom_EventScript_Agatha", "PokemonLeague_LancesRoom_EventScript_Lance",
      // The Sevii Islands (part 1).
      "CinnabarIsland_PokemonCenter_1F_EventScript_Bill", "VermilionCity_EventScript_FerrySailor",
      "OneIsland_Harbor_EventScript_Sailor", "TwoIsland_Harbor_EventScript_Sailor", "ThreeIsland_Harbor_EventScript_Sailor",
      "OneIsland_PokemonCenter_1F_EventScript_Nurse", "TwoIsland_PokemonCenter_1F_EventScript_Nurse", "ThreeIsland_PokemonCenter_1F_EventScript_Nurse",
      "OneIsland_PokemonCenter_1F_EventScript_Celio", "OneIsland_PokemonCenter_1F_EventScript_Bill",
      "OneIsland_PokemonCenter_1F_EventScript_NetworkMachine", "OneIsland_PokemonCenter_1F_EventScript_CrushGirl", "OneIsland_EventScript_OldMan",
      "OneIsland_KindleRoad_EmberSpa_EventScript_RockSmashMan", "TwoIsland_EventScript_Clerk",
      "TwoIsland_JoyfulGameCorner_EventScript_LostellesDaddy", "TwoIsland_JoyfulGameCorner_EventScript_InfoMan",
      "TwoIsland_JoyfulGameCorner_EventScript_Lostelle", "TwoIsland_CapeBrink_House_EventScript_StarterTutor",
      "TwoIsland_House_EventScript_MoveManiac", "ThreeIsland_EventScript_Biker", "ThreeIsland_EventScript_AntiBiker1",
      "ThreeIsland_EventScript_AntiBiker2", "ThreeIsland_EventScript_Doduo", "ThreeIsland_Port_EventScript_Woman",
      "ThreeIsland_House1_EventScript_Lostelle", "ThreeIsland_House5_EventScript_LittleGirl", "ThreeIsland_Mart_EventScript_Clerk",
      "ThreeIsland_BerryForest_EventScript_Lostelle", "ThreeIsland_DunsparceTunnel_EventScript_Prospector",
      "MtEmber_Exterior_EventScript_Grunt1", "MtEmber_Exterior_EventScript_Grunt2", "MtEmber_Exterior_EventScript_ExplosionTutor",
      "MtEmber_Summit_EventScript_Moltres", "MtEmber_RubyPath_B5F_EventScript_Ruby",
      // The Sevii Islands (part 2): Four and Five Island.
      "FourIsland_Harbor_EventScript_Sailor", "FiveIsland_Harbor_EventScript_Sailor",
      "FourIsland_PokemonCenter_1F_EventScript_Nurse", "FiveIsland_PokemonCenter_1F_EventScript_Nurse", "FourIsland_Mart_EventScript_Clerk",
      "FourIsland_EventScript_DaycareMan", "FourIsland_PokemonDayCare_EventScript_DaycareWoman", "FourIsland_EventScript_OldWoman",
      "Johto_DaycareMan", "Johto_DaycareLady",
      "FourIsland_House1_EventScript_BodySlamTutor", "FourIsland_House2_EventScript_StickerMan", "FourIsland_LoreleisHouse_EventScript_Lorelei",
      "FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene", "FourIsland_IcefallCave_1F_EventScript_FallDownHole",
      "FiveIsland_Meadow_EventScript_WarehouseDoor", "FiveIsland_RocketWarehouse_EventScript_Cage",
      "FiveIsland_RocketWarehouse_EventScript_Admin2Trigger", "FiveIsland_RocketWarehouse_EventScript_Gideon",
      "FiveIsland_MemorialPillar_EventScript_MemorialMan", "FiveIsland_MemorialPillar_EventScript_Memorial",
      "FiveIsland_WaterLabyrinth_EventScript_EggGentleman", "FiveIsland_ResortGorgeous_House_EventScript_Selphy",
      // The Sevii Islands (part 3): Six and Seven Island, Trainer Tower.
      "SixIsland_Harbor_EventScript_Sailor", "SevenIsland_Harbor_EventScript_Sailor",
      "SixIsland_PokemonCenter_1F_EventScript_Nurse", "SevenIsland_PokemonCenter_1F_EventScript_Nurse",
      "SixIsland_Mart_EventScript_Clerk", "SevenIsland_Mart_EventScript_Clerk", "TrainerTower_Lobby_EventScript_MartClerk",
      "SixIsland_RuinValley_EventScript_Scientist", "SixIsland_RuinValley_EventScript_DottedHoleDoor",
      "SixIsland_DottedHole_SapphireRoom_EventScript_Sapphire", "SixIsland_DottedHole_SapphireRoom_EventScript_BrailleMessage",
      "SixIsland_DottedHole_B1F_EventScript_BrailleUp", "SixIsland_DottedHole_B2F_EventScript_BrailleLeft",
      "SixIsland_DottedHole_B3F_EventScript_BrailleRight", "SixIsland_DottedHole_B4F_EventScript_BrailleDown",
      "SixIsland_WaterPath_House1_EventScript_Beauty", "SixIsland_WaterPath_House1_EventScript_SizeRecord",
      "SevenIsland_EventScript_SwordsDanceTutor", "SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan",
      "SevenIsland_SevaultCanyon_House_EventScript_Chansey", "SevenIsland_House_Room1_EventScript_OldWoman",
      "TrainerTower_Lobby_EventScript_Nurse", "TrainerTower_Lobby_EventScript_Receptionist", "TrainerTower_Lobby_EventScript_EntryTrigger",
      "TrainerTower_Lobby_EventScript_ShowRecords", "TrainerTower_Elevator_EventScript_FloorSelect", "TrainerTower_EventScript_Owner",
      "TrainerTower_EventScript_DoublesTrainer1", "TrainerTower_EventScript_SinglesTrainer", "TrainerTower_EventScript_KnockoutTrainer",
      "TrainerTower_EventScript_DoublesTrainer2", "TrainerTower_EventScript_SingleBattleTrigger",
      "TrainerTower_EventScript_DoubleBattleTriggerTop", "TrainerTower_EventScript_DoubleBattleTriggerBottom",
      // Cerulean Cave.
      "CeruleanCave_B1F_EventScript_Mewtwo",
      // Faraway Island (Emerald's; data/emerald-maps.js).
      "FarawayIsland_Entrance_EventScript_Sailor", "FarawayIsland_Interior_EventScript_Mew",
      // Orre (data/orre-maps.js).
      "OutskirtStand_Diner_EventScript_Bartender", "OutskirtStand_Diner_EventScript_Willie",
      "OutskirtStand_Diner_EventScript_TV", "OutskirtStand_Diner_EventScript_Jukebox",
      "OrreAirStrip_EventScript_Pilot", "OrreAirStrip_PokemonCenter_1F_EventScript_Nurse",
      "SnagemHideout_EventScript_Guard1", "SnagemHideout_EventScript_Guard2", "PhenacCity_EventScript_Kodo",
      "OutskirtStand_Diner_EventScript_Traveller3", "PyriteTown_EventScript_Rook", "AgateVillage_EventScript_Fay", "PyriteCave_EventScript_Rowe",
      "PyriteTown_EventScript_Zeke", "PyriteTown_EventScript_Rina", "AgateVillage_EventScript_Ted", "AgateVillage_EventScript_Sue",
      "PyriteCave_EventScript_Dex", "PyriteCave_EventScript_Taro",
      "arrive:PhenacCity", "enter:PhenacCity", "enter:PhenacCity_MayorsHouse", "PhenacCity_EventScript_Truck", "PhenacCity_EventScript_Folly",
      "PhenacCity_EventScript_Trudly", "PhenacCity_MayorsHouse_EventScript_EsCade", "PhenacCity_PreGym_EventScript_Justy",
      "arrive:PyriteTown", "enter:PyriteTown", "PyriteTown_DukingsHouse_EventScript_Duking", "PyriteTown_DukingsHouse_EventScript_Marcia",
      "PyriteTown_DukingsHouse_EventScript_Secc", "PyriteTown_PyriteBuilding_1F_EventScript_Nore", "enter:PyriteTown_PyriteBuilding_4F",
      "enter:PyriteCave_MirorBHideout", ...Object.keys(Orre.SHADOW_TRAINERS), ...Orre.PYRITE_SCRIPTS, ...Object.keys(Orre.COLO_TRAINERS),
      "enter:AgateVillage_EaguansHouse", "AgateVillage_EaguansHouse_EventScript_Eagun", "AgateVillage_EaguansHouse_EventScript_Beluh", OrreDayCare.SCRIPT,
      "AgateVillage_EventScript_Skrub", "AgateVillage_EventScript_Peon", "AgateVillage_EventScript_RelicStone", "RelicForest_EventScript_Shrine",
      "AgateVillage_EventScript_CologneGirl", "AgateVillage_EventScript_MartClerk", ...Object.keys(Orre.TOURNAMENTS), "MtBattle_EventScript_Challenge",
      "arrive:MtBattle", "enter:MtBattle", "MtBattle_EventScript_Dakim", "MtBattle_EventScript_SummitSkrub", "MtBattle_EventScript_Vander",
      "MtBattle_EventScript_Trainer1", "MtBattle_EventScript_Trainer2", "MtBattle_EventScript_Turo", "MtBattle_EventScript_Berin",
      "MtBattle_PokemonCenter_1F_EventScript_Nurse", "TheUnder_PokemonCenter_1F_EventScript_Nurse",
      "arrive:TheUnder", "enter:TheUnder", "TheUnder_EventScript_Kloak", "enter:TheUnder_Studio", "TheUnder_Studio_EventScript_Venus",
      "TheUnder_EventScript_Bitt", "enter:TheUnder_NettsHideout_1F", "TheUnder_JunkShop_1F_EventScript_Owner", "TheUnder_JunkShop_B1_EventScript_Perr", "enter:TheUnder_NettsHideout_B1",
      "TheUnder_NettsHideout_B1_EventScript_Nett", "TheUnder_NettsHideout_B1_EventScript_Megg", "TheUnder_NettsHideout_B1_EventScript_Bitt",
      "enter:TheUnder_Subway_B1", "enter:TheUnder_Subway_Station", "TheUnder_Subway_B1_EventScript_Fan", "TheUnder_Subway_Station_EventScript_Train",
      "TheUnder_Studio_EventScript_Elevator", "TheUnder_Subway_B1_EventScript_Elevator",
      "arrive:ShadowLab_1F", "enter:ShadowLab_1F", "enter:ShadowLab_B1F", "ShadowLab_B1F_EventScript_Troop", "enter:ShadowLab_EinsRoom",
      ...Orre.LAB.scripts, ...Object.keys(Orre.LAB.DOORS), "RealgamTower_Colosseum_EventScript_Host",
      "ShadowLab_EinsRoom_EventScript_Ein", "arrive:RealgamTower_1F", "enter:RealgamTower_1F", "RealgamTower_Dome_EventScript_Gonzap",
      "RealgamTower_Colosseum_EventScript_Nascour", "enter:RealgamTower_Top", "RealgamTower_Top_EventScript_Evice",
      "PyriteTown_PokemonCenter_1F_EventScript_Nurse", "AgateVillage_PokemonCenter_1F_EventScript_Nurse",
      ...Object.keys(Orre.FILLERS),
      "PhenacCity_PokemonCenter_1F_EventScript_Nurse"
    ]).concat(Object.keys(BRAILLE_SIGNS)).concat(League.ROOMS.map((r) => "enter:" + r.map), ["enter:" + League.HALL_OF_FAME]).concat(ROUTE23_BADGES.slice(1).flatMap((b) => ["", "Trigger"].map((t) => "Route23_EventScript_" + b + "BadgeGuard" + t))).concat([1, 2, 3, 4, 5, 6].flatMap((n) => ["Left", "Right"].map((s) => "CinnabarIsland_Gym_EventScript_Quiz" + n + s))).concat(CYCLING_ROAD_GATES.flatMap((g) => ["Top", "MidTop", "Mid", "MidBottom", "Bottom"].map((k) => g + "_EventScript_NeedBikeTrigger" + k))));

  for (const d of RaidDens.DENS) SPECIAL.add(d.script);
  // (Realgam Tower's Admins, Orre's: realgamAdmin(); the door on to its Colosseum, realgamDoor().)
  for (const a of Orre.REALGAM_ADMINS) SPECIAL.add(a.script);
  SPECIAL.add("enter:RealgamTower_Colosseum");

  // Which people are around, from FireRed's event flags and this game's story flags.
  // Item balls on the map: picked up once, then gone.
  const ITEM_BALLS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.item) ITEM_BALLS.add(p.script);
  // Trainers: battle until beaten (a flag named for the trainer, as in FireRed).
  // (Hoenn's nurses and clerks: tools/build-hoenn.js.)
  for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "hoenn") for (const p of m.people) if (/_PokemonCenter_1F_EventScript_Nurse$|_Mart_EventScript_Clerk$/.test(p.script || "")) SPECIAL.add(p.script);
  // (Sinnoh's: tools/build-sinnoh.js; and Sandgem's beach's sailor, sinnohSailor.)
  for (const m of Object.values(window.WORLD_MAPS)) if (["sinnoh","unova"].includes(m.region)) for (const p of m.people) if (/_PokemonCenter_1F_EventScript_Nurse$|_Mart_EventScript_Clerk$/.test(p.script || "")) SPECIAL.add(p.script);
  SPECIAL.add("SandgemTown_EventScript_Sailor");
  // (And its ferries, Canalave's to Iron Island and back, and Oreburgh's fossil scientist: sinnohFerry, fossilScientist.)
  for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "sinnoh") for (const p of m.people) if (p.ferry || /_EventScript_FossilScientist$/.test(p.script || "")) SPECIAL.add(p.script);
  SPECIAL.add("SlateportCity_Harbor_EventScript_Sailor"); SPECIAL.add("Route117_PokemonDayCare_EventScript_DaycareWoman");
  SPECIAL.add("LilycoveCity_MoveDeletersHouse_EventScript_MoveDeleter"); SPECIAL.add("FallarborTown_MoveRelearnersHouse_EventScript_MoveRelearner");
  for (const m of Object.values(window.WORLD_MAPS)) {
    for (const p of [...m.people, ...(m.signs || [])]) if ((p.script || "").startsWith("pt:")) SPECIAL.add(p.script);
  }
  const TRAINER_SCRIPTS = new Set();
  for (const m of Object.values(window.WORLD_MAPS)) for (const p of m.people) if (p.trainer && p.trainer.id) TRAINER_SCRIPTS.add(p.script);
  // (or, once you're Champion, the Fighting Dojo wants its rematch: dojoRematch())
  const trainerWaiting = (person) => !!(person.trainer && person.trainer.id && SinnohServices.trainerActive(player,person.trainer.id) &&
    (!player.flags[person.trainer.id] || dojoRematch(person.trainer.id)));

  const T = (label) => window.WORLD_TEXT[label];
  // {PLAYER}, {RIVAL}, and {STR_VAR_1..3} from `vars` (["Abra", "Mr. Mime"]).
  // (Once Mr. Stone has made your Pokégear a PokéNav, it's that in everyone's words: "registered in your PokéNav".)
  // ({OLDGEAR}: the Pokégear as it was, by that name still: what Mr. Stone made it from.)
  // ("a {STR_VAR_2}" before a name starting with a vowel: "an Old Amber".)
  const anBefore = (s, val) => s.replace(/\b([Aa]) (?=\{STR_VAR_(\d)\})/g, (m, a, n) => (/^[AEIOU]/i.test(val(n) || "") ? a + "n " : m));
  const fill = (s, vars) => navName(anBefore(s, (n) => vars && vars[n - 1]).replace(/\{PLAYER\}/g, player.name).replace(/\{RIVAL\}/g, player.rival)
    .replace(/\{STR_VAR_(\d)\}/g, (_, n) => (vars && vars[n - 1] != null ? vars[n - 1] : ""))).replace(/\{OLDGEAR\}/g, "Pokégear");
  const navName = (s) => (hasPokenav() ? s.replace(/Pok[ée]gear|POK[ÉéE]GEAR|Pok[ée]Gear/g, "PokéNav") : s);
  // (The PokéNav: Mr. Stone's, in Devon's office, Emerald's FLAG_SYS_POKENAV_GET. It's your Pokégear made over, and
  // does all it does: ui/pokegear.js, in its own colours.)
  const hasPokenav = () => !!(player && player.flags && player.flags.hoenn && player.flags.hoenn.f && player.flags.hoenn.f.FLAG_SYS_POKENAV_GET);
  async function say(pages, vars) { for (const p of [].concat(pages)) await window.Screen.read(fill(p, vars)); }

  // (A scene as you come out of a building: out of its doorway first, as HGSS's and Emerald's step you out
  // before their scenes run; the overworld's own step out waits for the scene, so you'd be left in the door.)
  async function outOfDoorway() {
    const at = Overworld.position(), b = World.blockAt(at.map, at.x, at.y);
    if (b.behavior !== World.MB.WARP_DOOR && b.behavior !== World.MB.CAVE_DOOR) return;
    if (World.step({ map: at.map, x: at.x, y: at.y }, "down", null).ok) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
  }

  // A Pokémon's picture in a box over the map, as FireRed shows the starters.
  function showPicture(species) {
    const box = $("#world-pic");
    box.querySelector("img").src = window.Screen.spriteUrl(species, "");
    box.querySelector("img").alt = species;
    box.classList.remove("hidden");
  }
  const hidePicture = () => $("#world-pic").classList.add("hidden");

  // ---------- Prof. Oak's walk to the lab ----------
  //
  // FireRed's scene: stepping into the grass north of Pallet Town without a
  // Pokémon, Oak calls out, walks up, and leads you to his lab, where your
  // rival is waiting. Movements are FireRed's (window.WORLD_MOVEMENTS).

  const M = (label) => window.WORLD_MOVEMENTS[label];
  const OAK = "LOCALID_PALLET_PROF_OAK", LAB_OAK = "LOCALID_OAKS_LAB_PROF_OAK", LAB_RIVAL = "LOCALID_OAKS_LAB_RIVAL";

  // At the start, Leaf is in Oak's lab instead of Gary: she waits for her
  // Pokémon, takes the one that beats yours and battles you. Gary's FireRed
  // lines, with her name, "Prof. Oak" for his "Gramps" (she isn't Oak's
  // grandchild), and without his "Smell you later!".
  const LAB_RIVAL_NAME = "Leaf";
  const leafT = (label) => [].concat(T(label)).map((p) => p.replace(/\{RIVAL\}/g, LAB_RIVAL_NAME)
    .replace(/Gramps/g, "Prof. Oak").replace(/Smell you later!/g, "See you later!"));

  // EventScript_OutOfCenterPartyHeal: the screen goes black while the healing
  // jingle plays, and the party is healed.
  async function outOfCenterHeal() {
    Screen.say("");
    await Overworld.fadeToBlack();
    // (as long as the jingle, and a moment at least, for when the sound is off)
    await Promise.all([fanfare("mus_heal"), new Promise((r) => setTimeout(r, 1500))]);
    player.party.forEach(Party.heal);
    await Overworld.fadeFromBlack();
  }

  // ---------- Trainers ----------
  //
  // A trainer who sees you: "!", walks up to you, you turn to face them, they
  // speak, and battle. One you talk to just speaks and battles. Their party is
  // FireRed's (data/world-maps.js, WORLD_TRAINERS), with FireRed's fixed IVs
  // (0-255 there, so 0-31 here).
  // A double battle's trainers (FireRed's trainerbattle_double: Route 8's
  // twins Eli & Anne, the couples, Sis and Bro) fight with two Pokémon each
  // side, after one of them speaks; without two Pokémon that can fight you
  // hear why not instead (EventScript_NotEnoughMonsForDoubleBattle), and
  // they don't come after you.
  async function trainerBattle(person, approach, facing) {
    if (person.pyramid != null) return pyramidFight(person, approach, facing);
    if(!SinnohServices.trainerActive(player,person.trainer.id)){await say(/POLICEMAN/.test(person.trainer.id)?"I’m off duty. Come back at night.":"I train in the morning. Come back then.");return;}
    const t = person.trainer, data = window.WORLD_TRAINERS[t.id];
    const who = "#" + person.id;
    if (t.double && approach == null && !canDouble()) {
      await say(t.notEnough || ["You need two Pokémon to battle us!"]);
      return;
    }
    music(inJohto() ? johtoEyes(data) : data.music || "mus_encounter_boy");   // their "eyes meet" theme
    // (Emerald's buried trainers burst up out of the sand: shown, a hop and "!", where they were.)
    if (t.buried && approach != null) {
      Overworld.unbury(person);
      sfx("se_m_sand_attack");
      await Overworld.act([{ who, moves: ["face_" + World.OPPOSITE[facing], "walk_in_place_fast_" + World.OPPOSITE[facing]] }]);
    }
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    // (Hoenn's: their own script, Emerald's trainerbattle, says what they say before and after, and goes on to
    // whatever follows: a rematch's registration, a Gym's, ...)
    if (/^EM_/.test(t.id) && isHoenn(player.location.map) && window.HOENN_SCRIPTS.s[person.script]) {
      await runHoenn(person.script, person);
      if (approach && player.flags[t.id]) {
        const [dx, dy] = World.DIRS[facing];
        (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[t.id] = { map: player.location.map, x: person.x + dx * approach, y: person.y + dy * approach, facing };
      }
      return;
    }
    const re = dojoRematch(t.id);
    // (Nothing to say, straight to the battle: no waiting on an empty message.)
    const intro = re ? re.intro : t.intro;
    if (intro && [].concat(intro).length) await say(intro);
    if (!canBattle()) return;
    const team = re ? re.team() : trainerTeam(t.id);
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team, pic: data.pic },
      defeatText: re ? re.defeat : t.defeat, trainerId: t.id, prizeClass: data.className, double: !!t.double });
    if (re && outcome === "won") {
      (player.flags.dojoRematch || (player.flags.dojoRematch = {}))[t.id] = true;
      if (t.id === DOJO_MASTER) { show("world"); await Overworld.resume(); await dojoMaster(); }
    }
    // A beaten trainer who walked over to you stays where they stopped (see
    // visible()) while you're on the map: back in their spot they could shut
    // you in, as Route 25's Hiker Flint does the TM43 corner. Leave the map
    // and come back and they're home again, doing what they did before, as
    // in FireRed.
    if (approach && player.flags[t.id]) {
      const [dx, dy] = World.DIRS[facing];
      (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[t.id] =
        { map: player.location.map, x: person.x + dx * approach, y: person.y + dy * approach, facing };
    }
  }
  // A Trainer you've beaten (this game's own, in place of FireRed's VS Seeker): when you talk to them they say
  // their line, then "Rematch?" or "Never mind". A rematch is the same battle again, their intro, and their team
  // grown with the story (rematchTeam); win or lose, nothing else changes (they've been beaten already). Not in Orre, a Battle Pyramid's or the Fighting
  // Dojo's (which has its own: dojoRematch).
  async function trainerRematch(person) {
    const t = person.trainer, data = t && window.WORLD_TRAINERS[t.id];
    if (!data || !data.party || person.pyramid != null || (window.WORLD_MAPS[player.location.map] || {}).region === "orre") return;
    const pick = await multichoice(null, 0, 0, ["Rematch?", "Never mind"]);
    Screen.say("");
    if (pick !== 0) return;
    const text = /^EM_/.test(t.id) ? pairText(Object.assign({}, person, { trainer: Object.assign({}, t, { double: false }) })) : null;
    const intro = (/^HGSS_/.test(t.id) && gear.rematchIntroOf(t.id, rematchFoe(t.id))) || (text && text.intro) || t.intro;
    if (intro && [].concat(intro).length) await say(intro);
    if (!canBattle()) return;
    // (Johto's and Hoenn's: the team their own game would send out: rematchFoe.)
    const foeId = rematchFoe(t.id), foeData = window.WORLD_TRAINERS[foeId] || data;
    const double = !!(foeData.double || data.double || t.double) && canDouble();
    await battle("trainer", { foe: { name: foeData.className + " " + foeData.name, team: rematchTeam(foeId), pic: foeData.pic || data.pic },
      defeatText: (text && text.defeat) || t.defeat, trainerId: foeId, prizeClass: foeData.className, double });
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }
  // A rematch's team. Kanto's Trainers (the Sevii Islands' too) grow stronger as the story goes on, at FireRed's
  // VS Seeker's points (src/vs_seeker.c): once you've been to Vermilion (where FireRed gives the VS Seeker), to
  // Celadon, to Fuchsia, become Champion, and finished the Sevii Islands' story. FireRed has other teams for some
  // Trainers at those points; here each keeps their own, raised: the team's best up to about FireRed's rematch
  // levels there (REMATCH_TARGET) or a few levels more than it was (REMATCH_BUMP), whichever's higher, the rest by
  // as much. A Pokémon that would have evolved by then has: by level, as its evolution says; by a stone from
  // Lv. 32, by trading from 38, by friendship from 35 (one of several ways chosen by the Trainer, the same each
  // time). Johto's and Hoenn's are their own games' teams (rematchFoe).
  const REMATCH_TARGET = [0, 20, 25, 30, 50, 55], REMATCH_BUMP = [0, 2, 4, 6, 10, 14];
  // Whom a Trainer you talk to battles as, in a rematch: Kanto's as themselves (grown: rematchTeam). Johto's as HGSS
  // would (the Pokégear's choice of tier: gear.rematchFor). Hoenn's as Emerald would (src/battle_setup.c's
  // GetRematchTrainerIdFromTable): once you've five of Hoenn's Badges, when Emerald's rematches begin, their first
  // team in its rematch table (HOENN_MATCH_CALL.teams; the later ones, data/hoenn-rematches.js) you haven't beaten,
  // or their last; before that, their first. (Not the Gym Leaders', Wally's or the Elite Four's: theirs are their
  // own scenes.) Beating that team counts it beaten, so the next time it's the next one.
  const HOENN_REMATCH_SPECIAL = /^EM_TRAINER_(WALLY|ROXANNE|BRAWLY|WATTSON|FLANNERY|NORMAN|WINONA|TATE_AND_LIZA|JUAN|SIDNEY|PHOEBE|GLACIA|DRAKE|WALLACE)/;
  function rematchFoe(id) {
    if (/^HGSS_/.test(id)) return gear.rematchFor(id) || id;
    if (!/^EM_/.test(id) || HOENN_REMATCH_SPECIAL.test(id)) return id;
    const tiers = ((window.HOENN_MATCH_CALL || {}).teams || {})[id];
    if (!tiers || Player.REGION_BADGES.hoenn.filter((b) => player.badges.includes(b)).length < 5) return id;
    for (let i = 1; i < tiers.length; i++) {
      if (!window.WORLD_TRAINERS[tiers[i]]) return tiers[i - 1];
      if (!player.flags[tiers[i]]) return tiers[i];
    }
    return tiers[tiers.length - 1];
  }
  function kantoRematchTier() {
    const f = player.flags, seen = f.visitedSections || [];
    return f.canLinkWithRS ? 5 : f.gameClear ? 4 : seen.includes("FUCHSIA_CITY") ? 3 : seen.includes("CELADON_CITY") ? 2 : seen.includes("VERMILION_CITY") ? 1 : 0;
  }
  // What `species` would be by `level`, as a Trainer's Pokémon (`seed`: which of several evolutions).
  function grownSpecies(species, level, seed) {
    const ok = (e) => DEX[e.into] && !e.note && (e.method === "level" ? level >= e.level
      : e.method === "item" ? level >= 32 && !e.time : e.method === "trade" ? level >= 38 : e.method === "friendship" ? level >= 35 && !e.time && !e.moveType : false);
    for (let n = 0; n < 3; n++) {
      const ways = ((window.EVOLUTIONS || {})[species] || []).filter(ok);
      if (!ways.length) break;
      species = ways[seed % ways.length].into;
    }
    return species;
  }
  function rematchTeam(id) {
    const team = trainerTeam(id), here = window.WORLD_MAPS[player.location.map] || {};
    const tier = /^TRAINER_/.test(id) && !here.region ? kantoRematchTier() : 0;
    if (!tier || !team.length) return team;
    const top = Math.max(...team.map((r) => r.level)), up = Math.max(top + REMATCH_BUMP[tier], REMATCH_TARGET[tier]) - top;
    const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
    return team.map((r, i) => {
      const level = Math.min(100, r.level + up);
      return Object.assign(Party.create(grownSpecies(r.species, level, seed + i), level, { ivs: r.ivs.hp }), r.item ? { item: r.item } : {});
    });
  }
  // Two trainers who see you at once (Overworld's `second`): both walk up, one then the other, as Emerald's do, and
  // it's a double battle against the two of them, in every region but Orre (where every battle is a double). Not
  // for a trainer who battles two on their own, a rematch, the Battle Pyramid's or one buried in the sand; nor with
  // fewer than two Pokémon able to battle. Then (false) the first one comes alone, and the other after.
  function pairText(person) {
    const t = person.trainer, data = t && window.WORLD_TRAINERS[t.id];
    if (!data || data.double || t.double || t.buried || person.pyramid != null || dojoRematch(t.id)) return null;
    if (!/^EM_/.test(t.id)) return { intro: t.intro || [], defeat: t.defeat || ["…"] };
    // (Hoenn's: what its trainerbattle says, from Emerald's script.)
    const c = (window.HOENN_SCRIPTS.s[person.script] || []).find((op) => /^trainerbattle/.test(op[0]));
    const labels = !c ? null : c[0] === "trainerbattle_single" ? [c[2], c[3]]
      : c[0] === "trainerbattle" && !/DOUBLE|NO_INTRO/.test(String(c[1])) ? [c[4], c[5]] : null;
    const D = window.HOENN_SCRIPTS.t;
    return labels && { intro: D[labels[0]] || [], defeat: D[labels[1]] || ["…"] };
  }
  async function pairBattle(one, two) {
    if ((window.WORLD_MAPS[player.location.map] || {}).region === "orre" || !canDouble()) return false;
    const tx1 = pairText(one.person), tx2 = pairText(two.person);
    if (!tx1 || !tx2) return false;
    const [d1, d2] = [one, two].map((ev) => window.WORLD_TRAINERS[ev.person.trainer.id]);
    music(inJohto() ? johtoEyes(d1) : d1.music || "mus_encounter_boy");
    for (const ev of [one, two]) {
      await Overworld.act([{ who: "#" + ev.person.id, moves: ["emote_exclamation_mark"].concat(Array(ev.approach).fill("walk_" + ev.facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[ev.facing]] }]);
    }
    await say(tx1.intro);
    await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[one.facing]] }]);
    await say(tx2.intro);
    if (!canBattle()) return true;
    const foeOf = (ev, d) => ({ name: d.className + " " + d.name, team: trainerTeam(ev.person.trainer.id), pic: d.pic });
    const outcome = await battle("trainer", { foe: foeOf(one, d1), defeatText: tx1.defeat, trainerId: one.person.trainer.id, prizeClass: d1.className,
      foe2: Object.assign(foeOf(two, d2), { defeatText: tx2.defeat, prizeClass: d2.className }) });
    if (outcome !== "won") return true;
    player.flags[two.person.trainer.id] = true;
    for (const ev of [one, two]) {
      // (Where they stopped, as one who walked up alone: trainerBattle.)
      const [dx, dy] = World.DIRS[ev.facing];
      if (ev.approach) (player.flags.trainerSpots || (player.flags.trainerSpots = {}))[ev.person.trainer.id] =
        { map: player.location.map, x: ev.person.x + dx * ev.approach, y: ev.person.y + dy * ev.approach, facing: ev.facing };
      await afterRocket(ev.person);
      if (gear.wantsNumber(ev.person)) { show("world"); await Overworld.resume(); await gear.beatTrainer(ev.person); }
    }
    return true;
  }
  // FireRed's temporary flags (FLAG_TEMP_*: the trees you've cut, as
  // "map:flag"), cleared when you go to another map.
  const tempFlags = new Set();
  let tempFlagsMap = null;
  function clearTempFlags(map) {
    if (map !== tempFlagsMap) tempFlags.clear();
    tempFlagsMap = map;
  }
  function forgetTrainerSpots(map) {
    const spots = player.flags.trainerSpots;
    if (!spots) return;
    // (Spots saved before they named their map: the trainer's own map.)
    const mapOf = (id) => Object.keys(window.WORLD_MAPS).find((m) => window.WORLD_MAPS[m].people.some((p) => p.trainer && p.trainer.id === id));
    for (const id of Object.keys(spots)) if ((spots[id].map || mapOf(id)) !== map) delete spots[id];
  }

  // A FireRed trainer's party as party records.
  // (Their moves: the last four each learns by its level, not FireRed's sets.)
  function trainerTeam(id) {
    const data = window.WORLD_TRAINERS[id];
    if (data.region === "unova") return Unova.team(id);
    if (data.region === "sinnoh") return Sinnoh.team(id); // Platinum's authored movesets
    return data.party.map((m) => Object.assign(Party.create(m.species, m.level, { ivs: Math.floor(m.iv * 31 / 255) }),
      m.item ? { item: m.item } : {}));
  }

  // ---------- In-game trades ----------
  //
  // FireRed's sInGameTrades: what they want, what they give (nicknamed, with set
  // IVs: HP, Attack, Defense, Speed, Sp. Atk, Sp. Def), at your Pokémon's level.
  const TRADES = {
    mimien: { flag: "tradedMimien", wants: "Abra", gives: "Mr. Mime", nickname: "Mimien",
      ivs: { hp: 20, atk: 15, def: 17, spe: 24, spa: 23, spd: 22 }, ot: { name: "REYLEY", id: 1985 } },
    // Dontae, in Cerulean (FireRed's INGAME_TRADE_JYNX), with the other trade texts.
    zynx: { flag: "tradedZynx", wants: "Poliwhirl", gives: "Jynx", nickname: "Zynx",
      ivs: { hp: 18, atk: 17, def: 18, spe: 22, spa: 25, spd: 21 }, ot: { name: "DONTAE", id: 36728 },
      text: { ask: "Trade_Text_DoYouHaveMonWouldYouTradeForMon", no: "Trade_Text_WellIfYouDontWantTo",
        wrong: "Trade_Text_ThisIsntMon", thanks: "Trade_Text_Thanks", after: "Trade_Text_HasTradedMonGrownStronger" } },
    // Saige, at the Underground Path's north entrance on Route 5 (FireRed's
    // INGAME_TRADE_NIDORAN; FireRed's holds a Tiny Mushroom, which this game hasn't got).
    // Elyssa, in Vermilion City (FireRed's INGAME_TRADE_FARFETCHD).
    chDing: { flag: "tradedChDing", wants: "Spearow", gives: "Farfetch'd", nickname: "Ch'Ding",
      ivs: { hp: 20, atk: 25, def: 21, spe: 24, spa: 15, spd: 20 }, ot: { name: "ELYSSA", id: 8810 },
      text: { ask: "VermilionCity_House2_Text_DoYouHaveMonWantToTradeForMyMon", no: "VermilionCity_House2_Text_ThatsTooBad",
        wrong: "VermilionCity_House2_Text_ThisIsNoMon", thanks: "VermilionCity_House2_Text_ThankYou",
        after: "VermilionCity_House2_Text_HowIsMyOldMon" } },
    // Turner, upstairs in Route 11's gate (FireRed's INGAME_TRADE_NIDORINOA).
    nina: { flag: "tradedNina", wants: "Nidorino", gives: "Nidorina", nickname: "Nina",
      ivs: { hp: 22, atk: 25, def: 18, spe: 19, spa: 22, spd: 15 }, ot: { name: "TURNER", id: 13637 } },
    // Haden, upstairs in Route 18's gate (FireRed's INGAME_TRADE_LICKITUNG).
    marc: { flag: "tradedMarc", wants: "Golduck", gives: "Lickitung", nickname: "Marc",
      ivs: { hp: 24, atk: 19, def: 21, spe: 15, spa: 23, spd: 21 }, ot: { name: "HADEN", id: 1239 } },
    // In the Pokémon Lab on Cinnabar Island: Garett (FireRed's INGAME_TRADE_SEEL),
    // Clifton (INGAME_TRADE_ELECTRODE) and Norma (INGAME_TRADE_TANGELA, holding Stardust).
    seelor: { flag: "tradedSeelor", wants: "Ponyta", gives: "Seel", nickname: "Seelor",
      ivs: { hp: 24, atk: 15, def: 22, spe: 16, spa: 23, spd: 22 }, ot: { name: "GARETT", id: 9853 } },
    esphere: { flag: "tradedEsphere", wants: "Raichu", gives: "Electrode", nickname: "Esphere",
      ivs: { hp: 19, atk: 16, def: 18, spe: 25, spa: 25, spd: 19 }, ot: { name: "CLIFTON", id: 50298 },
      text: { ask: "Trade_Text_DoYouHaveMonWouldYouTradeForMon", no: "Trade_Text_WellIfYouDontWantTo",
        wrong: "Trade_Text_ThisIsntMon", thanks: "Trade_Text_Thanks", after: "Trade_Text_HasTradedMonGrownStronger" } },
    tangeny: { flag: "tradedTangeny", wants: "Venonat", gives: "Tangela", nickname: "Tangeny", item: "stardust",
      ivs: { hp: 22, atk: 17, def: 25, spe: 16, spa: 23, spd: 20 }, ot: { name: "NORMA", id: 60042 },
      text: { ask: "Trade_Text_DoYouHaveMonWantToTradeForMon", no: "Trade_Text_ThatsTooBad",
        wrong: "Trade_Text_ThisIsNoMon", thanks: "Trade_Text_ThanksYoureAPal", after: "Trade_Text_HowIsMyOldMon" } },
    msNido: { flag: "tradedMsNido", wants: "Nidoran-M", gives: "Nidoran-F", nickname: "Ms. Nido",
      ivs: { hp: 22, atk: 18, def: 25, spe: 19, spa: 15, spd: 22 }, ot: { name: "SAIGE", id: 63184 },
      text: { ask: "Trade_Text_DoYouHaveMonWantToTradeForMon", no: "Trade_Text_ThatsTooBad",
        wrong: "Trade_Text_ThisIsNoMon", thanks: "Trade_Text_ThanksYoureAPal", after: "Trade_Text_HowIsMyOldMon" } }
  };
  // FireRed's trade sequence (ui/trade-scene.js): `mine` leaves for `partner`
  // and `theirs` arrives, from the black and back to it.
  async function tradeScene(mine, theirs, partner) {
    show("scene");
    Screen.say("");
    clearMenu();
    music(null);
    const pic = (r) => ({ url: Screen.spriteUrl(r.species, Party.form(r), false, r.shiny), species: r.species, name: Party.displayName(r) });
    const t = await TradeScene.open(scene, {
      send: pic(mine), receive: pic(theirs), partner,
      say: (text) => Screen.say(fill(text)), cry: (sp) => cry(sp), music, fanfare,
      waitA: () => Screen.printed().then(() => Screen.waitForA())
    });
    try { await t.run(); } finally { t.close(); }
    Screen.say("");
  }
  async function inGameTrade(trade) {
    const f = player.flags, vars = [Party.speciesName(trade.wants), Party.speciesName(trade.gives)];
    const X = Object.assign({ ask: "Trade_Text_LookingForMonWannaTradeForMon", no: "Trade_Text_AwwOhWell",
      wrong: "Trade_Text_WhatThatsNoMon", thanks: "Trade_Text_HeyThanks", after: "Trade_Text_IsntMyOldMonGreat" }, trade.text);
    if (f[trade.flag]) { await say(T(X.after), vars); return; }
    const ask = T(X.ask);
    await say(ask.slice(0, -1), vars);
    if (!(await confirm(fill(ask[ask.length - 1], vars)))) { await say(T(X.no)); return; }
    const mine = await choosePartyFor("Choose a POKéMON.");
    show("world");
    if (!mine) { await say(T(X.no)); return; }
    const i = player.party.indexOf(mine);
    if (mine.species !== trade.wants || mine.egg) { await say(T(X.wrong), vars); return; }
    const theirs = Party.create(trade.gives, mine.level, { nickname: trade.nickname });
    theirs.ivs = Object.assign({}, trade.ivs);
    if (trade.ot) theirs.ot = Object.assign({}, trade.ot);
    if (trade.item) theirs.item = trade.item;   // (what it holds: FireRed's heldItem)
    theirs.met = { level: theirs.level, map: player.location.map, traded: true };
    theirs.hp = Party.maxHp(theirs);
    // (Their trainer, FireRed's OT name in capitals: "REYLEY" -> "Reyley".)
    await tradeFor(i, theirs, trade.ot ? trade.ot.name.charAt(0) + trade.ot.name.slice(1).toLowerCase() : "the trainer");
    f[trade.flag] = true;
    await say(T(X.thanks));
  }
  // Your Pokémon in party slot `i` for `theirs`, as FireRed shows it; then back to the map.
  async function tradeFor(i, theirs, partner) {
    await tradeScene(player.party[i], theirs, partner);
    player.party[i] = theirs;
    Player.markCaught(player, theirs.species);
    // (Back to the map: FireRed's CB2_ReturnToField, the map's music again.)
    show("world");
    music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
    await Overworld.resume();
  }

  // A Pokémon Center nurse. Blacking out later brings you back to this one.
  // She turns to the machine behind her, your Poké Balls go in and it heals
  // them (FLDEFF_POKECENTER_HEAL), and she turns back.
  async function nurse(mapName, who) {
    const [welcome, ask] = T("Text_WelcomeWantToHealPkmn");
    await say(welcome);
    if (!(await confirm(fill(ask)))) { await say(T("Text_WeHopeToSeeYouAgain")); return; }
    await say(T("Text_TakeYourPkmnForFewSeconds"));
    Screen.say("");
    const id = who && who.localId;
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterLeft") }]);
    await Overworld.pokecenterHeal(player.party.length, () => fanfare("mus_heal"));
    if (id) await Overworld.act([{ who: id, moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    player.party.forEach(Party.heal);
    if (centerOf(mapName)) player.flags.lastCenter = mapName;
    await say(T("Text_RestoredPkmnToFullHealth"));
    await say(T("Text_WeHopeToSeeYouAgain"));
  }

  // FireRed's move tutors (EventScript_DreamEaterTutor and the like), with
  // their own lines (Text_<Move>Teach, ...Declined, ...WhichMon, ...Taught).
  // In FireRed each teaches its move once; here they all teach it again and
  // again, for `price` each time (TUTOR_PRICE unless given; null: free).
  // `taught`: the label of what they say once it's taught, if not <text>Taught.
  // True when it's taught this time.
  function tutorCanLearn(record, move) {
    const set = window.LEARNSETS_GEN6[record.species] || {};
    return [].concat(set.tm || [], set.tutor || [], (set.levelup || []).map((l) => l[1])).includes(move) ||
      ((window.TUTOR_LEARNERS || {})[move] || []).includes(record.species);
  }
  async function moveTutor(move, flag, text, price, taught) {
    const f = player.flags;
    taught = taught || text + "Taught";
    if (price === undefined) price = TUTOR_PRICE;
    const teach = T(text + "Teach");
    await say(teach.slice(0, -1));
    const declined = () => say(T(text + "Declined"));
    if (!(await confirm(fill(teach[teach.length - 1])))) { await declined(); return; }
    if (price) {
      if (!(await confirm("It'll cost " + money(price) + ". Is that okay?\n(You have " + money(player.money) + ".)"))) { await declined(); return; }
      if (player.money < price) { await say("You don't have enough money."); return; }
    }
    await say(T(text + "WhichMon"));
    // (Each box says whether it can learn the move, as FireRed's tutors' party screen does.)
    const notes = player.party.map((r) => (r.egg || !tutorCanLearn(r, move) ? "NOT ABLE" : Party.knowsMove(r, move) ? "LEARNED" : "ABLE"));
    const record = await choosePartyFor("Teach which {PKMN}?", null, notes);
    show("world");
    if (!record) { await declined(); return; }
    if (record.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); return; }
    const name = Party.displayName(record);
    if (Party.knowsMove(record, move)) { await say(name + " already knows " + move + "."); return; }
    if (!tutorCanLearn(record, move)) { await say(name + " can't learn " + move + "."); return; }
    await learnMove(record, move);
    if (!Party.knowsMove(record, move)) { await declined(); return; }
    if (price) {
      Player.addMoney(player, -price);
      await say(player.name + " paid " + money(price) + ".");
    }
    f[flag] = true;
    await say(T(taught));
    return true;
  }

  // Celadon Dept. Store 2F's TM counter: Hyper Beam, Dark Pulse, Flash Cannon, Stone Edge and Dazzling Gleam (by the move, this
  // game's numbers).
  const CELADON_TMS = ["Hyper Beam", "Dark Pulse", "Flash Cannon", "Stone Edge", "Dazzling Gleam"].map((mv) => Bag.machines().find((m) => /^tm/.test(m) && Bag.machineMove(m) === mv));
  // What the move tutors charge each time they teach.
  const TUTOR_PRICE = 10000;

  // Lavender Town's Name Rater (LavenderTown_House2_EventScript_NameRater):
  // renames a Pokémon you caught yourself; one from a trade keeps its name.
  async function nameRater() {
    const N = (k) => T("LavenderTown_House2_Text_" + k);
    const q = N("WantMeToRateNicknames");
    await say(q.slice(0, -1));
    if (!(await confirm(q[q.length - 1]))) { await say(N("ISeeComeVisitAgain")); return; }
    await say(N("CritiqueWhichMonsNickname"));
    const r = await choosePartyFor("Rate which {PKMN}'s nickname?");
    show("world");
    if (!r) { await say(N("ISeeComeVisitAgain")); return; }
    if (r.egg) { await say(N("ThatIsMerelyAnEgg")); return; }
    const name = Party.displayName(r);
    const traded = (r.met && r.met.traded) || (r.ot && (r.ot.id !== player.trainerId || r.ot.name !== player.name));
    if (traded) { await say(N("TrulyImpeccableName"), [name]); return; }
    const g = N("GiveItANicerName");
    await say(g.slice(0, -1), [name]);
    if (!(await confirm(fill(g[g.length - 1], [name])))) { await say(N("ISeeComeVisitAgain")); return; }
    await say(N("WhatShallNewNicknameBe"));
    const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", name, 10);
    const next = typed || name;
    if (next === Party.speciesName(r.species)) delete r.nickname; else r.nickname = next;
    await say(N(next === name ? "FromNowOnShallBeKnownAsSameName" : "FromNowOnShallBeKnownAsName"), [next]);
  }

  // ---------- Badges ----------

  const hasBadge = (id) => player.badges.includes(id);

  // Kanto scenes use the current player, including after loading another save.
  const { route22Rival, viridianStopStep, viridianOldManStop, redForestStep, redForest,
    jessieJamesStep, jessieJames, laterJessieJamesStep, laterJessieJames,
    ceruleanRival, towerRival } = KantoStory.create({
    get player() { return player; },
    music, say, T, M, battle, show, sfx, canBattle, canDouble,
    hasBadge, trainerTeam, STARTER_BALLS, RIVAL_PICK
  });

  // ---------- Leaf, outside Pewter Gym and in Vermilion City ----------
  //
  // Leaf waits a few steps from Pewter Gym's door once you have the Boulder
  // Badge. Coming out (or talking to her), she sees you ("!"), comes over,
  // happy for you: she has a Pokédex from Prof. Oak too, and wants a battle
  // (healing your Pokémon first). Butterfree (level 14: it Terastallizes into
  // a pure Flying type), her starter (level 15, the one weak against yours)
  // and Jigglypuff (level 13). Losing blacks you
  // out and she's waiting again; beat her and she gives you TM54 False Swipe
  // and heads off west, out of sight.
  //
  // In Vermilion City she waits where the road from Route 6 comes in, and
  // battles you as you come down it: Butterfree (18, Terastallizing into a
  // Flying type again), Wigglytuff (20),
  // Nidorina (21) and her starter's evolution (22).
  const LEAF = "LOCALID_LEAF";
  const LEAF_SPOTS = { PewterCity: { x: 19, y: 17, facing: "left" }, VermilionCity: { x: 23, y: 10, facing: "up" } };
  // People the game's scenes add to a map (Overworld's ctx.extraPeople).
  // ---------- Mega Stones ----------
  //
  // (This game's own.) Mega Stones lying about Kanto as item balls, each
  // with its own flag (flags["megaStone:<item>"]): Beedrillite in Viridian
  // Forest, Aerodactylite in Mt. Moon, Gyaradosite on Route 25, Slowbronite
  // in the Seafoam Islands, Pinsirite and Scizorite in the Safari Zone (its
  // Center and East areas), and Mewtwonite X
  // and Y beside Mewtwo's spot in Cerulean Cave once it's caught or beaten.
  // Others are gifts (megaStoneGift): Gary's Pidgeotite on Silph Co. 7F,
  // Sabrina's Alakazite and Giovanni's Kangaskhanite with their badges. A
  // save from before these gifts finds Gary's and Giovanni's (who have gone)
  // as item balls where they stood, and Sabrina gives hers when you talk to
  // her again.
  const megaFlag = (item) => "megaStone:" + item;
  const hoennChampion = (f) => !!(f.hoenn && f.hoenn.f && f.hoenn.f.FLAG_SYS_GAME_CLEAR);
  const MEGA_STONE_BALLS = [
    { map: "ViridianForest", x: 3, y: 55, item: "beedrillite" },
    { map: "MtMoon_B2F", x: 46, y: 22, item: "aerodactylite" },
    { map: "Route25", x: 41, y: 2, item: "gyaradosite" },
    { map: "SeafoamIslands_1F", x: 3, y: 18, item: "slowbronite" },
    { map: "SafariZone_Center", x: 9, y: 29, item: "pinsirite" },
    { map: "SafariZone_East", x: 44, y: 13, item: "scizorite" },
    { map: "CeruleanCave_B1F", x: 5, y: 12, item: "mewtwonite-x", when: (f) => f.foughtMewtwo },
    { map: "CeruleanCave_B1F", x: 9, y: 12, item: "mewtwonite-y", when: (f) => f.foughtMewtwo },
    // (Left behind for a save that beat them before they gave these.)
    { map: "SilphCo_7F", x: 2, y: 6, item: "pidgeotite", when: (f) => f.silphRival },
    { map: "ViridianCity_Gym", x: 2, y: 2, item: "kangaskhanite", when: (f) => f.giovanniLeft },
    // Legends: Z-A's, for Kanto's Pokémon: where each lives.
    { map: "MtMoon_1F", x: 45, y: 37, item: "clefablite" },
    { map: "Route25", x: 16, y: 6, item: "victreebelite" },
    { map: "PowerPlant", x: 11, y: 38, item: "raichunite-x" },
    { map: "PowerPlant", x: 47, y: 9, item: "raichunite-y" },
    { map: "SeafoamIslands_B4F", x: 33, y: 5, item: "starminite" },
    { map: "SafariZone_West", x: 7, y: 15, item: "dragoninite" },
    // Hoenn's (this game's own spots, after Omega Ruby and Alpha Sapphire's stones): each where its Pokémon lives, or
    // its Trainer; the starters' on Prof. Birch's lab's table once you're Hoenn's Champion, Steven's Metagrossite in
    // his Mossdeep house once you've beaten him at Meteor Falls. (Latias's and Latios's come with them: latiGift.)
    { map: "Route102", x: 11, y: 14, item: "gardevoirite", id: 1260 },
    { map: "HoennVictoryRoad_1F", x: 41, y: 26, item: "galladite", id: 1261 },
    { map: "GraniteCave_B2F", x: 3, y: 4, item: "mawilite", id: 1262 },
    { map: "GraniteCave_B2F", x: 4, y: 5, item: "aggronite", id: 1263 },
    { map: "GraniteCave_B1F", x: 14, y: 21, item: "sablenite", id: 1264 },
    { map: "MtPyre_Exterior", x: 27, y: 14, item: "medichamite", id: 1265 },
    { map: "MtPyre_6F", x: 5, y: 9, item: "banettite", id: 1266 },
    { map: "NewMauville_Inside", x: 35, y: 39, item: "manectite", id: 1267 },
    { map: "Route120", x: 20, y: 54, item: "absolite", id: 1268 },
    { map: "ShoalCave_LowTideIceRoom", x: 11, y: 8, item: "glalitite", id: 1269 },
    { map: "MeteorFalls_B1F_1R", x: 9, y: 5, item: "salamencite", id: 1270 },
    { map: "Route115", x: 24, y: 38, item: "altarianite", id: 1271 },
    { map: "MagmaHideout_4F", x: 4, y: 7, item: "cameruptite", id: 1272 },
    { map: "AquaHideout_B2F", x: 2, y: 13, item: "sharpedonite", id: 1273 },
    { map: "MossdeepCity_StevensHouse", x: 3, y: 3, item: "metagrossite", id: 1274, when: (f) => !!f.EM_TRAINER_STEVEN },
    { map: "LittlerootTown_ProfessorBirchsLab", x: 8, y: 11, item: "sceptilite", id: 1275, when: (f) => hoennChampion(f) },
    { map: "LittlerootTown_ProfessorBirchsLab", x: 9, y: 11, item: "blazikenite", id: 1276, when: (f) => hoennChampion(f) },
    { map: "LittlerootTown_ProfessorBirchsLab", x: 10, y: 11, item: "swampertite", id: 1277, when: (f) => hoennChampion(f) }
  ].map((b, i) => Object.assign({ id: 950 + i, script: "Game_EventScript_MegaStone_" + b.item, flag: megaFlag(b.item),
    movement: "face_down", text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }, b));
  for (const b of MEGA_STONE_BALLS) ITEM_BALLS.add(b.script);
  const megaStoneBalls = (map) => MEGA_STONE_BALLS.filter((b) => b.map === map && (!b.when || b.when(player.flags)));
  // ---------- Item balls of the older games (this game's own) ----------
  //
  // Every TM lying about as an item ball in Red, Blue and Yellow, or in Gold,
  // Silver and Crystal, is one here too, where those games had it: beside the
  // ball FireRed or HeartGold put in its place (FireRed's Mt. Moon Bullet Seed
  // where Water Gun was), unless that map already has a ball of the same TM.
  // Each spot is open floor you can reach and face, blocking no way through,
  // no ladder or door, no boulder's path and no spinner's or ice's slide.
  // And a Metal Coat in Rock Tunnel. Each has its own flag (flags["itemBall:<map>:<item>"]).
  const OLD_GAME_BALLS = [
    // Red, Blue and Yellow's:
    { map: "MtMoon_1F", x: 11, y: 34, item: "tm123" },   // (Water Gun)
    { map: "MtMoon_B2F", x: 34, y: 5, item: "tm114" },   // (Mega Punch)
    { map: "PowerPlant", x: 41, y: 22, item: "tm33" },   // (Reflect)
    { map: "RocketHideout_B2F", x: 5, y: 8, item: "tm118" },   // (Horn Drill)
    { map: "RocketHideout_B3F", x: 20, y: 14, item: "tm121" },   // (Double-Edge)
    { map: "RocketHideout_B4F", x: 2, y: 6, item: "tm115" },   // (Razor Wind)
    { map: "Route12", x: 18, y: 35, item: "tm124" },   // (Pay Day)
    { map: "Route15", x: 20, y: 5, item: "tm128" },   // (Rage)
    { map: "Route24", x: 11, y: 3, item: "tm72" },   // (Thunder Wave)
    { map: "Route25", x: 27, y: 2, item: "tm127" },   // (Seismic Toss)
    { map: "Route4", x: 67, y: 4, item: "tm116" },   // (Whirlwind)
    { map: "Route9", x: 12, y: 16, item: "tm132" },   // (Teleport)
    { map: "SSAnne_1F_Room2", x: 5, y: 6, item: "tm119" },   // (Body Slam)
    { map: "SafariZone_East", x: 30, y: 18, item: "tm137" },   // (Egg Bomb)
    { map: "SafariZone_North", x: 27, y: 9, item: "tm139" },   // (Skull Bash)
    { map: "SilphCo_10F", x: 2, y: 13, item: "tm26" },   // (Earthquake)
    { map: "SilphCo_5F", x: 0, y: 18, item: "tm120" },   // (Take Down)
    { map: "SilphCo_7F", x: 30, y: 10, item: "tm74" },   // (Swords Dance)
    { map: "VictoryRoad_1F", x: 17, y: 1, item: "tm141" },   // (Sky Attack)
    { map: "VictoryRoad_2F", x: 41, y: 9, item: "tm125" },   // (Submission)
    { map: "VictoryRoad_2F", x: 2, y: 18, item: "tm117" },   // (Mega Kick)
    { map: "VictoryRoad_3F", x: 12, y: 15, item: "tm64" },   // (Explosion)
    // Gold, Silver and Crystal's:
    { map: "BurnedTower_B1F", x: 9, y: 6, item: "tm152" },   // (Endure)
    { map: "DarkCave_Route45Side", x: 13, y: 49, item: "tm150" },   // (Snore)
    { map: "IcePath_B2F", x: 57, y: 10, item: "tm44" },   // (Rest)
    { map: "LakeOfRage", x: 25, y: 2, item: "tm158" },   // (Detect)
    { map: "MtMortar_2F", x: 29, y: 33, item: "tm156" },   // (Defense Curl)
    { map: "RockTunnel_1F", x: 16, y: 29, item: "tm51" },   // (Steel Wing)
    { map: "Route27", x: 88, y: 23, item: "tm22" },   // (Solar Beam)
    { map: "Route35", x: 28, y: 60, item: "tm147" },   // (Rollout)
    { map: "UnionCave_B1F", x: 12, y: 42, item: "tm138" },   // (Swift)
    { map: "VictoryRoad_3F", x: 38, y: 9, item: "tm26" },   // (Earthquake)
    { map: "RockTunnel_B1F", x: 24, y: 19, item: "metal-coat" },   // (Metal Coat)
  // (Johto's are at HGSS's tiles: on its maps as they are now, Heart & Soul's, ui/johto-coords.js. Their scripts and
  // flags keep the HGSS map's name, so one picked up stays picked up.)
  ].map((b) => (window.JohtoCoords && ((window.JOHTO_COORDS || {}).where || {})[b.map] ? Object.assign({ hgssMap: b.map }, b, window.JohtoCoords.toMapFree(b.map, b.x, b.y)) : b))
  .map((b, i) => Object.assign({ id: 1100 + i, script: "Game_EventScript_ItemBall_" + (b.hgssMap || b.map) + "_" + b.item, flag: "itemBall:" + (b.hgssMap || b.map) + ":" + b.item,
    movement: "face_down", text: null, sprite: "item_ball", width: 16, height: 16, frames: 1, inanimate: true }, b));
  for (const b of OLD_GAME_BALLS) ITEM_BALLS.add(b.script);
  // A Mega Stone handed over: `lines` first, then "… received …!" with the jingle; once.
  async function megaStoneGift(item, lines, from) {
    const f = player.flags;
    if (f[megaFlag(item)]) return false;
    if (lines) await say(lines);
    Player.addItem(player, item);
    f[megaFlag(item)] = true;
    await sayWithJingle(itemJingle(item), fill("{PLAYER} received the " + Bag.name(item) + "\nfrom " + from + "!"));
    return true;
  }

  // Azalea's Gym's Ariados (Heart & Soul's AzaleaTown_Gym_EventScript_Trigger_1-12; HGSS's Spinarak carts ride
  // the same webs): step on a station beside one of the pits' pads and an Ariados comes up the web to the pad;
  // you hop on and it carries you along the web, down the middle of the pit and across, to the station it pairs
  // with, where you hop off. Stations 1-3 below the lower pit, 4-6 above it, 7-9 below the upper one, 10-12 above
  // it, each in the left, middle and right columns; Heart & Soul's pairs: 1-5, 2-6, 3-4, 7-10, 8-12, 9-11.
  const AZALEA_RIDE = { cols: [6, 11, 16], rows: [39, 27, 23, 11], pads: [38, 28, 22, 12], webs: [33, 33, 17, 17],
    pairs: { 1: 5, 5: 1, 2: 6, 6: 2, 3: 4, 4: 3, 7: 10, 10: 7, 8: 12, 12: 8, 9: 11, 11: 9 } };
  async function azaleaRide(n) {
    const R = AZALEA_RIDE, to = R.pairs[n];
    if (!to) return;
    const row = Math.floor((n - 1) / 3), col = (n - 1) % 3, row2 = Math.floor((to - 1) / 3), col2 = (to - 1) % 3;
    const x = R.cols[col], pad = R.pads[row], web = R.webs[row], x2 = R.cols[col2], pad2 = R.pads[row2], stop = R.rows[row2];
    const into = pad < R.rows[row] ? "up" : "down", out = pad2 < stop ? "down" : "up";
    const steps = (from, to, up, down) => Array(Math.abs(to - from)).fill(to < from ? up : down);
    const ARIADOS = "LOCALID_AZALEA_ARIADOS";
    const look = { sprite: "follow/168", width: 32, height: 32, frames: 9, offsetX: -8, inanimate: true };
    await Overworld.act([{ who: "player", moves: ["face_" + into] }]);
    // (It comes up the web to the pad.)
    Overworld.addObject(ARIADOS, { x, y: web, facing: into === "up" ? "down" : "up" }, look);
    await Overworld.act([{ who: ARIADOS, moves: steps(web, pad, "walk_up", "walk_down").concat(["face_" + into]) }]);
    await Overworld.act([{ who: "player", moves: ["delay_16", "delay_16", "jump_" + into] }]);
    sfx("se_bike_hop");
    // (Along the web: to the middle of the pit, across, and on to the far pad.)
    const ride = steps(pad, web, "walk_up", "walk_down").concat(steps(x, x2, "walk_left", "walk_right"), steps(web, pad2, "walk_up", "walk_down"));
    await Overworld.act([{ who: ARIADOS, moves: ride }, { who: "player", moves: ride }]);
    await Overworld.act([{ who: "player", moves: ["jump_" + out] }]);
    sfx("se_bike_hop");
    await Overworld.act([{ who: ARIADOS, moves: steps(pad2, R.webs[row2], "walk_up", "walk_down") }]);
    Overworld.removeObject(ARIADOS);
  }

  // The Magnet Train's doors (Heart & Soul's stations, tools/build-magnet-train.js): walked up into from the
  // platform, past the ticket gate, the ride (ui/magnet-train.js), and you're at the other station's door, off
  // the train and down through its gate (Heart & Soul's ExitTrain). Saffron's runs once you're the Champion.
  const MAGNET_DOORS = {
    GoldenrodCity_MagnetTrainStation_1F: { x: 19, y: 5, to: "SaffronCity_MagnetTrainStation_1F" },
    SaffronCity_MagnetTrainStation_1F: { x: 30, y: 5, to: "GoldenrodCity_MagnetTrainStation_1F" }
  };
  async function magnetTrainBoard() {
    const from = MAGNET_DOORS[player.location.map], to = from && MAGNET_DOORS[from.to];
    if (!to || (from.to === "GoldenrodCity_MagnetTrainStation_1F" && !player.flags.gameClear)) {
      await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      return;
    }
    sfx("se_exit");
    await magnetTrain.ride(from.to === MagnetTrain.SAFFRON ? 0 : 1, from.to, to.x, to.y);
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_left", "walk_left", "walk_left", "walk_down", "walk_down", "walk_down"] }]);
  }

  // Goldenrod Underground's switch room (Heart & Soul's GoldenrodCity_UndergroundSwitches, in place of HGSS's
  // gates): three panels on its top wall, each on or off, open and shut its six walls (3 across the top row, 3 the
  // middle); 3, then 2, then 1 opens the way to the warehouse (2, 3 and 5), for good. The walls are shut each time
  // you come in, until then (GoldenrodUnderground1_OnLoad). The walls: the map's patches open1-6.
  const GOLDENROD_SWITCHES = "GoldenrodCity_Tunnel_B2F";
  let goldenrodSw = { on: {}, order: false, open: [] };
  function goldenrodSwitchesEnter() { goldenrodSw = { on: {}, order: false, open: player.flags.goldenrodSwitchesDone ? [2, 3, 5] : [] }; }
  async function goldenrodPanel(n) {
    const S = goldenrodSw;
    let open = [], sound = "se_bang";
    if (S.on[n]) {
      S.on[n] = false;
      if (n !== 1) S.order = false;
    } else {
      S.on[n] = true;
      if (n === 3) { S.order = false; open = [1, 4]; sound = "se_click"; }
      else if (n === 2) {
        if (S.on[1]) { S.order = false; open = [1, 2, 3]; }
        else if (S.on[3]) { S.order = true; open = [2, 3]; sound = "se_click"; }
        else open = [1, 2, 3];
      } else if (S.order) { player.flags.goldenrodSwitchesDone = true; open = [2, 3, 5]; sound = "se_click"; }
      else open = [1, 2, 3];
    }
    sfx(sound);
    await say("SWITCH " + n + (S.on[n] ? " activated." : " deactivated."));
    S.open = open;
    applyPatches(GOLDENROD_SWITCHES);
  }

  function extraPeople(map) {
    const out = megaStoneBalls(map).concat(OLD_GAME_BALLS.filter((b) => b.map === map), isHoenn(map) ? hoennDecor.overlay(map).people : [], map === PYRAMID_FLOOR ? pyramidPeople() : []);
    // The Tradeback Guy, upstairs in every Pokémon Center.
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 901, localId: "LOCALID_TRADEBACK_GUY", script: "Game_EventScript_TradebackGuy", x: 12, y: 5,
        movement: "face_down", text: null }, window.WORLD_SPRITES.tradeback));
    }
    // The S.S. Aqua's sailor on Vermilion's dock, once the S.S. Anne's gone and you've been to Johto.
    if (map === "SSAnne_Exterior" && player.flags.ssAnneDeparted && player.flags.johto) {
      out.push(Object.assign({ id: 903, localId: "LOCALID_SS_AQUA_SAILOR", script: "Game_EventScript_SSAquaSailor", x: 33, y: 7,
        movement: "face_left", text: null }, lookOf("sailor")));
    }
    // The Rejuvenator, upstairs in every Pokémon Center too (rejuvenator()).
    if (/_PokemonCenter_2F$/.test(map)) {
      out.push(Object.assign({ id: 902, localId: "LOCALID_REJUVENATOR", script: "Game_EventScript_Rejuvenator", x: 3, y: 5,
        movement: "face_down", text: null }, lookOf("scientist")));
    }
    if (map === "PokemonTower_7F" && megaTowerDue()) out.push(...megaTowerPeople());
    if (map === "CeladonCity_GameCorner_CardRoom") out.push(...cardRoomCrowd());
    if (leafWaiting(map)) {
      const at = LEAF_SPOTS[map];
      out.push(Object.assign({ id: 900, localId: LEAF, script: "Game_EventScript_Leaf", x: at.x, y: at.y,
        movement: "face_" + at.facing, text: null }, window.WORLD_SPRITES.leaf));
    }
    return out;
  }
  // The second-stage starter her lab Pokémon has become by Vermilion.
  const STAGE_TWO = { Bulbasaur: "Ivysaur", Charmander: "Charmeleon", Squirtle: "Wartortle" };

  // ---------- Move Relearner and Move Deleter (each Poké Mart's 2F) ----------
  //
  // The Relearner teaches a Pokémon a move it could have learned by its level,
  // for a Heart Scale (as in Gen 6); the Deleter makes it forget one, free.

  // Level-up moves a Pokémon could know by now but doesn't: its own, and (so
  // no move is missed by evolving early) those its earlier forms learn by its
  // level, e.g. a level 30 Venusaur can relearn Ivysaur's moves up to level 30.
  let preEvolutions = null;
  function evolutionLine(species) {
    if (!preEvolutions) {
      preEvolutions = {};
      for (const [from, list] of Object.entries(window.EVOLUTIONS || {})) for (const e of list) preEvolutions[e.into] = preEvolutions[e.into] || from;
    }
    const line = [species];
    for (let sp = species; preEvolutions[sp] && !line.includes(preEvolutions[sp]); sp = preEvolutions[sp]) line.push(preEvolutions[sp]);
    return line;
  }
  function relearnable(record) {
    const sets = window.LEARNSETS_GEN6 || {};
    const known = new Set(record.moves.map((m) => m.name));
    const out = [];
    for (const species of evolutionLine(record.species)) {
      const set = sets[species] || sets[String(species).split("-")[0]];
      for (const [lvl, move] of (set && set.levelup) || []) {
        if (lvl <= record.level && window.MOVES[move] && !known.has(move) && !out.includes(move)) out.push(move);
      }
    }
    return out;
  }
  async function moveRelearner() {
    await say(["I'm the Move Relearner.", "I can make your Pokémon remember a\nmove it has forgotten, in exchange\nfor a Heart Scale."]);
    if (!Player.itemCount(player, "heart-scale")) { await say("If you bring me a Heart Scale, I'll\nteach your Pokémon a move."); return; }
    for (;;) {
      if (!(await confirm("Shall I teach a Pokémon a move for a Heart Scale? (You have " + Player.itemCount(player, "heart-scale") + ".)"))) return;
      const r = await choosePartyFor("Choose a POKéMON.");
      if (!r) continue;
      if (r.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); continue; }
      const moves = relearnable(r);
      if (!moves.length) { await say("Sorry… There's no move I can teach\nthat Pokémon."); continue; }
      // FireRed's Move Relearner screen (ui/move-relearner.js); forgetting a
      // move picks it on the Summary screen's move list.
      Screen.say("");
      clearMenu();
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        forget: (m) => chooseMoveToForget(r, m),
        teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      if (move && Party.knowsMove(r, move)) {
        Player.removeItem(player, "heart-scale");
        await say("{PLAYER} handed over a Heart Scale\nin exchange.");
        await persist();
      }
      return;
    }
  }
  // Which of `record`'s moves to forget for `move`: FireRed's Summary screen
  // in its move-choosing mode (the new move below the four). -> slot or null.
  function chooseMoveToForget(record, move) {
    Screen.say("");
    clearMenu();
    return SummaryScreen.chooseMove(summaryView(record), move, { frame: GameOptions.get().frame });
  }

  async function moveDeleter() {
    await say(["Uh… Oh, yes, I'm the Move Deleter.", "I can make Pokémon forget their\nmoves."]);
    for (;;) {
      if (!(await confirm("Would you like me to make a Pokémon forget a move?"))) return;
      const r = await choosePartyFor("Choose a POKéMON.");
      if (!r) continue;
      if (r.egg) { await say(T("FuchsiaCity_House3_Text_NoEggShouldKnowMoves")); continue; }
      if (r.moves.length <= 1) { await say(Party.displayName(r) + " seems to know only\none move…"); continue; }
      const i = await ask("Which move should be forgotten?", r.moves.map((m, k) => ({ label: m.name, value: k, className: "type-" + MOVES[m.name].type }))
        .concat([back()]));
      if (i === "back") continue;
      const name = r.moves[i].name;
      if (!(await confirm("Hm! " + Party.displayName(r) + "'s " + name + "? That move should be forgotten?"))) continue;
      r.moves.splice(i, 1);
      await say(["It worked to perfection!", Party.displayName(r) + " has forgotten\n" + name + " completely."]);
      await persist();
      return;
    }
  }

  // ---------- Pallet Town's Sign Lady ----------
  //
  // FireRed's: at first she stands in front of the Trainer Tips sign, reading
  // it ("Hmm… Is that right…"). Talk to her and she notices you ("Oh! Look,
  // look!") and steps aside; until you read it, "Read it, read it!". Once you
  // have, "Signs are useful, aren't they?", and next time you come to Pallet
  // Town she's done: she wanders, raising Pokémon. If you get your starter
  // without having read the sign or opened the menu, she waits by the north
  // exit and recites it to you. flags.signLady: 0 (or none), 1 just read, 2 done.
  const SIGN_LADY = "LOCALID_PALLET_SIGN_LADY";
  let signLadyAside = false;   // stepped aside this visit (FireRed's FLAG_TEMP_2)
  // Where she is is decided when you arrive in Pallet Town (FireRed's
  // OnTransition) and kept for the whole visit, so she stays put after her
  // scene; signLadyVisit is cleared once you're on another map.
  let signLadyVisit = null;
  const leftPallet = (map) => { if (map !== "PalletTown") signLadyVisit = null; };

  // ---------- Pokémon Tower ----------
  //
  // Without the Silph Scope, the wild Pokémon in Pokémon Tower are ghosts
  // nobody can identify (FireRed's CheckSilphScopeInPokemonTower): your
  // Pokémon are too scared to fight, so you run.
  let inPurifiedZone = false;
  const towerGhost = () => /^PokemonTower_/.test(player.location.map) && !Player.itemCount(player, "silph-scope");

  // ---------- Prof. Oak's Mega Evolution test (this game's own) ----------
  //
  // With four badges and Pokémon Tower put to rest, one of Prof. Oak's aides
  // finds you as you come out (of the Gym or the Volunteer House, whichever
  // came second) and sends you up the Tower, where Oak and Mr. Fuji wait at
  // the top, and Leaf, Gary and Red in a line before them. Oak is studying
  // Mega Evolution, and tests everyone: Leaf, then Gary, then Red steps away
  // from the others with you, down the floor, to battle you (their aces
  // Terastallize; the others battle off screen), and goes back to their
  // place; after each, Oak comes down to heal your Pokémon and goes back to
  // his, while you stay where you are till all three are done (your Pokémon
  // back in its Ball the whole time: there's no room). Lose one and you black out as usual, and the
  // test starts over when you come back. Win all three and you go up to Oak
  // for the Mega Ring and the Kanto starters' Mega Stones, and Leaf, Gary and
  // Red each step up for a Mega Ring of their own; then Red, Leaf,
  // Gary and Oak leave down the stairs, and Mr. Fuji, last, comes over with
  // the Gengarite.
  const MEGA_AIDE = "LOCALID_MEGA_AIDE";
  const MEGA_CAST = { oak: "LOCALID_MEGA_OAK", fuji: "LOCALID_MEGA_FUJI", gary: "LOCALID_MEGA_GARY", red: "LOCALID_MEGA_RED", leaf: "LOCALID_MEGA_LEAF" };
  // An overworld look (sprite, size, frames) someone on some map already has.
  function lookOf(sprite) {
    if (window.WORLD_SPRITES[sprite]) return window.WORLD_SPRITES[sprite];
    for (const m of Object.values(window.WORLD_MAPS)) {
      const p = m.people.find((q) => q.sprite === sprite);
      if (p) return { sprite: p.sprite, width: p.width, height: p.height, frames: p.frames };
    }
    return null;
  }
  // The steps for someone ("player" or a local id) to walk from where they
  // stand to `to`, along tiles anyone can walk on (World.walkable) and round
  // everyone else; null when there's no way there.
  function pathTo(who, to) {
    const me = Overworld.position(), from = who === "player" ? me : Overworld.personPosition(who);
    if (!from) return null;
    const others = Overworld.people().filter((q) => who === "player" || q.def.localId !== who);
    const occupied = (m, x, y) => (who !== "player" && me.x === x && me.y === y) || others.some((q) => q.x === x && q.y === y);
    const tree = World.walkable({ map: me.map, x: from.x, y: from.y }, occupied, 80), key = to.x + "," + to.y;
    if (!tree.has(key)) return null;
    return World.pathBack(tree, key).reverse().map((d) => World.OPPOSITE[d]);
  }
  // Walks someone there (`speed`: "" or "fast_"), and turns them to `face`.
  async function walkTo(who, to, face, speed) {
    const path = pathTo(who, to) || [];
    await Overworld.act([{ who, moves: path.map((d) => "walk_" + (speed || "") + d).concat(face ? ["face_" + face] : []) }]);
  }
  // Someone not on the map comes from `from` (out of sight) to the first of
  // `spots` ({ x, y, face }) they can reach, and faces that way: they appear
  // on the last tile of the way there that's off the screen. Returns that
  // tile (to go back out by), or null.
  async function walkIn(who, look, from, spots, speed) {
    const me = Overworld.position();
    Overworld.addObject(who, { x: from.x, y: from.y, facing: "down" }, look);
    let path = null, face = null;
    for (const s of spots) if (s && (path = pathTo(who, s))) { face = s.face; break; }
    if (!path) { Overworld.removeObject(who); return null; }
    const tiles = [{ x: from.x, y: from.y }];
    for (const d of path) { const t = tiles[tiles.length - 1], [dx, dy] = World.DIRS[d]; tiles.push({ x: t.x + dx, y: t.y + dy }); }
    // (A person's picture is two tiles tall: one just below the screen still shows.)
    const offScreen = (t) => t.x < me.x - 7 || t.x > me.x + 7 || t.y < me.y - 4 || t.y > me.y + 6;
    let k = 0;
    tiles.forEach((t, i) => { if (i < tiles.length - 1 && offScreen(t)) k = i; });
    Overworld.addObject(who, { x: tiles[k].x, y: tiles[k].y, facing: path[k] || face }, look);
    await Overworld.act([{ who, moves: path.slice(k).map((d) => "walk_" + (speed || "") + d).concat(["face_" + face]) }]);
    return tiles[k];
  }
  // ... and back out that way, out of sight.
  async function walkOut(who, to, speed) {
    await walkTo(who, to, null, speed);
    await Overworld.act([{ who, moves: ["set_invisible"] }]);
    Overworld.removeObject(who);
  }
  const megaReady = () => player.badges.length >= 4 && !!player.flags.rescuedMrFuji;
  const megaTowerDue = () => !!player.flags.megaAideMet && !player.flags.megaTowerDone;

  // The Tera Orb (this game's own): the first time you come out of Viridian Forest's north gate onto Route 2,
  // another of Prof. Oak's aides comes out of the gate behind you, calling after you; he gives you the Tera Orb and
  // goes back the way he came, into the gate, towards the forest.
  const TERA_AIDE = "LOCALID_TERA_AIDE";
  const TERA_GATE_DOORS = [5, 6];   // (Route 2's tiles out of the gate, y 13)
  const teraAideDue = (script) => script === "enter:Route2" && !player.flags.gotTeraOrb && (() => {
    const at = Overworld.position();
    return at.map === "Route2" && at.y === 13 && TERA_GATE_DOORS.includes(at.x);
  })();
  // Who's at the top of the Tower, waiting: Prof. Oak and Mr. Fuji at the
  // top, and Leaf, Gary and Red in a line, facing them, with a place left in
  // the middle for you (MEGA_SPOT), two steps before Oak.
  const MEGA_SPOT = { x: 11, y: 7 };
  const MEGA_PLACES = { oak: [11, 4, "down"], fuji: [12, 4, "down"], leaf: [9, 7, "up"], gary: [10, 7, "up"], red: [12, 7, "up"] };
  // Where you and the one you're battling stand, apart from the others: down
  // the floor, face to face.
  const MEGA_ARENA = { you: { x: 11, y: 11 }, them: { x: 11, y: 9 } };
  // Leaf's team: her lab starter (second stage) and the Pokémon that covers its weakness.
  const LEAF_FOURTH = { Bulbasaur: "Vulpix", Squirtle: "Gloom", Charmander: "Poliwhirl" };
  const leafMegaTeam = () => {
    const starter = RIVAL_PICK[player.flags.starter] || "Bulbasaur";
    return [["Butterfree", 30], ["Wigglytuff", 31], ["Nidorina", 32], [LEAF_FOURTH[starter], 33], [STAGE_TWO[starter], 34]];
  };
  // In the order you battle them. Each one's ace Terastallizes, as it has
  // before (`tera`): Leaf's Butterfree into a Flying type, Gary's Eevee, now
  // an Umbreon, into a Ghost type, and Red's Pikachu (knowing Surf) into a
  // Water type.
  const MEGA_RIVALS = [
    { key: "leaf", name: () => "Pokémon Trainer " + LAB_RIVAL_NAME, pic: "green", music: "mus_encounter_rival",
      team: leafMegaTeam, tera: ["Butterfree", "Flying"],
      intro: ["Leaf: My turn, {PLAYER}! I've been\ntraining really hard since\nVermilion!", "This time I'm going to win!"],
      defeat: ["Leaf: Aww! You're amazing,\n{PLAYER}!"],
      after: ["Leaf: That was so much fun!\nI can't wait to see what Mega\nEvolution is!"] },
    { key: "gary", name: () => "Rival " + player.rival, pic: "rival_late", music: "mus_encounter_rival",
      team: () => [["Pidgeotto", 30], ["Growlithe", 31], ["Gyarados", 32], ["Exeggutor", 33], ["Umbreon", 34]], tera: ["Umbreon", "Ghost"],
      intro: ["{RIVAL}: Heh! Gramps called you too,\nhuh, {PLAYER}?", "Doesn't matter. I'll pass his test\nby beating you first! Let's go!"],
      defeat: ["{RIVAL}: What!? Not again!"],
      after: ["{RIVAL}: Tch… Fine. You passed.\nBut I'm not done getting stronger!"] },
    { key: "red", name: () => "Pokémon Trainer Red", pic: "red", music: "mus_encounter_rival",
      team: () => [["Pikachu", 30], ["Charmeleon", 31], ["Wartortle", 32], ["Ivysaur", 33], ["Espeon", 34]], tera: ["Pikachu", "Water"],
      intro: ["Red: …", "Red stepped forward, ready to battle!"],
      defeat: ["…"],
      after: ["Red: …", "Red gave a small nod."] }
  ];

  // ---------- HMs outside battle (game/field-moves.js) ----------
  //
  // A field move can be used by a Pokémon that knows it, or that could learn
  // it from its HM while you have the HM, once you have the badge it needs
  // (FireRed's sFieldMoves). From the party screen, or by A in front of a
  // tree, a rock, a boulder, the water or a waterfall (FireRed's scripts).
  const usedMove = (mon, move) => Party.displayName(mon) + " used " + move + "!";
  const facingScript = (script) => { const a = Overworld.ahead(); return a.person && a.person.script === script ? a.person : null; };
  let strengthOn = false;   // (FLAG_SYS_USE_STRENGTH: until you leave the map)

  // From the party screen: why it can't be used here (FireRed's messages), or
  // what to do once the menus close.
  function fieldMoveHere(move, mon) {
    const here = window.WORLD_MAPS[player.location.map] || {}, a = Overworld.ahead(), surfing = Overworld.avatar() === "surf";
    switch (move) {
      case "Defog":
        if (!Sinnoh.fog(player.location.map, player)) return "Can’t use that here.";
        return async () => { await say(usedMove(mon, "Defog")); sfx("se_m_reflect"); Sinnoh.defog(player); await say("The fog cleared!"); };
      case "Flash": {
        // (In the middle of the Ancient Tomb: Registeel's doorway opens.)
        const tomb = braillePuzzle("Flash");
        if (tomb) return async () => { await say(usedMove(mon, "Flash")); await tomb(); };
        // (In front of the Ruins of Alph's wall that says LIGHT: Task_UseFlashInField.)
        const js = JohtoAlph.chamberReaction(player.location.map, Overworld.position(), "flash");
        if (js) return async () => { await say(usedMove(mon, "Flash")); sfx("se_m_reflect"); johto.setVar("VAR_SPECIAL_RESULT", 0); await runJohto(js); };
        if (!Overworld.isDark()) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Flash")); sfx("se_m_reflect"); Overworld.flash(); };
      }
      case "Cut": {
        // (Ruin Valley's dotted door, from below: CutMoveRuinValleyCheck.)
        if (Sevii.cutOpensDottedHole(player.flags, Overworld.position())) return () => cutDottedHoleDoor(mon);
        const tree = facingScript("EventScript_CutTree");
        if (!tree) return "There's nothing to Cut.";
        return async () => { await say(usedMove(mon, "Cut")); cutDown(tree); };
      }
      case "Fly":
        if (!OUTDOORS.includes(here.type)) return "Can't use that here.";
        return () => fly(mon);
      case "Strength": {
        if (!facingScript("EventScript_StrengthBoulder")) return "Can't use that here.";
        return () => useStrength(mon);
      }
      case "Surf":
        if (surfing) return "You're already surfing.";
        if (!a.water) return "No surfing here!";
        return () => startSurfing(mon);
      case "Dive":
        if (!diveTarget(Overworld.avatar())) return "Can't use that here.";
        return () => dive(true);
      case "Rock Smash": {
        // (Before the Desert Ruins' braille: Regirock's doorway opens.)
        const ruins = braillePuzzle("Rock Smash");
        if (ruins) return async () => { await say(usedMove(mon, "Rock Smash")); await ruins(); };
        const rock = facingScript("EventScript_RockSmash");
        if (!rock) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Rock Smash")); await smashRock(rock); };
      }
      case "Waterfall":
        if (!surfing || a.behavior !== World.MB.WATERFALL) return "Can't use that here.";
        return async () => { await say(Party.displayName(mon) + " used Waterfall."); await climbWaterfall(); };
      case "Whirlpool":
        if (!surfing || a.behavior !== World.MB.WHIRLPOOL) return "Can't use that here.";
        return async () => { await say(Party.displayName(mon) + " used Whirlpool."); await crossWhirlpool(); };
      case "Rock Climb":
        if (surfing || !World.climbable(a.behavior, a.facing)) return "Can't use that here.";
        return async () => { await say(usedMove(mon, "Rock Climb")); await climbRocks(); };
      // FireRed's FldEff_TeleportWarpOut: from where Fly could go, back to the last Pokémon Center you were in (outside
      // it, where Fly lands), as blacking out would take you (in Hoenn, only to Hoenn's; or your room there, or home).
      case "Teleport": {
        if (!OUTDOORS.includes(here.type)) return "Can't use that here.";
        const to = teleportTarget();
        if (!to || (to.map === player.location.map && to.x === Overworld.position().x && to.y === Overworld.position().y)) return "Can't use that here.";
        return async () => {
          await say(usedMove(mon, "Teleport"));
          Screen.say("");
          Overworld.setAvatar("walk");
          await Overworld.escapeRopeOut();
          await Overworld.escapeRopeIn(Object.assign({ facing: "down" }, to));
          await persist();
        };
      }
      // FireRed's FldEff_SweetScent: in the grass (or a cave), a wild Pokémon comes out at once; X and Y's: where
      // hordes live, it's a horde. Anywhere else, "Looks like there's nothing here…".
      case "Sweet Scent": {
        const at = Overworld.position(), m = window.WORLD_MAPS[at.map] || {}, b = World.blockAt(at.map, at.x, at.y);
        const terrain = ["route", "town", "city"].includes(m.type) ? "grass" : undefined;
        const grass = !surfing && m.wild && World.isGrass(b) && canBattle() && !towerGhost();
        return async () => {
          await say(usedMove(mon, "Sweet Scent"));
          Screen.say("");
          if (grass && Hordes.at(at.map) && await hordeBattle(at.map, terrain)) { show("world"); return; }
          const wild = grass ? World.pickWild(m, Math.random, null) : null;
          if (!wild) { await say("Looks like there's nothing here…"); return; }
          await battle("wild", { terrain, foe: { name: "Wild", team: [wildMon(Party.create(wild.species, wild.level))] } });
          show("world");
        };
      }
      case "Dig": {
        // (Under the Sealed Chamber's DIG HERE: its wall gives way.)
        const wall = braillePuzzle("Dig");
        if (wall) return async () => { await say(usedMove(mon, "Dig")); await wall(); };
        // (Anywhere else you could use an Escape Rope, out as it takes you: FireRed's FldEff_UseDig.)
        const to = player.flags.escapeWarp;
        if (!here.allowEscaping || !to) return "Can't use that here.";
        return async () => {
          await say(usedMove(mon, "Dig"));
          Screen.say("");
          await Overworld.escapeRopeOut();
          await Overworld.escapeRopeIn({ map: to.map, x: to.x, y: to.y, facing: "down" });
          await persist();
        };
      }
    }
    return "Can't use that here.";
  }
  // The party screen's answer when a Pokémon can't use it at all yet.
  function fieldMoveBlocked(mon, move) {
    const why = FieldMoves.check(player, mon, move);
    if (why === "badge") return "This can't be used until a new\nBadge is obtained.";
    if (why === "hm") return "You need " + Bag.name(FieldMoves.hmFor(move)) + " to use " + move + ".";
    if (why) return Party.displayName(mon) + " can't use " + move + ".";
    return null;
  }

  // Cut: a small tree, cut down; it grows back when you come back to the
  // map, as in FireRed (EventScript_CutTree).
  async function cutTree(person) {
    const mon = FieldMoves.user(player, "Cut");
    if (!mon) { await say(T("Text_TreeCanBeCutDown")); return; }
    const q = T("Text_CutTreeDown");
    await say(q.slice(0, -1));
    if (!(await confirm(fill(q[q.length - 1])))) return;
    await say(usedMove(mon, "Cut"));
    cutDown(person);
  }
  function cutDown(person) {
    sfx("se_m_cut");
    if (person.flag) tempFlags.add(player.location.map + ":" + person.flag);
    Overworld.removePerson(person);
  }

  // Rock Smash (EventScript_RockSmash): the rock breaks (back when you return),
  // and a Pokémon may be hiding under it (RockSmashWildEncounter: the map's
  // Rock Smash Pokémon, at its rate out of 100).
  async function rockSmash(person) {
    const mon = FieldMoves.user(player, "Rock Smash");
    if (!mon) { await say("It's a rugged rock, but a Pokémon\nmay be able to smash it."); return; }
    if (!(await confirm("This rock appears to be breakable.\nWould you like to use Rock Smash?"))) return;
    await say(usedMove(mon, "Rock Smash"));
    await smashRock(person);
  }
  async function smashRock(person) {
    sfx("se_m_rock_throw");
    if (person.flag) tempFlags.add(player.location.map + ":" + person.flag);
    Overworld.removePerson(person);
    const m = window.WORLD_MAPS[player.location.map];
    if (m && m.rockSmash && Math.floor(Math.random() * 1600) < m.rockSmash.rate * 16 && canBattle()) {
      const w = World.pickWild(m, Math.random, m.rockSmash);
      if (w) await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(w.species, w.level))] } });
    }
  }

  // Strength (EventScript_StrengthBoulder): once used, boulders on the map
  // can be pushed until you leave it.
  async function strengthBoulder() {
    const mon = FieldMoves.user(player, "Strength");
    if (!mon) { await say(["It's a big boulder, but a Pokémon\nmay be able to push it aside."]); return; }
    if (strengthOn) { await say("Strength made it possible to move\nboulders around."); return; }
    await say("It's a big boulder, but a Pokémon\nmay be able to push it aside.");
    if (!(await confirm("Would you like to use Strength?"))) return;
    await useStrength(mon);
  }
  async function useStrength(mon) {
    strengthOn = true;
    cry(mon.species);
    await say([usedMove(mon, "Strength"), Party.displayName(mon) + "'s Strength made it\npossible to move boulders around!"]);
  }

  // Dive (Hoenn: EventScript_UseDive and EventScript_UseDiveUnderwater, src/field_control_avatar.c's TrySetDiveWarp): on
  // deep water, A goes down, to the map's dive connection (the same tile) or the fixed warp its scripts set; under it,
  // anywhere but where you can't surface, A comes up.
  const DIVEABLE = [0x11, 0x12];
  function diveTarget(avatar) {
    const L = player.location, m = window.WORLD_MAPS[L.map], pos = Overworld.position();
    if (!m || m.region !== "hoenn") return null;
    const beh = window.World.blockAt(L.map, pos.x, pos.y).behavior;
    const down = avatar === "surf";
    if (down ? !DIVEABLE.includes(beh) : (m.type !== "underwater" || beh === 0x19 || beh === 0x2a || beh === 0x69)) return null;
    const c = (m.connections || []).find((q) => q.direction === (down ? "dive" : "emerge") && q.map);
    if (c) return { map: c.map, x: pos.x, y: pos.y, down };
    const w = hoenn.diveWarp(L.map), dest = w && window.HOENN_SCRIPTS.consts[w.map];
    return dest ? { map: dest, x: w.x, y: w.y, down } : null;
  }
  const diveHere = (avatar) => !!diveTarget(avatar) && !!FieldMoves.user(player, "Dive");
  async function dive(asked) {
    const t = diveTarget(Overworld.avatar()), mon = FieldMoves.user(player, "Dive");
    if (!t || !mon) { await say(t ? "The sea is deep here. A POKéMON\nmight be able to go underwater." : "Can't use that here."); return; }
    if (!asked && !(await confirm(t.down ? "The sea is deep here.\nWould you like to use Dive?" : "Light is filtering down from above.\nWould you like to use Dive?"))) return;
    await say(usedMove(mon, "Dive"));
    Screen.say("");
    sfx("se_m_dive");
    await Overworld.fadeToBlack();
    await Overworld.teleport({ map: t.map, x: t.x, y: t.y, facing: player.location.facing || "down" });
    Overworld.setAvatar(t.down ? "dive" : "surf");
    await Overworld.fadeFromBlack();
  }

  // Surf (EventScript_UseSurf): A in front of the water with a Pokémon that
  // can; you hop on and the surfing music plays.
  async function surfPrompt() {
    const mon = FieldMoves.user(player, "Surf");
    if (!mon) return;
    if (!(await confirm("The water is dyed a deep blue…\nWould you like to Surf?"))) return;
    await startSurfing(mon);
  }
  async function startSurfing(mon) {
    await say(usedMove(mon, "Surf"));
    Screen.say("");
    cry(mon.species);
    sfx("se_m_surf");
    const dir = Overworld.ahead().facing;
    Overworld.setAvatar("surf");
    await Overworld.act([{ who: "player", moves: ["jump_" + dir] }]);
  }

  // Waterfall (EventScript_Waterfall): surfing, up the falls to the top.
  async function waterfall() {
    const mon = FieldMoves.user(player, "Waterfall");
    if (!mon) { await say("A wall of water is crashing down\nwith a mighty roar."); return; }
    if (!(await confirm("It's a large waterfall.\nWould you like to use Waterfall?"))) return;
    await say(Party.displayName(mon) + " used Waterfall.");
    await climbWaterfall();
  }
  async function climbWaterfall() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior === World.MB.WATERFALL) n++;
    sfx("se_m_waterfall");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_slow_" + a.facing) }]);
  }

  // Whirlpool (HGSS's std_menu_whirlpool): surfing, through the whirlpool
  // ahead to the water beyond it (CallFieldTask_Whirlpool); it stays.
  async function whirlpool() {
    const mon = FieldMoves.user(player, "Whirlpool");
    if (!mon) { await say("The water is swirling and spinning\naround with a mighty roar."); return; }
    if (!(await confirm("It's a huge swirl of water.\nWould you like to use Whirlpool?"))) return;
    await say(Party.displayName(mon) + " used Whirlpool.");
    await crossWhirlpool();
  }
  async function crossWhirlpool() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior === World.MB.WHIRLPOOL) n++;
    sfx("se_m_whirlpool");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_" + a.facing) }]);
  }

  // Rock Climb (HGSS's std_menu_rock_climb): up, down or along the rocky
  // wall ahead, the way it goes, to the ground at its other end (CallFieldTask_RockClimb).
  async function rockClimb() {
    const mon = FieldMoves.user(player, "Rock Climb");
    if (!mon) { await say("The wall is very rocky…\nWill a Pokémon's move scale it?"); return; }
    if (!(await confirm("The wall is very rocky…\nWould you like to use Rock Climb?"))) return;
    await say(usedMove(mon, "Rock Climb"));
    await climbRocks();
  }
  async function climbRocks() {
    const a = Overworld.ahead(), [dx, dy] = World.DIRS[a.facing];
    let n = 0;
    while (World.climbable(World.blockAt(a.map, a.x + dx * n, a.y + dy * n).behavior, a.facing)) n++;
    sfx("se_m_rock_throw");
    await Overworld.act([{ who: "player", moves: Array(n + 1).fill("walk_" + a.facing) }]);
  }

  // Fly: pick a town you've been to on the Town Map, and off you go, landing
  // outside its Pokémon Center (FireRed's heal locations). `mon` flies you:
  // FireRed's Fly out of battle (Overworld.flyOut, flyIn), unless you're
  // surfing (then just the sound and a fade).
  // Soaring on your Latias or Latios (the Eon Flute's, ui/soaring.js): up from where you are, over Emerald's map of
  // Hoenn, and down at a place Fly could take you to; or back down where you were.
  const eonLati = () => player.party.concat(...(player.boxes || [])).find((r) => r && !r.egg && (r.species === "Latias" || r.species === "Latios")) || null;
  async function soar() {
    const R = HOENN_MAP, lati = eonLati(), visited = player.flags.visitedSections || [], T = window.TOWN_MAP;
    if (!R || !lati) return;
    visitSection(player.location.map);
    // (Up from your square of the map: your section's first, or a cave's place.)
    const mySec = R.mapSections[player.location.map];
    let at = R.at[player.location.map] || null;
    for (let y = 0; !at && y < R.height; y++) for (let x = 0; x < R.width; x++) if (R.map[y][x] === mySec) { at = [x, y]; break; }
    at = at || [Math.floor(R.width / 2), Math.floor(R.height / 2)];
    const spotOf = (sec) => (visited.includes(sec) && ((T.fly || {})[sec] || (R.fly || {})[sec])) || null;
    await say(Party.displayName(lati) + " came flying at the sound\nof the Eon Flute!");
    Screen.say("");
    cry(lati.species);
    await Overworld.flyOut({ species: lati.species, form: Party.form(lati), shiny: !!lati.shiny });
    const was = (window.WORLD_MAPS[player.location.map] || {}).music;
    const canvas = $("#overlay-full");
    const sec = await Soaring.open(canvas, { map: R, start: at.slice(0, 2), lati: (lati.species === "Latias" ? "follow/380" : "follow/381"),
      landing: (s) => !!spotOf(s), music, sfx });
    canvas.classList.add("hidden");
    let spot = sec && spotOf(sec);
    if (spot && spot.girl && isGirl()) spot = Object.assign({}, spot, spot.girl);
    if (spot) await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y, facing: "down", hidden: true });
    else await Overworld.teleport(Object.assign({}, player.location, { hidden: true }));
    music((window.WORLD_MAPS[player.location.map] || {}).music || was);
    await Overworld.flyIn();
  }
  async function fly(mon) {
    let spot = await townMap({ fly: true });
    await Overworld.resume();   // (the map was put away for the Town Map)
    if (!spot) return;
    // (Littleroot's: outside your own house.)
    if (spot.girl && isGirl()) spot = Object.assign({}, spot, spot.girl);
    if (Overworld.avatar() === "surf" || !mon) sfx("se_m_fly");
    else {
      Overworld.setAvatar("walk");
      await Overworld.flyOut({ species: mon.species, form: Party.form(mon), shiny: !!mon.shiny });
    }
    Overworld.setAvatar("walk");
    await Overworld.teleport({ map: spot.map, x: spot.x, y: spot.y, facing: "down", hidden: true });
    await Overworld.flyIn();
    // (A scene that starts on arriving: Bill waiting on Cinnabar Island.)
    if (spot.map === "CinnabarIsland" && special("enter:" + spot.map)) await story({ type: "trigger", trigger: { script: "enter:" + spot.map }, map: spot.map });
  }

  // The Bicycle (from the Bag, or Select once registered): on and off,
  // where the map allows cycling (FireRed's ItemUseOutOfBattle_Bike).
  async function bicycle() {
    const here = window.WORLD_MAPS[player.location.map] || {};
    const mode = Overworld.avatar();
    if (mode === "bike" && onCyclingRoad()) { await say("You can't dismount your Bike here."); return; }
    if (mode === "bike") { Overworld.setAvatar("walk"); return; }
    if (mode === "surf" || !here.cycling) { await say("Oak: " + player.name + "! This isn't the time to use that!"); return; }
    Overworld.setAvatar("bike");
  }
  // Fishing (FireRed's StartFishing, src/field_player_avatar.c, Task_Fishing).
  // You cast, and a second later dots appear in the text box, one every 20
  // frames, 4 to 10 of them; then either nothing bites, "Not even a nibble‥"
  // (always, where there's nothing to fish), or something does: the rod
  // bends, a "!" pops up over your head, and "A POKéMON's on the hook!", then
  // a wild battle with the map's fishing Pokémon for your fishing level
  // (game/fishing.js), and the fishing XP it's worth. As in FireRed and LeafGreen there's no button
  // to press in time and only the one round of dots (Fishing7 goes straight
  // to the hook; the reeling of Ruby and Sapphire, Fishing8 and Fishing9, is
  // left behind, never reached). FireRed's bite is Random() & 1, one cast in
  // two; here it's twice that, every cast where there's something to catch.
  const BITE_CHANCE = 1;
  // Feebas (Emerald's CheckFeebas): six of Route 119's fishing spots, where half the bites are Feebas, Lv. 20 to 25.
  // Which six is your own (Emerald's go by Dewford's trendy phrase; here by your Trainer ID).
  let feebasCache = null;
  function feebasSpots() {
    if (feebasCache && feebasCache.id === player.trainerId) return feebasCache.spots;
    const m = window.WORLD_MAPS.Route119, water = [];
    for (let i = 0; m && i < m.width * m.height; i++)
      if (World.isSurfable(m.behavior[i]) && m.behavior[i] !== World.MB.WATERFALL && !m.collision[i]) water.push((i % m.width) + "," + Math.floor(i / m.width));
    let seed = (player.trainerId | 0) || 1;
    const spots = new Set();
    while (spots.size < Math.min(6, water.length)) { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; spots.add(water[(seed >>> 16) % water.length]); }
    feebasCache = { id: player.trainerId, spots };
    return spots;
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { feebasSpots: () => [...feebasSpots()] });
  async function fish() {
    // (No fishing without a Pokémon to fight what bites.)
    if (!player.party.some((m) => !m.egg)) { await say("You don't have any POKéMON to fish\nwith!"); Screen.say(""); return; }
    const at = player.location;
    const here = window.WORLD_MAPS[at.map] || {};
    const frames = (n) => sleep(n * 1000 / 60);
    const second = frames(60);
    await Overworld.rod("out");
    await second;
    // The dots (Fishing4, Fishing5).
    const dots = Math.min(10, Math.floor(Math.random() * 10) + 4);
    Screen.say(" ");
    for (let n = 1; n <= dots; n++) {
      await frames(20);
      const text = Array(n).fill("·").join("  ");
      Screen.say(text, text.length);
    }
    await frames(20);
    // Whether it bites (Fishing6).
    if (!here.fishing || Math.random() >= BITE_CHANCE) {
      Overworld.rod("away");
      await say("Not even a nibble‥");
      Screen.say("");
      Overworld.rod(null);
      return;
    }
    Overworld.rod("bite");
    Overworld.emote("!");
    sfx("se_pin");
    await say("A POKéMON's on the hook!");
    Screen.say("");
    Overworld.emote(null);
    Overworld.rod(null);
    const spot = Overworld.ahead(), before = Fishing.level(fishingXp());
    const mon = at.map === "Route119" && feebasSpots().has(spot.x + "," + spot.y) && Math.random() < 0.5
      ? { species: "Feebas", level: 20 + Math.floor(Math.random() * 6), xp: Fishing.XP[Fishing.pickRod(before)] } : Fishing.encounter(at.map, before);
    if (!mon) return;
    // (Reeling it in: the reeling game, game/fishing-game.js. Landed, it's yours to fight; else it got away. A treasure
    // brought up with it is yours either way.)
    show("scene"); clearMenu();
    const reel = await FishingGameScreen.run(scene, FishingGame.create(Math.random, { level: before, rod: mon.rod, slot: mon.slot }),
      { species: mon.species, level: before });
    const r = FishingGame.result(reel);
    if (r.treasure) Player.addItem(player, r.treasure);
    FishingGameScreen.clear();
    show("world"); await Overworld.resume();
    // (A treasure brought up with it: told in the text box, with the item jingle, whether or not the Pokémon was landed.)
    if (r.treasure) { await sayWithJingle(itemJingle(r.treasure), "{PLAYER} fished up " + article(Bag.name(r.treasure)) + "!"); Screen.say(""); }
    if (!r.landed) { if (reel.over !== "quit") await say("It got away‥"); else await say("You let it go."); Screen.say(""); return; }
    player.flags.fishingCaptures = (player.flags.fishingCaptures | 0) + 1;
    await gainFishingXp(mon.xp + r.xpBonus, r.perfect ? "(a perfect catch!)" : null);
    Screen.say("");
    // (FireRed's pond, or the sea.)
    const ahead = Overworld.ahead();
    const terrain = ahead.behavior === 0x10 ? "pond" : "water";
    if (safariOn()) { await safariBattle(mon.species, mon.level, terrain); return; }
    if (!canBattle()) return;
    const outcome = await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(mon.species, mon.level))] }, terrain, fishing: true });
    // (This game's own: more fishing XP for landing it, catching it (as much again as the bite) or beating it (half).)
    const bonus = outcome === "caught" ? mon.xp : outcome === "won" ? Math.ceil(mon.xp / 2) : 0;
    if (bonus) {
      show("world");
      await Overworld.resume();
      await gainFishingXp(bonus, outcome === "caught" ? "for catching it" : "for beating it");
      Screen.say("");
    }
  }
  // Fishing XP, and the fishing level it brings (game/fishing.js).
  async function gainFishingXp(n, why) {
    const before = Fishing.level(fishingXp());
    player.flags.fishingXp = fishingXp() + n;
    const after = Fishing.level(player.flags.fishingXp);
    await say("Gained " + n + " fishing XP" + (why ? " " + why : "") + ".");
    const rarer = Fishing.TIERS.some(([from]) => from > before && from <= after);
    if (after > before) await say("Your fishing level rose to " + after + "!" + (rarer ? "\nRarer Pokémon may bite now." : ""));
  }

  // ---------- Cycling Road ----------
  //
  // (Route 16's and Route 18's gates, and the maps between: CYCLING_ROAD_MAPS.)
  // FireRed's FLAG_SYS_ON_CYCLING_ROAD: out on the road (not in a gate), where
  // you can't get off the Bicycle.
  const onCyclingRoad = () => !!player.flags.cyclingRoad && ["Route16", "Route17", "Route18"].includes(player.location.map) || Sinnoh.cyclingRequired(player.location) && Sinnoh.cyclingAllowed(player);
  // A gate's guard without a Bicycle (FireRed's NeedBikeTrigger): "Excuse me!",
  // you face him, walk up to the counter, and are turned back the way you came.
  async function needBike(script) {
    const [, gate, row] = /^(\w+_1F)_EventScript_NeedBikeTrigger(\w+)$/.exec(script);
    await say(T(gate + (gate === "Route16_NorthEntrance_1F" ? "_Text_ExcuseMeWaitUp" : "_Text_ExcuseMe")));
    await Overworld.act([{ who: "player", moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    await sleep(333);
    const up = { MidTop: "WalkUp", Mid: "WalkUp2", MidBottom: "WalkUp3", Bottom: "WalkUp4" }[row];
    if (up) await Overworld.act([{ who: "player", moves: M(gate + "_Movement_" + up) }]);
    await say(T(gate + (gate === "Route16_NorthEntrance_1F" ? "_Text_NoPedestriansOnCyclingRoad" : "_Text_NeedBicycleForCyclingRoad")));
    Screen.say("");
    await Overworld.act([{ who: "player", moves: M(gate + "_Movement_WalkRight") }]);
  }

  // Getting on or off the Bicycle or the water: its music, or the map's again.
  function avatarMusic(mode) {
    return mode === "bike" ? "mus_cycling" : mode === "surf" ? "mus_surf" : null;
  }

  // Select: the key item registered from the Bag (FireRed's registered item).
  async function useRegistered() {
    const id = player.flags.registered;
    if (!id || !Player.itemCount(player, id)) { await say("An item in the Bag can be\nregistered to Select for easy use."); return; }
    await useKeyItem(id);
    if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
  }

  // ---------- Route 25: Bill's Sea Cottage ----------
  //
  // Bill has got himself mixed up with a Clefairy. He walks into his
  // Teleporter; you run the Cell Separation System on his PC; out he comes as
  // himself, and gives you the S.S. Ticket (Route25_SeaCottage_EventScript_*).
  // Afterwards his PC shows his favourite Pokémon. (Leaving while he's in the
  // Teleporter, he's a Clefairy again when you come back, as in FireRed.)
  let billInTeleporter = false, seaCottageReturn = false, billJustOut = false;

  // ---------- Celadon City ----------

  // An elevator's floor select (FireRed's ..._EventScript_FloorSelect): the
  // "Now on:" window at the top right (DrawElevatorCurrentFloorWindow), "Which
  // floor do you want?" and the floors in a multichoice at the top left (the
  // floor you're on chosen to begin with; Silph Co.'s eleven floors are a
  // list of seven at a time, `list`). Another floor: the window closes, the
  // car shakes while SE_ELEVATOR plays (AnimateElevator: longer the further it
  // goes), then SE_DING_DONG; its doors open onto that floor (the dynamic
  // warp, World.setDynamicWarp).
  // FireRed's floor numbers (sFloorNamePointers: B4F is 0, 1F is 4).
  const floorNumber = (label) => { const m = /^(B?)(\d+)F$/.exec(label); return m ? (m[1] ? 4 - +m[2] : 3 + +m[2]) : 4; };
  const ELEVATOR_SHAKES = [8, 16, 24, 32, 38, 46, 53, 56, 57];

  // ---------- The Department Store roof ----------

  const DRINKS = [["fresh-water", "tm16", "gotTM16FromThirstyGirl", "YayFreshWaterHaveThis", "ExplainTM16", 200],
    ["soda-pop", "tm20", "gotTM20FromThirstyGirl", "YaySodaPopHaveThis", "ExplainTM20", 300],
    ["lemonade", "tm33", "gotTM33FromThirstyGirl", "YayLemonadeHaveThis", "ExplainTM33", 350]];

  // ---------- The Game Corner ----------
  //
  // Coins (in the Coin Case, up to 50,000: HGSS's): bought from the clerk, given by a
  // few gamblers, found on the floor, and won at the slots; spent next door
  // in the Prize Room. (Goldenrod's Game Corner: Voltorb Flip, below.)
  const MAX_COINS = 50000;
  const coins = () => player.flags.coins || 0;
  const addCoins = (n) => { player.flags.coins = Math.max(0, Math.min(MAX_COINS, coins() + n)); };
  const plainCoins = (n) => n.toLocaleString("en-US");

  // The card room's regulars (this game's own; data/card-room.js): people
  // in the chairs. Three at the poker table (a chair left for you) and two at
  // blackjack, the same all day; three round the mahjong table, a chair free,
  // new ones after every game you play with them. Each a trainer from around
  // the game (TablePlayers) in someone's clothes.
  const CROWD_SPRITES = ["woman_1", "fat_man", "boy", "old_man_1", "woman_3", "youngster", "balding_man", "woman_2", "lass", "gentleman",
    "old_man_2", "bug_catcher", "cooltrainer_f", "rocker", "man", "camper", "black_belt", "hiker", "cooltrainer_m", "picnicker",
    "old_woman", "beauty", "sailor", "fisher", "poke_maniac", "channeler", "crush_girl", "scientist"];
  const CROWD_FACING = { poker: ["right", "left", "up", "up"], blackjack: ["up", "up", "up", "up"], mahjong: ["down", "up", "right", "left"] };
  const CROWD_SAYS = [
    ["I'm on a hot streak today!"], ["Don't tell my wife how much\nI've lost here..."], ["Shh! I'm counting."],
    ["The house always wins, they say.\nNot today!"], ["One more hand, then I'll go home."],
    ["I came for the slots, but\nthe cards are where it's at."], ["Bah! Another bad beat!"]];
  // (The mahjong chairs they take: the one nearest the door, 1, is yours.)
  const MAHJONG_CHAIRS = [0, 2, 3];
  let crowdCache = null, mahjongCrowd = null;

  // Mahjong (game/mahjong.js, ui/mahjong.js; this game's own): Riichi, an
  // East round. 250 Coins buys you in for 25,000 points; when you get up (or
  // the game's over) every 100 points left is a Coin; quitting mid-game
  // with Select forfeits it all. Any of the three at the table asks you to
  // sit in; you play them, and three others sit down after.
  const MAHJONG_BUY_IN = 250;

  // The Prize Room's three counters (FireRed's prizes and prices). A TM
  // prize is the TM of this game with that move.
  const PRIZES = {
    Mons: [["Abra", 180, 9], ["Clefairy", 500, 8], ["Dratini", 2800, 18], ["Scyther", 5500, 25], ["Porygon", 9999, 26]],
    TMs: [["Ice Beam", 4000], ["Iron Tail", 3500], ["Thunderbolt", 4000], ["Shadow Ball", 4500], ["Flamethrower", 4000]],
    Items: [["smoke-ball", 800], ["miracle-seed", 1000], ["charcoal", 1000], ["mystic-water", 1000], ["yellow-flute", 1600]]
  };
  const machineFor = (move) => Bag.machines().find((m) => Bag.machineMove(m) === move);
  // Each counter's multichoice (MULTICHOICE_GAME_CORNER_POKEMON_PRIZES,
  // _TMPRIZES, _BATTLE_ITEM_PRIZES: where FireRed puts each one and its
  // prices' column), with the coins box at the top left.
  const PRIZE_MENU = { Mons: { left: 11, at: (i) => (i < 2 ? 85 : 75) }, TMs: { left: 11, at: () => 72 }, Items: { left: 10, at: (i) => (i ? 80 : 90) } };

  // ---------- The Rocket Hideout ----------
  //
  // Giovanni, on B4F (this game's own: a tag battle). As you speak to him,
  // Leaf comes in from the elevator's side to battle him with you: her
  // Butterfree, Wigglytuff and starter as at the top of Pokémon Tower, and
  // three of yours. Beaten, he leaves, and the Silph Scope is left behind;
  // then Leaf goes back the way she came.
  const HIDEOUT_LEAF = "LOCALID_HIDEOUT_LEAF";
  // FireRed's team (Onix, Rhyhorn, Kangaskhan), with three more (his
  // Dugtrio, Nidorino and Persian) against the two of you.
  const HIDEOUT_GIOVANNI_EXTRA = [["Dugtrio", 29], ["Nidorino", 29], ["Persian", 31]];
  let hideoutLeafFrom = null;   // (the tile Leaf came in by, to leave by)
  // Which way to face from one tile to look at another.
  const toward = (from, to) => (to.x < from.x ? "left" : to.x > from.x ? "right" : to.y < from.y ? "up" : "down");
  // Someone and you turn to each other.
  const faceEachOther = (who) => Overworld.act([{ who, moves: ["face_player"] },
    { who: "player", moves: ["face_" + toward(Overworld.position(), Overworld.personPosition(who))] }]);

  // ---------- Saffron City ----------

  // Team Rocket's out of Saffron once Giovanni's beaten on Silph Co.'s 11F
  // (FireRed's VAR_MAP_SCENE_SILPH_CO_11F, FLAG_HIDE_SAFFRON_ROCKETS).
  const silphFreed = () => !!player.flags.TRAINER_BOSS_GIOVANNI_2;

  // FireRed's text about one of its TMs, with this game's number for the TM
  // with that move ("TM29" -> "TM29" or whatever it is here).
  const tmText = (pages, frNumber, item) => [].concat(pages).map((p) =>
    p.replace(new RegExp("TM" + String(frNumber).padStart(2, "0"), "g"), Bag.name(item).split(" ")[0]));

  // (This game's own: her Alakazam's Mega Stone, after the badge and TM.)
  const sabrinaAlakazite = () => megaStoneGift("alakazite", ["I foresaw that you would win…\nand that you would need this.",
    "An Alakazite. Held by Alakazam, it\nawakens a power beyond the mind's."], "Sabrina");

  // ---------- The Fighting Dojo's rematch ----------
  //
  // (This game's own.) Once you're Champion (flags.gameClear), the Dojo has
  // trained hard: each of its Black Belts and the Karate Master battles you
  // once more, their Pokémon fully evolved (FireRed's teams' species lines:
  // Machop and Machoke are Machamps now, Mankey and Primeape Annihilapes) at levels 48-52.
  // Beat the Karate Master again and he gives you the Hitmon you didn't
  // take the first time, at Lv. 50. Each battles you again only once
  // (flags.dojoRematch[trainer id]: won).
  const DOJO_MASTER = "TRAINER_BLACK_BELT_KOICHI";
  const DOJO_SECOND_LEVEL = 50;
  const DOJO_REMATCH = {
    TRAINER_BLACK_BELT_HITOSHI: {
      team: [["Machamp", 49], ["Annihilape", 49], ["Annihilape", 50]],
      intro: ["Hwaah!", "So the Champion comes back to our\nFighting Dojo!", "A title means nothing on these\nmats! Fight me!"],
      defeat: ["Oof!\nThe Champion's the real thing!"],
      after: ["Even the Champion comes here to\ntrain! I'll have to work twice as hard!"]
    },
    TRAINER_BLACK_BELT_HIDEKI: {
      team: [["Machamp", 50], ["Machamp", 51]],
      intro: ["My Machop and Machoke have grown\nup since you were last here.", "Four arms each now!\nShow me what you've got!"],
      defeat: ["Judge!\nIppon! A clean point to you!"],
      after: ["Our Master has waited a long time\nfor this rematch. Be ready!"]
    },
    TRAINER_BLACK_BELT_AARON: {
      team: [["Annihilape", 52]],
      intro: ["Hiyah!", "Boulders are too easy now!\nI shatter whole cliffs!", "My Annihilape's fury is harder than\nany rock!"],
      defeat: ["Yow!\nStubbed fingers… again!"],
      after: ["Psychic power still frightens us…\nBut now, so do you!"]
    },
    TRAINER_BLACK_BELT_MIKE: {
      team: [["Annihilape", 48], ["Annihilape", 49], ["Annihilape", 50]],
      intro: ["Hoargh!", "Champion or not, rules are rules!\nTake your shoes off!"],
      defeat: ["I give up!\nYou're even stronger than before!"],
      after: ["I'm still a small fry next to our\nMaster. Next time, I'll be bigger!"]
    },
    [DOJO_MASTER]: {
      team: [["Hitmonlee", 52], ["Hitmonchan", 52]],
      intro: ["Grunt!", "The Champion of the Pokémon League\nreturns to my Dojo!", "Since the day you beat us, we have\ntrained from dawn till dusk!",
        "Show me the fighting spirit of a\nChampion! I hold nothing back!", "Fwaaa!"],
      defeat: ["Hwa!\nArrgh! Beaten once more!"],
      after: ["Grunt!", "Your strength is beyond doubt.\nWe will train even harder!"]
    }
  };
  const dojoAfter = (id) => (DOJO_REMATCH[id] && player.flags.dojoRematch && player.flags.dojoRematch[id] ? DOJO_REMATCH[id].after : null);
  const dojoMasterRematchWon = () => !!(player.flags.dojoRematch && player.flags.dojoRematch[DOJO_MASTER]);

  // ---------- Silph Co. ----------

  // The elevator's floors, top down, and where its doors open on each
  // (SilphCo_Elevator_EventScript_To<n>F's setdynamicwarp).
  const SILPH_FLOORS = [["11F", 13], ["10F", 13], ["9F", 24], ["8F", 22], ["7F", 23], ["6F", 20], ["5F", 22], ["4F", 22],
    ["3F", 22], ["2F", 22], ["1F", 22]];

  // A card-key door (FireRed's SilphCo_<n>F_EventScript_Door<k>): with the
  // Card Key from 5F it opens for good (FLAG_SILPH_<n>F_DOOR_<k>).
  const silphDoorFlag = (n, k, single) => "FLAG_SILPH_" + n + "F_DOOR" + (single ? "" : "_" + k);

  // 7F: Gary (SilphCo_7F_EventScript_RivalScene). This game's own team, at
  // about FireRed's levels: Pidgeot, Growlithe, Gyarados (which holds its
  // Gyaradosite and Mega Evolves), Exeggutor, Umbreon (his Eevee) and Alakazam.
  // Then he's off by the warp pad.
  const SILPH_RIVAL_TEAM = [["Pidgeot", 41], ["Growlithe", 39], ["Gyarados", 42, "gyaradosite"], ["Exeggutor", 39], ["Umbreon", 44], ["Alakazam", 39]];

  // 11F: Giovanni (SilphCo_11F_EventScript_BattleGiovanni). This game's
  // own: a tag battle. Red comes down by the warp pad from 7F and stands
  // beside you, without a word; he brings Charizard (holding its Charizardite
  // X: it Mega Evolves), Snorlax and Pikachu; Giovanni has six, and his
  // Kangaskhan holds its Kangaskhanite. Beaten, Giovanni's gone, and so is Team Rocket, from
  // Silph Co. and from Saffron; and Red goes back the way he came.
  const SILPH_RED = "LOCALID_SILPH_CO_RED";
  // Red's Pokémon now: those he had at the top of Pokémon Tower, all fully
  // evolved, and a Snorlax, all at Lv. 36 (your partner); for the tag battle he picks three.
  const RED_SILPH_ROSTER = [["Pikachu", 36], ["Charizard", 36, "charizardite-x"], ["Blastoise", 36], ["Venusaur", 36], ["Espeon", 36], ["Snorlax", 36]];
  const RED_SILPH_PICK = ["Charizard", "Snorlax", "Pikachu"];
  // FireRed's team for him (Nidorino, Kangaskhan, Rhyhorn, Nidoqueen), with
  // two more (his Dugtrio and Persian), six against the two of you.
  const SILPH_GIOVANNI_EXTRA = [["Dugtrio", 42], ["Persian", 43]];

  // ---------- Route 12 to Fuchsia City ----------

  const isGirl = () => !!(Player.LOOKS[player.look] && Player.LOOKS[player.look].girl);
  // (Your room in Littleroot, until a Pokémon Center's your place to come back to: Brendan's house, or May's for a girl, as
  // the truck's step-off has it, ui/hoenn-changes.js.)
  const hoennBedroom = () => ({ map: isGirl() ? "LittlerootTown_MaysHouse_2F" : "LittlerootTown_BrendansHouse_2F", x: 4, y: 2 });
  const hasFishingRod = () => Player.itemCount(player, "fishing-rod") > 0;
  // (This game's own words: fishing levels, game/fishing.js.)
  const FISHING_LEVELS_EXPLAINED = ["The more Pokémon you hook, the\nbetter you get at fishing.",
    "And the better you fish, the rarer\nthe Pokémon that bite!"];

  // The Magikarp size record (src/pokemon_size_record.c): a Magikarp's size
  // comes from its personality and IVs (GetMonSizeHash), through
  // sBigMonSizeTable, times its Pokédex height; shown in inches, to a tenth.
  const BIG_MON_SIZES = [[290, 1, 0], [300, 1, 10], [400, 2, 110], [500, 4, 310], [600, 20, 710], [700, 50, 2710],
    [800, 100, 7710], [900, 150, 17710], [1000, 150, 32710], [1100, 100, 47710], [1200, 50, 57710], [1300, 20, 62710],
    [1400, 5, 64710], [1500, 2, 65210], [1600, 1, 65410], [1700, 1, 65510]];
  const monInches = (species, hash) => { const n = Math.floor(monSize(species, hash) * 100 / 254); return Math.floor(n / 10) + "." + (n % 10); };
  const magikarpSizeHash = monSizeHash, magikarpSize = (hash) => monSize("Magikarp", hash), magikarpInches = (hash) => monInches("Magikarp", hash);

  // ---------- The Seafoam Islands ----------
  //
  // (game/seafoam.js has the boulders and currents.) Through a hole onto the
  // water of B3F or B4F, you're surfing (FallWarpEffect_7) and, unless both of
  // the floor's boulders block it, the current carries you off: from B3F
  // down to B4F, where you come up its current from below; on B4F to the
  // shore, where you climb out.
  let seafoamFell = null;

  // ---------- Johto's roaming beasts ----------
  //
  // HGSS's CreateRoamer, after the Burned Tower (Raikou and Entei; Suicune
  // waits at the Bell Tower, as in HGSS): each roams Johto until you catch it.
  // Here one of them is the Pokémon in 1 of 16 wild battles in Johto's grass
  // outdoors, at Lv. 40, as likely either; run from it, or knock it out, and it
  // roams on.
  const JOHTO_ROAMERS = ["Raikou", "Entei"];
  function roamerWild(mon, table) {
    mon=Sinnoh.roamerWild(player,mon,table);
    // (A save from past the Burned Tower before the beasts roamed: off they go.)
    if (!player.flags.johtoRoamers && johto.flag("FLAG_HIDE_BURNED_TOWER_B1F_RAIKOU")) player.flags.johtoRoamers = { Raikou: true, Entei: true };
    const r = player.flags.johtoRoamers, m = window.WORLD_MAPS[player.location.map] || {};
    // (Hoenn's Latias or Latios, from the news flash on, in the grass or on the water of its routes: InitRoamer.)
    if (mon && player.flags.hoennRoamer && m.region === "hoenn" && /route/.test(m.type || "") && (table === m.wild || table === m.water) && Math.random() < 1 / 16)
      return { species: player.flags.hoennRoamer, level: 40 };
    if (!mon || table !== m.wild || !r || m.region !== "johto" || m.type === "indoor" || m.type === "underground") return mon;
    const out = JOHTO_ROAMERS.filter((sp) => r[sp]);
    if (!out.length || Math.random() >= 1 / 16) return mon;
    return { species: out[Math.floor(Math.random() * out.length)], level: 40 };
  }

  // ---------- Latias and Latios (this game's own, after Omega Ruby and Alpha Sapphire's) ----------
  //
  // When Steven gives you HM Dive at his house in Mossdeep (or, a save already past that, when you next speak to him),
  // he asks your favourite colour: red, Latias; blue, Latios (player.flags.latiChoice). His ship takes you to
  // Southern Island, far to the south, and at the stone in its heart that one comes down and joins you, Lv. 30,
  // holding its Mega Stone; then you're given the Eon Flute, to call it and soar over Hoenn (ui/soaring.js). He leaves
  // you the Eon Ticket, for the S.S. Tidal from Lilycove. Once you're Hoenn's Champion the other one is at the stone:
  // a battle, Lv. 50, holding its own Mega Stone (player.flags.latiOther once it's caught). Emerald's news flash and
  // its roaming Lati are gone (ui/hoenn-changes.js).
  const LATI = { Latias: { stone: "latiasite", colour: "red", sprite: "follow/380" }, Latios: { stone: "latiosite", colour: "blue", sprite: "follow/381" } };
  const latiOther = (sp) => (sp === "Latias" ? "Latios" : "Latias");
  async function stevenEonQuestion() {
    const f = player.flags;
    if (f.latiChoice) return;
    await say(["Steven: Oh, and {PLAYER}… This may\nsound like an odd question.", "What's your favourite colour?"]);
    let i;
    do i = await multichoice(null, 0, 0, ["Red", "Blue"]); while (i !== 0 && i !== 1);
    Screen.say("");
    f.latiChoice = i ? "Latios" : "Latias";
    await say(["Steven: " + (i ? "Blue" : "Red") + "… Like the sea, or like a\nflame. Ha ha, I thought you might say\nthat.",
      "Far to the south of Hoenn there's a\nlittle island, Southern Island.", "Something lives there that only shows\nitself to a Trainer it can trust.",
      "I think it's been waiting for someone\nwho loves " + (i ? "blue" : "red") + ". Come, my ship can take\nus there!"]);
    Player.addItem(player, "eon-ticket", 1);
    hoenn.setFlag("FLAG_ENABLE_SHIP_SOUTHERN_ISLAND", true);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Eon Ticket!"));
    await say(["Steven: That's for the S.S. Tidal from\nLilycove, if you ever want to go back.", "Now, let's go!"]);
    afterScript = async () => {
      await Overworld.fadeToBlack();
      await Overworld.teleport({ map: "SouthernIsland_Exterior", x: 13, y: 22, facing: "up" });
      await Overworld.fadeFromBlack();
      await say(["Sailor: Here we are, Southern Island!\nI'll wait here for you, mate."]);
      await persist();
    };
    await persist();
  }
  async function southernIsland(script) {
    const f = player.flags;
    if (script === "SouthernIsland_Exterior_EventScript_Sailor") {
      if (!(await confirm(fill(window.HOENN_SCRIPTS.t.EventTicket_Text_SouthernIslandSailBack.join("\n").split("\n").slice(-2).join("\n"))))) { await say("Aye, as you like."); return true; }
      await say("Aye, all aboard!");
      Screen.say("");
      await Overworld.fadeToBlack();
      await Overworld.teleport({ map: "LilycoveCity_Harbor", x: 8, y: 11, facing: "down" });
      await Overworld.fadeFromBlack();
      return true;
    }
    if (script === "SouthernIsland_Exterior_EventScript_Sign") { await say(window.HOENN_SCRIPTS.t.SouthernIsland_Exterior_Text_Sign); return true; }
    if (script !== "SouthernIsland_Interior_EventScript_Stone") return false;
    const mine = f.latiChoice, other = mine && latiOther(mine), champ = hoennChampion(f);
    const who = mine && !f.latiGift ? mine : other && champ && !f.latiOther ? other : null;
    if (!who) { await say(window.HOENN_SCRIPTS.t.SouthernIsland_Interior_Text_Sign); return true; }
    const L = "LOCALID_SOUTHERN_ISLAND_LATI", me = Overworld.position();
    await say(window.HOENN_SCRIPTS.t.SouthernIsland_Interior_Text_Sign);
    Screen.say("");
    Overworld.follower.hide(true);
    Overworld.addObject(L, { x: me.x, y: 2, facing: "down" }, { sprite: LATI[who].sprite, width: 32, height: 32, frames: 9, offsetX: -8 });
    cry(who);
    await Overworld.act([{ who: L, moves: Array(Math.max(0, me.y - 4)).fill("walk_down") }]);
    if (who === mine) {
      await say([who + " looks at {PLAYER} closely…", "It seems to want to come with you!"]);
      const ok = await giftMon(who, 30, "{PLAYER} received " + who + "!", null, () => { f.latiGift = true; }, (r) => { r.item = LATI[who].stone; });
      if (ok) {
        Overworld.removeObject(L);
        await say([who + " is holding " + article(Bag.name(LATI[who].stone)) + "."]);
        Player.addItem(player, "eon-flute", 1);
        await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Eon Flute!"));
        await say(["Play the Eon Flute and " + who + " will\ncome flying, wherever you are, to\ncarry you over Hoenn's skies."]);
      } else Overworld.removeObject(L);
    } else {
      await say([who + " came down from the sky!", "It doesn't seem to trust you yet…"]);
      Screen.say("");
      const outcome = await battle("wild", { foe: { name: "Wild", team: [Object.assign(wildMon(Party.create(who, 50)), { item: LATI[who].stone })] }, music: "em_vs_regi" });
      if (outcome !== "lost") { show("world"); await Overworld.resume(); }
      if (Overworld.personPosition(L)) Overworld.removeObject(L);
      if (outcome === "caught") f.latiOther = true;
      else if (outcome !== "lost") await say([who + " flew off into the sky…", "It might come back to the stone."]);
    }
    Overworld.follower.hide(false);
    await persist();
    return true;
  }

  // ---------- The Delta Episode (this game's own, after Omega Ruby and Alpha Sapphire's) ----------
  //
  // After Hoenn's Hall of Fame (FLAG_SYS_GAME_CLEAR): a meteoroid is falling on Hoenn. player.flags.delta:
  //   0 (not yet)  Mossdeep's Space Center, 1F, as you come in: its director and Steven tell you of it,
  //                and Zinnia, the Draconids' lorekeeper, comes in and battles you; then she's off
  //   1            Meteor Falls: a Draconid elder tells the old story (the sky's protector, Rayquaza)
  //                and sends you up the Sky Pillar
  //   2            the Sky Pillar's top: Zinnia again, a battle; Rayquaza answers her call (yours, if
  //                you have one), and carries you up into space (ui/rayquaza-scene.js's flight),
  //                into the meteoroid, where Deoxys waits: Lv. 80, in the meteoroid's heart; the
  //                meteoroid breaks apart and you're back at the Space Center
  //   3            done; 2F's researcher has found a strange energy signature in the sealed
  //                observation room, and unseals its door (4): Jirachi, below
  // Zinnia's picture and sheet are Emerald's Hex Maniac's recoloured (tools/build-delta-episode.js).
  const DELTA = { SC1: "MossdeepCity_SpaceCenter_1F", SC2: "MossdeepCity_SpaceCenter_2F", DECK: "MossdeepCity_SpaceCenter_ObservationDeck",
    FALLS: "MeteorFalls_1F_1R", TOP: "SkyPillar_Top" };
  const DELTA_PEOPLE = [
    [DELTA.SC1, { id: 960, localId: "LOCALID_DELTA_STEVEN", x: 9, y: 3, movement: "face_down", script: "Delta_EventScript_Steven", sprite: "em_steven" }],
    [DELTA.FALLS, { id: 961, localId: "LOCALID_DELTA_ELDER", x: 24, y: 18, movement: "face_right", script: "Delta_EventScript_Elder", sprite: "em_old_woman" }],
    [DELTA.TOP, { id: 962, localId: "LOCALID_DELTA_ZINNIA", x: 12, y: 11, movement: "face_down", script: "Delta_EventScript_Zinnia", sprite: "em_zinnia" }]];
  for (const [map, p] of DELTA_PEOPLE) {
    const m = window.WORLD_MAPS[map];
    if (!m || m.people.some((q) => q.localId === p.localId)) continue;
    const look = lookOf(p.sprite) || { sprite: p.sprite, width: 16, height: 32, frames: 9 };
    m.people.push(Object.assign({ rangeX: 0, rangeY: 0, flag: null, text: null }, p, { width: look.width, height: look.height, frames: look.frames }));
  }
  ["SouthernIsland_Exterior_EventScript_Sailor", "SouthernIsland_Exterior_EventScript_Sign", "SouthernIsland_Interior_EventScript_Stone"].forEach((n) => SPECIAL.add(n));
  ["Delta_EventScript_Steven", "Delta_EventScript_Elder", "Delta_EventScript_Zinnia", "SpaceCenter_EventScript_DeckDoor", "SpaceCenter_EventScript_WishRock"].forEach((n) => SPECIAL.add(n));
  const hoennCleared = () => hoenn.flag("FLAG_SYS_GAME_CLEAR") || hoenn.flag("FLAG_IS_CHAMPION");
  const deltaStage = () => player.flags.delta | 0;
  const ownsSpecies = (sp) => player.party.concat(...(player.boxes || [])).some((r) => r && !r.egg && r.species === sp);
  // (Who's there: Steven at the Space Center but while you're off after the meteoroid; the elder from the
  // telling on; Zinnia at the Sky Pillar's top while she waits for you there.)
  function deltaVisible(person) {
    if (person.localId === "LOCALID_DELTA_STEVEN") return hoennCleared() && deltaStage() !== 1 && deltaStage() !== 2;
    if (person.localId === "LOCALID_DELTA_ELDER") return deltaStage() >= 1;
    if (person.localId === "LOCALID_DELTA_ZINNIA") return deltaStage() === 2;
    return undefined;
  }
  // The scenes as you come in: 1F's at the start, the Sky Pillar's top, 2F's after Jirachi.
  function deltaDue(script) {
    script = String(script || "").replace(/^enter:/, "arrive:");   // (through a door, or over a map's edge, the same)
    if (script === "arrive:" + DELTA.SC1) return hoennCleared() && !deltaStage();
    if (script === "arrive:" + DELTA.TOP) return deltaStage() === 2;
    if (script === "arrive:" + DELTA.SC2) return !!player.flags.jirachiMet && !player.flags.jirachiAfter;
    return false;
  }
  // Zinnia's teams: Omega Ruby and Alpha Sapphire's Pokémon, at the post-game's levels; her ace a Mega Salamence.
  const zinniaTeam = (second) => (second
    ? [["Tyrantrum", 70], ["Noivern", 70], ["Goodra", 71], ["Altaria", 71], ["Salamence", 74, { item: "salamencite", teraType: "Dragon", teraAce: true }]]
    : [["Tyrunt", 62], ["Shelgon", 62], ["Altaria", 63], ["Salamence", 65, { item: "salamencite" }]])
    .map(([sp, lv, extra]) => Object.assign(Party.create(sp, lv, { ivs: 31 }), extra || {}));
  async function zinniaBattle(second) {
    const team = zinniaTeam(second);
    const outcome = await battle("trainer", { foe: { name: "Lorekeeper Zinnia", team, pic: "zinnia", tera: second },
      defeatText: second ? ["Zinnia: Hah… So that's how strong you are.", "Then the sky's protector will listen to you, too."]
        : ["Zinnia: Not bad. Not bad at all!"], prize: 200 * Math.max(...team.map((r) => r.level)),
      music: second ? "em_vs_champion" : "em_vs_elite_four" });
    if (outcome === "won") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  async function deltaScene(script) {
    script = script.replace(/^enter:/, "arrive:");
    const f = player.flags, Z = "LOCALID_DELTA_ZINNIA_1F", D = "LOCALID_SPACE_CENTER_1F_SCIENTIST_1";
    if (script === "arrive:" + DELTA.SC1) {
      await Overworld.act([{ who: D, moves: ["face_down", "emote_exclamation_mark"] }]);
      await say(["Director: You're the Champion,\naren't you? Thank goodness!", "Our telescopes have found a\nmeteoroid. A huge one.",
        "It's falling toward Hoenn.\nIf nothing changes, it will strike\nin a matter of days."]);
      await say(["Steven: Devon is working on a way\nto send it somewhere else, but\nthere isn't time to finish it.",
        "We need another answer, " + player.name + "."]);
      music("mus_encounter_girl");
      const from = await walkIn(Z, lookOf("em_zinnia"), { x: 7, y: 9 }, [{ x: 7, y: 6, face: "up" }, { x: 8, y: 6, face: "up" }]);
      await say(["???: There is another answer.\nThere always was.", "Zinnia: I'm Zinnia. My people, the\nDraconids, have watched the sky\nfor a thousand years.",
        "The one who guards Hoenn's sky\ncan stop that rock. But only if\nsomeone strong enough asks it.", "So. Let's see how strong the\nChampion really is!"]);
      Screen.say("");
      if (await zinniaBattle(false) !== "won") { if (Overworld.personPosition(Z)) Overworld.removeObject(Z); return; }
      await say(["Zinnia: You'll do.", "Come to Meteor Falls. My people's\nstory is told there. You'd better\nhear it before the sky falls."]);
      if (from) await walkOut(Z, from); else Overworld.removeObject(Z);
      await say(["Steven: Rayquaza… Is that what\nshe means?", "Go, " + player.name + ". I'll help the\nSpace Center here."]);
      f.delta = 1;
      music((window.WORLD_MAPS[player.location.map] || {}).music);
      await persist();
      return;
    }
    if (script === "arrive:" + DELTA.TOP) {
      if (!f.deltaZinnia) {
        await say(["Zinnia: So you climbed all the way\nup. Good.", "Up there, past the clouds, the\nmeteoroid is coming.",
          "When the sky's protector rises, it\nwill only carry someone it trusts.\nShow me you're that someone!"]);
        Screen.say("");
        if (await zinniaBattle(true) !== "won") return;
        f.deltaZinnia = true;
        await persist();
      }
      await deltaRide();
      return;
    }
    if (script === "arrive:" + DELTA.SC2) {
      // After Jirachi: the readings settle; the instruments glitch. (Out of the doorway first: the scene comes before the step out.)
      const R = "LOCALID_SPACE_CENTER_2F_SCIENTIST";
      if (Overworld.position().y === 1) await Overworld.act([{ who: "player", moves: ["walk_down"] }]);
      await Overworld.act([{ who: R, moves: ["emote_exclamation_mark"] }]);
      await say(["Researcher: The energy readings\nfrom the observation room…", "They've settled. Whatever it was,\nit's gone quiet."]);
      sfx("se_pc_off");
      await Overworld.shake(16, { x: 1, y: 0, delay: 1 });
      await screenFlash([255, 255, 255], 3);
      await say(["Researcher: Wh-what?! The\ninstruments just…", "For a moment there, they recorded\nsomething impossible.",
        "A wish… granted? Ha… ha ha. I must\nbe working too hard."]);
      f.jirachiAfter = true;
      await persist();
    }
  }
  // Rayquaza carries you up, into the meteoroid; Deoxys; the meteoroid breaks apart; back to the Space Center.
  async function deltaRide() {
    const f = player.flags, yours = ownsSpecies("Rayquaza");
    await say(["Zinnia: Lord Rayquaza! Protector of\nthe sky! Hear us!"].concat(yours
      ? ["{PLAYER}'s Rayquaza let out a\ngreat roar!", "Zinnia: It answers you. Of course it\ndoes. Go on, Champion. Ride it!"]
      : ["A roar came down from beyond the\nclouds, and Rayquaza descended!", "Zinnia: It came… Go on, Champion.\nIt will carry you. Ride it!"]));
    cry("Rayquaza");
    await sleep(600);
    // (As in Omega Ruby and Alpha Sapphire: the meteorites it has eaten, and the people's wish, and it Mega Evolves;
    // yours learns Dragon Ascent, the move that lets it.)
    await say(["The energy of the meteorites within\nRayquaza's body began to surge…", "The Draconids' wish reached\nRayquaza!"]);
    Screen.say("");
    await screenFlash([255, 255, 255], 3);
    cry("Rayquaza");
    await say(["Rayquaza Mega Evolved into\nMega Rayquaza!"]);
    const mine = player.party.find((r) => !r.egg && r.species === "Rayquaza");
    if (mine && !Party.knowsMove(mine, "Dragon Ascent")) { await say(["Zinnia: Your Rayquaza… it knows the\nmove of our people's legend now."]); await learnMove(mine, "Dragon Ascent"); }
    Screen.say("");
    await Overworld.fadeToBlack();
    await RayquazaScene.play($("#overlay"), 2, { cry, sfx, music });
    $("#overlay").classList.add("hidden");
    show("world");
    await say(["Rayquaza tore up through the sky,\npast the clouds, into the black of\nspace…", "…and smashed into the meteoroid!",
      "Deep in the meteoroid's heart,\nsomething stirred…"]);
    if (!canBattle()) return;
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Deoxys-Normal", 80)] }, music: "mus_vs_deoxys", terrain: "space" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    await Overworld.fadeToBlack();
    await say(["The meteoroid broke apart into a\nshower of shooting stars!", "Rayquaza carried {PLAYER} back down\nto Hoenn…"]);
    f.delta = 3;
    delete f.deltaZinnia;
    await Overworld.teleport({ map: DELTA.SC1, x: 7, y: 6, facing: "up" });
    await Overworld.fadeFromBlack();
    await say(["Director: The meteoroid… It's gone!\nIt simply broke apart!", "Hoenn is safe. You've saved us all,\n" + player.name + "!",
      "Ah, and one more thing. Our\nresearcher upstairs has found\nsomething odd. Would you see him?"]);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }
  async function deltaTalk(script, ev) {
    const f = player.flags, st = deltaStage();
    if (script === "Delta_EventScript_Steven") {
      await say(st >= 3 ? ["Steven: The sky over Hoenn is clear\nagain, thanks to you.", "I'll never forget it, " + player.name + "."]
        : ["Steven: A meteoroid… Hoenn has seen\nfalling stars before, but never one\nlike this."]);
      return true;
    }
    if (script === "Delta_EventScript_Elder") {
      if (st === 1) {
        await say(["Elder: So you are the one Zinnia\nspoke of. Listen, then.", "Long ago a great rock fell from\nthe sky. Our people's ancestors\nfeared the end of the world.",
          "But the sky's protector, Lord\nRayquaza, came down and broke the\nrock apart before it could fall.", "We Draconids have told that story\never since, so we'd be ready if a\nstar ever fell again.",
          "Zinnia has gone up the Sky Pillar\nto call Lord Rayquaza.", "Go to her, child. Hurry."]);
        f.delta = 2;
        await persist();
      } else await say(st >= 3 ? ["Elder: The star broke apart over\nthe sea. The story ends well, this\ntime.", "Thank you, child."] : ["Elder: Hurry to the Sky Pillar."]);
      // (From the meteoroid on: she teaches Dragon Ascent, Lord Rayquaza's move, to a Rayquaza: Mega Rayquaza's key.)
      if (st >= 3 && player.party.some((r) => !r.egg && r.species === "Rayquaza" && !Party.knowsMove(r, "Dragon Ascent"))) {
        if (!(await confirm("Elder: Ah, Lord Rayquaza is with you.\nShall I teach it Dragon Ascent?"))) return true;
        const r = await choosePartyFor("Teach which {PKMN}?", null, player.party.map((q) => (q.egg || q.species !== "Rayquaza" ? "NOT ABLE" : Party.knowsMove(q, "Dragon Ascent") ? "LEARNED" : "ABLE")));
        show("world");
        if (r && !r.egg && r.species === "Rayquaza" && !Party.knowsMove(r, "Dragon Ascent")) await learnMove(r, "Dragon Ascent");
      }
      return true;
    }
    if (script === "Delta_EventScript_Zinnia") { await deltaScene("arrive:" + DELTA.TOP); return true; }
    if (script === "MossdeepCity_SpaceCenter_2F_EventScript_Scientist" && st === 3) {
      await say(["Researcher: Ah, the hero of the hour!", "Ever since the meteoroid broke up,\nwe've been picking up a strange\nenergy signature.",
        "It's coming from the observation\nroom up here. That room's been\nsealed for years.", "I've unsealed the door. Would you\ntake a look? I can't explain it."]);
      f.delta = 4;
      sfx("se_door");
      applyPatches(player.location.map);
      await persist();
      return true;
    }
    if (script === "SpaceCenter_EventScript_DeckDoor") {
      await say(st >= 4 ? ["The observation room's door is open."] : ["OBSERVATION ROOM", "The door is sealed.\nAUTHORIZED PERSONNEL ONLY."]);
      return true;
    }
    if (script === "SpaceCenter_EventScript_WishRock") { await wishRock(); return true; }
    return false;
  }

  // ---------- Jirachi (this game's own: the Space Center's observation deck) ----------
  //
  // Once the 2F researcher has unsealed it: a small observation deck, a wide window on the night sky, a
  // white rock in the middle (tools/build-delta-episode.js). Check the rock and make a wish (only words);
  // it glows, the stars outside line up, and Jirachi appears, to test you: a wild Jirachi, Lv. 50. Caught
  // or beaten it's gone for good (and 2F's researcher sees the readings settle); run from it, and it's back
  // the next time you wish.
  const deckFx = new Set();
  async function screenFlash(rgb, times) {
    const c = $("#overlay"), g = c.getContext("2d");
    c.classList.remove("hidden");
    for (let n = 0; n < (times || 1); n++) for (let a = 0; a <= 8; a++) {
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "rgba(" + rgb.join(",") + "," + (1 - Math.abs(a - 4) / 4) + ")";
      g.fillRect(0, 0, c.width, c.height);
      await sleep(30);
    }
    g.clearRect(0, 0, c.width, c.height);
    c.classList.add("hidden");
  }
  async function wishRock() {
    const f = player.flags, J = "LOCALID_DECK_JIRACHI";
    if (f.jirachiMet) { await say(["It's a white rock.", "Its warmth has faded."]); return; }
    await say(["It's a strange white rock.", "It feels warm… as if it's listening."]);
    if (!(await confirm("Make a wish?"))) return;
    await say("{PLAYER} closed their eyes and made\na wish…");
    Screen.say("");
    music(null);
    await sleep(500);
    deckFx.add("glow"); sfx("se_m_heal_bell");
    await sleep(1200);
    deckFx.add("stars"); sfx("se_m_moonlight");
    await say("Outside the window, the stars drew\ninto a line across the sky…");
    Screen.say("");
    await screenFlash([255, 250, 210], 1);
    Overworld.addObject(J, { x: 4, y: 2, facing: "down" }, { sprite: "follow/385", width: 32, height: 32, frames: 9, offsetX: -8 });
    cry("Jirachi");
    await sleep(700);
    await say(["Jirachi: …", "A wish only holds power if the one\nwho makes it is strong enough to\nprotect it."]);
    Screen.say("");
    const outcome = canBattle() ? await battle("wild", { foe: { name: "Wild", team: [Party.create("Jirachi", 50)] }, music: "mus_vs_legend" }) : "ran";
    if (outcome === "lost") { deckFx.clear(); Overworld.removeObject(J); return; }
    show("world");
    await Overworld.resume();
    if (Overworld.personPosition(J)) Overworld.removeObject(J);
    deckFx.clear();
    if (outcome === "ran") { await say(["Jirachi vanished into the starlight…", "Maybe it will come again for\nanother wish."]); return; }
    if (outcome === "won") await say("Jirachi faded back into the stars…");
    f.jirachiMet = true;
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }

  // ---------- The GS Ball (Pokémon Crystal's) ----------
  //
  // This game's way to it: once you've been through the Hall of Fame, Prof.
  // Oak in his lab gives you the GS Ball (Crystal's came from Goldenrod's
  // Pokémon Center, and Kurt looked it over first). Put it in Ilex Forest's
  // shrine (Crystal's IlexForestShrineScript, its words) and Celebi appears,
  // wild at Lv. 50 (Crystal's was 30). Catch it and the GS Ball is spent;
  // run, or knock it out, and the Ball is still yours to try again.
  async function oakGsBall() {
    const f = player.flags;
    await say(["Oak: Ah, {PLAYER}! Our new\nChampion! Ho ho!", "I have something for you.",
      "A friend sent me this mysterious\nPoké Ball. It's called the GS Ball.", "I've studied it for months, but I\ncan't make heads or tails of it!",
      "Kurt, the Ball maker in Johto's\nAzalea Town, says there's a shrine\nin Ilex Forest…", "Perhaps the GS Ball has something\nto do with it. Will you take it\nthere for me?"]);
    Player.addItem(player, "gs-ball");
    f.gotGsBall = true;
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} received the GS Ball\nfrom Prof. Oak!");
    await say(["Oak: Let me know what you find\nat the shrine!"]);
    await persist();
  }
  async function ilexShrineCelebi() {
    const f = player.flags;
    await say(["Ilex Forest Shrine…", "It's in honor of the forest's\nprotector…", "Oh? What is this?", "It's a hole.\nIt looks like the GS Ball would fit\ninside it."]);
    if (!(await confirm("Want to put the GS Ball here?"))) return;
    await say("{PLAYER} put in the GS Ball.");
    Screen.say("");
    if (!canBattle()) return;
    await sleep(333);
    music(null);
    await Overworld.act([{ who: "player", moves: ["face_down"] }]);
    await sleep(500);
    await Overworld.fadeToBlack();
    cry("Celebi");
    await Overworld.fadeFromBlack();
    await sleep(300);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create("Celebi", 50)] }, music: "mus_vs_legend", terrain: "grass" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    if (outcome === "ran" || outcome === "won") { await say(["Celebi vanished into the forest…", "The GS Ball rolled back out of\nthe shrine."]); return; }
    Player.removeItem(player, "gs-ball");
    f.gsBallCelebi = true;
    await persist();
  }

  // The legendary birds: Articuno (SeafoamIslands_B4F_EventScript_Articuno)
  // and Zapdos (PowerPlant_EventScript_Zapdos), wild at Lv. 50, to the
  // legendary battle music. Beaten or caught, it's gone for good; run from,
  // it flies away, and is back the next time you come.
  // (Mewtwo in Cerulean Cave too, `opts` { level, text, music, moves }: Lv. 70,
  // "Mew!", its own battle music: CeruleanCave_B1F_EventScript_Mewtwo.)
  async function legendaryBird(person, species, flag, opts) {
    opts = opts || {};
    if (!canBattle()) return;
    cry(species);
    await say(opts.text || T("Text_Gyaoo"));
    music("mus_encounter_gym_leader");
    await sleep(300);
    const outcome = await battle("wild", { foe: { name: "Wild", team: [Party.create(species, opts.level || 50, opts.moves ? { moves: opts.moves } : {})] }, music: opts.music || "mus_vs_legend" });
    if (outcome === "lost") return;
    show("world");
    await Overworld.resume();
    if (outcome === "ran") {
      await Overworld.fadeToBlack();
      tempFlags.add(player.location.map + ":" + person.flag);
      Overworld.removePerson(person);
      await Overworld.fadeFromBlack();
      await say(T("Text_MonFlewAway"), [species]);
      return;
    }
    player.flags[flag] = true;
    if (outcome === "won") { await Overworld.fadeToBlack(); Overworld.removePerson(person); await Overworld.fadeFromBlack(); }
    else Overworld.removePerson(person);
    // (Mewtwo gone, its Mega Stones are there beside its spot.)
    if (species === "Mewtwo") Overworld.refreshPeople();
  }

  // ---------- Viridian City's Gym ----------

  // Open once you have the Cascade, Thunder, Rainbow, Soul, Marsh and Volcano
  // Badges (ViridianCity_EventScript_TryUnlockGym: FireRed doesn't check the
  // Boulder Badge).
  const viridianGymOpen = () => LeagueRoad.gymOpen(player.badges);

  // (This game's own: his Kangaskhan's Mega Stone, after the badge and TM.)
  const giovanniKangaskhanite = () => megaStoneGift("kangaskhanite", ["And take this. A Kangaskhanite.",
    "Team Rocket has no more use for it.\nPerhaps you can master its power."], "Giovanni");

  // ---------- Route 22, on the way to the League: Leaf ----------
  //
  // Where FireRed's Route22_EventScript_LateRival has Gary (this game's own:
  // Leaf), once you've beaten Giovanni: she comes up from the left on your
  // way to the League. Butterfree, Wigglytuff, Nidoqueen, Politoed, her
  // starter (fully evolved) and her ace, Dragonite, holding its Dragoninite:
  // it Mega Evolves and Terastallizes into a Flying type (she has a Tera Orb).
  const FINAL_STAGE = { Bulbasaur: "Venusaur", Charmander: "Charizard", Squirtle: "Blastoise" };
  const route22LeafTeam = () => {
    const starter = FINAL_STAGE[RIVAL_PICK[player.flags.starter] || "Bulbasaur"];
    return [Party.create("Butterfree", 52, { ivs: 20 }), Party.create("Wigglytuff", 52, { ivs: 20 }), Party.create("Nidoqueen", 53, { ivs: 20 }),
      Party.create("Politoed", 53, { ivs: 20 }), Party.create(starter, 55, { ivs: 25 }),
      Object.assign(Party.create("Dragonite", 58, { ivs: 31 }), { item: "dragoninite", teraType: "Flying", teraAce: true })];
  };
  const route22LateRivalDue = () => !!(player.flags.TRAINER_LEADER_GIOVANNI && !player.flags.route22LateRival);

  // ---------- Kanto's Gym Leaders' rematches ----------
  //
  // This game's own: once you're the Champion (and each has given you their
  // TM), Kanto's Gym Leaders battle you again in their Gyms, once a day (the
  // game's clock: Player.gameTime), with stronger teams: HeartGold and
  // SoulSilver's rematch teams where they have them (TRAINER_LEADER_*_2:
  // Brock, Misty, Lt. Surge, Erika, Sabrina, Blaine) and Koga's from HGSS's
  // Elite Four rematch (Giovanni's Gym has none). Each one's ace Terastallizes
  // as in your first battle, and Koga's Beedrill, Sabrina's Alakazam and
  // Blaine's Houndoom Mega Evolve again. Lose, and they'll take you on again today.
  const KANTO_REMATCH = {
    PewterCity_Gym_EventScript_Brock: { id: "TRAINER_LEADER_BROCK", tm: "gotTM39", name: "Brock", pic: "leader_brock",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_BROCK_BROCK_2", "Onix", { teraType: "Dragon" }),
      intro: ["Brock: You're the Champion now?", "My rock-hard will is stronger than\never. Let's see if you can crack it!"],
      defeat: ["Brock: Your strength is solid as a\nrock. Come back anytime!"] },
    CeruleanCity_Gym_EventScript_Misty: { id: "TRAINER_LEADER_MISTY", tm: "gotTM03", name: "Misty", pic: "leader_misty",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_MISTY_MISTY_2", "Starmie", { teraType: "Psychic" }),
      intro: ["Misty: The Champion, back at my Gym!", "My water Pokémon have gotten tougher.\nReady to get soaked?"],
      defeat: ["Misty: Wow… You're still way too\nstrong. Come by again tomorrow!"] },
    VermilionCity_Gym_EventScript_LtSurge: { id: "TRAINER_LEADER_LT_SURGE", tm: "gotTM34", name: "Lt. Surge", pic: "leader_lt_surge",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_LT_SURGE_LT__SURGE_2", "Raichu", { teraType: "Water" }),
      intro: ["Lt. Surge: Hey, kid! The Champion!", "My electric soldiers have been drilling\nday and night! Let's battle!"],
      defeat: ["Lt. Surge: Whoa! You're the real deal,\nkid! Come back for another round!"] },
    CeladonCity_Gym_EventScript_Erika: { id: "TRAINER_LEADER_ERIKA", tm: "gotTM19", name: "Erika", pic: "leader_erika",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_ERIKA_ERIKA_2", "Tangrowth", { teraType: "Poison" }),
      intro: ["Erika: Oh, the Champion… How lovely.", "My Pokémon have grown, as flowers do.\nShall we battle?"],
      defeat: ["Erika: Such splendid strength…\nPlease, visit again."] },
    FuchsiaCity_Gym_EventScript_Koga: { id: "TRAINER_LEADER_KOGA", tm: "gotTM06FromKoga", name: "Koga", pic: "leader_koga",
      team: () => leaderTeam("HGSS_TRAINER_ELITE_FOUR_KOGA_KOGA_2", null, null, [["Skuntank", "Beedrill", { item: "beedrillite", teraType: "Ground" }]]),
      intro: ["Koga: Fwahahaha! The Champion!", "My ninja techniques have only grown\nsharper. Witness them!"],
      defeat: ["Koga: Humph! Your skill is beyond\ndoubt. I shall train harder still."] },
    SaffronCity_Gym_EventScript_Sabrina: { id: "TRAINER_LEADER_SABRINA", tm: "gotTM04", name: "Sabrina", pic: "leader_sabrina",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_SABRINA_SABRINA_2", "Alakazam", { item: "alakazite", teraType: "Dark" }),
      intro: ["Sabrina: I knew you would come.", "I foresaw this battle… but not how\nit ends. Show me."],
      defeat: ["Sabrina: Even my visions could not\nforesee such power. Come again."] },
    CinnabarIsland_Gym_EventScript_Blaine: { id: "TRAINER_LEADER_BLAINE", tm: "gotTM38FromBlaine", name: "Blaine", pic: "leader_blaine",
      team: () => leaderTeam("HGSS_TRAINER_LEADER_BLAINE_BLAINE_2", "Houndoom", { item: "houndoominite", teraType: "Dark", level: 62 }),
      intro: ["Blaine: Hah! The Champion returns!", "My fire burns hotter than ever!\nCan you stand the heat?"],
      defeat: ["Blaine: I've burned out! You're\na blazing talent. Come again!"] }
  };

  // ---------- The end of Victory Road: Gary ----------
  //
  // This game's own: coming out of Victory Road onto Route 23 (its 2F's way
  // out, at (18, 28)), Gary comes down from the Indigo Plateau to meet you,
  // with his team from Silph Co. (his Growlithe an Arcanine now) at about
  // level 50: Pidgeot, Arcanine, Gyarados (holding its Gyaradosite: it Mega
  // Evolves), Exeggutor, Alakazam and Umbreon (his Eevee) as his ace. Then he
  // heads back up to the League.
  const VICTORY_ROAD_RIVAL_TEAM = [["Pidgeot", 55], ["Arcanine", 55], ["Gyarados", 55, "gyaradosite"], ["Exeggutor", 54], ["Alakazam", 55], ["Umbreon", 58]];
  const victoryRoadRivalDue = () => {
    const at = Overworld.position();
    return !!(player.flags.TRAINER_LEADER_GIOVANNI && !player.flags.victoryRoadRival && at.map === "Route23" && at.x === 18 && at.y === 28 && canBattle());
  };

  // ---------- Route 23's badge guards ----------
  //
  // FireRed's Route23_EventScript_BadgeGuard and ..Trigger (and the League
  // gate's on Route 22): each guard checks one Badge, in order from the
  // Boulder Badge at the gate to the Earth Badge by Victory Road; walking up
  // to the next guard stops you until he's seen his (VAR_MAP_SCENE_ROUTE23,
  // the last Badge shown). Talking to one, he checks his Badge whatever
  // you've shown before.
  const route23Scene = () => LeagueRoad.scene(player.flags);


  // ---------- The Pokémon League ----------
  //
  // FireRed's PokemonLeague_* scripts (the rules are in game/pokemon-league.js).
  // Through the Indigo Plateau's back door: walking into each Elite Four
  // room, you walk up to its trainer and the way in shuts behind you (SE_UNLOCK);
  // there's no way out but on, through the door that opens once they're beaten,
  // or blacking out, back to the Indigo Plateau's Pokémon Center, and the League
  // starts over from Lorelei. Lance's room has its long corridor. Then Gary,
  // the Champion; Prof. Oak; the Hall of Fame, its record, and the credits;
  // and you're home in Pallet Town.
  const ELITE_FOUR_SCRIPTS = ["PokemonLeague_LoreleisRoom_EventScript_Lorelei", "PokemonLeague_BrunosRoom_EventScript_Bruno",
    "PokemonLeague_AgathasRoom_EventScript_Agatha", "PokemonLeague_LancesRoom_EventScript_Lance"];
  const LEAGUE_TEXT = ["PokemonLeague_LoreleisRoom_Text_", "PokemonLeague_BrunosRoom_Text_", "PokemonLeague_AgathasRoom_Text_", "PokemonLeague_LancesRoom_Text_"];
  const LEAGUE_IDS = [null, "LOCALID_BRUNO", "#0", "LOCALID_LANCE"];

  // An Elite Four member (PokemonLeague_<name>sRoom_EventScript_<name>):
  // FireRed's team (the rematch team, _2, once FLAG_SYS_CAN_LINK_WITH_RS is
  // set), to the Gym Leader battle music; beaten, the door behind them opens.
  // Bruno and Agatha look away when they've had their say. (Lorelei's
  // rematch words go by FLAG_SYS_CAN_LINK_WITH_RS, the others' by
  // FLAG_SYS_GAME_CLEAR, as in FireRed.)
  // This game's changes to FireRed's teams, the same for the first battle
  // and the rematch (_2): [slot, species in its place (null: keep it), extras]
  // at that slot's level. A Tera ace (teraAce) Terastallizes as soon as it's
  // out, its trainer having a Tera Orb.
  const TEAM_SWAPS = {
    // Giovanni (Viridian Gym): Rhydon, Persian, and his ace, Mega Kangaskhan (Tera Fighting).
    TRAINER_LEADER_GIOVANNI: [[0, "Rhydon"], [1, "Persian"], [4, "Kangaskhan", { item: "kangaskhanite", teraType: "Fighting", teraAce: true }]],
    // Sabrina (Saffron Gym): Jynx in Kadabra's place.
    TRAINER_LEADER_SABRINA: [[0, "Jynx"]],
    // Bruno: Hitmontop in his second Onix's (Steelix's) place.
    TRAINER_ELITE_FOUR_BRUNO: [[3, "Hitmontop"]], TRAINER_ELITE_FOUR_BRUNO_2: [[3, "Hitmontop"]],
    // Agatha: Hisuian Typhlosion, Cursola, Alolan Marowak, Mismagius and her ace, Mega Gengar (Tera Dark).
    TRAINER_ELITE_FOUR_AGATHA: [[0, "Typhlosion-Hisui"], [1, "Cursola"], [2, "Marowak-Alola"], [3, "Mismagius"], [4, null, { item: "gengarite", teraType: "Dark", teraAce: true }]],
    TRAINER_ELITE_FOUR_AGATHA_2: [[0, "Typhlosion-Hisui"], [1, "Cursola"], [2, "Marowak-Alola"], [3, "Mismagius"], [4, null, { item: "gengarite", teraType: "Dark", teraAce: true }]],
    // Lance: Kingdra and Mega Charizard X in his Dragonairs' places, and his ace, Dragonite (Tera Flying).
    TRAINER_ELITE_FOUR_LANCE: [[1, "Kingdra"], [2, "Charizard", { item: "charizardite-x" }], [4, null, { teraType: "Flying", teraAce: true }]],
    TRAINER_ELITE_FOUR_LANCE_2: [[1, "Kingdra"], [2, "Charizard", { item: "charizardite-x" }], [4, null, { teraType: "Flying", teraAce: true }]]
  };
  // Johto's League (this game's): once you've Johto's eight Badges, HGSS's
  // Elite Four, Will, Koga, Bruno and Karen, and Champion Lance take the
  // League's rooms (data/johto-maps.js's JOHTO_LEAGUE, from HGSS's T10R0201-0601),
  // with their HGSS teams, their rematch teams once you've beaten them, and
  // their lines. (Its rooms and Hall of Fame are FireRed's as before.)
  const johtoLeague = () => !!window.JOHTO_LEAGUE && Player.REGION_BADGES.johto.every((b) => player.badges.includes(b));

  // Red, the Champion (this game's own; FireRed has Gary,
  // PokemonLeague_ChampionsRoom_EventScript_EnterRoom): Pikachu, Espeon,
  // Blastoise, Venusaur, Snorlax and his ace, Charizard, holding its
  // Charizardite Y: it Mega Evolves. Levels about FireRed's Champion's (57-63),
  // and with FLAG_SYS_CAN_LINK_WITH_RS its rematch ones (72-75).
  const CHAMPION_TEAM = [["Pikachu", 58, 72], ["Espeon", 59, 72], ["Blastoise", 60, 73], ["Venusaur", 60, 73], ["Snorlax", 61, 74], ["Charizard", 63, 75, "charizardite-y"]];

  // ---------- Hoenn: by Seagallop from Vermilion (this game's own) ----------
  //
  // The first time, the Seagallop takes you, and a moving truck, to Hoenn: the truck's inside, as Emerald
  // begins (data/emerald-maps.js; ui/hoenn-script.js plays Emerald's scripts from there). After that, the
  // Seagallop lands at Slateport's harbor, whose sailor sails you back to Vermilion.
  const hoennStarted = () => hoenn.getVar("VAR_LITTLEROOT_INTRO_STATE") > 0;
  async function sailToHoenn(aqua) {
    const ship = aqua ? "the S.S. Aqua" : "SEAGALLOP HI-SPEED 9";
    await say(hoennStarted() ? ["All aboard " + ship + "!", "Next stop, Slateport City in Hoenn!"]
      : ["All aboard " + ship + "!", "It's a long way to Hoenn. You can\nride in the moving truck we're taking."]);
    if (hoennStarted()) await ferry({ map: "SlateportCity_Harbor", x: 6, y: 11, facing: "down" }, false);
    else await ferry({ map: "InsideOfTruck", x: 2, y: 2, facing: "right" }, false);
  }
  async function slateportSailor() {
    // (Olivine too, by the S.S. Aqua, once you've beaten Johto's League.)
    const dests = ["Vermilion City"].concat(player.flags.johtoLeagueClear ? ["Olivine City"] : [], ["Cancel"]);
    const i = await multichoice("Ahoy! Where are you sailing?", 17, 12 - 2 * dests.length, dests);
    const pick = dests[i];
    if (!pick || pick === "Cancel") { await say("Come back any time."); return; }
    if (pick === "Olivine City") {
      await say(["All aboard the S.S. Aqua!"]);
      const port = window.WORLD_MAPS.SSAqua_OlivinePortExterior, plank = port.warps.find((w) => w.map === "SSAqua_1F");
      await ferry({ map: port.name, x: plank.x, y: plank.y + 1, facing: "down" }, false);
      return;
    }
    await say(["All aboard SEAGALLOP HI-SPEED 9!"]);
    await ferry({ map: "VermilionCity", x: 23, y: 32, facing: "up" }, true);
  }

  // ---------- Faraway Island (Emerald's Old Sea Map event) ----------
  //
  // From Pokémon Emerald (data/maps/FarawayIsland_*, src/faraway_island.c;
  // the maps in data/emerald-maps.js). The Seagallop's sailor waits at the
  // shore to take you home; inside, in the long grass, Mew plays hide and
  // seek (game/faraway.js): it hides as you come in, moves as you do, away
  // from you, shows itself every 8th step, and is found by walking up to it,
  // seen or not. A wild Mew, Lv. 50 (Emerald's is Lv. 30): caught or beaten it's gone for good; run
  // from, it flies away and is back the next time you come in.
  const MEW = "LOCALID_FARAWAY_ISLAND_MEW";
  // FarawayIsland_Entrance_EventScript_Sailor ("Do you want to return to Lilycove?" in Emerald).
  async function farawaySailor(person) {
    const q = ["The captain can be so maddeningly\nfickle…", "Do you want to return to Vermilion?"];
    await say(q.slice(0, -1));
    if (!(await confirm(q[q.length - 1]))) { await say("Aye, right, as you like, then."); return; }
    await say(["Aye, right, then!\nSail home we will!"]);
    Screen.say("");
    await Overworld.act([{ who: "LOCALID_FARAWAY_ISLAND_SAILOR", moves: M("Common_Movement_WalkInPlaceFasterDown") }]);
    await sleep(500);
    const p = Sevii.port("VERMILION_CITY");
    await ferry({ map: p.map, x: p.x, y: p.y, facing: "up" }, true);
  }
  // FarawayIsland_Interior_EventScript_FindMew: coming in, "!" over Mew,
  // and it darts three steps up into the grass and is gone from sight.
  async function findMew() {
    sfx("se_pin");
    await Overworld.act([{ who: MEW, moves: ["emote_exclamation_mark"] }]);
    await sleep(800);
    await Overworld.act([{ who: MEW, moves: ["walk_up", "walk_up", "walk_up", "walk_in_place_faster_down", "set_invisible"] }]);
  }
  // Each step inside: Mew's (UpdateFarawayIslandStepCounter, GetMewMoveDirection).
  function farawayStep() {
    const f = player.flags;
    if (player.location.map !== "FarawayIsland_Interior" || f.foughtMew) return;
    const mew = Overworld.personPosition(MEW);
    if (!mew) return;
    f.farawaySteps = ((f.farawaySteps | 0) + 1) % 9999;
    const cur = Overworld.position(), [dx, dy] = World.DIRS[cur.facing];
    const r = Faraway.mewStep({ mew, prev: { x: cur.x - dx, y: cur.y - dy }, cur, steps: f.farawaySteps, isGrass: Faraway.isGrass(cur.map) });
    if (r.visible != null) Overworld.setPersonHidden(MEW, !r.visible);
    if (r.dir) Overworld.stepPerson(MEW, r.dir);
  }
  // FarawayIsland_Interior_EventScript_Mew: found! It shows itself, "Myuu…",
  // and the battle. (This game's own: it knows Psychic, Nasty Plot, Aura
  // Sphere and Ice Beam.)
  const FARAWAY_MEW_MOVES = ["Psychic", "Nasty Plot", "Aura Sphere", "Ice Beam"];
  async function mewFound(person) {
    if (!canBattle()) return;
    Overworld.setPersonHidden(MEW, false);
    await Overworld.act([{ who: MEW, moves: ["face_player"] }]);
    await legendaryBird(person, "Mew", "foughtMew", { level: 50, text: ["Myuu…"], moves: FARAWAY_MEW_MOVES });
  }

  // ---------- Orre: the Outskirt Stand (Pokémon Colosseum's opening) ----------
  //
  // Up the road from the Air Strip (Prof. Oak's plane: below) is the Outskirt
  // Stand, an old locomotive made a diner (the maps in data/orre-maps.js).
  // The first time you come, two men come out of the diner, Folly and Trudly,
  // talking about their meal and the sack in their truck; seeing you, they
  // tell you to get lost and drive off north with it. Inside, Rider Willie, at
  // the back, wants a look at your Pokémon: coming out again, Willie follows
  // and challenges you to a double battle (every battle in Colosseum is one),
  // and after it points you on to Phenac City; the bar sells to you from then
  // on. (The words are this game's own: Colosseum's script isn't to hand.)
  const ORRE = (k) => "LOCALID_ORRE_" + k;
  // (The debug menu's way there: Prof. Oak's plane, without his briefing.)
  // ---------- Sinnoh: Platinum's opening chapter (ui/sinnoh-story.js) ----------

  async function unovaTournament(ids){
    const chosen=await chooseBattleTeam(3,{check:()=>null});if(!chosen||chosen.length!==3)return 'cancelled';
    const st=Unova.state(player),original=player.party;st.pwtBackup=original;Save.write(player);
    try{player.party=chosen.map(i=>{const r=JSON.parse(JSON.stringify(original[i]));r.level=25;r.exp=Experience.expForLevel(Experience.growthRate(r.species),25);Party.heal(r);return r;});
      for(let i=0;i<ids.length;i++){const t=Unova.data().trainers[ids[i]],sets=Unova.data().west.tournament.sets[i===1?'cheren':'colress'];const team=i===0?Unova.team(ids[i]).map(r=>{r.level=25;Party.heal(r);return r;}):sets.map(m=>{const r=Party.create(m.species,25,{moves:m.moves,nature:m.nature,ivs:12});if(m.item)r.item=m.item;return r;});
        const outcome=await battle('trainer',{foe:{name:t.name,team,pic:t.pic},noExp:true,noPrize:true,noBlackout:true,noBag:true,noGimmicks:true,record:true});if(outcome!=='won')return outcome;player.party.forEach(Party.heal);
      }return 'won';
    }finally{player.party=original;delete st.pwtBackup;Save.write(player);show('world');await Overworld.resume();}
  }
  const unovaStory = UnovaStory.create({chooseParty:choosePartyFor,daycareLady:()=>fourIslandDayCareLady("unova"),daycareMan:()=>fourIslandDayCareMan("unova"),tournament:unovaTournament,recorded:()=>lastRecord,dashing:()=>Overworld.lastStepRunning(),player:()=>player,say,confirm,battle,mart,replay:async rec=>{await playRecord(rec);music(WORLD_MAPS[player.location.map].music);},movie:async()=>{Screen.say("");clearMenu();show("field");music("mus_vs_trainer");try{return await UnovaMovie.shoot(player);}finally{music(WORLD_MAPS[player.location.map].music);}},canBattle,showWorld:()=>show("world"),resume:()=>Overworld.resume(),refreshPeople:()=>Overworld.refreshPeople(),saveCheckpoint:async()=>{tick();Save.write(player);},teleport:async loc=>{await Overworld.teleport({...loc});},choose:(prompt,options)=>ask(prompt,options.map(label=>({label,value:label})).concat([{label:"Cancel",value:null}])),wildEncounter:async(record,opts={})=>{const outcome=await battle("wild",{...opts,foe:{name:"Wild",team:[wildMon(record)]}});show("world");await Overworld.resume();return outcome;}});
  const sinnohStory = SinnohStory.create({
    player: () => player, avatar:()=>Overworld.avatar(), wildMon, say,
    saveCheckpoint: async()=>{tick();Save.write(player);},
    sinnohDiploma: async kind=>{Screen.say("");show('scene');clearMenu();try{await SinnohOptionalDevice.diploma(scene,player,kind);}finally{show('world');await Overworld.resume();}},
    frontierBattle: async(spec)=>{const s=SinnohFrontier.state(player),real=player.party;s.backup=real;s.active.phase='battle';tick();Save.write(player);player.party=spec.team;let outcome;try{outcome=await battle('trainer',{foe:spec.foe,defeatText:spec.defeatText,double:spec.double,noExp:true,noPrize:true,noBlackout:true,noGimmicks:true,noBag:true,record:true,weather:spec.weather,trickRoom:spec.trickRoom,onResult:r=>{s.active.lastTurns=r.turns;},partner:spec.partner,foe2:spec.foe2,chosen:spec.partner?[0,1]:undefined});}finally{player.party=real;}if(lastRecord){s.lastRecord=Object.assign({facility:s.active.facility,streak:s.active.streak+1},lastRecord);lastRecord=null;}show('world');await Overworld.resume();return outcome;},
    frontierReplay: async()=>{const rec=SinnohFrontier.state(player).lastRecord;if(rec)await playRecord(rec);else await say('No Sinnoh Frontier battle has been recorded.');},
    chooseFrontierTeam: async(list,n,title)=>{Screen.say("");show("scene");clearMenu();try{return await SinnohFrontierDevice.select(scene,list,n,title);}finally{show("world");await Overworld.resume();}},
    spinFrontier: async()=>{Screen.say("");show("scene");clearMenu();try{return await SinnohFrontierDevice.roulette(scene,player);}finally{show("world");await Overworld.resume();}},
    contestDevice: async(stage,index)=>{Screen.say("");show("scene");clearMenu();try{const fn={visual:'dress',dance:'dance',acting:'acting',results:'results',photo:'photo'}[stage];return await SinnohContestDevice[fn](scene,player,stage==='photo'?index:async()=>{tick();Save.write(player);});}finally{show("world");await Overworld.resume();}},
    choosePoffinBerries: async()=>{Screen.say("");show("scene");clearMenu();try{return await SinnohPoffinDevice.ingredients(scene,player);}finally{show("world");await Overworld.resume();}},
    cookPoffin: async berries=>{Screen.say("");show("scene");clearMenu();try{return await SinnohPoffinDevice.cook(scene,berries);}finally{show("world");await Overworld.resume();}},
    openPoffinCase: async()=>{Screen.say("");show("scene");clearMenu();try{await SinnohPoffinDevice.openCase(scene,player);}finally{show("world");await Overworld.resume();}},
    chooseParkPokemon: async()=>{Screen.say("");show("scene");clearMenu();try{return await SinnohParkSelection.open(scene,player);}finally{show("world");await Overworld.resume();}},
    mineUnderground: async()=>{Screen.say("");show("scene");clearMenu();const xp=miningXp(),dig=Mining.create(Math.random,Mining.level(xp),player.location.map,{pool:SinnohUnderground.pool(player),count:2+Math.floor(Math.random()*3),rocks:3,energy:50,tools:Mining.TOOLS.slice(0,2)}),found=await MiningScreen.run(scene,dig,xp);player.flags.miningXp=xp+dig.xp;for(const id of found){const ok=SinnohUnderground.found(player,id,dig.energy/dig.maxEnergy);await MiningScreen.message(ok?"You dug up "+Bag.name(id)+"!":"Your Underground inventory is full.");}if(!found.length)await MiningScreen.message("Nothing was dug up…");MiningScreen.clear();show("world");await Overworld.resume();await persist();},
    decorateUnderground: async()=>{Screen.say("");show("scene");clearMenu();try{await SinnohUndergroundDevice.decorate(scene,player);}finally{show("world");await Overworld.resume();}},
    escapeUndergroundTrap: async id=>{Screen.say("");show("scene");clearMenu();try{await SinnohUndergroundDevice.escapeTrap(scene,id);}finally{show("world");await Overworld.resume();}}, confirm, showPicture, hidePicture, canBattle, battle, sfx, forgetMove: chooseMoveToForget,
    openPC: async()=>{await pc();show("world");await Overworld.resume();},
    chooseParty: choosePartyFor, learnMove, enterText, tradeFor, daycareLady: () => fourIslandDayCareLady("sinnoh"), daycareMan: () => fourIslandDayCareMan("sinnoh"),
    choose: (prompt, species) => ask(prompt, species.map((name) => ({ label: name, value: name })).concat([{label:"Cancel",value:null}])),
    playCasinoSlots: async id=>{Screen.say("");const value=await window.SlotMachine.play({machineId:id,coins:SinnohServices.coins(player),maxCoins:50000,sfx,fanfare,onWin:()=>{SinnohCompletion.state(player).casinoWins++;}});SinnohServices.setCoins(player,value);tick();Save.write(player);show("world");await Overworld.resume();},
    showWorld: () => show("world"), resume: () => Overworld.resume(),
    refreshPeople: () => Overworld.refreshPeople(), teleport: (to) => Overworld.teleport(to),
    refreshMap: () => { applyPatches(player.location.map); Overworld.refreshPeople(); },
    onBike: () => Overworld.avatar() === "bike", mountBike: () => Overworld.setAvatar("bike"),
    championScreen: async entry => {
      tick(); Save.write(player);
      await HallOfFame.show($("#overlay"), entry, {cry, sfx, music, player:{name:player.name,id:player.trainerId,playTimeMs:player.playTimeMs,pic:Player.LOOKS[player.look].front},save:async()=>{tick();Save.write(player);savePromptAt=player.playTimeMs;}});
      $("#overlay").classList.add("hidden"); show("world");
    }
  });

  // ---------- Sinnoh: the S.S. Tidal's run (this game's own) ----------
  //
  // From Lilycove's harbor, with the Sinnoh Ticket (Norman's, after Hoenn's Hall of Fame): across the sea to Sinnoh,
  // where the ship drops anchor off Sandgem Town's beach; its sailor there rows you out to it again, back to Lilycove.
  const SANDGEM_BEACH = { map: "SandgemTown", x: 25, y: 29, facing: "down" };
  const LILYCOVE_HARBOR = { map: "LilycoveCity_Harbor", x: 8, y: 11, facing: "down" };
  async function voyage(to, lines) {
    await Overworld.fadeToBlack();
    music(null);
    Overworld.setAvatar("walk");
    Orre.leave(player);
    const o = $("#overlay");
    sfx("se_ship");
    for (const l of lines) await GbaMenus.blackScreen(o, l);
    o.classList.add("hidden");
    player.location = Object.assign({}, to);
    await Overworld.teleport(player.location);
    await persist();
  }
  async function sailToSinnoh() {
    Screen.say("");
    show("world");
    Overworld.resume();
    await voyage(SANDGEM_BEACH, ["The S.S. Tidal sets sail from Lilycove,\nout across the open sea…", "Days later, a new land comes into\nview: the Sinnoh region."]);
    player.flags.sinnohLanded = true;
    await say(["Sailor: Here we are: Sandgem Town,\nin the Sinnoh region!", "The ship's anchored offshore. Come\nand see me when you want to sail\nback to Hoenn."]);
  }
  // A ferryman in Sinnoh (Canalave's Eldritch, to Iron Island; and back): his question, then off.
  async function sinnohFerry(person) {
    // (His question, what he says before it, and after you say yes.)
    const text = [].concat(person.text || []), q = Math.max(0, text.map((t) => /\?/.test(t)).lastIndexOf(true));
    if (q > 0) await say(text.slice(0, q));
    if (!(await confirm(fill(text[q] || "Shall we set sail?")))) return;
    if (text.length > q + 1) await say(text.slice(q + 1));
    const to = window.WORLD_MAPS[person.ferry.map];
    await voyage({ map: person.ferry.map, x: person.ferry.x, y: person.ferry.y, facing: "down" }, ["The boat sets out across the water…"]);
    await say("We've arrived at " + (to ? to.title : "our stop") + "!");
  }
  async function sinnohSailor() {
    await say(["Sailor: Ahoy! The S.S. Tidal's\nanchored just offshore."]);
    if (!(await confirm("Shall we sail back to Lilycove City\nin Hoenn?"))) { await say("Enjoy Sinnoh! I'll be right here."); return; }
    await say("All aboard!");
    await voyage(LILYCOVE_HARBOR, ["The S.S. Tidal sets sail from Sinnoh,\nback across the sea to Hoenn…"]);
    await say("The S.S. Tidal has arrived in\nLilycove City.");
  }

  async function visitOrre() {
    Screen.say("");
    show("world");
    Overworld.resume();
    await flyToOrre();
  }

  // ---------- Orre: how you come to be there (this game's own) ----------
  //
  // Once you've beaten Johto's Pokémon League (Lance; player.flags.johtoLeagueClear), the next step you take outdoors
  // Prof. Oak calls on your Pokégear (or PokéNav): something's wrong in Orre, far away, and he'd like to see you at his lab in Pallet Town
  // (player.flags.orreStory 1). There he tells you of Orre's two evil teams, Cipher and Team Snagem, and the Shadow
  // Pokémon, and asks you to go undercover in Team Snagem to find out what they're planning and stop it. Say yes and
  // his plane takes you to the Orre Air Strip (orreStory 2); say no and he asks again next time. In Orre you're
  // yourself, with your own Pokémon (game/orre.js); the pilot at the Air Strip flies you back to Kanto, and Oak sends
  // you to Orre again whenever you ask him. He gives you the Orre Map, Team Snagem's hideout marked on it: you go
  // from place to place in Orre on its map (orreWorldMap()), at first only the Air Strip and the hideout. (The other
  // way on after Johto is the S.S. Aqua's Hoenn Ticket.)
  function orreCallStep() {
    const f = player.flags;
    if (f.orreStory || !f.johtoLeagueClear) return null;
    // (Out and about, not inside: the League's rooms or the Hall of Fame.)
    const here = window.WORLD_MAPS[player.location.map] || {};
    return OUTDOORS.includes(here.type) ? { type: "orre-call" } : null;
  }
  async function orreOakCall() {
    player.flags.orreStory = 1;
    await gear.storyCall(["Prof. Oak: Hello, {PLAYER}! It's me,\nProf. Oak!",
      "Congratulations on becoming the\nChampion of Johto! Splendid work!",
      "But I'm afraid I'm not only calling\nto celebrate…",
      "Something troubling is going on in a\nregion far away from here: Orre.",
      "I'd rather not say more over the\nphone. Could you come and see me\nat my lab in Pallet Town, in Kanto?",
      "I'll be waiting for you!"].map((p) => fill(p)));
    await persist();
  }
  // Prof. Oak in his lab: the briefing and his question; or, once you've been, the plane back.
  async function oakOrre() {
    const f = player.flags;
    if (f.orreStory >= 2) {
      if (!(await confirm(fill("Oak: {PLAYER}! How goes your mission\nin Orre? Shall I have my plane take\nyou back there?")))) { await say("Oak: Rest up, then. Orre is counting\non you."); return; }
      await say("Oak: Good luck, {PLAYER}!");
      await flyToOrre();
      return;
    }
    if (!f.orreBriefed) {
      await say(["Oak: Ah, {PLAYER}! You came!\nThank you.",
        "Let me tell you why I called.\nHave you heard of the Orre region?",
        "It's a vast desert land, very far\nfrom Kanto. Few wild Pokémon live\nthere.",
        "So Orre's Trainers battle with the\nPokémon they've raised themselves,\ntwo against two.",
        "Lately, terrible reports have been\ncoming out of Orre.",
        "Two evil teams are wreaking havoc\nthere: Team Snagem and Cipher.",
        "Team Snagem is a gang of thieves.\nThey steal other Trainers' Pokémon\nwith a machine that can snag them!",
        "Cipher is more mysterious. No one\nknows who leads it, or what it truly\nwants…",
        "But we do know this: Cipher has\nbeen turning Pokémon into something\ncalled Shadow Pokémon.",
        "Shadow Pokémon have had the doors\nto their hearts shut tight. They feel\nnothing for anyone.",
        "They battle like fighting machines,\nand will even attack people!",
        "It's a cruel thing to do to a\nPokémon. And I fear the two teams are\nworking together somehow.",
        "So here is what I'd ask of you,\n{PLAYER}.",
        "Join Team Snagem as an undercover\nagent, and find out what they and\nCipher are planning.",
        "Then put a stop to it!",
        "It will be dangerous. You'll be far\nfrom home, and no one must find out\nwho you really are."]);
      f.orreBriefed = true;
    } else await say(["Oak: {PLAYER}, have you thought about\nwhat I asked?"]);
    if (!(await confirm(fill("Oak: Will you go to Orre and help,\n{PLAYER}?")))) {
      await say(["Oak: I see… It's a lot to ask of you.", "Come and talk to me again when\nyou're ready."]);
      return;
    }
    await say(["Oak: I knew I could count on you!", "My plane is waiting to fly you to\nthe Orre Air Strip.",
      "Team Snagem's hideout is out in\nEclo Canyon, in the north-east of\nOrre.",
      "I've had it marked on a map of Orre\nfor you. Here!"]);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Orre Map!"));
    await say(["Oak: Places in Orre are far apart.\nWhen you leave one, pick where to\ngo next on the map.",
      "Go to Team Snagem's hideout. That's\nwhere your mission begins.",
      "And remember: in Orre, every battle\nis a double battle. Take at least\ntwo Pokémon you can trust!",
      "Good luck, {PLAYER}!"]);
    f.orreStory = 2;
    await flyToOrre(true);
  }
  // The flight: the screen goes black, the plane's engine and the words of the trip, and you're on the Air Strip by
  // the plane's door; the first time, the pilot welcomes you to Orre.
  async function flyToOrre(fromOak) {
    const first = !player.flags.orreLanded;
    await Overworld.fadeToBlack();
    music(null);
    Overworld.setAvatar("walk");
    Orre.leave(player);   // (an older save's Wes, back to yourself first)
    Orre.enter(player);
    if (first) {
      const o = $("#overlay");
      sfx("se_m_fly");
      await GbaMenus.blackScreen(o, fromOak ? fill("Prof. Oak's little plane takes off\nfrom Kanto, and flies far, far away…") : "A little plane flies far, far away…");
      await GbaMenus.blackScreen(o, "Over the sea, and on over a land of\nendless desert: the Orre region.");
      o.classList.add("hidden");
    }
    await Overworld.teleport(player.location);
    player.flags.orreLanded = true;
    if (first) {
      await sleep(300);
      await Overworld.act([{ who: ORRE("PILOT"), moves: ["face_left", "walk_in_place_faster_left"] }]);
      await say(["Pilot: Here we are: the Orre Air\nStrip! Welcome to Orre.",
        "Head out through the gate, and pick\nwhere to go on your map of Orre.",
        "Whenever you want to go back to\nKanto, come and see me. I'll be\nwaiting here with the plane."]);
    }
    await persist();
  }
  // ---------- Orre's map (Colosseum's) ----------
  //
  // Places in Orre are far apart, across the desert: walk out of one (its way out: the map's "Orre_WorldMap"
  // triggers, tools/build-orre.js) and the map of Orre comes up, a marker on each place you can go (game/orre.js:
  // at first the Air Strip and Team Snagem's hideout). The arrows go to the nearest place that way, A sets off (your
  // icon slides across to it, then you're there, by its way in), B stays (a step back in from the edge).
  async function orreWorldMap() {
    const current = player.location.map, here = (window.WORLD_MAPS[current] || {}).orrePlace || current, places = Orre.openPlaces(player.flags);
    let at = Math.max(0, places.findIndex((p) => p.map === here));
    const from = places[at];
    const pos = (p) => "left:" + (p.x / 2.4) + "%;top:" + (p.y / 1.6) + "%";
    const icon = (p) => "left:" + ((p.x - 8) / 2.4) + "%;top:" + ((p.y - 8) / 1.6) + "%";
    show("scene");
    clearMenu();
    Screen.say("");
    scene.innerHTML = '<div class="town-map orre-map"><img class="tm-map" src="assets/town-map/orre.png" alt="Map of Orre">' +
      places.map((p) => '<div class="om-place' + (p.map === here ? " here" : "") + '" style="' + pos(p) + '"></div>').join("") +
      '<img class="tm-player" src="assets/town-map/player.png" alt="You are here" style="' + icon(from) + '">' +
      '<div class="tm-name"><b></b><small></small></div><div class="tm-cursor"></div></div>';
    const draw = () => {
      const p = places[at];
      scene.querySelector(".tm-name b").textContent = p.name;
      scene.querySelector(".tm-name small").textContent = p.map === here ? "You are here" : "Where do you want to go?";
      scene.querySelector(".tm-cursor").setAttribute("style", icon(p));
    };
    draw();
    let picked = null;
    const choose = new Promise((resolve) => { picked = resolve; });
    const onKey = (e) => {
      if (["z", "Z", " ", "Enter"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); sfx("se_select"); picked(places[at]); return; }
      if (["x", "X", "Escape"].includes(e.key)) { e.preventDefault(); e.stopPropagation(); picked(null); return; }
      const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
      if (!d) return;
      e.preventDefault(); e.stopPropagation();
      // (The nearest place that way: distance, with places off to the side counting for more.)
      const cur = places[at];
      let best = -1, bestScore = Infinity;
      places.forEach((p, k) => {
        const dx = p.x - cur.x, dy = p.y - cur.y, along = dx * d[0] + dy * d[1];
        if (k === at || along <= 0) return;
        const score = along + 2 * Math.abs(dx * d[1] + dy * d[0]);
        if (score < bestScore) { bestScore = score; best = k; }
      });
      if (best >= 0) { at = best; sfx("se_select"); draw(); }
    };
    document.addEventListener("keydown", onKey, true);
    const r = await Promise.race([ask("", [back("Stay")]).then(() => null), choose]);
    clearMenu();
    document.removeEventListener("keydown", onKey, true);
    if (r && r.map !== here) {
      scene.querySelector(".tm-cursor").remove();
      scene.querySelector(".tm-name small").textContent = "";
      const me = scene.querySelector(".tm-player");
      me.getBoundingClientRect();
      me.setAttribute("style", icon(r));
      await sleep(1000);
    }
    return r && r.map !== here ? r : null;
  }
  // ---------- Orre: Colosseum's e-mail (game/orre-mail.js) ----------
  //
  // An e-mail arriving (Colosseum's notice, then it's read: its subject and sender, then its words), and the ones
  // received, to read again (the Start menu's E-MAIL while in Orre; the newest first, a "+" on any not read yet: the menu font has no "*").
  async function readMail(key) {
    const m = Orre.MAIL[key], first = !((player.flags.orreMail || {}).read || []).includes(key);
    await say([m.subject + "\nFrom: " + m.from].concat(m.body));
    Orre.mailRead(player.flags, key);
    if (first && m.after) await say(m.after);
  }
  async function receiveMail(key) {
    Orre.mailReceive(player.flags, key);
    sfx("se_pin");
    await say("The P★DA received an e-mail!");   // (M3_houseC_1F #20849)
    await say("{PLAYER} read the e-mail.");   // (#20854)
    await readMail(key);
    await persist();
  }
  // (Those due as you come into an Orre map: ui/story-events.js's special() hands them over, orreMailPending.)
  let orreMailPending = null;
  const orreMailDue = (script) => {
    const map = String(script || "").replace(/^\w+:/, "");
    if (!Orre.mailDue || !Orre.inOrre({ map })) return false;
    // (One at a time, as Colosseum's come: the next waits for the next map.)
    orreMailPending = Orre.mailDue(player.flags, map).slice(0, 1);
    return orreMailPending.length > 0;
  };
  async function orreMail() {
    const due = orreMailPending || [];
    orreMailPending = null;
    for (const k of due) await receiveMail(k);
  }
  async function mailbox() {
    for (let cursor = 0; ;) {
      const list = Orre.mailList(player.flags);
      if (!list.length) { await say("There's no e-mail."); return; }
      const i = await multichoice("Which e-mail will you read?", 0, 0, list.map((e) => (e.read ? " " : "+") + e.subject).concat(["Cancel"]), { shown: 6, cursor });
      Screen.say("");
      if (i < 0 || i >= list.length) return;
      cursor = i;
      await readMail(list[i].key);
      await persist();
    }
  }
  async function orreTravel() {
    // (Out of Ein's lab, the first time, having come by the Shadow Liner: as in Colosseum, it's on Orre's map from then on.)
    if (/^ShadowLab/.test(player.location.map) && !Orre.isOpen(player.flags, "ShadowLab_1F")) {
      Orre.unlock(player.flags, "ShadowLab_1F");
      await say("The Shadow Pokémon Lab was marked on\nthe Orre Map!");
    }
    // (Out of Phenac City, the Mystery Troop in the way till you've beaten one of them: phenacTroop, the nearest.)
    if (player.location.map === "PhenacCity" && (player.flags.orreStory | 0) === 21 && !player.flags.orreTroop) {
      const x = player.location.x, near = TROOP.map((n, i) => [n, Math.abs([17, 19, 22][i] - x)]).sort((a, b) => a[1] - b[1])[0][0];
      await Overworld.act([{ who: ORRE("PHENAC_" + near.toUpperCase()), moves: ["emote_exclamation_mark"] }]);
      await phenacTroop(TROOP_SCRIPT(near));
      if (!player.flags.orreTroop) { await Overworld.act([{ who: "player", moves: ["walk_up"] }]); return; }
    }
    const to = await orreWorldMap();
    show("world");
    await Overworld.resume();
    const loc = player.location, m = window.WORLD_MAPS[loc.map];
    if (!to) {
      // (Back in from the edge you were leaving by.)
      const dir = loc.y === 0 ? "down" : loc.y === m.height - 1 ? "up" : loc.x === 0 ? "right" : "left";
      await Overworld.act([{ who: "player", moves: ["walk_" + dir] }]);
      return;
    }
    await Overworld.fadeToBlack();
    Overworld.setAvatar("walk");
    player.location = Object.assign({ map: to.map }, to.arrive);
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS[player.location.map].music);
    // (A scene as you get there: Folly and Trudly at the Outskirt Stand.)
    if (special("arrive:" + player.location.map)) await story({ type: "trigger", trigger: { script: "arrive:" + player.location.map }, map: player.location.map });
    await persist();
  }
  // Team Snagem's guards at the hideout's gate. Talk to one and you can ask to join Team Snagem, as Prof. Oak asked:
  // they laugh, then battle you one after the other, each two on two with Lv. 5 Pokémon (you've come as a Champion,
  // but with your Pokémon made Lv. 5 again by the Rejuvenator, as for any new region; player.flags.orreGrunts: how
  // many you've beaten, so losing to the second has you face only him again). Beat both and they give you the Snag Machine and
  // Snagem's tests for a new recruit (player.flags.orreStory 3). The first: go to Phenac City (it opens on Orre's map)
  // and snag a Trainer's Makuhita (phenacKodo); come back with it (4) and they pass you (5) and send you straight on
  // to the second (6): snag both of Breeder Lena's Eevee at the Outskirt Stand (it opens on the map; outskirtLena);
  // back with them (7), they report you to Master Gonzap (8). Fail a test, by losing or without snagging its Pokémon, and
  // you're brought back to the guards to try again. (What comes after is for later.)
  const SNAGEM_GUARDS = [ORRE("GUARD_1"), ORRE("GUARD_2")];
  const SNAGEM_GRUNTS = () => [
    { name: "Snagem Grunt", team: [Party.create("Poochyena", 5), Party.create("Zubat", 5)], pic: "snagem_grunt", defeatText: ["Gah! Lucky shot, rookie!"] },
    { name: "Snagem Grunt", team: [Party.create("Zigzagoon", 5), Party.create("Ekans", 5)], pic: "snagem_grunt", defeatText: ["Ugh… The rookie's got some bite!"] }];
  // One of the guards' battles (0: the first, 1: the other): won?
  async function snagemGruntBattle(i) {
    const g = SNAGEM_GRUNTS()[i];
    const outcome = await battle("trainer", { foe: g, double: true, prizeClass: "Team Rocket", noBlackout: true, music: "mus_vs_trainer",
      defeatText: g.defeatText });
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.SnagemHideout.music);
    if (outcome === "won") return true;
    await say(["Grunt: Hah! Is that all you've got?", "Come back when your Pokémon can\nactually fight, kid!"]);
    player.party.forEach(Party.heal);
    await persist();
    return false;
  }
  // Snagem's second test, given with the first passed (or later, to a save that passed it before there was one).
  async function snagemTestTwo() {
    await say(["Grunt: Test two. Head south-west to the\nOutskirt Stand, the diner out in the\ndesert.",
      "There's a Pokémon Breeder in there\nwith two Eevee. Real prizes, those.", "Snag them both, and bring them back\nhere!"]);
    player.flags.orreStory = 6;
    if (Orre.unlock(player.flags, "OutskirtStand")) await say("The Outskirt Stand was marked on\nthe Orre Map!");
  }
  // Snagem's tests three to five (this game's own, before Colosseum's story proper): each in a new place, a Trainer's
  // Pokémon to snag (Colosseum's Shadow Pokémon's kinds), the prologue's Trainers (and Orre.FILLERS) bringing your
  // Pokémon up toward its level cap of 26 by the end. orreStory: `set` with the test given, `snagged` with its Pokémon,
  // `passed` once the guards have seen it (and the next test given at once). After the last, Master Gonzap wants to
  // see you (SNAGEM_DONE): Colosseum's story proper, for later.
  const SNAGEM_TESTS = [
    { set: 9, snagged: 10, passed: 11, place: "PyriteTown", species: "Murkrow", target: "PyriteTown_EventScript_Rook",
      give: ["Grunt: Test three. Pyrite Town, out\neast. Roughest town in Orre.", "There's a burglar there, calls himself\nRook. Has a Murkrow he's real proud of.",
        "Snag it, and bring it back here!"],
      remind: ["Your test's in Pyrite Town! Burglar\nRook has a Murkrow.", "Snag it, and bring it back here!"],
      report: ["Grunt: Hah! Stealing from a burglar!\nNow that's Snagem style!", "Other grunt: Rook's gonna be sore\nabout that one. Heh heh."] },
    { set: 12, snagged: 13, passed: 14, place: "AgateVillage", species: "Aipom", target: "AgateVillage_EventScript_Fay",
      give: ["Grunt: Test four. Agate Village, up in\nthe hills north of here.", "A Pokémon Ranger's staying there.\nFay, she's called. She has an Aipom.",
        "Rangers are tough. Snag it anyway!"],
      remind: ["Your test's in Agate Village! Ranger\nFay has an Aipom.", "Snag it, and bring it back here!"],
      report: ["Grunt: You snagged a Ranger's Pokémon?!\nRight out from under her nose!", "Other grunt: Kid's getting good.\nAlmost too good…"] },
    { set: 15, snagged: 16, passed: 17, place: "PyriteTown", species: "Gligar", target: "PyriteCave_EventScript_Rowe",
      give: ["Grunt: Last test. There's a cave in\nthe canyon wall by Pyrite Town.", "A hiker named Rowe digs in there,\nwith a Gligar that's a real handful.",
        "Snag that Gligar, and you're one of us.\nFor real."],
      remind: ["Your test's in Pyrite Cave, in\nPyrite Town's east wall!", "Hiker Rowe has a Gligar. Snag it!"],
      report: ["Grunt: …You did it. Every test, passed.", "Other grunt: I'll be honest, rookie.\nNever thought you'd make it.",
        "Grunt: Master Gonzap's gonna want to\nmeet you himself.", "Hang around. When the boss is ready,\nyou'll know."] }
  ];
  const SNAGEM_DONE = 17;
  // The next of Snagem's tests (after test two, or one of these), or nothing after the last.
  async function snagemNextTest() {
    const f = player.flags, step = f.orreStory | 0;
    const t = SNAGEM_TESTS.find((x) => x.set > step);
    if (!t || step >= SNAGEM_DONE) return;
    await say(t.give);
    f.orreStory = t.set;
    if (Orre.unlock(f, t.place)) await say(Orre.PLACES.find((p) => p.map === t.place).name + " was marked on\nthe Orre Map!");
  }
  // A test's Trainer (tests three to five): before the test, a word; with it, the battle, its Pokémon to snag; after,
  // sore about it.
  async function snagemTarget(script, person) {
    const t = SNAGEM_TESTS.find((x) => x.target === script), d = ORRE_TRAINERS[script], step = player.flags.orreStory | 0;
    if (step >= t.snagged) { await say(d.snagged); return; }
    if (step < t.set) { await say(d.before); return; }
    await say(d.intro);
    const opts = { foe: { name: d.name, team: d.team(), pic: d.pic }, double: true, prizeClass: d.cls, noBlackout: true, snag: [t.species],
      music: "mus_vs_trainer", defeatText: d.defeat };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    if (outcome !== "lost" && (opts.snagged || []).includes(t.species)) {
      await say(d.robbed);
      player.flags.orreStory = t.snagged;
      await persist();
      return;
    }
    await say(outcome === "lost" ? d.won : d.lost);
    await snagemTestFailed(t.species);
  }
  // Orre's Trainers in the new places (this game's own): each battles you once, two on two; after, a word. And the
  // tests' Trainers (snagemTarget): `before` the test, `intro`, `robbed` once snagged, `snagged` after; `won` and
  // `lost` when the test fails.
  const ORRE_TRAINERS = {
    PyriteTown_EventScript_Zeke: { name: "Biker Zeke", cls: "Biker", pic: "biker", team: () => [Party.create("Koffing", 13), Party.create("Grimer", 13)],
      intro: ["You lost, kid? Pyrite eats tourists\nlike you for breakfast!"], defeat: ["Tch! Lucky break."],
      after: ["Don't let it go to your head. There's\nworse than me in Pyrite."] },
    PyriteTown_EventScript_Rina: { name: "Psychic Rina", cls: "Psychic", pic: "psychic_f", team: () => [Party.create("Spoink", 14), Party.create("Natu", 14)],
      intro: ["I foresaw you coming… and I foresaw\nyou losing to me!"], defeat: ["My vision was… cloudy."],
      after: ["Something dark is gathering in Orre.\nI can feel it…"] },
    AgateVillage_EventScript_Ted: { name: "Camper Ted", cls: "Camper", pic: "camper", team: () => [Party.create("Lombre", 17), Party.create("Nuzleaf", 17)],
      intro: ["I come up to Agate every summer to\ntrain by the stream. Battle me!"], defeat: ["Aw, man! Back to training…"],
      after: ["Grandpa Eagun up on Mt. Battle is\nthe strongest Trainer around here."] },
    AgateVillage_EventScript_Sue: { name: "Picnicker Sue", cls: "Picnicker", pic: "picnicker", team: () => [Party.create("Skiploom", 17), Party.create("Marill", 18)],
      intro: ["It's such a nice day for a battle!\nDon't you think?"], defeat: ["Oh! You're good!"],
      after: ["The flowers in Agate grow so well.\nThe Relic Stone looks after them."] },
    PyriteCave_EventScript_Dex: { name: "Ruin Maniac Dex", cls: "Ruin Maniac", pic: "ruin_maniac", team: () => [Party.create("Baltoy", 21), Party.create("Trapinch", 21)],
      intro: ["These tunnels are older than Pyrite\nitself! Don't you touch anything!"], defeat: ["My precious ruins…"],
      after: ["Someone's been digging new tunnels\ndown here. Big machines, too…"] },
    PyriteCave_EventScript_Taro: { name: "Black Belt Taro", cls: "Black Belt", pic: "black_belt", team: () => [Party.create("Machoke", 22), Party.create("Meditite", 22)],
      intro: ["Hwaah! I train in the dark to sharpen\nmy senses! Face me!"], defeat: ["Hngh! My senses… dulled!"],
      after: ["Kodo in Phenac is my little brother.\nHe says a thief took his Makuhita…"] },
    PyriteTown_EventScript_Rook: { name: "Burglar Rook", cls: "Burglar", pic: "burglar", team: () => [Party.create("Murkrow", 15), Party.create("Houndour", 14)],
      before: ["What're you looking at? Beat it,\nbefore I pick your pockets."],
      intro: ["Snagem sent you, huh? Ha! Nobody steals\nfrom Rook. Nobody!"], defeat: ["What?! Robbed by a kid!"],
      robbed: ["My Murkrow! You little thief!", "…Heh. Takes one to know one, I guess."],
      snagged: ["Get lost, Snagem! You've taken enough\nfrom me already."],
      won: ["Hah! Back to the hideout with you,\nrookie!"], lost: ["Ha! My Murkrow's too slick for you!"] },
    AgateVillage_EventScript_Fay: { name: "Pokémon Ranger Fay", cls: "Pokémon Ranger", pic: "pokemon_ranger_f", team: () => [Party.create("Aipom", 19), Party.create("Shroomish", 18)],
      before: ["I'm a Pokémon Ranger. I came to Agate\nto look into the strange Pokémon\npeople have been seeing."],
      intro: ["That machine on your arm… You're with\nTeam Snagem!", "I won't let you take my partners!"], defeat: ["No… I failed them…"],
      robbed: ["My Aipom!", "I'll find you, Snagem. I'll get it\nback. I swear it!"],
      snagged: ["Give my Aipom back, thief!"],
      won: ["Leave Agate, Snagem! And don't come\nback!"], lost: ["My partners and I won't be beaten\nby a Snagem!"] },
    // (Mt. Battle's, in Colosseum's story, in the order you meet them going up, with Colosseum's words: Rider Turo
    // and Hunter Drovic by the way in, Cipher's Peons Kison and Berin on the slopes.)
    MtBattle_EventScript_Trainer1: { name: "Rider Turo", cls: "Rider", pic: "biker", team: () => Orre.team("Turo"),
      intro: ["Whoops, hold on. Aren't you mistaking\nsomething? All training has been put\non hold.", "But if you really must, sure, I'll\nbattle you."],
      defeat: ["Urrrgh… Master Dakim will\nreprimand me…"], after: ["Urrrgh… Master Dakim will\nreprimand me…"] },
    MtBattle_EventScript_Trainer2: { name: "Hunter Drovic", cls: "Hunter", pic: "cooltrainer_m", team: [["Swinub", 35], ["Baltoy", 36], ["Larvitar", 37]],
      intro: ["Hm? Turo took a fall, did he? I could\nnever count on that guy.", "Well, I'll just think of it as there\nbeing more for me to enjoy! Come on!"],
      defeat: ["I'm going to get reprimanded, too!"], after: ["I'm going to get reprimanded, too!"] },
    MtBattle_EventScript_Turo: { name: "Cipher Peon Kison", cls: "Team Rocket", pic: "cipher_peon", team: [["Houndour", 37], ["Kirlia", 36], ["Koffing", 37], ["Duskull", 36]],
      intro: ["I guess we're all a little guilty of\nunderestimating you. You've earned\nsome respect.", "But I'll make you regret ever having\ncome here!"],
      defeat: ["I shouldn't have battled you in the\nfirst place…"], after: ["I shouldn't have battled you in the\nfirst place…"] },
    MtBattle_EventScript_Berin: { name: "Cipher Peon Berin", cls: "Team Rocket", pic: "cipher_peon", team: () => Orre.team("Berin"),
      intro: ["You've done well to get here. But\nthere's no next battle for you after\nthis.", "I'll destroy you thoroughly!"],
      defeat: ["Don't get a swelled head just because\nyou beat me."], after: ["Master Dakim will deflate your pride\nreal quick!"] },
    PyriteCave_EventScript_Rowe: { name: "Hiker Rowe", cls: "Hiker", pic: "hiker", team: () => [Party.create("Gligar", 23), Party.create("Graveler", 22)],
      before: ["I've been digging in this cave for\nthirty years. Found all kinds of\nthings!"],
      intro: ["Eh? Snagem, down here? My Gligar's\nthe best digging partner there is!", "You'll not have it!"], defeat: ["Rock-solid, you are…"],
      robbed: ["My Gligar! Thirty years we've dug\ntogether…", "Snagem… You're a heartless lot."],
      snagged: ["Leave me be. You've taken my partner."],
      won: ["Ha! Back to your hideout, rookie!"], lost: ["Tough as stone, my Gligar!"] }
  };
  // (Orre's filler Trainers too: Orre.FILLERS, their teams as [species, level].)
  async function orreTrainer(script) {
    const d = ORRE_TRAINERS[script] || Orre.FILLERS[script], f = player.flags, beaten = (f.orreBeaten = f.orreBeaten || []);
    if (beaten.includes(script)) { await say(d.after); return; }
    await say(d.intro);
    const team = typeof d.team === "function" ? d.team() : d.team.map(([sp, lv]) => Party.create(sp, lv));
    const outcome = await battle("trainer", { foe: { name: d.name, team, pic: d.pic }, double: true, prizeClass: d.cls,
      music: "mus_vs_trainer", defeatText: d.defeat });
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    if (outcome === "won") { beaten.push(script); await say(d.after); await persist(); }
  }
  // A failed test: taken back to the hideout's guards to try again.
  async function snagemTestFailed(what, plural) {
    Screen.say("");
    await Overworld.fadeToBlack();
    player.party.forEach(Party.heal);
    player.location = { map: "SnagemHideout", x: 11, y: 7, facing: "up" };
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS.SnagemHideout.music);
    await say(["Grunt: You call that a snag?\nYou came back empty-handed!", "Pathetic. Get back out there and\ntry again!",
      plural ? "And this time, snag those " + what + "\nbefore they go down!" : "And this time, snag that " + what + "\nbefore it goes down!"]);
    await persist();
  }
  async function snagemGuard(person) {
    const f = player.flags;
    // (A save from before the Snag Machine, when 3 and 4 were the guard's battle: asked again.)
    if ((f.orreStory === 3 || f.orreStory === 4) && !Player.itemCount(player, "snag-machine")) f.orreStory = 2;
    const step = f.orreStory | 0;
    const me = (person && person.localId) || SNAGEM_GUARDS[0], other = SNAGEM_GUARDS.find((g) => g !== me);
    if (step >= SNAGEM_DONE) { await snagemBreak(); return; }   // (Colosseum's story proper)
    // (Tests three to five: SNAGEM_TESTS.)
    const t = SNAGEM_TESTS.find((x) => step === x.snagged);
    if (t) {
      await say(fill("Grunt: Well? Let's see it, then.\nYou got that " + t.species + "?"));
      await say(t.report);
      f.orreStory = t.passed;
      await snagemNextTest();
      await persist();
      return;
    }
    const now = SNAGEM_TESTS.find((x) => step === x.set);
    if (now) { await say(["Grunt: What're you doing back here?"].concat(now.remind)); return; }
    if (step === 8 || SNAGEM_TESTS.some((x) => step === x.passed)) {
      await say(["Grunt: There you are, rookie.\nReady for your next test?"]);
      await snagemNextTest();
      await persist();
      return;
    }
    if (step === 7) {
      await say(fill("Grunt: Well? Let's see them, then.\nYou got those Eevee?"));
      await say(["Grunt: Hah! Both of them!", "Other grunt: This rookie's the real\ndeal!"]);
      await say(["Grunt: That's test two passed.", "But don't get cocky. A Snagem's got a\nlot more to prove than that."]);
      f.orreStory = 8;
      await snagemNextTest();
      await persist();
      return;
    }
    if (step === 6) {
      const left = 2 - (f.orreLenaSnagged | 0);
      await say(["Grunt: What're you doing back here?", "Your test's at the Outskirt Stand! The\nBreeder in the diner has two Eevee.",
        left === 1 ? "You've got one. Snag the other, and\nbring it back here!" : "Snag them both, and bring them back\nhere!"]);
      return;
    }
    if (step === 5) {
      await say(["Grunt: There you are, rookie.\nTest one's done. Ready for the next?"]);
      await snagemTestTwo();
      await persist();
      return;
    }
    if (step === 4) {
      await say(fill("Grunt: Well? Let's see it, then.\nYou got that Makuhita?"));
      await say(["Grunt: Hah! You really snagged it!", "Other grunt: Not bad for a rookie!"]);
      await say(["Grunt: That's test one passed.", "But one snag's nothing. Any punk can\nget lucky once."]);
      f.orreStory = 5;
      await snagemTestTwo();
      await persist();
      return;
    }
    if (step === 3) {
      await say(["Grunt: What're you doing back here?", "Your test's in Phenac City! A Trainer\nthere has a Makuhita.",
        "Snag it, and bring it back here!"]);
      return;
    }
    if ((f.orreGrunts | 0) === 1) {
      // (The first beaten, the second not yet.)
      await say(["Other grunt: Back for more, rookie?", "You beat him, sure. But you still\ngotta get past me!"]);
      if (!(await snagemGruntBattle(1))) return;
      return snagemJoin(f);
    }
    await say(["Grunt: Hey! Who are you? This is\nTeam Snagem's hideout!", "Nobody gets through this gate without\nthe boss's say-so."]);
    if (!(await confirm("Ask to join Team Snagem?"))) { await say("Grunt: Then beat it, kid!"); return; }
    await say([fill("{PLAYER}: I want to join Team Snagem!")]);
    Screen.say("");
    sfx("se_pin");
    await Overworld.act([{ who: me, moves: ["emote_exclamation_mark"] }, { who: other, moves: ["emote_exclamation_mark"] }]);
    await say(["Grunt: Huh?! You want to join\nTeam Snagem?"]);
    await say(["Other grunt: Gahahaha! You hear that?\nThe kid wants to be a Snagem!"]);
    await say(["Grunt: Team Snagem's no playground,\nkid. We snag other Trainers' Pokémon\nfor a living.",
      "…Then again, Master Gonzap's always\nsaying we need more hands."]);
    await say(["Other grunt: Not so fast. Snagem don't\ntake weaklings.", "You'll have to beat the both of us.\nOne at a time!"]);
    await say(["Grunt: Me first. Let's see what your\nPokémon can do!"]);
    if (!(await snagemGruntBattle(0))) return;
    f.orreGrunts = 1;
    await persist();
    await say(["Grunt: Hngh… Not bad, kid.", "Other grunt: Outta the way. My turn!"]);
    if (!(await snagemGruntBattle(1))) return;
    return snagemJoin(f);
  }
  // Both guards beaten: the Snag Machine and Snagem's first test.
  async function snagemJoin(f) {
    f.orreGrunts = 2;
    await say(["Grunt: …Huh. The kid can battle.", "Fine. You want in? You pass our tests.",
      "And for those, you'll need this."]);
    Player.addItem(player, "snag-machine", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the Snag Machine!"));
    await say(["Grunt: That's a Snag Machine. Put it on\nand your Poké Balls become Snag Balls.",
      "With those, you can catch another\nTrainer's Pokémon right out from\nunder their nose!",
      "Test one: Phenac City, the city of\nwater, west of here.", "There's a Trainer there with a\nMakuhita. Snag it, and bring it back!",
      "Lose, or come back empty-handed, and\nyou'll be starting over. Got it?"]);
    f.orreStory = 3;
    Orre.unlock(f, "PhenacCity");
    await persist();
  }
  // The Trainer in Phenac City with the Makuhita (Snagem's first test): a double battle, his Makuhita (Lv. 7) to be
  // snagged and his Machop (Lv. 7). Snag it and keep it (orreStory 4); lose, or knock it out without snagging it,
  // and you're taken back to the guards to try again.
  const KODO_TEAM = () => [Party.create("Makuhita", 7), Party.create("Machop", 7)];
  async function phenacKodo() {
    const f = player.flags, step = f.orreStory | 0;
    if (step >= 4) { await say(["Black Belt Kodo: My Makuhita…", "I'll get stronger, and get it back\nfrom you. You'll see!"]); return; }
    if (step < 3) { await say(["Black Belt Kodo: My Makuhita and\nMachop are training by the fountain.", "We'll be the toughest Trainers in\nPhenac City!"]); return; }
    await say(["Black Belt Kodo: Hey, you! You look\nlike you can handle yourself.",
      "My Makuhita and Machop have been\ntraining all morning. Battle us!"]);
    const opts = { foe: { name: "Black Belt Kodo", team: KODO_TEAM(), pic: "black_belt" }, double: true, prizeClass: "Black Belt",
      noBlackout: true, snag: ["Makuhita"], music: "mus_vs_trainer", defeatText: ["Hwaah! You're strong!"] };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity.music);
    if (outcome !== "lost" && (opts.snagged || []).includes("Makuhita")) {
      await say(["Black Belt Kodo: My Makuhita…\nYou snagged it!", "You… You're with Team Snagem?!"]);
      f.orreStory = 4;
      await persist();
      return;
    }
    // (Failed: back to the hideout's guards.)
    await say(outcome === "lost" ? ["Black Belt Kodo: Hah! Not so tough\nafter all!"] : ["Black Belt Kodo: That was a great\nbattle! My Makuhita needs a rest."]);
    await snagemTestFailed("Makuhita");
  }
  // Snagem's second test, at the Outskirt Stand: Breeder Lena in the diner (the third traveller) and her two Eevee
  // (Lv. 10, both to be snagged) and Skitty (Lv. 9). Snag both and win (orreStory 7). Lose, or knock one out without
  // snagging it, and you're taken back to the guards to try again; one you did snag is yours, and she has only the
  // other next time (player.flags.orreLenaSnagged). Before the test she's just a traveller.
  const LENA_EEVEE = 2;
  const LENA_TEAM = (eevee) => Array.from({ length: eevee }, () => Party.create("Eevee", 10)).concat([Party.create("Skitty", 9)]);
  async function outskirtLena(person) {
    const f = player.flags, step = f.orreStory | 0;
    if (step >= 7) { await say(["Breeder Lena: My Eevee… I raised them\nfrom Eggs.", "Team Snagem… I'll never forgive you!"]); return; }
    if (step < 6) { if (person && person.text) await say(person.text); return; }
    const left = LENA_EEVEE - (f.orreLenaSnagged | 0);
    await say(left < LENA_EEVEE ? ["Breeder Lena: You again!", "You took one of my Eevee… You won't\nget the other!"]
      : ["Breeder Lena: Oh, hello! Are you a\nTrainer too?", "I'm taking my two Eevee and Skitty to\nPhenac City. They're my pride and joy!",
        "Would you like to battle? Two on two!"]);
    const opts = { foe: { name: "Breeder Lena", team: LENA_TEAM(left), pic: "pokemon_breeder" }, double: true, prizeClass: "Pokémon Breeder",
      noBlackout: true, snag: ["Eevee"], music: "mus_vs_trainer", defeatText: ["Oh my! You're very strong!"] };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.OutskirtStand_Diner.music);
    f.orreLenaSnagged = (f.orreLenaSnagged | 0) + (opts.snagged || []).filter((sp) => sp === "Eevee").length;
    if (outcome !== "lost" && f.orreLenaSnagged >= LENA_EEVEE) {
      await say(["Breeder Lena: My Eevee! Both of them!\nGive them back!", "That machine on your arm…\nYou're with Team Snagem!"]);
      f.orreStory = 7;
      await persist();
      return;
    }
    await say(outcome === "lost" ? ["Breeder Lena: Better luck next time!"] : ["Breeder Lena: What a lovely battle!\nMy Eevee needs a rest now."]);
    await snagemTestFailed("Eevee", LENA_EEVEE - f.orreLenaSnagged > 1);
  }
  // The pilot: back to Kanto, outside Prof. Oak's lab.
  async function orrePilot() {
    if (!(await confirm("Pilot: Want me to fly you back to\nKanto?"))) { await say("Pilot: Just say the word when you\nwant to go."); return; }
    await say("Pilot: Hop in! Next stop, Pallet Town.");
    await Overworld.fadeToBlack();
    music(null);
    Orre.leave(player, { map: "PalletTown", x: 16, y: 14, facing: "down" });
    await Overworld.teleport(player.location);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }
  async function leaveOrre(to) {
    Orre.leave(player, to);
    await persist();
  }
  // Coming up the road from the Air Strip the first time: Folly and Trudly come out of the diner.
  async function orreArrival() {
    player.flags.orre = 1;
    Overworld.refreshPeople();
    music(window.WORLD_MAPS.OutskirtStand.music);
    await sleep(400);
    await follyAndTrudly();
  }
  // Folly and Trudly come out of the diner, and drive off north with their sack.
  async function follyAndTrudly() {
    const door = window.WORLD_MAPS.OutskirtStand.warps[0];
    sfx("se_door");
    Overworld.addObject(ORRE("TRUDLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: ["walk_down", "walk_right", "walk_right"] }]);
    sfx("se_door");
    Overworld.addObject(ORRE("FOLLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("FOLLY"), moves: ["walk_down", "walk_right"] }, { who: ORRE("TRUDLY"), moves: ["delay_16", "face_left"] }]);
    await say(["Trudly: Burp! Ahh, I'm stuffed!\nNothing beats a hot meal after a drive."]);
    await say(["Folly: Quit yapping, Trudly. The boss is\nwaiting on this delivery, remember?"]);
    await say(["Trudly: Yeah, yeah… That sack in the\ntruck isn't going anywhere, Folly."]);
    sfx("se_pin");
    await Overworld.act([{ who: ORRE("FOLLY"), moves: ["face_down", "emote_exclamation_mark"] }]);
    await say(["Folly: …Huh? What are you gawking at?", "Mind your own business, kid!\nCome on, Trudly. We're going."]);
    Screen.say("");
    // (Along to the truck out front, and in: Trudly at the wheel, Folly beside him.)
    const truck = window.WORLD_MAPS.OutskirtStand.patches.truck, right = (n) => Array(n).fill("walk_right");
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: right(truck.x + 1 - door.x - 2).concat(["walk_down", "set_invisible"]) },
      { who: ORRE("FOLLY"), moves: right(truck.x - door.x - 1).concat(["walk_down", "set_invisible"]) }]);
    sfx("se_door");
    await sleep(500);
    await say(["The sack in the back of the truck…\nDid it just move?"]);
    Screen.say("");
    player.flags.orre = 2;
    applyPatches("OutskirtStand");
    sfx("se_truck_move");
    await Overworld.act([{ who: ORRE("TRUCK"), moves: ["delay_16"].concat(Array(12).fill("walk_fast_right"), ["set_invisible"]) }]);
    Overworld.removeObject(ORRE("FOLLY")); Overworld.removeObject(ORRE("TRUDLY"));
  }
  // ---------- Orre: Colosseum's story proper (this game's own telling of it, with Colosseum's own words) ----------
  //
  // player.flags.orreStory 17: the prologue's tests passed. The guards take you in to meet Master Gonzap, who boasts
  // that Team Snagem snags Pokémon for Cipher, who make them into Shadow Pokémon; that night you overload the
  // hideout's big Snag Machine and run, the hideout blowing up behind you, the Snag Machine still on your arm (18,
  // Orre's level cap up to 30); Prof. Oak calls. At the Outskirt Stand Folly and Trudly drive off with a sack, and
  // Rider Willie battles you (19). At Phenac City you battle Folly and Trudly by their truck, and out of the sack comes
  // Rui, who asks you to take her to the Mayor (20). At the Mayor's house: Es Cade hears her out and goes to look
  // into it; Snagem grunts come for their traitor and the Snag Machine; then Folly and Trudly, Trudly with a Shadow
  // Pokémon (Colosseum's: a Makuhita, Lv. 30, Orre.SHADOW) that Rui can see the black aura of, to be snagged; Miror B. calls them back to Pyrite, and Rui
  // says you should follow (21). (orreStandFT: Folly and Trudly gone from the Stand; orreFT: beaten at Phenac;
  // orreMayor: how far the Mayor's house's scene has got, 1 Es Cade gone, 2 the grunts beaten, 3 Folly beaten.)
  const ORRE_STORY_CAP = 30;
  async function snagemBreak() {
    const f = player.flags;
    // (Colosseum opens on its hideout blowing up, a scene with no words; Gonzap's, from D4_tower_2F #21717 and #21718,
    // where he tells it at Realgam Tower.)
    Screen.say("");
    await Overworld.fadeToBlack();
    music(null);
    await say(["Gonzap: I'm Gonzap, the boss of Team\nSnagem. And don't you forget it!",
      "Gonzap: We were just thieves before\nwe got hold of the Snag Machines. And\nwhere did we get them? From Cipher.",
      "Gonzap: What they wanted was this: Go\nSnag superior-grade Pokémon from\ntrainers everywhere!"]);
    Screen.say("");
    sfx("se_m_explosion");
    await Overworld.shake(16, { x: 3, y: 3, delay: 2 });
    f.orreStory = 18;
    f.orreLevelCap = Math.max(f.orreLevelCap | 0, ORRE_STORY_CAP);
    player.party.forEach(Party.heal);
    player.location = { map: "SnagemHideout", x: 12, y: 18, facing: "down" };
    await Overworld.teleport(player.location);
    music(window.WORLD_MAPS.SnagemHideout.music);
    sfx("se_m_explosion");
    await Overworld.shake(8, { x: 2, y: 2, delay: 3 });
    await say("Your Pokémon can now grow up to\nLv. " + ORRE_STORY_CAP + " in Orre!");
    await persist();
  }
  // At the Outskirt Stand (orreStory 18): Folly and Trudly come out of the diner and drive off with their sack; Willie
  // comes after you.
  async function orreStandStory() {
    const f = player.flags, door = window.WORLD_MAPS.OutskirtStand.warps[0];
    f.orre = Math.max(f.orre | 0, 2);
    await sleep(400);
    sfx("se_door");
    Overworld.addObject(ORRE("TRUDLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: ["walk_down", "walk_right", "walk_right"] }]);
    sfx("se_door");
    Overworld.addObject(ORRE("FOLLY"), { x: door.x, y: door.y, facing: "down" });
    await Overworld.act([{ who: ORRE("FOLLY"), moves: ["walk_down", "walk_right"] }, { who: ORRE("TRUDLY"), moves: ["delay_16", "face_left"] }]);
    // (Colosseum's words, S1_out #20829 and #20806.)
    await say(["Trudly: Fwaah! We sure pigged out,\neh? I love chowing down after a job!\nIt adds to the flavor, I swear."]);
    await say(["Folly: Heheheh, yeah. And we bagged\nourselves a great big catch, too.",
      "Folly: Boss'll be sure to fix us up\ngood with big rewards, too. Heheheh,\nit doesn't get any better than this!"]);
    Screen.say("");
    const truck = window.WORLD_MAPS.OutskirtStand.patches.truck, right = (n) => Array(n).fill("walk_right");
    await Overworld.act([{ who: ORRE("TRUDLY"), moves: right(truck.x + 1 - door.x - 2).concat(["walk_down", "set_invisible"]) },
      { who: ORRE("FOLLY"), moves: right(truck.x - door.x - 1).concat(["walk_down", "set_invisible"]) }]);
    sfx("se_door");
    await sleep(500);
    await say(["There's something squirming in the\nsack!"]);
    Screen.say("");
    f.orreStandFT = true;
    applyPatches("OutskirtStand");
    sfx("se_truck_move");
    await Overworld.act([{ who: ORRE("TRUCK"), moves: ["delay_16"].concat(Array(12).fill("walk_fast_right"), ["set_invisible"]) }]);
    Overworld.removeObject(ORRE("FOLLY")); Overworld.removeObject(ORRE("TRUDLY"));
    await persist();
    // Willie, out of the diner after you.
    await say(["???: Yo! Wait! Wait up!"]);
    sfx("se_door");
    Overworld.addObject(ORRE("WILLIE"), { x: door.x, y: door.y, facing: "down" });
    const toMe = [];
    for (let y = door.y + 1; y < player.location.y - 1; y++) toMe.push("walk_down");
    await Overworld.act([{ who: ORRE("WILLIE"), moves: toMe }, { who: "player", moves: ["face_up"] }]);
    // (S1_out #20795, #20807, #20797, #20799.)
    await say(["Willie: Hey, my name's Willie. After\nI got a good look at you, well, I got", "this urge to battle you. It's like\nI'm compelled to.",
      "Willie: Any way I look at it, it's\nobvious that you're no ordinary Joe."]);
    await say(["Willie: So, what do you say? Let's\nyou and me have a quick battle!"]);
    while (!(await confirm("Battle Willie?"))) await say(["Willie: What are you saying? You're\njoshing, right?", "Willie: So, what do you say? Let's\nyou and me have a quick battle!"]);
    await say(["Willie: Yeahah! That's the spirit!"]);
    const won = await willieBattle();
    Screen.say("");
    await Overworld.act([{ who: ORRE("WILLIE"), moves: toMe.map(() => "walk_up").concat(["set_invisible"]) }]);
    sfx("se_door");
    Overworld.removeObject(ORRE("WILLIE"));
    Overworld.refreshPeople();
  }
  // Willie's battle (Colosseum's words): won?
  async function willieBattle() {
    await say(["Willie: Yeeeeeeaaaah! I'm burning\nnow! I'm on fire! It's full-throttle\ntime!", "Willie: Vrum! Vrooom! Let's roll!"]);
    const outcome = await battle("trainer", { foe: { name: "Rider Willie", team: Orre.willieTeam(), pic: "rider_willie" },
      double: true, prizeClass: "Rider", noBlackout: true, music: "mus_rs_vs_trainer", defeatText: ["Tch… Wiped out.\nI still need seasoning."] });
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    if (outcome !== "won") { await persist(); return false; }
    // (S1_out #20805.)
    await say(["Willie: But, yeah, you're tough. Real\ntough. You did a real number on us.",
      "Willie: Hey, I know. Why not test\nyour skills in Phenac City? It's out\nwest of here.",
      "Willie: You'll find trainers who are\nway better than me there. You should", "go out there and get some battling\nin."]);
    player.flags.orreStory = Math.max(player.flags.orreStory | 0, 19);
    Orre.unlock(player.flags, "PhenacCity");
    await persist();
    return true;
  }
  // Willie in the diner: a battle if you haven't won one yet (story 18), else a word.
  async function dinerWillie() {
    if ((player.flags.orreStory | 0) === 18) {
      await say(["Willie: So, what do you say? Let's\nyou and me have a quick battle!"]);
      if (!(await confirm("Battle Willie?"))) { await say(["Willie: What are you saying? You're\njoshing, right?"]); return; }
      await say(["Willie: Yeahah! That's the spirit!"]);
      await willieBattle();
      Overworld.refreshPeople();
      return;
    }
    // (Colosseum's later battles with him: once you've reached Pyrite, and once all 48 Shadow Pokémon are snagged.)
    // (Orre.WILLIE_STAGES, game/orre-trainers-early.js; player.flags.orreColo's "Willie": the one beaten last.)
    const f = player.flags, stages = Orre.WILLIE_STAGES || [];
    let index = -1;
    stages.forEach((st, i) => { if (typeof st.from === "function" ? st.from(f) : (f.orreStory | 0) >= st.from) index = i; });
    if (index >= 0) {
      const stage = stages[index], beaten = ((f.orreColo || {}).Willie ?? -1) >= index;
      if (!beaten) await coloStageBattle({ name: "Rider Willie", cls: "Rider", pic: "rider_willie" }, stage, index, "orreColo", "Willie");
      else await say(stage.after);
      return;
    }
    // (S1_out #20794: after Team Snagem's come looking for you in Phenac.)
    if ((f.orreStory | 0) >= 20) {
      await say(["Willie: Oh, hey, it's you! I was\nworried about you.", "Willie: Some rough-looking characters\ncame around asking about you. It made\nme worried.",
        "Willie: Those guys, they looked like\nthey're from Team Snagem."]);
      return;
    }
    // (S1_out #20790, its first words, and #20791.)
    await say(["Willie: Phenac City's out west from\nhere.", "Willie: Since we battled, I've been\nhaving battles with you in my head.",
      "Willie: You know, like what I\nshould've done when you did that, or", "what I needed to do when you did\nthis…",
      "Willie: Oh, right! That's what I\nshould've done! Okay, I'm not losing\nnext time!"]);
  }
  // At Phenac City (orreStory 19): Folly and Trudly by their truck, and a battle; then the sack.
  const FOLLY_PIC = "burglar", TRUDLY_PIC = "cue_ball";
  async function phenacFT() {
    // (Out of the Mayor's house after he's heard Rui out: Team Snagem's Wakin, phenacWakin.)
    if ((player.flags.orreStory | 0) === 20) { await phenacWakin(); return; }
    const F = ORRE("PHENAC_FOLLY"), T = ORRE("PHENAC_TRUDLY");
    // (Colosseum's words, M1_out: the sack squirms, Rui shouts from inside it, and a passer-by takes them for robbers.)
    await say(["Trudly: Yeah, you say that, but this…\nIt won't stop squirming. Makes it\ntough to hold on."]);
    await say(["Folly: Okay, okay. Settle down in\nthere. Just be quiet for a little\nwhile longer."]);
    await say(["???: Mgflpmmmgg… Beh! Help! Someone\nlet me out! Kidnappers!"]);
    await say(["Folly: Tch! That tape didn't keep her\nyap shut!"]);
    await say(["Woman: Eeeek! Somebody! Robbers!\nThey're robbers!"]);
    await say(["Trudly: Y-You be quiet! We're no\nrobbers! We're kidnappers! Get it?\nKidnappers!"]);
    await say(["Folly: Wha… You dingbat! Don't shoot\noff your mouth!"]);
    sfx("se_pin");
    await Overworld.act([{ who: F, moves: ["emote_exclamation_mark"] }]);
    const me = player.location, near = Math.max(0, me.y - 31);
    if (near > 0) await Overworld.act([{ who: F, moves: Array(near).fill("walk_down") }, { who: T, moves: Array(near).fill("walk_down") }]);
    await say(["Folly: Oh, drat! Did that punk there\nhear all that?!"]);
    await say(["Folly: Since you overheard us, we\ndon't have any choice. Blame it on\nyour own bad luck!"]);
    await phenacFTBattle();
  }
  async function phenacFTBattle() {
    const outcome = await battle("trainer", {
      foe: { name: "Shady Guy Folly", team: Orre.team("Folly"), pic: FOLLY_PIC }, double: true,
      prizeClass: "Team Rocket", noBlackout: true, music: "mus_vs_trainer", defeatText: ["Wha…?!"] });
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity.music);
    if (outcome !== "won") { await persist(); return; }
    // (M1_out #20109, #20100, #20111, and Trudly's #20103.)
    await say(["Folly: You took out my Whismur…\nYou're no ordinary trainer, are you?!", "Folly: Huh? Wait a sec… That face…\nMight you be… Team Snagem's…"]);
    await say(["Trudly: Hey, what are you doing? Get\na grip, man!"]);
    await say(["Folly: Don't get all happy just on\naccount of winning this once.", "Folly: The next time we meet, I'll\ntrash you, your Pokémon, and all!"]);
    await say(["Trudly: What do we do? What is there\nto do?", "Trudly: Run away!"]);
    Screen.say("");
    const F = ORRE("PHENAC_FOLLY"), T = ORRE("PHENAC_TRUDLY");
    await Overworld.act([{ who: F, moves: ["walk_fast_up", "walk_fast_up", "walk_fast_up", "set_invisible"] }, { who: T, moves: ["walk_fast_up", "walk_fast_up", "walk_fast_up", "set_invisible"] }]);
    Overworld.removeObject(F); Overworld.removeObject(T);
    player.flags.orreFT = true;
    Overworld.refreshPeople();
    // (A passer-by finds Rui in the sack: M1_out #20203, #20204, #20205.)
    await say(["Man: Oh, yuck! There's someone inside\nthere!"]);
    await say(["Man: Rrrrmmm… It's no good. I'm not\nstrong enough to undo this knot."]);
    await say(["Man: Please! We need your help!"]);
    await persist();
  }
  // Folly and Trudly's truck at Phenac: the sack, and Rui.
  async function phenacTruck(person) {
    const f = player.flags;
    if ((f.orreStory | 0) !== 19 || !f.orreFT) { if (person && person.text) await say(person.text); return; }
    // (Colosseum's words, M1_out: #20815, #20224, #20225; Rui, #20191, #20193, #20195; a passer-by, #20207; Rui,
    // #20197, #20198, #20196, #21799, #20199.)
    await say(["There's something squirming in the\nsack!", "The sack's mouth is firmly closed\nwith a tightly knotted rope."]);
    if (!(await confirm("Undo the knot?"))) return;
    await say(["{PLAYER} tugged hard on the tightly\nknotted rope.", "The knot gradually loosened.", "{PLAYER} undid the knot…"]);
    Screen.say("");
    const at = player.location, R = ORRE("PHENAC_RUI");
    sfx("se_door");
    Overworld.addObject(R, { x: at.x + 1, y: at.y, facing: "left" });
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(["???: Phew! Thank goodness! I'm saved!"]);
    await say(["???: Oh! Is that so? Thank you! And…\nUh… You are?", "???: Oh! So you're named {PLAYER}! I\nam…"]);
    await say(["???: My name's Rui. I'm sure glad I\nmet you!", "Rui: I was in the neighboring town\nwhen those two grabbed me…"]);
    await say(["Man: Well, it's easy to see\nsomething's on your mind. You should\ngo see our Mayor for his advice.",
      "Man: He's a very kindly person. I'm\nsure that he'll be able to help you\nsomehow."]);
    await say(["Rui: The Mayor? Yes, that's true!", "Rui: The Mayor might know something!"]);
    await say(["Rui: Oh, but… Those men might come\nback…", "Rui: Please, can I get you to stick\nwith me for just a while?"]);
    while (!(await confirm("Let Rui come along?"))) {
      await say(["Rui: Oh… No… No, that's fine, then."]);
      await say(["Rui: Hey, {PLAYER}… I know I'm\nimposing, but I don't have anyone\nelse that I can turn to.", "Rui: Please, can I get you to escort\nme for a while?"]);
    }
    await say(["Rui: Thank you, {PLAYER}! Eheh, I\nthought you might say that!", "Rui: If you're with me, {PLAYER}, it\nwon't matter if those guys come back\nagain!",
      "Rui: Thank you! Thanks for joining me\nfor a while!"]);
    await say(["Man: The Mayor's house is near the\nfountain square past here. Go up the", "stairs from the square, and it's on\nyour left."]);
    Screen.say("");
    await Overworld.fadeToBlack();
    Overworld.removeObject(R);
    f.orreStory = 20;
    f.orreRui = true;
    applyPatches("PhenacCity");
    Overworld.refreshPeople();
    await Overworld.fadeFromBlack();
    await sayWithJingle("mus_obtain_key_item", "Rui is coming along with {PLAYER}!");
    await persist();
  }
  // The Mayor's house (orreStory 20), as in Colosseum: Es Cade hears Rui out and goes to investigate (orreMayor 1);
  // outside, Wakin (phenacWakin, 2); back in, Miror B. with Folly and Trudly (orreMayorMirorB), Folly's battle (3),
  // then Trudly and his Shadow Pokémon. A battle lost ends it there; come back in to go on from where it got to.
  async function mayorScene() {
    const f = player.flags, R = ORRE("MAYOR_RUI"), E = ORRE("MAYOR_ES_CADE");
    const me = player.location;
    Overworld.addObject(R, { x: me.x + 1, y: me.y, facing: "up" });
    const up = (who, n) => ({ who, moves: Array(n).fill("walk_up") });
    const steps = (f.orreMayor | 0) >= 2 ? 2 : 4;   // (with Folly and Trudly up by the Mayor's desk, only part way)
    await Overworld.act([up("player", steps), up(R, steps)]);
    if (!(f.orreMayor | 0)) {
      // (Colosseum's words, M1_houseA_1F: #20028, Rui's #20241 to #20245, Es Cade's #20030 to #20035.)
      await say(["Es Cade: Ah, you must be travelers!\nWelcome to Phenac City! I am Es Cade,\nthe Mayor.",
        "Es Cade: Now, you wanted to see me.\nIs there something that I may be able\nto assist you with?"]);
      await say(["Rui: Um… Er…", "Rui: I… I saw it!"]);
      await say(["Es Cade: Saw it? And what did you\nsee?"]);
      await say(["Rui: I saw a peculiar Pokémon… No,\nthat's not quite right.", "Rui: What I saw was a Pokémon that\ngave off a black aura. It was like a\nfighting machine!",
        "Rui: And, that Pokémon would attack\npeople!"]);
      await say(["Es Cade: O-o-o-oh, my! Pokémon like a\nfighting machine? And it attacks\npeople?!",
        "Es Cade: Now, if that were true, that\nwould be truly frightening. However,\nit is a little hard to believe."]);
      await say(["Rui: It's true! It's true, Mr. Mayor!", "Rui: Because I saw that Pokémon, I\nwas made the prisoner of some", "frightening men until just a little\nwhile ago."]);
      await say(["Es Cade: Hmm… I see. I understand. I\nwill order an investigation at once."]);
      await say(["Rui: You will? Thank you, Mr. Mayor!"]);
      await say(["Es Cade: Oh, no, no. There is no need\nfor thanks.", "Es Cade: We mustn't allow thugs to do\nas they wish. Especially thugs that", "endanger a pretty young lady like\nyou!",
        "Es Cade: I'll ask that you give me a\nlittle time on this matter. I promise", "we will get some useful information\nfor you."]);
      await say(["Es Cade: I promise you, we will\nobtain useful information about those\nsinister Pokémon.",
        "Es Cade: While we do so, I heartily\nrecommend that you visit our Stadium,\nthe symbol of our civic pride!"]);
      Screen.say("");
      // (He goes out on his investigation; outside, Team Snagem is waiting: phenacWakin.)
      await Overworld.act([{ who: E, moves: ["walk_right", "walk_right", "walk_down", "walk_down", "walk_down", "walk_down", "walk_down", "set_invisible"] }]);
      sfx("se_door");
      Overworld.removeObject(E);
      Overworld.removeObject(R);
      f.orreMayor = 1;
      await persist();
      return;
    }
    if ((f.orreMayor | 0) === 1) { Overworld.removeObject(R); return; }   // (Wakin's outside first: phenacWakin)
    const leave = async (...who) => {
      Screen.say("");
      await Overworld.act(who.map((w) => ({ who: w, moves: ["walk_fast_down", "walk_fast_down", "set_invisible"] })));
      sfx("se_door");
      who.forEach((w) => Overworld.removeObject(w));
    };
    const lost = async (...who) => { await leave(...who); Overworld.removeObject(R); player.party.forEach(Party.heal); await persist(); };
    // (Back in after Wakin, a crowd of shady men has marched in: Miror B., with Folly and Trudly. Colosseum's words,
    // M1_houseA_1F: Folly's #20246; Miror B.'s #20171, #21803 and #21805; Folly's #23073 and #20252; Trudly's #20096.)
    const F = ORRE("MAYOR_FOLLY"), T = ORRE("MAYOR_TRUDLY"), MB = ORRE("MAYOR_MIROR_B");
    Overworld.addObject(F, { x: 6, y: 3, facing: "down" });
    Overworld.addObject(T, { x: 7, y: 3, facing: "down" });
    if ((f.orreMayor | 0) === 2) {
      if (!f.orreMayorMirorB) {
        Overworld.addObject(MB, { x: 8, y: 3, facing: "down" });
        await say(["Folly: Master Miror B.! It's… It's\nhim! He's the one that took the girl\nfrom us!"]);
        await say(["Miror B.: Oh, now aren't you boys\nfrightfully pathetic? You mean to", "tell me you were bested by these\ndarling infants?",
          "Miror B.: Darling, did you say your\nname was {PLAYER} or something?",
          "Miror B.: I so don't like saying\nthis, but we're not at liberty to\nkeep your lady friend at liberty.",
          "Miror B.: That sweet young thing, she\ncan see things that ordinary people\naren't supposed to see.",
          "Miror B.: That just will not do for\nwhat we're planning to do. No, it\njust won't do at all.",
          "Miror B.: If you don't like pain,\nlike most people, you can avoid the", "pain by keeping your nose out of\nplaces it needn't be."]);
        await say(["Miror B.: Boys, I shall make my\nreturn to Pyrite now. Do remember", "that I will be waiting for you to\nreturn with the little lady.",
          "Miror B.: Am I making myself clear? I\nwon't accept failure from you again,\nboys. Fuhohoho…"]);
        await say(["Folly: Yes! Yes, we will!"]);
        await say(["Miror B.: Let the music spin! Let's\nget it on!"]);
        Screen.say("");
        await Overworld.act([{ who: MB, moves: ["walk_down", "walk_down", "walk_down", "walk_down", "walk_down", "set_invisible"] }]);
        sfx("se_door");
        Overworld.removeObject(MB);
        f.orreMayorMirorB = true;
      }
      await say(["Folly: You, you, you! The last time,\nyou caught me off guard! That's not\ngonna happen again!"]);
      const outcome = await battle("trainer", { foe: { name: "Miror B. Peon Folly", team: Orre.team("Folly@Mayor"), pic: FOLLY_PIC },
        double: true, prizeClass: "Team Rocket", noBlackout: true, music: "mus_vs_trainer", defeatText: ["Awww, blast it! I got tripped\nup again!"] });
      show("world");
      await Overworld.resume();
      music(window.WORLD_MAPS.PhenacCity_MayorsHouse.music);
      if (outcome !== "won") { await say(["Folly: Heh! You should've stayed\ntucked away in your beddy-byes\nupstairs!"]); await lost(F, T); return; }
      f.orreMayor = 3;
      await persist();
    }
    // Trudly, and the Shadow Pokémon (M1_houseA_1F: #20096; Rui's #20259 and #20261).
    await say(["Trudly: My turn now! I'm not going to\nend up like Folly!"]);
    await say(["Rui: {PLAYER}! That's it! It's that\nPokémon!", "Rui: Those guys kidnapped me because\nI saw that Pokémon!",
      "Rui: I can see it! That Pokémon has a\nblack aura! They've done something to\nit!"]);
    await say(["Rui: {PLAYER}, be careful! Just as I\nthought, that Pokémon will attack\npeople!",
      "Rui: {PLAYER}, I know! It's not\nsomething I like, but this is a\ndesperate situation.",
      "Rui: Please, snag that poor Pokémon\nback from those horrible thugs!", "Rui: You can… No. Only you can do it!"]);
    // (His Shadow Pokémon, Colosseum's: Orre.SHADOW.)
    const shadow = Orre.shadowOf("Trudly")[0];
    const opts = { foe: { name: "Miror B. Peon Trudly", team: Orre.team("Trudly"), pic: TRUDLY_PIC }, double: true, prizeClass: "Team Rocket",
      noBlackout: true, snag: [shadow.species], music: "mus_vs_trainer", defeatText: ["Darn it, but you're good!"] };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity_MayorsHouse.music);
    if (outcome === "lost") { await lost(F, T); return; }
    const snagged = (opts.snagged || []).includes(shadow.species);
    // (Colosseum's words: M1_houseA_1F #20099 or #20101, Rui's #20266 or #20265; M1_out #23668 to #23671; Folly's
    // #21806, Trudly's #20103; then Rui's #23672, or #20253 if it got away.)
    await say(snagged ? ["Trudly: Darn it, but you're good! You\nsnagged my Pokémon!"] : ["Trudly: Darn it, but you're good! You\nknocked out my Pokémon!"]);
    await say(snagged ? ["Rui: You did it, {PLAYER}! You\nsnagged that Pokémon from that goon!", "Rui: But I'm sure there are others\nlike it.",
      "Rui: Let's get all of them back from\nthe bad guys!"]
      : ["Rui: Oh, it's disappointing that we\ncouldn't snag that Pokémon off them.", "Rui: But I'm sure there are others\nlike it.",
        "Rui: Let's get all of them back from\nthe bad guys!"]);
    await say(["Rui: What was that strange Pokémon?\nWhat did you people do to it?!"]);
    await say(["Trudly: That? It's a Pokémon that we\nturned into a fighting machine by", "artificially closing the door to its\nheart."]);
    await say(["Rui: No! You didn't! You artificially\nclosed the door to that poor\nPokémon's heart?!"]);
    await say(["Folly: Humph. Knowing that's not\ngoing to help you do anything!"]);
    await say(["Folly: Oh, man… What are we supposed\nto do? We got flattened again. Miror\nB.'s going to chew us out!"]);
    await say(["Trudly: What do we do? What is there\nto do?", "Trudly: Run away!"]);
    await leave(F, T);
    await say(snagged ? ["Rui: I know! When I was little, I\nheard about that.", "Rui: They say that if any Pokémon\ncloses the door to its heart, it can",
      "be gradually reopened by battling\ntogether with it.", "Rui: {PLAYER}, let's go. Those guys\nare probably headed for Pyrite Town.",
      "Rui: After all, it was in Pyrite that\nthey captured me."]
      : ["Rui: Just as I thought… There are\nmany other Pokémon with that black\naura.", "Rui: {PLAYER}, let's go. Those guys\nare probably headed for Pyrite Town.",
        "Rui: After all, it was in Pyrite that\nthey captured me.", "Rui: That town must be hiding a big\nsecret!"]);
    Overworld.removeObject(R);
    // (Outside, the Mystery Troop: phenacTroop.)
    f.orreStory = 21;
    if (snagged) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(shadow.species);
    Overworld.refreshPeople();
    await persist();
  }
  // Out of the Mayor's house after he's heard Rui out (orreStory 20, orreMayor 1): Team Snagem's Wakin and another of
  // Snagem's, come for their traitor and the Snag Machine, as in Colosseum (its words, M1_out: #20048, #20212, #20200,
  // #20218, #20201, #20214, #20051, #20053, #20237, #20054; after the battle #20238, #20055, #20056, #20059, Rui's
  // #20240; then #20230: shady men have gone into the Mayor's house). Beaten, orreMayor 2; lost, he's there again
  // next time you come out.
  async function phenacWakin() {
    const f = player.flags, W = ORRE("PHENAC_WAKIN"), G = ORRE("PHENAC_GRUNT"), me = player.location;
    Overworld.addObject(W, { x: me.x, y: me.y + 3, facing: "up" });
    Overworld.addObject(G, { x: me.x + 1, y: me.y + 3, facing: "up" });
    await Overworld.act([{ who: W, moves: ["walk_up", "walk_up"] }, { who: G, moves: ["walk_up", "walk_up"] }, { who: "player", moves: ["face_down"] }]);
    await say(["Wakin: Hey, {PLAYER}! We've finally\nfound you! You filthy,\ndouble-crossing traitor!",
      "Wakin: Wrecking the hideout wasn't\ngood enough for you?! So you rip off", "the Snag Machine? You've got some\nnerve!"]);
    await say(["Rui: Who are these people? Huh? Are\nthey Team Snagem?!", "Rui: And what did they mean by\ntraitor? {PLAYER}… You mean…"]);
    await say(["Wakin: Hey, {PLAYER}! Come on, hand\nit over! Give back the Snag Machine\nyou ripped off from the hideout!"]);
    await say(["Rui: Snag Machine? {PLAYER}, do you\nreally have something like that?"]);
    await say(["Grunt: The Snag Machine's built for\ntrainers. When a trainer puts the", "Snag Machine on, their Poké Balls are\nconverted.",
      "Grunt: Ordinary Poké Balls are turned\ninto Snag Balls that can steal", "Pokémon from their trainers in\nbattle."]);
    await say(["Rui: No way! Is it true, {PLAYER}?"]);
    await say(["Grunt: That's right, pretty lady!\nHe's from Team Snagem, just like us!",
      "Grunt: But he's no ordinary member.\nHe's a Snagger. He's the best in Team", "Snagem at Snagging Pokémon without\nfail!"]);
    await say(["Wakin: Hey, you blabbermouth! Keep\nthat stuff secret!"]);
    await say(["Rui: I get it, {PLAYER}. That's why\nthese creeps are chasing after you."]);
    await say(["Wakin: Creeps? What do you mean by\ncreeps?", "Wakin: Gah, this is getting us\nnowhere! If you won't give it up", "willingly, we'll take it back by\nforce!"]);
    const outcome = await battle("trainer", { foe: { name: "Team Snagem Wakin", team: Orre.team("Wakin"), pic: "snagem_grunt" }, double: true,
      prizeClass: "Team Rocket", noBlackout: true, music: "mus_vs_trainer", defeatText: ["Wha… Stop that!"] });
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity.music);
    const go = async () => {
      Screen.say("");
      await Overworld.act([W, G].map((who) => ({ who, moves: ["walk_fast_down", "walk_fast_down", "walk_fast_down", "set_invisible"] })));
      Overworld.removeObject(W); Overworld.removeObject(G);
    };
    if (outcome !== "won") { await go(); player.party.forEach(Party.heal); await persist(); return; }
    await say(["Rui: Aiyeeeeh! Help! Please, someone,\nhelp! It's Team Snagem! Team Snagem's\nhere!"]);
    await say(["Wakin: Wha… Stop that! Quit\nscreaming! I said quit it!"]);
    await say(["Man: What, what?! What's going on out\nhere?!"]);
    await say(["Wakin: Blast you, {PLAYER}! Don't\nthink this is over!", "Wakin: We're going to get that Snag\nMachine back. Just you wait!"]);
    await go();
    await say(["Rui: Well, what do you know,\n{PLAYER}. So you're from Team Snagem.", "Rui: Oh, right. To be accurate, I\nshould say former Team Snagem.",
      "Rui: It's okay. {PLAYER}, it doesn't\nmatter to me who you are.", "Rui: After all, you're my gallant\nprince who rescued me when I was in\ntrouble.",
      "Rui: So, it doesn't matter. Besides,\nI thought up something after\nlistening to those creeps.", "Rui: Listen, {PLAYER}. We should go\nshopping for some Poké Balls."]);
    f.orreMayor = 2;
    await persist();
    await say(["Woman: My goodness! It's terrible! A\nbig group of shady-looking men\nmarched into the Mayor's house!"]);
  }
  // The Mystery Troop (orreStory 21, after the Mayor's house): Verde, Rosso and Bluno stand by Phenac's way out, and
  // won't let you by till you've beaten one of them (each with a Shadow Pokémon, Lv. 30, to snag: Orre.team). Then
  // all three go (player.flags.orreTroop: the one you battled; the other two are met again after the game). Colosseum's
  // words, M1_out: #20136, #22310, #22309 (if you lose) and #20173.
  const TROOP = ["Verde", "Rosso", "Bluno"];
  const TROOP_SCRIPT = (name) => "PhenacCity_EventScript_Troop_" + name.toUpperCase();
  async function phenacTroop(script) {
    const f = player.flags, name = TROOP.find((n) => TROOP_SCRIPT(n) === script) || script;
    if ((f.orreStory | 0) !== 21 || f.orreTroop) return;
    await say([name + ": Sorry to break it to you, but\nI'm not about to let you pass.", name + ": Or do you have this idea that\nyou can take me in a battle?"]);
    if (!(await confirm("Battle " + name + "?"))) return;
    await say([name + ": Wahaha! Who's going to beat\nme? You are?! Don't be crying out of\nregret later!"]);
    const opts = { foe: { name: "Mystery Troop " + name, team: Orre.team(name), pic: "cipher_peon" }, double: true, prizeClass: "Team Rocket",
      noBlackout: true, snag: Orre.snaggable(name, f.orreShadowSnagged), music: "mus_vs_trainer", defeatText: ["Tch! You win, but just today!"] };
    const outcome = await battle("trainer", opts);
    show("world");
    await Overworld.resume();
    music(window.WORLD_MAPS.PhenacCity.music);
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    if (outcome !== "won") { await say([name + ": Wahaha! Well, of course! I'm\nvastly superior to the other two!"]); await persist(); return; }
    await say([name + ": Hm? I'd guess you're a\ntraveling trainer.", name + ": Hm… I like what I see in your\nexpression.",
      name + ": Fufufu… I have a feeling I may\nsee you again somewhere."]);
    Screen.say("");
    await Overworld.fadeToBlack();
    for (const n of TROOP) Overworld.removeObject(ORRE("PHENAC_" + n.toUpperCase()));
    f.orreTroop = name;
    Overworld.refreshPeople();
    await Overworld.fadeFromBlack();
    await persist();
  }
  // (Their people, and Wakin's, and Miror B. in the Mayor's house: placed here, only in their scenes or till the Troop's
  // beaten (game/orre.js's visible()).)
  {
    const person = (map, id, x, y, facing, localId, sprite, script) => {
      const m = window.WORLD_MAPS[map];
      if (m && !m.people.some((p) => p.localId === ORRE(localId))) m.people.push({ id, x, y, movement: "face_" + facing, rangeX: 0, rangeY: 0,
        script: script || null, flag: null, text: null, localId: ORRE(localId), sprite, width: 16, height: 32, frames: 10 });
    };
    person("PhenacCity", 960, 5, 11, "up", "PHENAC_WAKIN", "orre_snagem_m");
    person("PhenacCity", 961, 6, 11, "up", "PHENAC_GRUNT", "orre_snagem_m");
    TROOP.forEach((n, i) => { person("PhenacCity", 962 + i, [17, 19, 22][i], 33, "up", "PHENAC_" + n.toUpperCase(), "orre_peon_m", TROOP_SCRIPT(n)); SPECIAL.add(TROOP_SCRIPT(n)); });
    person("PhenacCity_MayorsHouse", 965, 8, 3, "down", "MAYOR_MIROR_B", "rocker");
  }
  // ---------- Orre: Shadow Pokémon's hearts, and the Relic Stone (Colosseum's heart gauge) ----------
  //
  // A Shadow Pokémon you snag comes with the door to its heart shut tight: its heart gauge full (record.heart, of
  // record.heartMax points: each Shadow Pokémon's own size, game/orre-heart.js). As in Colosseum, it opens little by
  // little, by how much its nature takes to each (Colosseum's own figures, OrreHeart.NATURES): walking with it (every
  // 256 steps), battling with it (once a battle it's sent out in), calling it out of Hyper Mode (engine/battle.js's
  // callMon), leaving it with Agate's Day-Care Lady (every 256 steps), and massaging it with a Scent from the Cologne
  // Case (Joy once over, Excite twice, Vivid three times). As its five bars empty its own moves come back, its nature
  // shows, and (from under three bars) its Exp. Points start to be kept for it (record.shadowExp), given back when it's
  // purified. Once the door's open, Agate's Relic Stone purifies it (from orreStory 30, when Eagun's family tablet has
  // told you how): it regains its own first move in Shadow Rush's place, its Exp. Points, and a Ribbon.
  const SCENT_HEART = { "joy-scent": 1, "excite-scent": 2, "vivid-scent": 3 };
  const SCENT_SAYS = { "joy-scent": "a Joy Scent", "excite-scent": "an Excite Scent", "vivid-scent": "a Vivid Scent" };
  // (A heart just about to open: Colosseum's words, its Summary's.)
  const heartOpenText = (r) => "The door to " + Party.displayName(r) + "'s heart is\nabout to open. Undo the final lock!";
  // A heart opened by `way` (OrreHeart.open), `times` over: its bars, before and after, and whether it's now ready.
  function openHeart(r, way, times) {
    OrreHeart.migrate(r);
    const was = r.heart | 0, opened = OrreHeart.open(r, way, times);
    return { opened, ready: was > 0 && !(r.heart > 0) };
  }
  // (The steps towards the next 256 are kept in the save, player.flags.orreHeartSteps, so a reload doesn't lose them.)
  function heartStep() {
    // (The Day-Care Lady's Pokémon grows a step's worth: game/orre-daycare.js.)
    OrreDayCare.step(player, Player.levelCap(player));
    const f = player.flags;
    f.orreHeartSteps = (f.orreHeartSteps | 0) + 1;
    if (f.orreHeartSteps < OrreHeart.STEPS) return null;
    f.orreHeartSteps = 0;
    let ready = null;
    for (const r of player.party) if (r.shadow && r.heart > 0 && openHeart(r, "walk").ready && !ready) ready = r;
    // (The Day-Care Lady's Pokémon: game/orre-daycare.js.)
    const dc = window.OrreDayCare && OrreDayCare.held(player);
    if (dc && dc.shadow && dc.heart > 0) openHeart(dc, "daycare");
    return ready ? { type: "heart-open", text: heartOpenText(ready) } : null;
  }
  // Agate's Day-Care Lady (Colosseum's words: M3_houseD_1F #15121-#15134; game/orre-daycare.js): one Pokémon at a time.
  async function dayCareLady() {
    // (Her name before her words, the page wrapped again so no line runs past the box: 37 a line, three a page.)
    const lady = (s) => {
      const lines = [];
      let line = "";
      for (const w of ("Day-Care Lady: " + s).replace(/\n/g, " ").split(" ")) {
        if (line && (line + " " + w).length > 37) { lines.push(line); line = w; } else line = line ? line + " " + w : w;
      }
      if (line) lines.push(line);
      const pages = [];
      for (let i = 0; i < lines.length; i += 3) pages.push(lines.slice(i, i + 3).join("\n"));
      return pages.length === 1 ? pages[0] : pages;
    };
    const r = OrreDayCare.held(player);
    if (r) {
      const name = Party.displayName(r), up = OrreDayCare.grown(player);
      await say([lady("Ah, good to see you! Your\ndarling Pokémon is doing\nmarvelously well.")].concat(up ? [lady("By level, " + name + " has\ngrown by about " + up + ".")] : []).flat());
      if (!(await confirm(lady("Are you here to reclaim your\nPokémon?")))) { await say(lady("Come see me when you want\nyour Pokémon back.")); return; }
      if (player.party.length >= 6) { await say(lady("Your Pokémon party is full. I\ncan't return your little darling if\nthere's no room for it.")); return; }
      const price = OrreDayCare.fee(player);
      if (!(await confirm(lady("If you're reclaiming your darling\n" + name + ", you'll have to pay ¥" + price + ".")))) { await say(lady("Come see me when you want\nyour Pokémon back.")); return; }
      if (player.money < price) { await say(lady("You don't seem to have enough\nmoney, dear.")); return; }
      Player.addMoney(player, -price);
      player.party.push(OrreDayCare.withdraw(player));
      await say(lady("Fine, thank you! Take your\nlovely Pokémon with you."));
      await sayWithJingle("mus_obtain_item", player.name + " got " + name + " back\nfrom the Day-Care Lady.");
      await persist();
      return;
    }
    await say(lady("I'm the Day-Care Lady. I can\nraise a Pokémon for you, if you'd\nlike."));
    if (!(await confirm(lady("Have you a Pokémon you'd like\nme to raise?")))) { await say(lady("Come see me again if you have a\nPokémon you'd like me to raise.")); return; }
    if (player.party.filter((q) => !q.egg).length < 2) {
      await say([lady("Oh? You've got only one\nPokémon with you."), lady("If you leave that one with me,\nwhy, you'll have none with you."),
        lady("I'll raise a Pokémon for you if you\nhave at least two with you. Come back\nthen.")].flat());
      return;
    }
    await say(lady("Which darling Pokémon should\nI raise?"));
    const pick = await choosePartyFor("Leave which {PKMN}?", null, player.party.map((q) => (q.egg ? "NOT ABLE" : "ABLE")));
    if (!pick || pick.egg) { await say(lady("Come see me again if you have a\nPokémon you'd like me to raise.")); return; }
    player.party.splice(player.party.indexOf(pick), 1);
    OrreDayCare.deposit(player, pick, Player.levelCap(player));
    await say(lady("Fine, I'll take your precious\n" + Party.displayName(pick) + ". Come back for it\nlater."));
    await persist();
  }
  // The door to a heart, in Colosseum's Summary's words (pocket_menu #11225-#11231), by the bars left.
  const heartDoor = (r) => OrreHeart.door(r).replace("heart is ", "heart is\n").replace(" Undo", "\nUndo");
  // A Scent (Colosseum's Cologne Massage, from the Cologne Case): Colosseum's words (common_rel#1 #15094-#15098, #17013,
  // #17014, #10856). It also dispels Hyper Mode.
  async function scentOn(record, item) {
    const name = Party.displayName(record);
    if (!record.shadow || record.heart == null || !(record.heart > 0 || record.hyper)) { await message("It won't have any effect."); return; }
    Player.removeItem(player, item);
    await message(player.name + " massaged " + name + "\nusing " + SCENT_SAYS[item] + ".");
    if (record.hyper) { record.hyper = false; await message(name + " came to its senses!"); }
    const { opened, ready } = openHeart(record, "scent", SCENT_HEART[item]);
    if (opened) await message("The door to " + name + "'s heart\n" + (opened < 150 ? "opened a tiny bit!" : opened < 400 ? "opened up a little!" : "opened up a lot!"));
    if (ready) await message(heartOpenText(record));
  }
  async function relicStone() {
    const f = player.flags, shadows = player.party.filter((r) => r.shadow);
    // (Colosseum's words for the Relic, and for a heart not yet ready or ready to open.)
    await say(["This is a mystical relic. It seems to\nbe giving off a strange and fantastic\npower."]);
    if ((f.orreStory | 0) < 30 || !shadows.length) return;
    if (shadows.some((r) => !((r.heart | 0) > 0))) await say(["There's a Pokémon that may open the\ndoor to its heart!"]);
    for (const r of shadows) {
      if ((r.heart | 0) > 0) { await say(["The door to that Pokémon's heart\ncan't be opened yet.", heartDoor(r)]); continue; }
      await Overworld.flash();
      sfx("se_m_reflect");
      await purifyWithWords(r);
      await persist();
    }
  }
  // Purified at the Relic Stone, or by Celebi: Colosseum's words for it (M3_shrine_1F_rl #15120, #15115, #17614, #15116,
  // #15117).
  async function purifyWithWords(r) {
    const name = Party.displayName(r), got = purify(r);
    await sayWithJingle("mus_heal", [name + " opened the door to its\nheart!"].concat(got.move ? [name + " regained the move\n" + got.move + "!"] : []));
    if (got.exp) await say(name + " regained " + got.exp + "\nEXP Points!");
    if (got.level) await say(name + " was elevated to Lv. " + got.level + ".");
    await say(name + " obtained a RIBBON!");
    if (!r.nickname && await confirm("Would you like to give a nickname\nto " + name + "?")) {
      const typed = await enterText(name + "'s nickname?", name, 10);
      if (typed && typed !== name) r.nickname = typed;
    }
  }
  // Purified: no longer a Shadow Pokémon. It regains its moves (Colosseum's four, its first back in Shadow Rush's place;
  // an older record without them, the moves it would know at its level), the Exp. Points kept for it (levelling up, as
  // far as Orre's level cap), and Colosseum's Ribbon (record.nationalRibbon). Returns { move, exp, level }.
  function purify(r) {
    const got = { move: r.purifyMoves && r.purifyMoves[0], exp: r.shadowExp | 0, level: 0 };
    r.shadow = false;
    delete r.heart; delete r.heartMax; delete r.hyper;
    r.moves = r.purifyMoves ? r.purifyMoves.map((name) => ({ name, pp: Party.maxPp ? Party.maxPp(name) : (window.MOVES[name] || {}).pp || 10 })) : Party.create(r.species, r.level).moves;
    delete r.purifyMoves;
    if (got.exp) {
      const E = window.Experience, rate = E.growthRate(r.species), cap = Math.min(100, Player.levelCap(player));
      r.exp = Math.min((r.exp | 0) + got.exp, E.expForLevel(rate, Math.max(cap, r.level)));
      const lv = Math.max(r.level, Math.min(cap, E.levelForExp(rate, r.exp)));
      if (lv > r.level) { const before = Party.maxHp(r); r.level = lv; got.level = lv; r.hp = Math.max(0, (r.hp | 0) + Party.maxHp(r) - before); }
    }
    delete r.shadowExp;
    r.nationalRibbon = true;
    (player.flags.orrePurified = player.flags.orrePurified || []).push(r.species);
    return got;
  }

  // The Pyrite Colosseum's and Phenac Stadium's tournaments (Orre.TOURNAMENTS): enter at the counter, four double
  // battles in a row, healed between rounds; win all four for the prize. (player.flags.orreTourney: wins by key.)
  async function orreTournament(script) {
    // (The Pyrite Colosseum's and Phenac Stadium's desks: Colosseum's own, the story's challenge too: colosseumDesk.)
    if (script === "PyriteTown_Colosseum_EventScript_Receptionist" || script === "PhenacCity_Stadium_EventScript_Receptionist") { await colosseumDesk(script); return; }
    const t = Orre.TOURNAMENTS[script], f = player.flags, wins = (f.orreTourney = f.orreTourney || {});
    if ((f.orreStory | 0) < t.from) { await say(t.closed); return; }
    await say(["Welcome to the " + t.name + "!", "Today's tournament: four double\nbattles in a row. Win them all and\nyou're the champion of the day!"]);
    if (player.party.filter((r) => !r.egg).length < 2) { await say(["You'll need at least two Pokémon to\nenter. These are double battles!"]); return; }
    if (!(await confirm("Enter the tournament?"))) { await say(["Please come again!"]); return; }
    const top = Math.max(...player.party.filter((r) => !r.egg).map((r) => r.level));
    // (The Deep Colosseum's, Colosseum's own five rounds, t.rounds: each win takes you on to the next.)
    const draw = t.rounds ? t.rounds[Math.min(wins[t.key] | 0, t.rounds.length - 1)] : Orre.tournamentDraw(t, top, Player.levelCap(player)), heal = () => player.party.forEach(Party.heal);
    heal();
    await say(["Your Pokémon have been restored to\nfull health.", "The entrants are ready. Please, step\nthis way!"]);
    for (let round = 0; round < 4; round++) {
      const e = draw[round];
      await say([round === 3 ? "The final! Your opponent: " + e.name + "!" : "Round " + (round + 1) + "! Your opponent:\n" + e.name + "!"]);
      if (e.intro) await say(e.intro);
      Screen.say("");
      const made = t.rounds ? Orre.roundTeam(e, f) : { team: teamOf(e.team), snag: [] };
      const opts = { foe: { name: e.name, team: made.team, pic: e.pic }, prizeClass: e.cls, noBlackout: true, snag: made.snag,
        defeatText: e.defeat || [pickOne(["You're as tough as they said!", "Argh! I was so close!", "Well fought. Go win the\nwhole thing!", "Not bad… not bad at all."])] };
      const outcome = await storyBattle(opts);
      if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
      heal();
      if (outcome !== "won") { if (e.lost) await say(e.lost); await say(["Oh, what a shame! You're out of the\ntournament.", "Your Pokémon have been healed. Please\ntry again!"]); await persist(); return; }
      if (round < 3) await say(["Congratulations! On to the next\nround!", "Your Pokémon have been restored to\nfull health."]);
    }
    const firstTime = !wins[t.key], item = firstTime ? t.first : pickOne(t.items);
    wins[t.key] = (wins[t.key] | 0) + 1;
    await sayWithJingle("mus_obtain_badge", ["Congratulations! You're today's\n" + t.name + " champion!"]);
    Player.addMoney(player, t.prize);
    await say(["{PLAYER} received ¥" + t.prize + " in prize money!"]);
    Player.addItem(player, item, 1);
    await sayWithJingle(itemJingle(item), "{PLAYER} received " + article(Bag.name(item)) + "!");
    // (The Deep King, Agnol, is the Deep Colosseum's last round's last battle, Orre.DEEP_ROUNDS: no one waits by the
    // counter.)
    await say(["Please come back and enter again!"]);
    await persist();
  }
  const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

  // Mt. Battle's 100-Trainer challenge (Orre.MT_BATTLE): ten areas of ten double battles, the tenth the Area Leader;
  // healed only between areas, where you may stop. player.flags.orreMtBattle: { best (the furthest area cleared),
  // cleared (areas whose first-clear prize you've had), hooh (Ho-Oh given) }.
  async function mtBattleChallenge() {
    const f = player.flags, M = Orre.MT_BATTLE, rec = (f.orreMtBattle = f.orreMtBattle || { best: 0, cleared: [] });
    if ((f.orreStory | 0) < M.from) { await say(["The challenge is closed while those\npurple crooks are on the mountain.", "Sorry, kid. Come back once they're\ngone."]); return; }
    await say(["Welcome to Mt. Battle's challenge!", "Ten areas, ten Trainers each, all\ndouble battles. The tenth in each\narea is its Area Leader.",
      "Your Pokémon are only healed between\nareas, and you can stop there.", "Beat all 100 in one go and, they say,\nsomething wonderful happens!"]);
    if (player.party.filter((r) => !r.egg).length < 2) { await say(["You'll need at least two Pokémon.\nThey're double battles!"]); return; }
    const starts = M.starts.filter((a) => a === 1 || rec.best >= a - 1);
    const at = await multichoice("Where will you start?", 0, 0, starts.map((a) => "Area " + a).concat(["Cancel"]));
    if (at < 0 || at >= starts.length) { await say(["Come back any time!"]); return; }
    const from = starts[at], heal = () => player.party.forEach(Party.heal);
    heal();
    await say(["Your Pokémon have been restored to\nfull health. Good luck!"]);
    for (let area = from; area <= 10; area++) {
      const foes = Orre.mtBattleArea(area, Player.levelCap(player));
      await say(["Area " + area + "! Ten Trainers stand\nbetween you and the next area."]);
      for (let k = 0; k < 10; k++) {
        const e = foes[k];
        await say([e.leader ? "Area " + area + "'s Area Leader steps up:\n" + e.name + "!" : "Battle " + ((area - 1) * 10 + k + 1) + ": " + e.name + "!"]);
        Screen.say("");
        const outcome = await storyBattle({ foe: { name: e.name, team: teamOf(e.team), pic: e.pic }, prizeClass: e.leader ? "Leader" : e.cls, noBlackout: true,
          defeatText: [e.leader ? "You've earned the next area. Go on!" : pickOne(["Whoa! You're strong!", "Hmph. Good luck up there.", "My training wasn't enough…"])] });
        if (outcome !== "won") {
          heal();
          await say(["You were beaten in Area " + area + ".", "Your Pokémon have been healed. Train\nup and try again!"]);
          await persist();
          return;
        }
      }
      rec.best = Math.max(rec.best, area);
      heal();
      await sayWithJingle("mus_obtain_badge", ["You've cleared Area " + area + "!"]);
      if (!rec.cleared.includes(area)) {
        rec.cleared.push(area);
        Player.addMoney(player, M.money(area));
        await say(["{PLAYER} received ¥" + M.money(area) + "!"]);
        const item = M.prizes[area];
        Player.addItem(player, item, 1);
        await sayWithJingle(itemJingle(item), "{PLAYER} received " + article(Bag.name(item)) + "!");
      }
      await persist();
      if (area < 10 && !(await confirm("Your Pokémon are healed. Go on to\nArea " + (area + 1) + "?"))) { await say(["Come back any time!"]); return; }
    }
    await say(["Incredible! You've beaten all of Mt.\nBattle's Trainers!"]);
    // (As in Colosseum: all 100 in one go, once all 48 Shadow Pokémon have been purified. Its Ho-Oh, Lv. 70, knows
    // Recover, Fire Blast, Sunny Day and Swift: Serebii's Colosseum Ho-Oh page.)
    const allPurified = Orre.SHADOW.every((s) => (f.orrePurified || []).includes(s.species));
    if (from === 1 && !rec.hooh && (f.orreStory | 0) >= 44 && allPurified) {
      await say(["…Huh? Look at the sky!", "A rainbow… and something's flying out\nof it!"]);
      await Overworld.flash();
      cry("Ho-Oh");
      const moves = ["Recover", "Fire Blast", "Sunny Day", "Swift"];
      if (await giftMon("Ho-Oh", 70, "Ho-Oh came down to {PLAYER}!", null, null,
        (r) => { r.moves = moves.map((name) => ({ name, pp: Party.maxPp(name) })); })) rec.hooh = true;
    }
    await say(["Come back and take the challenge\nagain any time!"]);
    await persist();
  }

  // Agate's Cologne Massage (game/orre-trainers-middle.js places them): the girl with the spare Cologne Case, after
  // Dakim (M3_out #22291-#22296), and the Poké Mart's clerk, who sells the Scents only to those with a case (#15645).
  async function cologneGirl() {
    if (Player.itemCount(player, "cologne-case")) { await say(["Give your Pokémon Cologne Massages\nwith different Scents. That will make\nthem more friendly."]); return; }
    await say(["I came to this village so I could\nlearn more about becoming closer to\nPokémon.", "All I know is the Cologne Massage\nmethod for making Pokémon friendly."]);
    if (await confirm("Do you know about Cologne\nMassages?")) await say(["Yup! All Pokémon love being treated\nto Cologne Massages!"]);
    await say(["Pokémon get very happy if you\nmassage them with different kinds of\nScents.", "Actually, I have an extra Cologne\nCase with me. You can have it."]);
    Player.addItem(player, "cologne-case", 1);
    await sayWithJingle("mus_obtain_key_item", "{PLAYER} obtained the Cologne Case.");
    await say(["Put a Scent in that Cologne Case\nand give your Pokémon a massage. I'm\nsure that it will be delighted."]);
    await persist();
  }
  async function agateMart() {
    const caseIn = Player.itemCount(player, "cologne-case") > 0;
    await mart(Orre.AGATE_MART.concat(caseIn ? Orre.SCENTS : []));
    if (!caseIn) await say(["I'm terribly sorry, but I can't sell\nyou a Scent since you don't have a\nCologne Case."]);
  }

  // The Relic in the Relic Forest (west of Agate, through the Relic Cave): the Relic Stone, and, as in Colosseum, where
  // the Time Flute brings Celebi (Senilor's words: "That is all one needs to bring Celebi to the Relic Forest. Celebi
  // will surely cause darkness to flee from the hearts of any Pokémon"; Ein's report, "Celebi's Power": "If a Shadow
  // Pokémon encounters a Celebi, it recalls how its heart was before being closed, and reverts to its original form").
  // So every Shadow Pokémon with you is purified at once, however shut its heart, with the Relic's words. The flute
  // can call Celebi only once: it's gone then (orreCelebi). With no Shadow Pokémon with you, "It cannot be used now."
  async function relicForestShrine() {
    const f = player.flags;
    if ((f.orreStory | 0) === 29) { await agateShrine(); return; }
    await relicStone();
    if (f.orreCelebi || !Player.itemCount(player, "time-flute")) return;
    if (!(await confirm("Use the Time Flute?"))) return;
    const shadows = player.party.filter((r) => r.shadow);
    if (!shadows.length) { await say(["It cannot be used now."]); return; }
    Screen.say("");
    const at = Object.assign({}, player.location), CELEBI = "LOCALID_RELIC_CELEBI";
    await say(["{PLAYER} used the Time Flute."]);
    Screen.say("");
    Overworld.follower.hide(true);   // (your Pokémon back in its ball: Celebi comes where it stood)
    await Overworld.act([{ who: "player", moves: ["walk_down", "face_up"] }]);
    music(null);
    await Overworld.flash();
    Overworld.addObject(CELEBI, { x: at.x, y: at.y, facing: "down" }, { sprite: "follow/251", width: 32, height: 32, frames: 9, offsetX: -8 });
    cry("Celebi");
    await sleep(1200);
    Player.removeItem(player, "time-flute", 1);
    f.orreCelebi = true;
    for (const r of shadows) {
      await Overworld.flash();
      sfx("se_m_reflect");
      await purifyWithWords(r);
    }
    cry("Celebi");
    await Overworld.act([{ who: CELEBI, moves: ["walk_up", "set_invisible"] }]);
    Overworld.removeObject(CELEBI);
    Overworld.follower.hide(false);
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }

  // ---------- Orre: Colosseum's story, Agate Village (orreStory 28 to 31) ----------
  //
  // 28: in Eagun and Beluh's house, Rui tells her grandparents about the kidnapping and the Shadow Pokémon; a villager
  // runs in: strangers at the Relic Stone! Eagun goes after them (29). At the shrine, Cipher's Peons and Skrub (Shadow
  // Hitmontop, Lv. 38): beat them, and Eagun tells of the family's old tablet; Beluh finds it: the Relic can open the
  // last door of a heart shut by shadows (30: purifying at the Relic Stone). Then a call: crooks have taken over
  // Mt. Battle (31).
  async function eagunsHouse(script) {
    const f = player.flags, story = f.orreStory | 0;
    // (Colosseum's words: Beluh and Eagun as the story goes on.)
    if (script === "AgateVillage_EaguansHouse_EventScript_Beluh") {
      await say(story === 29 ? ["Beluh: Rui, dear! Please, go after\nhim!"]
        : story >= 33 ? ["Beluh: Ah, you're home! Are you okay?\nYou're not hurt in any way?", "Beluh: Well, thanks to you two,\nthings are back to normal at Mt.\nBattle.",
          "Beluh: They should resume training\nthere right away.", "Beluh: {PLAYER}, even if it's just\nonce, train at Mt. Battle. I'm sure\nit will make you even stronger."]
        : story >= 31 ? ["Beluh: Rui, you poor dears… No time\nto even properly rest. It hardly\nseems fair…"]
        : story >= 30 ? ["Beluh: I hope that Small Tablet is\nsomething useful to you."]
        : ["Beluh: Ah, Rui! Welcome, welcome!"]);
      return;
    }
    await say(story >= 33 ? (player.flags.orreCelebi
      ? ["Eagun: Ah, Rui! And {PLAYER}! It's\ngood to see you back!", "Eagun: It would be useful if one\ncould summon Celebi whenever one\ndesired.", "But that, of course, isn't possible.",
        "Eagun: Luckily, as it is inscribed on\nthe Small Tablet, the Relic in the\nRelic Forest is imbued with Celebi's", "power.", "Eagun: If a Shadow Pokémon is ready\nto throw open its heart's door, you\nmust visit the Relic."]
      : ["Eagun: Ah, Rui! And {PLAYER}! It's\ngood to see you back!", "Eagun: Hmhm… I see! So Vander\nconferred the Time Flute upon you.",
        "Eagun: Then, what are you waiting\nfor? Depart for the Relic Forest and\nsummon Celebi at once.", "Eagun: I wonder what will happen. I\nfind it quite exciting."])
      : story >= 31 ? ["Eagun: Mt. Battle is to the\nnortheast. You can see it in the\ndistance once you leave the village.", "Hurry, Rui!"]
      : story >= 30 ? ["Eagun: The Relic must have some\neffect on Shadow Pokémon.", "Eagun: I will leave that for you to\ndetermine for yourselves."]
      : ["Eagun: You've finally arrived. What\nheld you up?"]);
  }
  async function eagunsHouseScene() {
    if ((player.flags.orreStory | 0) !== 28) return;
    const f = player.flags, R = ORRE("EAGUN_RUI"), V = ORRE("AGATE_RUNNER"), E = ORRE("EAGUN"), B = ORRE("BELUH");
    const me = player.location;
    // (Up past the table on the left, to stand before Eagun, Rui beside you.)
    Overworld.addObject(R, { x: me.x + 2, y: me.y, facing: "up" });
    await Overworld.act([{ who: "player", moves: ["walk_up", "walk_right", "walk_up", "walk_up"] }, { who: R, moves: ["walk_up", "walk_up", "walk_up"] }]);
    // (Colosseum's words, in its order.)
    await say(["Rui: Grandpa Eagun! Grandma Beluh! I\nmissed you!"]);
    await say(["Eagun: You've finally arrived. What\nheld you up?"]);
    await say(["Beluh: Ah, Rui! Welcome, welcome!", "Beluh: We heard that you were coming,\nbut then you didn't arrive. We were\nworried about you, dear."]);
    await say(["Rui: I had just this terrible time!\nOn the way here, I was abducted by\nthese creepy people…"]);
    await say(["Eagun: But why would anyone want to\nharm Rui?"]);
    await say(["Rui: It's probably because I can see\nthese bizarre Pokémon.", "Rui: They're Shadow Pokémon. Pokémon\nthat have been turned into fighting\nmachines with hearts of darkness."]);
    await say(["Eagun: Shadow Pokémon?! What on earth\nis that?"]);
    await say(["Rui: Luckily, I was saved by\n{PLAYER}, who happened to be there by\ncoincidence."]);
    await say(["Beluh: Oh, how frightful. Thank you\nso much for saving our granddaughter."]);
    await say(["Villager: Help! There's trouble!"]);
    sfx("se_door");
    Overworld.addObject(V, { x: 3, y: 8, facing: "up" });
    await Overworld.act([{ who: V, moves: ["walk_up"] }, { who: "player", moves: ["face_down"] }, { who: R, moves: ["face_down"] }]);
    await say(["Villager: Gasp, gasp… Eagun, it's a\nserious situation! Some outsiders\nwent into the Relic Forest."]);
    await say(["Eagun: What?! Who were they?"]);
    await say(["Villager: I… I don't know… They\nshoved me aside and…"]);
    await say(["Eagun: That's enough talk! It can\nwait! I'm off!"]);
    Screen.say("");
    await Overworld.act([{ who: E, moves: ["walk_down", "walk_down", "walk_left", "walk_left", "walk_down", "walk_down", "walk_down", "set_invisible"] }]);
    sfx("se_door");
    Overworld.removeObject(E); Overworld.removeObject(V);
    await say(["Beluh: Outsiders fouling the Relic\nForest… That mustn't happen.", "Beluh: But I worry for my husband\neven more so.", "Beluh: Rui, dear! Please, go after\nhim!"]);
    Overworld.removeObject(R);
    f.orreStory = 29;
    Overworld.refreshPeople();
    await persist();
  }
  async function agateShrine() {
    const f = player.flags, S = ORRE("SKRUB"), P = ORRE("AGATE_PEON"), E = ORRE("SHRINE_EAGUN");
    const elder = window.WORLD_MAPS[player.location.map].people.find((p) => p.localId === E);
    Overworld.addObject(E, { x: elder.x, y: elder.y, facing: "right" });
    // (Colosseum's words: Eagun and his Pikachu take Skrub on first, and lose to his Shadow Pokémon.)
    await say(["Eagun: You! Who are you?! What are\nyou doing here?!"]);
    await say(["Skrub: Although you may ask why we\nare here, we simply cannot answer\nthat.", "Skrub: I can see that you are a\nsenior citizen, but I cannot allow\nyou to interfere with our affairs."]);
    await say(["Eagun: You're the ones interfering!\nShady creeps like you, I'll\npersonally run out!"]);
    await say(["Skrub: Ahahah. Now, now. Someone so\nold shouldn't overdo it."]);
    await say(["Eagun: Don't take me for a fool! I'll\nhave you know I was once hailed the\nmost powerful trainer!",
      "Eagun: That isn't all, either. I have\na comrade with whom I've been through\nthick and thin!", "Eagun: This is the first Pokémon I\ngot, and it's been with me ever\nsince!"]);
    await say(["Skrub: Ah, a creaky old Pokémon to go\nwith an ancient trainer. How fitting."]);
    await say(["Eagun: You'll rue those words!"]);
    await say(["Eagun: Okay, Pikachu! We haven't\nbattled this much in a while! Let's\nkeep focused!"]);
    await Overworld.shake(8, { x: 2, y: 0, delay: 2 });
    await say(["Eagun: Th-That Pokémon?! That's no\nordinary Pokémon!"]);
    await say(["Pikachu: Bi… Biggaah!"]);
    await say(["Rui: Grandpa! Pikachu!"]);
    await say(["Rui: Grandpa! Are you okay?!"]);
    await say(["Eagun: I'm fine. But my partner!"]);
    await say(["Skrub: Fu… Didn't I already say? An\nold man shouldn't overdo it."]);
    await say(["Rui: How dare you? You'll never get\naway with this!"]);
    await say(["Skrub: Ah… Now here's someone who may\nshow me a more enjoyable time. Very\nwell. En garde!"]);
    const shadows = Orre.shadowOf("Skrub");
    const opts = { foe: { name: "Cipher Peon Skrub", team: Orre.team("Skrub"), pic: "cipher_peon" }, double: true,
      prizeClass: "Team Rocket", noBlackout: true, snag: shadows.map((s) => s.species), defeatText: ["Matters have not gone according\nto plan…"] };
    const outcome = await storyBattle(opts);
    if (outcome !== "won") { await say(["Skrub: Fu… Didn't I already say? An\nold man shouldn't overdo it."]); Overworld.removeObject(E); return; }
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    await say(["Skrub: I had been instructed to\ncapture Celebi, then destroy the\nRelic Stone,", "but matters have not gone according\nto plan.",
      "Skrub: I shall have to immediately\ninform Dakim, who has gone to Mt.\nBattle!"]);
    Screen.say("");
    await Overworld.act([{ who: S, moves: ["walk_fast_right", "walk_fast_down", "walk_fast_down", "set_invisible"] },
      { who: P, moves: ["walk_fast_down", "walk_fast_down", "set_invisible"] }]);
    Overworld.removeObject(S); Overworld.removeObject(P);
    await Overworld.act([{ who: E, moves: ["face_right"] }]);
    await say(["Eagun: Ah, you're safe! Good, good.\nYou battled with honor.", "Eagun: If your opponent was any\nordinary Pokémon, you would have won.\nSo, that was a Shadow Pokémon…",
      "Eagun: Rui. And {PLAYER}, am I right?\nThank you for helping us.", "Eagun: We should go home for the time\nbeing."]);
    Screen.say("");
    await Overworld.fadeToBlack();
    Overworld.removeObject(E);
    f.orreStory = 30;
    Overworld.refreshPeople();
    await Overworld.fadeFromBlack();
    // (Back at the house, in Colosseum's words: the Small Tablet.)
    await say(["Beluh: You really had me worried.\nPlease don't do anything so rash and\ndangerous again."]);
    await say(["Eagun: Those crooks… They said they\nwere out to capture Celebi and\ndestroy the Relic Stone.", "Eagun: Hmmm… Why? Might there be a\nconnection between Celebi and Shadow\nPokémon?"]);
    await say(["Rui: Oh, no, that's no good. We came\nhere because we thought you would\nknow something, Grandpa."]);
    await say(["Eagun: Hmm… Sorry to disappoint you."]);
    await say(["Eagun: Oh, yes! Dear, didn't we have\na stone tablet? It had something\nabout the Relic carved into it."]);
    await say(["Beluh: Ah, yes! Yes, we did have such\na stone tablet. Now where could I\nhave put it away?", "Beluh: Let me go look for it\nupstairs. It may take time, so please\nbe patient."]);
    await say(["Beluh: Ah, Rui! Welcome home. I've\nfinally found the Small Tablet."]);
    await say(["Eagun: That is the Small Tablet that\nhas been passed down through our\nfamily over many generations.", "Examine it."]);
    await say(["There are words carved into the Small\nTablet.", "{PLAYER} read the words.", "\"In Agate's mystic Relic, Celebi's\npower shelters.",
      "A heart imprisoned by shadows\nIts last door shall be opened\nBy the power within.\""]);
    await say(["Eagun: The Relic must have some\neffect on Shadow Pokémon.", "Eagun: I will leave that for you to\ndetermine for yourselves."]);
    await persist();
    // (Duking's e-mail, Colosseum's, on the P★DA: game/orre-mail.js.)
    await receiveMail("EMERGENCY");
    await say(["Rui: Whaaat?! Those crooks are loose\non Mt. Battle now?! That's awful!", "Rui: We can't let this go on!\n{PLAYER}, let's go! …Oh, wait."]);
    await say(["Rui: Grandpa, where is Mt. Battle,\nanyway?"]);
    await say(["Eagun: Mt. Battle is to the\nnortheast. You can see it in the\ndistance once you leave the village.", "Hurry, Rui!"]);
    await say("{PLAYER} gave the P★DA number to\nEagun.");   // (M3_houseC_1F #20862: his e-mail comes later, GREETINGS)
    f.orreStory = 31;
    Orre.unlock(f, "MtBattle");
    await persist();
  }
  // ---------- Orre: Colosseum's story, Mt. Battle (orreStory 31 to 33) ----------
  //
  // 31: Mt. Battle, up the terraces past Cipher's Peons (Orre's cap up to 40; 32). At the summit Dakim has beaten Area
  // Leader Vander for his Time Flute; battle him (Shadow Entei, Lv. 40). He pulls out, sending Skrub off to "Ein's
  // lab"; Vander gives you the Time Flute (33).
  const ORRE_MTBATTLE_CAP = 40;
  async function mtBattleArrival() {
    const f = player.flags;
    // (Colosseum's words: the registration counter's attendant, who called Duking for help.)
    await say(["Attendant: No! I'm sorry, but I can't\nlet you in. It's full of thugs. It's\ndangerous.", "Attendant: Oh? You heard about us\nfrom Duking? You must be here to save\nus!",
      "Attendant: You see, it was me who\ncontacted Duking for help. I didn't\nthink you would get here so quickly.", "Attendant: But please be careful. The\npower of their Pokémon isn't normal."]);
    f.orreStory = 32;
    f.orreLevelCap = Math.max(f.orreLevelCap | 0, ORRE_MTBATTLE_CAP);
    await say("Your Pokémon can now grow up to\nLv. " + ORRE_MTBATTLE_CAP + " in Orre!");
    await persist();
  }
  async function mtBattleSummit(script) {
    const f = player.flags, story = f.orreStory | 0;
    if (script === "MtBattle_EventScript_Vander") {
      await say(story >= 33 ? ["Vander: You should come here for\ntraining, then. It will toughen you\nup much, much more.",
        "Vander: I have to warn you, though.\nIf you come up against me, I won't\nease up one bit. I'll be waiting!"]
        : ["Vander: Ow…"]);
      return;
    }
    if (story < 32) return;
    // (Colosseum's words: Dakim has just beaten Vander for the Time Flute.)
    if (!f.orreDakimMet) {
      await say(["Dakim: Fine. After all the persuading\nI did, you still won't hand it over?", "Dakim: Humph. This is what happens to\nstubborn oafs who don't do as I say!"]);
      await say(["Dakim: Daahahah! Treacherous? You\ndidn't really think that a worm like\nyou could win?",
        "Dakim: All you had to do was hand\nover the Time Flute without making a\nfuss.", "It's your own fault for getting hurt.",
        "Dakim: Since you're not cooperating,\nI don't have any choice but to haul\nyou off to Ein's Lab."]);
      await say(["Rui: Wait, wait! Where do you think\nyou're going? We can't just leave\nthis person here!"]);
      await say(["Dakim: Hm? Who are you? What were my\nunderlings doing?", "Dakim: That outfit of yours… You must\nbe the troublemaker who messed with\nSkrub in Celebi's forest!",
        "Dakim: And now you've come to mess\nwith me, the great Dakim! Don't make\nme laugh!", "Dakim: I'll pound a lesson into your\nflesh and bones, so you'll never even\nthink of bothering me again!"]);
      f.orreDakimMet = true;
    } else await say(["Dakim: Daahahah! You don't seem to\nlearn your lessons very well!", "Dakim: How many times must I tell you\nthat you will never beat me?!"]);
    const shadows = Orre.shadowOf("Dakim");
    const opts = { foe: { name: "Cipher Admin Dakim", team: Orre.team("Dakim"), pic: "black_belt" },
      prizeClass: "Leader", noBlackout: true, snag: shadows.map((s) => s.species), defeatText: ["This can't be! The mighty Dakim\nloses?"] };
    const outcome = await storyBattle(opts);
    if (outcome !== "won") { await say(["Dakim: Dahaha! You have experienced\nthe real might of the mighty Dakim!"]); return; }
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    await say(["Dakim: The way you handled those\nPokémon with your audacious skill…\nWho are you?"]);
    await say(["Skrub: Master Dakim!"]);
    await say(["Dakim: Ah, Skrub. You were hopelessly\noutclassed against him. You had zero\nchance of winning.", "Dakim: I'm pulling out for now. You\ngo to Ein's Lab and help out there."]);
    await say(["Skrub: As you wish, sir!"]);
    await say(["Dakim: This isn't over yet. Stronger\nPokémon are being made even now.", "Dakim: You'd better get serious about\ntraining your Pokémon for our next\nmeeting. Daahahah!"]);
    Screen.say("");
    const D = ORRE("DAKIM"), K = ORRE("SUMMIT_SKRUB");
    await Overworld.act([{ who: D, moves: ["walk_fast_left", "walk_fast_down", "walk_fast_down", "set_invisible"] },
      { who: K, moves: ["walk_fast_right", "walk_fast_down", "walk_fast_down", "set_invisible"] }]);
    Overworld.removeObject(D); Overworld.removeObject(K);
    await say(["Vander: Ow, that wasn't an experience\nI'd ever want to have again. I'm glad\nyou came to my rescue. Thank you!", "Vander: I'm Vander. I'm an Area\nLeader here at Mt. Battle."]);
    await say(["Rui: I'm Rui and this is {PLAYER}.\nWe're glad to see you!", "Rui explained everything that had\nhappened to Vander."]);
    await say(["Vander: Hm. What you've told me\nexplained a lot. Thanks to you, I\nknow exactly why they attacked us.",
      "Vander: This is the Time Flute. I\nhappened to find it while I was on my\ntraining trek.", "Vander: It's said that the Time Flute\nwill summon Celebi, but just once.",
      "Vander: There must be something about\nCelebi that frightens them.", "They obviously don't want Celebi to\nencounter Shadow Pokémon.", "Vander: But here, I want you to have\nthis."]);
    await say(["Rui: B-But… Are you certain? May we\nreally have something this precious?"]);
    await say(["Vander: Of course you may. I'd rather\nhave you use that Time Flute than\nhave those crooks take it by force.", "Vander: Use it, and save the Shadow\nPokémon from their sinister plans."]);
    Player.addItem(player, "time-flute", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} obtained the Time Flute!"));
    await say(["Vander: By the way, you two seem to\nhave been fighting that gang for a\nlong time.", "Vander: You should come here for\ntraining, then. It will toughen you\nup much, much more.",
      "Vander: I have to warn you, though.\nIf you come up against me, I won't\nease up one bit. I'll be waiting!"]);
    f.orreStory = 33;
    Overworld.refreshPeople();
    await persist();
    // (Colosseum's e-mail "TROUBLE IN UNDER?", on the P★DA: game/orre-mail.js.)
    await receiveMail("TROUBLE_IN_UNDER");
  }
  // ---------- Orre: Colosseum's story, The Under, Ein's lab and Realgam Tower (orreStory 33 to 44) ----------
  //
  // 33: after Mt. Battle, Duking calls: talk of a creepy Pokémon on Venus's TV show, down in The Under, under Pyrite
  // (the stairs in Pyrite's bottom-left shack). 34: in The Under (cap 45), Kloak guards Venus's studio; 35: Venus
  // (Shadow Suicune); beaten, she lets slip where Shadow Pokémon are made: Ein's lab, out in the desert (36). In the
  // lab (cap 48; 38; 37 was the Mystery Troop's, met in Phenac City now) its Peons, Tanie among them, and Ein, with
  // his Shadow Raikou, who boasts of the ultimate Shadow Pokémon made for the boss (40: Realgam Tower). At the tower
  // (cap 55; 41): Silva in disguise; Gonzap, out for revenge (Shadow Skarmory), then Nascour's welcome (42); the
  // four Admins in the domes, each with an ID Badge (realgamAdmin), the four opening the way on to the tower's
  // Colosseum (realgamDoor); Nascour there (Shadow Metagross; 43); at the top, Evice, who is Phenac's Mayor Es Cade
  // (Shadow Tyranitar). Beaten, he flees, Sherles arrests him, Ho-Oh appears, and Cipher's finished (44): Prof. Oak
  // calls.
  const ORRE_UNDER_CAP = 45, ORRE_LAB_CAP = 48, ORRE_REALGAM_CAP = 55;
  const raiseCap = async (cap) => {
    const f = player.flags;
    if ((f.orreLevelCap | 0) >= cap) return;
    f.orreLevelCap = cap;
    await say("Your Pokémon can now grow up to\nLv. " + cap + " in Orre!");
  };
  // A story battle with a Trainer's Colosseum Shadow Pokémon (Orre.SHADOW) and the rest of their team: won?
  async function bossBattle(key, name, pic, defeat, extra) {
    const f = player.flags, team = Orre.team(key, f.orreShadowSnagged), shadows = team.filter((r) => r.shadow);
    const opts = Object.assign({ foe: { name, team, pic }, prizeClass: "Leader", noBlackout: true,
      snag: shadows.map((s) => s.species), defeatText: defeat }, extra || {});
    const outcome = await storyBattle(opts);
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    return outcome === "won";
  }
  const goAway = async (key, moves) => { const who = ORRE(key); Screen.say(""); await Overworld.act([{ who, moves: (moves || ["walk_fast_down", "walk_fast_down"]).concat(["set_invisible"]) }]); Overworld.removeObject(who); };
  async function underArrival() {
    // (Colosseum's words: a resident, and the TV's Under Time with Lady Venus.)
    await say(["Resident: Welcome to The Under!", "Resident: Oh! Wait a second. It has\nbeen a long time since anyone has\ncome down here."]);
    await say(["Announcer: Hello, ladies and\ngentlemen, boys and girls! It's time\nfor The Under Time again!", "Announcer: Lady Venus, please!"]);
    await say(["Venus: Hi, everyone! It's me, your\nVenus! Everyone's Venus, that's me!", "Venus: I have something terribly\nimportant to share with you today.",
      "Venus: It's horrid. There are spies\nright here in The Under. Can you\nimagine?", "Venus: We don't really know all the\ndetails, but if you see anyone\nsuspicious, please let us know.", "Venus: Everyone, please, I'm counting\non you! We need you to get lots of\ninformation for us!"]);
    await say(["Rui: No way… They know that we came\nhere already?", "Rui: {PLAYER}, we're going to have to\nbe cautious."]);
    player.flags.orreStory = 34;
    await raiseCap(ORRE_UNDER_CAP);
    await persist();
  }
  // (Colosseum's words: Kloak's, M4_out #22033, #22036 and #22044; then Cipher Peon Dagur, who says Colosseum's
  // #22015 and #22029, battles too, with Colosseum's party. player.flags.orreKloak: Kloak beaten, Dagur still to go.)
  async function underKloak() {
    const f = player.flags;
    if (!f.orreKloak) {
      await say(["Kloak: Who might you be? If you're\ntourists, you're getting in our way.\nGo on, scram.",
        "Kloak: Hold on, you two! You're not\nfrom around these parts, are you,\nnow?", "Kloak: I get it! You came to rescue\nyour pal here! You two are spies,\ntoo!"]);
      if (!(await bossBattle("Kloak", "Cipher Peon Kloak", "cipher_peon_f", ["We're out of our league against\nthis guy!"], { prizeClass: "Team Rocket" }))) return;
      f.orreKloak = true;
      await persist();
    }
    await say(["Dagur: Don't be too hasty about\nrelaxing! I'm up next!"]);
    const outcome = await storyBattle({ foe: { name: "Cipher Peon Dagur", team: [["Ariados", 38], ["Gloom", 39], ["Illumise", 40]].map(([sp, lv]) => Party.create(sp, lv)),
      pic: "cipher_peon" }, double: true, prizeClass: "Team Rocket", noBlackout: true, defeatText: ["We're out of our league against\nthis guy!"] });
    if (outcome !== "won") return;
    await goAway("KLOAK", ["walk_fast_right", "walk_fast_down", "walk_fast_down"]);
    delete f.orreKloak;
    f.orreStory = 35;
    await persist();
  }
  async function underVenus() {
    // (Colosseum's words; a second try, its words for that.)
    const f = player.flags;
    if (!f.orreVenusMet) {
      await say(["Venus: You two… You're holding up the\nfilm shoot. We're about to begin\nfilming. …Wait, who are you?"]);
      await say(["Venus: Aak! I recognize those faces!", "Venus: Those faces were on the\nblacklist from Headquarters! How did\nyou find us?!", "Venus: But that's not important now!",
        "Venus: I'll squash you myself and\ncollect a reward from Master Nascour!"]);
      f.orreVenusMet = true;
    } else await say(["Venus: Now what is it? Why do you\nkeep on trying to mess up our plans?", "Venus: If that's what you want, I'll\nput our battle on the air live!\nEveryone will see you losing to me!"]);
    if (!(await bossBattle("Venus", "Cipher Admin Venus", "beauty", ["Aiyeeeeh! How dare you!"]))) {
      await say(["Venus: Ohohoho! It serves you right!"]); return;
    }
    await say(["Venus: Aiyeeeeh! How dare you! How\ncould I get bested by a mere boy?", "Venus: Remember this! I'll get you\nback for this!"]);
    await say(["Venus: Before that horrible boy can\nmeddle anymore, I'll link up with Ein\nat the Shadow Pokémon Lab!"]);
    // (Out of the set and off to the station's elevator, which she takes down to the Under Subway and locks behind
    // her, as in Colosseum: you follow down the stairway. Then the Shadow Liner to Ein's lab: subway*. The lab's on
    // Orre's map only once you've been there: orreTravel.)
    await goAway("VENUS", ["walk_fast_right", "walk_fast_down", "walk_fast_down", "walk_fast_down", "walk_fast_down"].concat(
      Array(5).fill("walk_fast_right"), Array(6).fill("walk_fast_up")));
    sfx("se_door");
    player.flags.orreStory = 36;
    await persist();
  }

  // ---------- The Under's Kids Grid and the Under Subway (Colosseum's: M4_junk_1F, M4_junk_B1, M4_out, M4_labo_B1,
  // M4_subway_B1, M4_subway_B3, M4_train_1F) ----------
  //
  // In The Under (34) Perr, in the Junk Shop's basement, asks you to take the Powerup Part to Nett (orreKidsGrid 1);
  // Bitt, waiting outside Nett's house (the one with the big rotating antenna dish), takes you in (2); downstairs Nett
  // gets the Kids Grid back up, and Megg takes your P★DA number (3): then Kloak and Dagur come out to guard Venus's
  // studio. Beaten (36), Venus takes the TV station's elevator down to the Under Subway and locks it behind her; you
  // follow down its long stairway (open from then on) past the subway's Trainers to the Shadow Liner's station, where
  // she gets away with its key (orreSubway 1); Ein comes for her on B1, and there on the ground is the Subway Key (2).
  // With it, the Shadow Liner takes you to Ein's lab (orreSubwayRidden), any time; the elevator works again, and the
  // door from B1 to The Under's colosseum can be unlocked (orreUnderDoor): subwayEnter, subwayElevator.
  async function junkShopOwner() {
    await say(player.flags.orreSubwayRidden ? ["Oh? You've ridden that Subway?", "Now that brings back memories… I\ndidn't know it was still running.\nWhy, I often drove it in my youth.",
      "Track all clear! All aboard!"] : ["It appears my grandchild\nrecently joined something called the\nKids Grid.", "Since then, I get this feeling\nthat parts have been slowly\ndisappearing from the shop…"]);
  }
  async function junkShopPerr() {
    const f = player.flags, step = f.orreKidsGrid | 0;
    if (step >= 3) {
      await say(f.orrePerrThanked ? ["Perr: Cipher are those outrageous\ncrooks who are trying to take over", "the world using Shadow Pokémon,\nright?",
        "Perr: {PLAYER} and Rui, you're taking\nthose people on, huh? That's\nmind-blowing."]
        : ["Perr: Hi, I'm sorry I asked you for\nthat favor without explaining\nanything before.", "Perr: Thanks to you, the Kids Grid is\nback in operation. Thanks, {PLAYER}.",
          "Perr: I'll do what I can to gather\nintelligence for you."]);
      f.orrePerrThanked = true;
      await persist();
      return;
    }
    if (step >= 1) { await say(["Perr: Nett's house is the one with\nthe big, rotating antenna dish.", "You'll know which one it is as soon\nas you see it."]); return; }
    if ((f.orreStory | 0) < 34) { await say(["Oh, sheesh, what should I do… I\nhave to make a delivery, but I'm\nstill not done cleaning…"]); return; }
    await say(["Oh, sheesh, what should I do… I\nhave to make a delivery, but I'm\nstill not done cleaning…"]);
    await say(["Perr: Hey, wait! Wow! Aren't you\n{PLAYER} and Rui?"]);
    await say(["Rui: Huh? How do you know who we are?"]);
    await say(["Perr: I thought so! This makes things\neasy. Please, can I get you to\ndeliver this part to Nett's house?"]);
    await say(["Rui: But… Wait…"]);
    await say(["Perr: Just tell Nett that it's from\nPerr. He'll tell you the details.", "Perr: Nett's house is the one with\nthe big, rotating antenna dish.",
      "You'll know which one it is as soon\nas you see it."]);
    Player.addItem(player, "powerup-part", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} obtained the Powerup Part."));
    f.orreKidsGrid = 1;
    await persist();
  }
  // Bitt, outside Nett's house: waiting for the part; with it, in he goes, and you after him.
  async function underBitt() {
    const f = player.flags;
    if ((f.orreKidsGrid | 0) < 1 || !Player.itemCount(player, "powerup-part")) { await say(["Bitt: What's the holdup? It should be\nhere by now…"]); return; }
    await say(["Bitt: You brought me the Powerup Part\nfrom Perr? Great! I was waiting for\nthat!", "Bitt: Huh? Are you… Are you \"the\"\n{PLAYER} and Rui?",
      "Bitt: Oh, wow, this is too awesome!\nCome on, you have to get inside.\nQuick, quick!"]);
    await goAway("UNDER_BITT", ["walk_up"]);
    sfx("se_door");
    f.orreKidsGrid = 2;
    Overworld.refreshPeople();
    await persist();
  }
  // Nett's door, before Bitt's taken you in: he stops you (or, with the part, takes you in).
  const nettsDoorShut = () => (player.flags.orreStory | 0) >= 34 && (player.flags.orreKidsGrid | 0) < 2;
  async function nettsDoor() {
    const door = window.WORLD_MAPS.TheUnder.warps.find((w) => w.map === "TheUnder_NettsHideout_1F");
    player.location = { map: "TheUnder", x: door.x, y: door.y + 1, facing: "right" };
    await Overworld.teleport(player.location);
    await underBitt();
    if ((player.flags.orreKidsGrid | 0) < 2) return;
    const inside = window.WORLD_MAPS.TheUnder_NettsHideout_1F.warps[0];
    player.location = { map: "TheUnder_NettsHideout_1F", x: inside.x, y: inside.y - 1, facing: "up" };
    await Overworld.teleport(player.location);
  }
  // Downstairs at Nett's: the Powerup Part handed over, the first time; then Nett, Megg and Bitt as the story goes on.
  async function nettsHideout() {
    const f = player.flags;
    if ((f.orreKidsGrid | 0) !== 2) return;
    await say(["Bitt: Megg! Nett! You won't believe\nwho just dropped in for a visit!\nWe've got some shocking company!"]);
    await say(["Megg: Shocking company?"]);
    await say(["Bitt: Try not to be too shocked when\nyou hear it! It's {PLAYER} and Rui!"]);
    await say(["Megg: No! Really?!"]);
    await say(["Nett: Bitt, is that true? Is that\n{PLAYER} really here?!"]);
    await say(["Bitt: Heheh. See for yourself."]);
    await say(["Nett: Hi, I'm Nett! Secc in Pyrite\nhas told me about what you've been\ndoing so far."]);
    Player.removeItem(player, "powerup-part", 1);
    await say(["{PLAYER} handed the Powerup Part to\nNett."]);
    await say(["Nett: Oh, this is from Perr. Great,\nthis is all that I needed to get the\nKids Grid back up and running again.",
      "Nett: I better explain. A little\nwhile ago, we somehow lost access to\nthe Kids Grid.", "Nett: We think it's caused by a\njamming signal that's interfering",
      "with the Kids Grid. It's probably\nVenus's doing.", "Nett: But this Powerup Part you\ndelivered will let me boost up our\nequipment.",
      "Nett: When we get the Kids Grid back\nup, I'll try to hack their computers\nfor useful data."]);
    await say(["Megg: This is like a dream come true!\n{PLAYER}, Rui, I'm so glad to meet\nyou. I'm Megg!", "Megg: The Kids Grid is bringing\ntogether kids from faraway towns.",
      "Megg: My big brother Nett managed to\nget a little bit of data out of\nCipher's computers.", "Megg: The data says there is a Lab\nsomewhere that makes Shadow Pokémon."]);
    await say(["Megg: Oh, {PLAYER}, wait, please.", "Megg: May I have your P★DA number?\nWe'll contact you just as soon as we\ndiscover anything."]);
    await say(["{PLAYER} gave the P★DA number to\nMegg."]);
    await say(["Megg: Thank you! We'll do our best to\ngather useful information for you."]);
    f.orreKidsGrid = 3;
    Overworld.refreshPeople();
    await persist();
  }
  async function nettsHideoutPerson(script) {
    const f = player.flags, story = f.orreStory | 0;
    if (/Megg$/.test(script)) {
      await say(story >= 40 ? ["Megg: I'm so glad! That's my hero!\nYou're so inspiring!"] : story >= 38 ? ["Megg: Oh, {PLAYER}! Did you go to the\nLab? Are both of you okay?"]
        : story >= 36 ? ["Megg: Oh, {PLAYER}! Everyone in town\nis saying that you beat that Venus!\nIt's the talk of the town!", "Megg: That's so amazing! I'm in awe!"]
        : ["Megg: Thank you! We'll do our best to\ngather useful information for you."]);
      return;
    }
    if (/Bitt$/.test(script)) {
      await say(f.orreDataRom ? ["Bitt: Nett is a genius. He's been\ngathering all sorts of data on those\ncrooks."]
        : ["Bitt: {PLAYER}, you two are, like,\ntotally famous on the Kids Grid.", "Bitt: Every kid in The Under knows\nthat you're the hero who's taking on\nCipher."]);
      return;
    }
    // Nett: the Data ROM from Ein's desk, if you've brought it (Colosseum's: then he e-mails what he finds).
    if (Player.itemCount(player, "data-rom")) {
      await say(["Nett: Oh, {PLAYER}. How did it go?\nDid you find any data?"]);
      Player.removeItem(player, "data-rom", 1);
      await say(["{PLAYER} handed the Data Rom to Nett."]);
      await say(["Nett: Oh, now this looks interesting!\nLet's scope it out right away!", "Nett: Oh, hey! This Data Rom appears\nto contain a list of Shadow Pokémon\nthat have been made so far!",
        "Nett: Awww, but no! It looks like\nthey've wiped the data.", "Nett: {PLAYER}. Please leave this\nwith me."]);
      await say(["Bitt: {PLAYER}, you two are, like,\ntotally famous on the Kids Grid.", "Bitt: Every kid in The Under knows\nthat you're the hero who's taking on\nCipher."]);
      await say(["Nett: I'll somehow try retrieving\ninformation from this Data Rom, even", "if it means going over it little by\nlittle.",
        "Nett: {PLAYER}, as soon as I discover\nanything, I'll e-mail your P★DA."]);
      await say(["Bitt: Nett is a genius. He's been\ngathering all sorts of data on those\ncrooks."]);
      f.orreDataRom = true;
      await persist();
      return;
    }
    if (f.orreDataRom) { await say(["Nett: Like I wrote in my e-mail,\nyou'll be getting information from\nall sorts of people from now on."]); return; }
    if (story >= 38) { await say(["Nett: Oh, {PLAYER}. How did it go?\nDid you find any data?"]); return; }
    if (story >= 36) {
      await say(f.orreNettLab ? ["Nett: Oh, you can tell me. You're\ngoing to the Lab, aren't you?"] : ["Nett: Oh, {PLAYER}. Thanks to you, we\ngot the Kids Grid back up and\nrunning. Honestly, thank you.",
        "Nett: Huh? The Subway goes out to the\nShadow Pokémon Lab? So, that's how\nthey did it!", "Nett: {PLAYER}, you're going to go\nout to the Lab, aren't you?"]);
      await say(["Nett: For sure, the Lab will have\nimportant data on Shadow Pokémon.", "Nett: It doesn't matter what it is;\nif you find any sort of data, please\nbe sure to bring it back here."]);
      f.orreNettLab = true;
      await persist();
      return;
    }
    await say(["Nett: {PLAYER}! I'll alert you\nimmediately if I hear anything new."]);
  }
  // The way down to the Under Subway, as in Colosseum: from Venus's TV station, down its long stairway (shut till Venus
  // runs down it, 36: M4_out #15275) or in its elevator (out of order, #15280, till the Subway Key's been found: then a
  // short cut between the station and the subway's B1); and the door between B1 and The Under's colosseum, locked from
  // B1's side till you open it there (M4_subway_B1 #21888, #21889; from the colosseum, #15283: orreUnderDoor).
  const SUBWAY = { door: { x: 4, y: 4 }, coloDoor: { x: 3, y: 6 }, stairs: { x: 1, y: 3 }, liftB1: { x: 8, y: 24 }, liftStudio: { x: 12, y: 2 } };
  const standingAt = (map, p) => player.location.map === map && player.location.x === p.x && player.location.y === p.y;
  const subwayStairsShut = () => (player.flags.orreStory | 0) < 36;
  // (A story event due on arriving: the stairway shut, the door's either side while locked, Ein on B1.)
  function subwayDue(script) {
    const f = player.flags;
    if (script === "enter:TheUnder_Subway_B1") {
      if (standingAt("TheUnder_Subway_B1", SUBWAY.door)) return !f.orreUnderDoor;
      return subwayStairsShut() || (f.orreSubway | 0) === 1;
    }
    return script === "enter:TheUnder_DeepColosseum" && standingAt("TheUnder_DeepColosseum", SUBWAY.coloDoor) && !f.orreUnderDoor;
  }
  async function subwayEnter(script) {
    const f = player.flags, go = async (map, p, facing) => { player.location = { map, x: p.x, y: p.y, facing }; await Overworld.teleport(player.location); };
    if (script === "enter:TheUnder_DeepColosseum") {
      // (Through the door from B1, the lock on B1's side.)
      if (!standingAt("TheUnder_DeepColosseum", SUBWAY.coloDoor) || f.orreUnderDoor) return;
      if (!(await confirm("It's locked from this side.\nUnlock the door?"))) { await go("TheUnder_Subway_B1", { x: SUBWAY.door.x + 1, y: SUBWAY.door.y }, "left"); return; }
      await say([fill("{PLAYER} unlocked the door.")]);
      f.orreUnderDoor = true;
      await persist();
      return;
    }
    if (standingAt("TheUnder_Subway_B1", SUBWAY.door)) {
      if (f.orreUnderDoor) return;
      await say(["It doesn't appear to open from this\nside."]);
      await go("TheUnder_DeepColosseum", { x: SUBWAY.coloDoor.x, y: SUBWAY.coloDoor.y + 1 }, "down");
      return;
    }
    if (subwayStairsShut()) {
      await say(["The door is locked."]);
      await go("TheUnder_Studio", SUBWAY.stairs, "down");
      return;
    }
    await subwayB1();
  }
  // The TV station's elevator, and its other end on B1.
  async function subwayElevator(script) {
    if ((player.flags.orreSubway | 0) < 2) { await say(["It doesn't appear as if it will work\nright now."]); return; }
    const down = /Studio/.test(script);
    if (!(await confirm(down ? "Take the elevator down?" : "Take the elevator up?"))) return;
    Screen.say("");
    sfx("se_door");
    await Overworld.fadeToBlack();
    player.location = down ? { map: "TheUnder_Subway_B1", x: SUBWAY.liftB1.x, y: SUBWAY.liftB1.y, facing: "up" }
      : { map: "TheUnder_Studio", x: SUBWAY.liftStudio.x, y: SUBWAY.liftStudio.y, facing: "down" };
    await Overworld.teleport(player.location);
  }
  // The station: Venus, with the Shadow Liner's key, the first time.
  async function subwayStation() {
    const f = player.flags;
    if ((f.orreStory | 0) !== 36 || f.orreSubway) return;
    const V = ORRE("STATION_VENUS");
    Overworld.addObject(V, { x: 6, y: 4, facing: "up" });
    await say(["Venus: Before that horrible boy can\nmeddle anymore, I'll link up with Ein\nat the Shadow Pokémon Lab!"]);
    sfx("se_pin");
    await Overworld.act([{ who: V, moves: ["face_down", "emote_exclamation_mark"] }]);
    await say(["Venus: Eek! Eek! Oh, why did you have\nto chase me here?! It's so unfair!", "Venus: …Tch. This isn't good. I can't\nlead them to the Lab…"]);
    await say(["Venus: Ohohoho! You are so easy to\ndupe!", "Venus: See? The Key for the Shadow\nLiner is right here.", "Venus: You didn't think I would\nreally let you take our train? Beh!",
      "Venus: Bye-bye, and this time I mean\nit! Don't you dare forget about me!"]);
    Screen.say("");
    const me = player.location, side = me.x <= 6 ? 1 : -1;
    const path = [side > 0 ? "walk_fast_right" : "walk_fast_left"].concat(Array(Math.max(1, me.y - 4)).fill("walk_fast_down"), ["set_invisible"]);
    await Overworld.act([{ who: V, moves: path }]);
    Overworld.removeObject(V);
    f.orreSubway = 1;
    await persist();
  }
  // Back on B1: Ein comes for Venus, and the Subway Key's dropped where they stood.
  async function subwayB1() {
    const f = player.flags;
    if ((f.orreSubway | 0) !== 1) return;
    const E = ORRE("SUBWAY_EIN"), V = ORRE("SUBWAY_VENUS");
    Overworld.addObject(E, { x: 6, y: 21, facing: "down" }); Overworld.addObject(V, { x: 7, y: 21, facing: "left" });
    await say(["Ein: Come. Back to the Lab."]);
    await say(["Venus: Yes, sir!"]);
    Screen.say("");
    await Overworld.act([{ who: E, moves: ["walk_fast_down", "walk_fast_down", "walk_fast_down", "walk_fast_down", "set_invisible"] },
      { who: V, moves: ["walk_fast_down", "walk_fast_down", "walk_fast_down", "walk_fast_down", "set_invisible"] }]);
    Overworld.removeObject(E); Overworld.removeObject(V);
    Player.addItem(player, "subway-key", 1);
    await say(["Look! It's the Subway Key on the\nground!"]);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} obtained the Subway Key."));
    f.orreSubway = 2;
    await persist();
  }
  async function subwayFan() {
    const story = player.flags.orreStory | 0;
    await say(story >= 38 ? ["I've been waiting for Lady Venus\nhere ever since. Am I being too\npatient?"]
      : ["A little while ago, I saw Lady\nVenus running down the hallway. She\nmust be one busy lady.", "So, I've decided I'll just have\nto be patient and wait for Lady Venus\nto come by right here."]);
  }
  // The Shadow Liner: with the Subway Key, out to the Shadow Pokémon Lab.
  async function shadowLiner() {
    const f = player.flags;
    if (!Player.itemCount(player, "subway-key")) { await say(["The Key is missing! The train can't\nbe moved.", "It appears as if this train was used\nfor transporting Shadow Pokémon."]); return; }
    await say(["It appears as if this train was used\nfor transporting Shadow Pokémon."]);
    if (!(await confirm("Ride the Shadow Liner?"))) return;
    await say([fill("{PLAYER} inserted the Subway Key and\nturned it.")]);
    Screen.say("");
    await Overworld.fadeToBlack();
    sfx("se_truck_move");
    await sleep(900);
    f.orreSubwayRidden = true;
    const arrive = (Orre.PLACES.find((p) => p.map === "ShadowLab_1F") || {}).arrive || { x: 7, y: 8, facing: "up" };
    player.location = { map: "ShadowLab_1F", x: arrive.x, y: arrive.y, facing: arrive.facing || "up" };
    await Overworld.teleport(player.location);
    await persist();
    if ((f.orreStory | 0) === 36) await labArrival();
  }
  // (Colosseum's words from here on, the lab's and Realgam Tower's: D1_labo_B3, D4_tower_1F_1, D4_tower_2F,
  // D4_dome_*, D4_casino_colo. The Mystery Troop's met in Phenac City now, as in Colosseum, not in the lab.)
  async function labArrival() {
    // (Colosseum's words in the garage: Rui checks the cargo, D1_garage_1F #21065. Then its keys: labObject, labDoor.)
    await say(["Rui: {PLAYER}. I'm going to check the\ncargo here.", "Rui: {PLAYER}, can you check the\nback, please?"]);
    Orre.LAB.dna(player.flags);
    player.flags.orreStory = 38;
    await raiseCap(ORRE_LAB_CAP);
    await persist();
  }
  // (An older save at 37 was to meet the Mystery Troop on B1F: on to Ein.)
  async function labTroop() {
    if ((player.flags.orreStory | 0) === 37) { player.flags.orreStory = 38; await persist(); }
  }
  // The lab's things (game/orre-lab.js): a DNA Sample, the DNA analyzer, the shutter switch, and after Ein his Data
  // ROM and TM26. (Colosseum's words: D1_labo_B1, D1_labo_1F, D1_labo_B3; the counts and "Take it?", our own.)
  async function labObject(script) {
    const f = player.flags, lab = Orre.LAB, dna = lab.dna(f);
    const spot = lab.DNA_SPOTS.find((s) => s.script === script);
    if (spot) {
      dna.got.push(spot.i);
      Player.addItem(player, "dna-sample");
      Overworld.refreshPeople();
      await sayWithJingle("mus_obtain_key_item", "{PLAYER} found a DNA Sample!");
      await persist();
      return;
    }
    if (script === "ShadowLab_EventScript_Analyzer") {
      await say("It's a DNA analyzer!");
      if (dna.done || (f.orreStory | 0) >= 40) return;
      if (dna.got.length < 3) { await say("(DNA Samples: " + dna.got.length + " of 3)"); return; }
      for (const i of dna.got) await say("This DNA Sample was that of\n" + lab.DNA_SPOTS[i].species + ".");
      Player.removeItem(player, "dna-sample", Player.itemCount(player, "dna-sample"));
      dna.done = true;
      sfx("se_door");
      await say("The door's lock was released!");
      await persist();
      return;
    }
    if (script === "ShadowLab_EventScript_Shutter") {
      if (f.orreLabShutter) return;
      if (!(await confirm("Here's the shutter switch! Press it?"))) return;
      f.orreLabShutter = true;
      sfx("se_click");
      await say("{PLAYER} pressed the switch.");
      await persist();
      return;
    }
    if (script === "ShadowLab_EventScript_DataROM") {
      await say("It's a Data ROM.");
      if (!(await confirm("Take it?"))) { await say(["Rui: Are you sure, {PLAYER}? It may\nbe something important. Don't you\nthink we should take it?"]); return; }
      f.orreLabDataROM = true;
      Player.addItem(player, "data-rom");
      Overworld.refreshPeople();
      await sayWithJingle("mus_obtain_key_item", "{PLAYER} obtained the Data ROM.");
      await persist();
      return;
    }
    if (script === "ShadowLab_EventScript_TM26") {
      f.orreLabTM26 = true;
      Player.addItem(player, "tm26");
      Overworld.refreshPeople();
      await sayWithJingle("mus_obtain_item", "{PLAYER} found " + Bag.name("tm26") + "!");
      await persist();
    }
  }
  // Into a room behind one of the lab's locked doors (Orre.LAB.DOORS): with its key, used (Colosseum's words for the
  // Card Key's, D1_labo_1F #21085; the Down St. Key's alike); without, Colosseum's words for the door, and back out.
  const labDoorShut = (script) => Orre.LAB.doorShut(script, player.flags);
  async function labDoor(script) {
    if (!labDoorShut(script)) return;
    const d = Orre.LAB.DOORS[script], f = player.flags;
    if (d.key && Player.itemCount(player, d.key) > 0) {
      f[d.flag] = true;
      await say("{PLAYER} used the " + Bag.name(d.key) + ".");
      await persist();
      return;
    }
    await say(d.key ? "The " + Bag.name(d.key) + " is needed to open\nthis door." : "The door is locked.");
    Screen.say("");
    player.location = Object.assign({}, d.back);
    await Overworld.teleport(player.location);
  }
  async function labEin() {
    await say(["Ein: Waah! How did you get in without\nmy notice?", "Ein: Ah, I see. You must be the\nmuch-talked-about {PLAYER}. Little\ndid I expect to see you here.",
      "Ein: I am Ein. I am in charge of this\nShadow Pokémon Lab.", "Ein: No one must be allowed to\ninterfere with our Shadow Pokémon\nplan. I won't allow it.",
      "Ein: Let me acquaint you with the\npower of my Shadow Pokémon!"]);
    if (!(await bossBattle("Ein", "Cipher Admin Ein", "scientist", ["This power… It… It defies\nbelief!"]))) {
      await say(["Ein: Wahaha! You impress me with your\nguts! Such fortitude!", "Ein: But guts alone will not let you\nwin battles!"]); return;
    }
    await say(["Ein: Humph! Your struggle to get here\nwas all in vain!", "Ein: The Shadow Pokémon we produced\nhave already been moved elsewhere.",
      "Ein: And that, of course, includes\nthe ultimate Shadow Pokémon I created\nfor the boss! Wahahahah!"]);
    await goAway("EIN", ["walk_fast_left", "walk_fast_down", "walk_fast_down"]);
    player.flags.orreStory = 40;
    Orre.unlock(player.flags, "RealgamTower_1F");
    await say("Realgam Tower was marked on\nthe Orre Map!");
    await persist();
  }
  async function realgamArrival() {
    // (Before the tower opens it's Colosseum's Construction Lot: its way in shut (D4_out #21585).)
    if ((player.flags.orreStory | 0) < 40) {
      await say(["Worker: Whoa, hold it there. This is\na construction site. It's not a safe\nplace to be."]);
      Screen.say("");
      player.location = { map: "RealgamTower_Exterior", x: 19, y: 25, facing: "down" };
      await Overworld.teleport(player.location);
      return;
    }
    // (Silva, in disguise in the tower's lobby.)
    await say(["???: Sssh. {PLAYER}, it's me, Silva.", "Silva: I snuck in here under\ndisguise. I surprised you, huh?", "Silva: That's not important, though.\nThe word is that Cipher's boss is\nwaiting for the both of you at the",
      "top of the Tower.", "Silva: And, he's supposed to have the\nultimate Shadow Pokémon!", "Silva: {PLAYER}, Rui! Good luck, and\nplease be careful always!"]);
    player.flags.orreStory = 41;
    await raiseCap(ORRE_REALGAM_CAP);
    await persist();
  }
  async function realgamGonzap() {
    const f = player.flags;
    if (!f.orreGonzapMet) {
      await say(["Gonzap: Gwaahahah! Long time no see,\neh, {PLAYER}?", "Gonzap: You're not gonna break my\nheart and tell me you've forgotten my\nface, are you now?"]);
      await say(["Rui: That face! It can't be… Team\nSnagem? But why here?"]);
      await say(["Gonzap: Even if you don't want to\nbelieve it, you're absolutely right,\nlittle lady!", "Gonzap: I'm Gonzap, the boss of Team\nSnagem. And don't you forget it!", "Gonzap: Did you ask what I'm doing\nhere?"]);
      await say(["Rui: Yes. Isn't this Cipher's\nHeadquarters? Team Snagem shouldn't\nhave anything to do with this."]);
      await say(["Gonzap: Uhehe. Well, surprise,\nsurprise. We do have a lot to do with\nthis, missy.", "Gonzap: We were just thieves before\nwe got hold of the Snag Machines. And\nwhere did we get them? From Cipher.",
        "Gonzap: What they wanted was this: Go\nSnag superior-grade Pokémon from\ntrainers everywhere!"]);
      await say(["Rui: What?! So this is all one big\nplot hatched by Cipher?"]);
      await say(["Gonzap: That's what I'm saying.\nAren't you the brainy one, missy.", "Gonzap: Master Nascour's waiting for\nyou upstairs, but you've got me to\ndeal with first."]);
      f.orreGonzapMet = true;
    }
    await say(["Gonzap: We've got a little score to\nsettle here. It's time you paid up\nfor wrecking our Hideout and wiping", "out Team Snagem!", "Gonzap: Don't get any ideas about\nbeating me! Gwaahahah!"]);
    if (!(await bossBattle("Gonzap", "Snagem Head Gonzap", "biker", ["You've grown a lot better,\n{PLAYER}."]))) {
      await say(["Gonzap: Gwaahahah! Well, aren't you\nthe pushover, {PLAYER}!", "Gonzap: I tell you, it makes me sad\nto think my organization got trashed\nby someone so wimpy.",
        "Gonzap: Come on, boy! I'll be happy\nto lay a licking on you as often as\nyou want!"]); return;
    }
    // (Colosseum's own question, #21721, and its Yes / No.)
    await say(["Gonzap: What do you say, {PLAYER}?\nWhy don't you and me team up again?\nJust like old times."]);
    await say((await confirm("Gonzap: You, me, and the Snag\nMachine… We can do whatever we\nplease. The world will be ours, hey?")) ? ["Gonzap: Humph. I can tell when you're\njust joshing me. But that doesn't\nmatter anymore."]
      : ["Gonzap: Humph. I figured you'd say\nthat. But that doesn't matter\nanymore."]);
    await say(["Gonzap: There's no going back for you\nnow. Get going."]);
    await goAway("GONZAP", ["walk_fast_left", "walk_fast_down", "walk_fast_down", "walk_fast_down"]);
    // (Nascour, over the tower's speakers: Colosseum's words on its 2F.)
    await say(["???: Ah, you've finally reached me. I\nmust say that I am impressed.", "???: {PLAYER} and Rui, I welcome you\nto the Realgam Tower.", "???: My name is Nascour. Do you\nremember? The time that we met in\nPhenac City?",
      "Nascour: I did have the feeling that\nI would one day face you in battle…", "Nascour: But I never imagined that\nyou would be the one to seek me out\nhere.",
      "Nascour: Very soon, we will be ready\nto greet your arrival in style.", "Nascour: I will go ahead and wait for\nyou. Don't keep me waiting too long."]);
    f.orreStory = 42;
    Overworld.refreshPeople();
    await persist();
  }
  // The four Admins in the tower's domes (Orre.REALGAM_ADMINS), each with an ID Badge for the door to the tower's
  // Colosseum; battling again while their Shadow Pokémon's still theirs.
  async function realgamAdmin(script) {
    const f = player.flags, a = Orre.realgamAdmin(script), beaten = a.beaten(f);
    await say(beaten ? a.again : a.intro);
    if (!(await bossBattle(a.key, a.name, a.pic, a.defeat))) { await say(a.lost); return; }
    if (!beaten) {
      await say(a.won);
      (f.orreRealgamAdmins = f.orreRealgamAdmins || []).push(a.trainer);
      await sayWithJingle("mus_obtain_key_item", a.badge);
      await say(a.after);
    }
    if (a.done(f)) await goAway(a.id.replace("LOCALID_ORRE_", ""), ["walk_fast_down", "walk_fast_down"]);
    await persist();
  }
  // Into the tower's Colosseum without all four ID Badges: the door's slots, and back.
  const realgamDoorShut = () => (player.flags.orreStory | 0) === 42 && !Orre.realgamBadges(player.flags);
  async function realgamDoor() {
    if (!realgamDoorShut()) return;
    await say(["There are small red and green slots\nin the wall.", "There are small blue and yellow slots\nin the wall."]);
    Screen.say("");
    player.location = { map: "RealgamTower_Dome", x: 6, y: 3, facing: "down" };
    await Overworld.teleport(player.location);
  }
  // A round of Realgam Tower's Colosseum (Orre.REALGAM_ROUNDS): a Trainer's words, their party (their Shadow Pokémon
  // to be snagged, or what's in its place once it has been), won?
  async function realgamRound(script, words) {
    const f = player.flags, d = Orre.SHADOW_TRAINERS[script];
    await say(words || d.intro);
    const team = Orre.realgamRoundTeam(d.trainer, f.orreShadowSnagged), shadows = team.filter((r) => r.shadow).map((r) => r.species);
    const opts = { foe: { name: d.name, team, pic: d.pic }, prizeClass: d.cls, noBlackout: true, snag: shadows, defeatText: d.defeat || d.kept };
    const outcome = await storyBattle(opts);
    const snagged = (opts.snagged || []).filter((sp) => shadows.includes(sp));
    if (snagged.length) {
      (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...snagged);
      const done = (f.orreShadowDone = f.orreShadowDone || []);
      if (!done.includes(script)) done.push(script);
    }
    await persist();
    return outcome === "won";
  }
  const realgamHeal = async () => { player.party.forEach(Party.heal); await say("Your Pokémon were restored to\nfull health."); };
  // Realgam Tower's Colosseum (orreStory 42), as in Colosseum: Nascour's words (D4_casino_colo #21722), then four
  // rounds before the crowd, Jomas, Delan, Nella and Ston (orreRealgamRound: those won; lose one and it's back to the
  // first), then, healed, Nascour himself (#21725).
  async function realgamNascour() {
    const f = player.flags;
    if (!f.orreNascourMet) {
      await say(["Nascour: What kept you, {PLAYER}? I\nworried that perhaps Gonzap had\nbeaten you.", "Nascour: The time has come for you to\npay off some debts.",
        "Nascour: We'll have you battle as\npayment towards the huge losses you\ninflicted on us.", "Nascour: I expect to see spectacular\nbattling out of you. After all,\nyou're here to entertain! Waahahahah!"]);
      f.orreNascourMet = true;
    }
    while ((f.orreRealgamRound | 0) < Orre.REALGAM_ROUNDS.length) {
      if (!(await realgamRound(Orre.REALGAM_ROUNDS[f.orreRealgamRound | 0]))) {
        f.orreRealgamRound = 0;
        await say(["Nascour: I expect to see spectacular\nbattling out of you. After all,\nyou're here to entertain! Waahahahah!"]);
        await persist(); return;
      }
      f.orreRealgamRound = (f.orreRealgamRound | 0) + 1;
      await persist();
    }
    await realgamHeal();
    await say(f.orreNascourBravo ? ["Nascour: I will destroy you in battle\nright now. You will know the", "humiliation of total domination\nbefore this crowd!"]
      : ["Nascour: Bravo! Bravo! Well done!", "Nascour: Why not become a Cipher\nshow-battle trainer? Would you even\nconsider it?", "Nascour: I'll vouch that you will\nbecome a top star in no time.",
        "Nascour: …I wouldn't have minded\nmaking that proposition, but I'm\nafraid I'm not that bighearted.", "Nascour: I will destroy you in battle\nright now. You will know the",
        "humiliation of total domination\nbefore this crowd!"]);
    f.orreNascourBravo = true;
    if (!(await bossBattle("Nascour", "Cipher Admin Nascour", "gentleman", ["N-No! There's no… This can't\nbe happening!"]))) {
      await say(["Nascour: I expect to see spectacular\nbattling out of you. After all,\nyou're here to entertain! Waahahahah!"]); return;
    }
    await say(["Nascour: Gaaaah! It's not over,\n{PLAYER}! Come on, we shall battle…"]);
    await say(["???: Enough! Don't embarrass\nyourself, Nascour!"]);
    await say(["Nascour: Sir! I… I beg your pardon!"]);
    await say(["Rui: What's going on? Nascour's\napologizing? Isn't he supposed to be\nthe boss?"]);
    await goAway("REALGAM_NASCOUR", ["walk_fast_left", "walk_fast_down", "walk_fast_down", "walk_fast_down"]);
    f.orreStory = 43;
    await persist();
  }
  // After the game, Realgam Tower's Colosseum again as a tournament (as in Colosseum): its four rounds, then Nascour
  // and Evice, healed before each of them; a Shadow Pokémon not yet snagged is still theirs, one snagged replaced
  // (Orre.realgamRoundTeam). Lose one and you're out. (The host's question, and the win, our own words.)
  async function realgamTournament() {
    if (!(await confirm("Take on the Realgam Tower\nColosseum's six in a row?"))) return;
    await realgamHeal();
    const rounds = Orre.REALGAM_ROUNDS.map((s) => [s]).concat([
      ["RealgamTower_Colosseum_Nascour", ["Nascour: I will destroy you in battle\nright now. You will know the", "humiliation of total domination\nbefore this crowd!"], "Nascour", "Cipher Admin Nascour", "gentleman", ["N-No! There's no… This can't\nbe happening!"]],
      ["RealgamTower_Colosseum_Evice", ["Es Cade: Now, are you prepared to be\ndevastated once again?"], "Evice", "Cipher Head Evice", "gentleman", ["Nooooooooh! Even my ultimate\nPokémon!"]]]);
    for (const [script, words, trainer, name, pic, defeat] of rounds) {
      if (!trainer) { if (!(await realgamRound(script))) return; continue; }
      await realgamHeal();
      await say(words);
      const f = player.flags, team = Orre.realgamRoundTeam(trainer, f.orreShadowSnagged), shadows = team.filter((r) => r.shadow).map((r) => r.species);
      const opts = { foe: { name, team, pic }, prizeClass: "Leader", noBlackout: true, snag: shadows, defeatText: defeat };
      const outcome = await storyBattle(opts);
      const snagged = (opts.snagged || []).filter((sp) => shadows.includes(sp));
      if (snagged.length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...snagged);
      await persist();
      if (outcome !== "won") return;
    }
    await say("You won all six of Realgam Tower\nColosseum's battles!");
    await persist();
  }
  async function realgamEvice() {
    const f = player.flags;
    // (Colosseum heals your Pokémon before Evice too.)
    if ((f.orreStory | 0) === 43) await realgamHeal();
    if (!f.orreEviceMet) {
      await say(["Rui: Huh? Mr. Mayor? Why are you\nhere?"]);
      await say(["Es Cade: My, my. That certainly was a\nbattle worth seeing.", "Es Cade: I must be honest with you. I\nnever imagined that you would get\nthis far.",
        "Es Cade: Oh, dear me. Do you fail to\nunderstand still? You're such an\ninnocent child.", "Es Cade: At times, I am the affable\nmayor of Phenac… And at others, I am\nthe secret boss of the criminal",
        "syndicate Cipher…", "Es Cade: I am Evice, and I shall rule\nthe world!"]);
      f.orreEviceMet = true;
    } else await say(["Es Cade: Ah, it's good to see you.\nIndeed it is. I've been worried about\nyou.", "Es Cade: I was worried that you'd run\noff out of fear of me! Hohoho!",
      "Es Cade: Now, are you prepared to be\ndevastated once again?"]);
    await say(["Evice: How dare you meddle in our\naffairs so thoroughly!", "Evice: The Shadow Pokémon plan, we\ncan resurrect from the start. But you\ntwo… You'll never be forgiven!",
      "Evice: I'll destroy you utterly so\nyou may never again rise against me!"]);
    if (!(await bossBattle("Evice", "Cipher Head Evice", "gentleman", ["Nooooooooh! Even my ultimate\nPokémon!"]))) {
      await say(["Evice: Hahah! I'll happily humiliate\nyou as often as you're willing!"]); return;
    }
    await say(["Evice: Blast you! Don't you forget\nwhat you've done, {PLAYER}!", "Evice: It won't end this way next\ntime! I will ruin you the next time,\nI promise you that!", "Evice: Waahahah! Let us meet again!",
      "Evice: Our bid to take over the world\nusing Shadow Pokémon hasn't ended\nyet!"]);
    await say(["Rui: No! He's trying to escape with\nthat helicopter!"]);
    await say(["Sherles: Halt! Stop where you are!\nThere's no getting away this time!", "Sherles: Evice! You and your cronies\nare under arrest!"]);
    await say(["Evice: What?!"]);
    await say(["Rui: Your plan… I think it just\nended."]);
    await goAway("EVICE", ["walk_fast_down", "walk_fast_down", "walk_fast_down", "walk_fast_down"]);
    await say(["Rui: Oh! Wh-What is that?!"]);
    await say(["Duking: It's a legendary Pokémon!\nIt's a Ho-Oh!"]);
    await say(["Rui: It is! It really is a Ho-Oh!\nIt's incredible!"]);
    await say(["Eagun: Gasp, gasp… Rui, are you all\nright?", "Eagun: It must have been keeping an\neye on your heroics from the sky\nabove. You obviously earned its",
      "support.", "Eagun: Of course, it would also never\nallow criminals to get off scot-free.\nNot when they're guilty of an", "outrage like creating Shadow Pokémon."]);
    await say(["Rui: Oh, wow. So Ho-Oh was watching\nover us!"]);
    await say(["Eagun: So true! This is the first\ntime I've seen one up so close.", "Eagun: Rui. And {PLAYER}. The Ho-Oh\nis blessing you for your victory.", "Eagun: Such a perfect outcome. Yes,\nindeed!"]);
    await say(["Duking: Cipher's finished! The Shadow\nPokémon plan ends now!"]);
    await say(["Rui: {PLAYER}. I guess it's finally\nover.", "Rui: We faced a lot of challenges,\nbut thanks to you, {PLAYER},\neverything has been resolved.",
      "Rui: {PLAYER}, thank you. You were\nstrong. You answered the call. And\nyou were cool!"]);
    // (Colosseum ends there, with no call: none here either.)
    f.orreStory = 44;
    await persist();
  }
  // ---------- Orre: Colosseum's story, Pyrite Town (orreStory 21 to 28) ----------
  //
  // 21: you and Rui come to Pyrite (Orre's cap up to 35). Its Trainers have Shadow Pokémon they won as prizes at the
  // Pyrite Colosseum; Rogue Cail, by the entrance, says so (22: his battle; 23 after it). Duking, who runs the
  // Colosseum, won't help, and his friend Silva storms out on him; his daughter Marcia tells you why: Miror B. has
  // Duking's Plusle hostage, in the Pyrite Building (24). There Nore guards the stairs; beaten, Duking comes in and
  // owns up (25). On the top floor Miror B. and Cipher's Nascour; Reath and Ferma battle you, Silva lies beaten, and
  // Miror B. dares you to come to his cave (26: Pyrite Cave's north end opens). In his hideout you beat him, he runs,
  // and Plusle's free; Duking thanks you, and Rui wants to see her grandparents in Agate Village (28).
  // Each of the story's Trainers with a Shadow Pokémon battles you until you've snagged it (orreShadowDone).
  const ORRE_PYRITE_CAP = 35;
  const storyBattle = async (opts) => {
    const o = Object.assign({ double: true, music: "mus_vs_trainer" }, opts);
    const outcome = await battle("trainer", o);
    // (What was snagged, battle() writes on the options it was given: back on the caller's, which it reads.)
    opts.snagged = o.snagged;
    show("world");
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
    return outcome;
  };
  // (An entry may carry its own moves, as Colosseum's Pyrite entrants do: [species, level, moves].)
  const teamOf = (list) => list.map(([sp, lv, moves]) => Party.create(sp, lv, moves ? { moves } : undefined));
  // Colosseum's other Trainers (game/orre-trainers*.js): the party of the stage they're at, once a stage; beaten,
  // that stage's words. Also a Shadow Pokémon Trainer's later parties, once theirs is snagged (Orre.REMATCHES).
  // (A stage's words can be a function of the flags: who's left to find, say.)
  const stageWords = (x) => (typeof x === "function" ? x(player.flags) : x);
  async function coloStageBattle(t, stage, index, store, script) {
    const f = player.flags;
    await say(stageWords(stage.intro));
    // (`shadow`: whose Shadow Pokémon, if it was never snagged, comes back in the first one's place, to be snagged, as
    // Colosseum's later battles have it.)
    const team = stage.team.map(([sp, lv]) => Party.create(sp, lv));
    const back = stage.shadow ? Orre.shadowOf(stage.shadow).filter((s) => !(f.orreShadowSnagged || []).includes(s.species)) : [];
    if (back.length) team.splice(0, back.length, ...back.map(Orre.shadowMon));
    const opts = { foe: { name: t.name, team, pic: t.pic }, prizeClass: t.cls,
      double: !t.single, defeatText: stageWords(stage.defeat), snag: back.map((s) => s.species) };
    const outcome = await storyBattle(opts);
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    if (outcome !== "won") { if (stage.lost) await say(stageWords(stage.lost)); return false; }
    (f[store] = f[store] || {})[script] = index;
    // (Said once, on winning: `won`; then a gift, `item`, the first time that stage is won.)
    if (stage.won) await say(stageWords(stage.won));
    if (stage.item) {
      Player.addItem(player, stage.item);
      // (`itemText`: the game's own words for it, Myron's Card Key; `afterItem`: what's said then, Rui's.)
      await sayWithJingle(window.ITEMS[stage.item] && window.ITEMS[stage.item].category === "key-items" ? "mus_obtain_key_item" : "mus_obtain_item",
        stage.itemText || "{PLAYER} obtained " + article(Bag.name(stage.item)) + "!");
      if (stage.afterItem) await say(stageWords(stage.afterItem));
    }
    if (stage.after && !stage.won) await say(stageWords(stage.after));
    await persist();
    return true;
  }
  async function coloTrainer(script) {
    const t = Orre.COLO_TRAINERS[script], s = Orre.coloStage(script, player.flags);
    if (!s || !s.stage) { if (t && t.before) await say(stageWords(t.before)); return; }
    if (s.beaten) { await say(stageWords(s.stage.after)); return; }
    await coloStageBattle(t, s.stage, s.index, "orreColo", script);
  }
  async function shadowTrainer(script) {
    const f = player.flags, d = Orre.SHADOW_TRAINERS[script], done = (f.orreShadowDone = f.orreShadowDone || []);
    if (done.includes(script)) {
      const r = Orre.rematchStage(script, f);
      if (r && r.stage && !r.beaten) { await coloStageBattle(d, r.stage, r.index, "orreColoRematch", script); return; }
      await say(r && r.stage ? stageWords(r.stage.after) : d.after);
      return;
    }
    const shadows = Orre.shadowOf(d.trainer);
    await say(d.intro);
    const opts = { foe: { name: d.name, team: Orre.team(d.key || d.trainer), pic: d.pic }, prizeClass: d.cls,
      snag: shadows.map((s) => s.species), defeatText: d.defeat || d.kept };
    const outcome = await storyBattle(opts);
    const snagged = (opts.snagged || []).filter((sp) => shadows.some((s) => s.species === sp));
    if (snagged.length) { (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...snagged); done.push(script); }
    if (outcome === "won" && script === "PyriteTown_EventScript_Shadow_CAIL" && (f.orreStory | 0) < 23) {
      // (Colosseum's words: Cail's #20523, then Rui's #20692 and #20693.)
      await say(["Cail: Bah! That was it? That lying\nMiror B.!", "Cail: He came up with that fancy\ntough-sounding name, Shadow Pokémon,\nbut it was no big deal!",
        "Cail: You guys be careful, too. Don't\nbe played for a sucker.", "Cail: That's about all they'll give\nyou if you win at the Colosseum."]);
      await say(["Rui: Shadow Pokémon? That's what it's\ncalled? A Shadow Pokémon? That\nPokémon with the black aura…", "Rui: It looks like the Colosseum has\na secret.",
        "Rui: I guess there's no choice but to\ntake part in a battle challenge\nthere!"]);
      f.orreStory = 23;
    } else if (outcome === "won") await say(snagged.length ? d.after : d.kept);
    await persist();
  }
  // Phenac's Pre Gym: Justy, its leader (Colosseum's words, M1_gym_1F). Beat his four Trainers
  // (game/orre-trainers-early.js) and he gives you a White Herb; with six Pokémon, and four Shadow Pokémon snagged
  // (as Colosseum has it), he battles you himself, and gives you TM27 Return. (player.flags.orrePreGym.)
  const PRE_GYM = ["BOTAN", "LIQUI", "DUGO", "GWIN"].map((k) => "PhenacCity_PreGym_EventScript_Colo_" + k);
  async function preGymJusty() {
    const f = player.flags, pg = (f.orrePreGym = f.orrePreGym || {}), beaten = f.orreColo || {};
    if (!PRE_GYM.every((s) => beaten[s] != null)) {
      await say(["Justy: Hello! I'm Justy. I'm in\ncharge of running the Pre Gym.", "Justy: Judging by your appearance,\nI'd say that you're traveling, the\ntwo of you.",
        "Justy: Hey, you're already here. You\nshould try battling our trainers."]);
      return;
    }
    if (!pg.herb) {
      await say(["Justy: Whoa, that was inspiring! You\nshowed me a great battle!", "Justy: It deserves a gift! I want you\nto have this."]);
      Player.addItem(player, "white-herb");
      await sayWithJingle("mus_obtain_item", "{PLAYER} obtained a White Herb!");
      pg.herb = true;
      await persist();
    }
    if (pg.justy) { await say(["Justy: Honestly, our battle was\nfantastic. I will never forget the\nbattle we had!"]); return; }
    if (player.party.filter((r) => !r.egg).length < 6) {
      await say(["Justy: You don't have a full party of\nPokémon yet. When you get six of", "them, I'd like you to come see me\nagain.",
        "Justy: That's when I will be your\nopponent. I'll be looking forward to\nit!"]);
      return;
    }
    if ((f.orreShadowSnagged || []).length < 4) { await say(["Justy: If you're in the mood for\nbattling, feel free to visit us.\nYou're always welcome."]); return; }
    await say(["Justy: Oh, hello! I guess you finally\ngot your sixth Pokémon for your\nparty.", "Justy: Well, then. Would you like to\nbattle against me?"]);
    if (!(await confirm("Battle Justy?"))) { await say(["Justy: Oh, okay. Well, if you get in\nthe mood for it, be sure to visit.", "Justy: I'll always be waiting for\nyou."]); return; }
    await say(["Justy: Okay, let's get this battle\nunder way. Show me a great battle!"]);
    if (f.orreRui) await say(["Rui: {PLAYER}, go for it! I'll be\nrooting for you!"]);
    const team = [["Sandshrew", 41], ["Cacnea", 41], ["Gligar", 41], ["Sunflora", 40], ["Azumarill", 40], ["Nosepass", 42]].map(([sp, lv]) => Party.create(sp, lv));
    const outcome = await storyBattle({ foe: { name: "Pregymleader Justy", team, pic: "cooltrainer_m" }, prizeClass: "Leader", double: true, defeatText: ["Wha-What?"] });
    if (outcome !== "won") return;
    await say(["Justy: Wow, that was one challenging\nand satisfying battle.", "Justy: Look at this. My palms are\ndrenched with sweat.",
      "Justy: There's no shame in this loss!\nI'm one lucky guy for being a part of\nthis spectacular battle.", "Justy: I'm glad that I got the\nopportunity to battle with you.",
      "Justy: I want you to have this.\nConsider it a memento of our battle!"]);
    Player.addItem(player, "tm27");
    await sayWithJingle("mus_obtain_item", "{PLAYER} obtained " + article(Bag.name("tm27")) + "!");
    pg.justy = true;
    await persist();
  }
  // ---------- Orre: Pyrite's windmill, its Colosseum's knockout challenge, Fateen; Phenac Stadium (game/orre-pyrite.js) ----------
  //
  // Colosseum's words throughout (M2_windmill_1F, M2_out, M2_enter_1F, M2_uranai_1F, M2_guild_1F_1, M1_stadium_1F): the
  // ids are by each line. After Silva storms out of Duking's house he rips a gear out of the windmill (orreGear 1); the
  // Chief asks you to find it; it's in town (two worn gears are junk) (2); back at the windmill Duking's tending the
  // Chief, the gear goes in and Duking asks you to win the Colosseum's knockout challenge (3); win it and Nore, "for
  // Miror B.'s gorgeous gift", leads you into the Pyrite Building (4, orreStory 24). After Miror B., Fateen stops you
  // in town and sends you north to Agate (28). Phenac Stadium's first visit comes before Wakin (orreStadium).
  const WINDMILL_GEAR_PLEA = ["Owowowow… That Silva's gone too\nfar this time.", "He ripped out and ripped off one\nof the gears.", "The Colosseum's going to be\nwithout power!"];
  // (Realgam Tower's grounds are Colosseum's Construction Lot till the tower opens: its name there too.)
  window.mapNameOverride = (map) => (map === "RealgamTower_Exterior" && player && (player.flags.orreStory | 0) < 40 ? "Construction Lot" : null);
  async function pyriteExtra(script, ev) {
    const f = player.flags, story = f.orreStory | 0, gear = f.orreGear | 0;
    const chief = (pages) => say(pages.map((p, i) => (i ? p : "Chief: " + p)));
    switch (script) {
      // (The windmill: #20504-#20509 the Chief's plea; then the gear brought back.)
      case "enter:PyriteTown_Windmill": {
        if (gear === 1 && !f.orreWindmill) {
          await chief(WINDMILL_GEAR_PLEA);
          await chief(["Yeah, the only thing bruised is my\npride. It was only Silva, so I wasn't\nexpecting any trouble."]);
          await chief(["That's what I want to know. He was\nranting about how the Colosseum can\njust shut down or something."]);
          await chief(["Sorry to worry you younglings.\nThanks. I'll be fine now.", "But I need to ask for a favor.\nWill you hear me out?"]);
          while (!(await confirm("Hear the Chief out?"))) await chief(["Oh, now, don't be that way. Hear\nme out."]);
          await chief(["If the Colosseum loses power, the\nwhole town suffers.", "I need you to find that Gear Silva\nran off with. I'm counting on you\nyounglings!"]);
          f.orreWindmill = true;
          await persist();
          return;
        }
        if (gear !== 2) return;
        const D = ORRE("WINDMILL_DUKING");
        Overworld.addObject(D, { x: 6, y: 8, facing: "left" }, { sprite: "black_belt", width: 16, height: 32, frames: 10 });
        await say(["Worker: Oh! That Gear! That's the\nstolen Gear!", "Please! Quickly! Give it to the\nChief!"]);
        await say(["Duking: Terribly sorry, Chief. You're\nsure you're okay?"]);
        await chief(["Ayup. I'm fine. There's no need\nfor all the worrying."]);
        await say(["Duking: Good. That's good… But Silva…\nThis is an outrage…"]);
        await chief(["No, no. I reckon he agonized over\nthis and did it because he thought it\nright. I can't blame the man for that.",
          "Enough about that, Duking.\nInstead, I think you should look over\nthere."]);
        await Overworld.act([{ who: D, moves: ["face_down"] }]);
        await say(["Duking: Wha… You people?", "Duking: Th-That's the Gear! You found\nit for us? What amazing luck!"]);
        await chief(["Hehe. I reckon you might be saying\nthanks, Duking.", "All right. I'll get you to slot\nthat Gear snugly back in that gap\nwhere it belongs."]);
        Screen.say("");
        sfx("se_pin");
        await Overworld.shake(4, { x: 1, y: 0, delay: 3 });
        await say(["Worker: Thank you! The power should\nbe restored at the Colosseum now."]);
        await say(["Duking: I'll ask you to excuse me for\nmy behavior earlier. You seem to be\npeople who are worthy of trust.", "Duking: You have my sincere thanks."]);
        await say(["Duking: I can tell that you're a man\nof courage and honor. I have a favor\nto ask. Will you hear me out?"]);
        while (!(await confirm("Hear Duking out?"))) await say(["Duking: I have no one else to turn\nto. Please, hear me out."]);
        await say(["Duking: I'm grateful. I want you to\nenter the next Colosseum battle.", "Duking: I need you to win the\nknockout challenge and find out what\nis going on there.",
          "Duking: I can tell from a glance that\nyou're no ordinary trainer."]);
        Screen.say("");
        await Overworld.act([{ who: D, moves: ["walk_down", "walk_down", "walk_left", "set_invisible"] }]);
        Overworld.removeObject(D);
        f.orreGear = 3;
        await persist();
        return;
      }
      case "PyriteTown_Windmill_EventScript_Chief":
        if (story >= 27) { await chief(["That Miror B.'s a bad parasite. If\nonly someone'd stomp that pest…\nWahaha!"]); return; }
        if (gear >= 3) { await chief(["Wahaha! This is the way it ought\nto be. Things are fine now."]); return; }
        if (gear >= 1) { await chief(f.orreWindmill ? ["If the Colosseum loses power, the\nwhole town suffers.", "I need you to find that Gear Silva\nran off with. I'm counting on you\nyounglings!"] : WINDMILL_GEAR_PLEA); return; }
        await chief(pickOne([["Wahaha! Not to disappoint you, but\nthis isn't a job that anyone can just\npick up.", "Give it another twenty years, then\ncome back. Wahaha!"],
          ["Wahaha! No doubt, no doubt!", "I've been doing this for thirty\nyears! Only I can do this! Wahaha!"]]));
        return;
      case "PyriteTown_Windmill_EventScript_Worker":
        await say(story >= 27 ? ["Hi, folks! The Windmill's\noperating perfectly, and it's all\nthanks to you!"]
          : story >= 25 ? ["Oh, so Miror B. was holding\nDuking's Pokémon hostage?", "So that was the problem! What a\nterrible thing to do."]
            : gear >= 3 ? ["Thank you! The power should be\nrestored at the Colosseum now."]
              : ["This Windmill generates\nelectricity for powering the\nColosseum.", "It may look a little worse for\nwear, but it's still going strong in\nactive service."]);
        return;
      case "PyriteTown_Windmill_EventScript_Gears":
        await say(gear === 1 || gear === 2 ? ["One of the gears is missing!"] : ["Large gears are rotating.", "It appears to be a power supply."]);
        return;
      case "PyriteTown_EventScript_WindmillMan":
        await say(["S-Someone… There's trouble… H-Help\nme…", "The Chief's inside! Silva came\nand…"]);
        return;
      // (The Construction Lot, D4_out: the gear Silva dumped (#16734); the guard at the tower's way in (#21578, then
      // #23679); the workers (#21582 while the gear's there, then #23680; #21605).)
      case "ConstructionLot_EventScript_Gear":
        if (gear !== 1) return;
        Overworld.removeObject(ORRE("GEAR_REAL"));
        await sayWithJingle("mus_obtain_key_item", "{PLAYER} found the Gear for the\nWindmill!");
        f.orreGear = 2;
        await persist();
        return;
      case "ConstructionLot_EventScript_Guard":
        await say(f.orreLotGuard ? ["Worker: This is no place for tourists\nto visit. Go on, scram."]
          : ["Worker: Whoa, hold it there. This is\na construction site. It's not a safe\nplace to be.", "Worker: This is no place for tourists\nto visit. Go on, scram."]);
        f.orreLotGuard = true;
        return;
      case "ConstructionLot_EventScript_Worker1":
        await say(gear === 1 ? ["Worker: Some guy came wandering by a\nwhile back. He threw out some trash\nand then took off.",
          "Worker: What's this place look like?\nIt's no garbage dump, that's for\nsure!"] : ["Worker: What's this place look like?\nIt's no garbage dump, that's for\nsure!"]);
        return;
      case "ConstructionLot_EventScript_Worker2":
        await say(["Worker: Aaaaaah… Been working hard, I\nhave.", "Worker: Let me tell you, making this\nhere huge tower's one massive job.\nIt's hard to imagine, even for me.",
          "Worker: Y'all come back to visit when\nwe're all done here. There'll be a\nColosseum on top of the tower.", "Worker: Amazing stuff!"]);
        return;
      case "PyriteTown_EventScript_JunkGear":
        await say(["A worn gear is on the floor. It\nappears to be junk."]);
        return;
      // (Fateen's fortune-telling chamber.)
      case "PyriteTown_FortuneHouse_EventScript_Fateen": {
        const fate = (pages) => say(pages.map((p) => "Fateen: " + p));
        if (story >= 36) { await fate(["Find what you seek, be it an\nobject, person, or luck. Welcome to\nFateen's Fortune-Telling Chamber."]); return; }
        if (story >= 33) { await fate(["I see… I see it…", "Deep under the ground… A\nswirling black cloud… I see it\nclearly!", "That black whirlpool of smoke\nis a new enemy. Go with caution. This\none won't be easy."]); return; }
        if (story >= 30) {
          await fate(["Have you visited Agate\nVillage?"]);
          await fate((await confirm("Have you visited Agate?")) ? ["Agate is now home to many\nformer trainers who were skilled in\ntheir heyday.", "It is best to confer with the\nexperts when it comes to Pokémon."]
            : ["Agate is now home to many\nformer trainers who were skilled in\ntheir heyday.", "Come to think of it… A man\nonce considered the mythical trainer\nnow lives there."]);
          return;
        }
        if (story >= 28) { await fate(["The key for lifting the black\naura from Pokémon… It appears to be\nin the north.", "You should visit Agate Village\nwhere the girl's grandfather lives."]); return; }
        if (story >= 24) { await fate(["You've been crowned as the\nwinner in the battle challenge. Well\ndone. You've impressed me.", "Oh? I see a small Pokémon\ncrying troubled tears somewhere.\nQuickly, you must save it."]); return; }
        if (gear === 1) {
          await fate(["Fwofwofwo. You seek what is\nmissing before you enter the\nColosseum, yes?", "Or, have you sought me to\nhave your fortune read?"]);
          await fate(["However, you've come at a\nmost inconvenient time. I am busy\nwith this customer, as you can see.", "This time, you must find what\nyou seek yourself. Fwofwofwo."]);
          await fate(["Good, good, that's the\nspirit. I'll leave you to your own\ndevices to find what you seek.\nFwofwofwo."]);
          return;
        }
        if (gear === 2) { await fate(["My. I see you've found what\nyou sought without my help. Well\ndone!"]); return; }
        await fate(["Find what you seek, be it an\nobject, person, or luck. Welcome to\nFateen's Fortune-Telling Chamber.", "I am Fateen. If ever a\nproblem clouds your brow, you shall\ncome to me.",
          "Whatever your problem may be,\nmy fortune-telling shall lead to the\nsolution. Fwofwofwo."]);
        await fate(["Oh, dear me. A problem vexes\nyou?", "If you so wish, I shall solve\nit for you with my fortune-telling.\nFwofwofwo."]);
        if (!(await confirm("Have your fortune told?"))) { await fate(["Fwofwofwo. Come back if you\nhave a change of heart. No harm will\ncome from what I do."]); return; }
        await fate(["Very well. Your trust will\nnot be betrayed. Let me begin."]);
        await fate(["Oh! Oh! What is the meaning\nof this?", "Hmm… You are at the center of\na monumental incident, it seems.", "It is pointless for me to say\nany more about it. You must make your\nway to the Colosseum.",
          "Your fortune has been told.\nAnd it requires you to win at the\nColosseum. Go, and do your best."]);
        return;
      }
      case "PyriteTown_FortuneHouse_EventScript_Customer":
        await say(story >= 27 ? ["People call Fateen the Mother\nof Pyrite. Her ability as a\nfortune-teller is highly regarded.", "Why, just a while ago, she\ntold me that the lottery tickets I\nbought were all duds before the draw.\nSob…"]
          : ["People call Fateen the Mother\nof Pyrite. Her ability as a\nfortune-teller is highly regarded.", "Why, just a while ago, she\neven determined where my wife is\nliving since she left me… Sob…"]);
        return;
      case "PyriteTown_FortuneHouse_EventScript_Helper":
        await say(["Find what you seek, be it an\nobject, person, or luck. Welcome to\nFateen's Fortune-Telling Chamber.", "Oh, wait. These aren't my\nlines, they're Fateen's. Ehehe."]);
        return;
      // (The Pyrite Building: locked till Nore leads you in, #15295.)
      case "enter:PyriteTown_PyriteBuilding_1F": {
        await say(["The door is locked."]);
        const door = window.WORLD_MAPS.PyriteTown.warps.find((w) => w.map === "PyriteTown_PyriteBuilding_1F");
        player.location = { map: "PyriteTown", x: door.x, y: door.y + 1, facing: "down" };
        await Overworld.teleport(player.location);
        return;
      }
      // (The Colosseum's lobby.)
      case "PyriteTown_Colosseum_EventScript_Fan":
        await say(gear >= 4 ? ["Wow, really. So you really went\nand won it all. It'll be my turn\nnext!"]
          : ["Hehehe. Here's my chance to win\nthe knockout challenge and score\nmyself an awesome Pokémon…", "Oh, sheesh, what am I saying? You\nhave to keep that a secret! Pretend\nyou never heard me, okay?"]);
        return;
      case "PyriteTown_Colosseum_EventScript_Kid":
        if (story >= 27) { await say(["Drat. It sounds like you can't get\none of those awesome Pokémon if Miror\nB.'s not around.", "I'll just have to toughen up my\nPokémon with the TMs you get for\nwinning challenges, so it can beat\nthose awesome Pokémon."]); return; }
        if (gear >= 4) {
          await say(["Oh, hey! Champ! Did they really\ngive you an awesome Pokémon?"]);
          await say((await confirm("Did they?")) ? ["Awwwww, dude! I want one, too!\nYes, I do!"] : ["Hah? No kidding? So that was just\na bogus rumor…"]);
          return;
        }
        await say(["Tch! I didn't get here in time to\nmake the registration.", "I've heard rumors that if you win\nthe challenge, you get an awesome\nPokémon like that Cail did…",
          "Oh, sheesh, what am I saying? You\nhave to keep that a secret! Pretend\nyou never heard me, okay?"]);
        if (story === 22 && !f.orreLobby) {
          await say(["Rui: {PLAYER}! Wasn't Cail that guy\nwho was hanging around the town's\nentrance?", "Rui: We should ask him. He might know\nsomething."]);
          f.orreLobby = true;
          await persist();
        }
        return;
      // (Phenac Stadium: its first visit, after the Mayor's heard Rui out, comes before Wakin.)
      case "enter:PhenacCity_Stadium":
        f.orreStadium = true;
        await persist();
        return;
      case "PhenacCity_Stadium_EventScript_Fan":
        await say(story >= 44 ? ["I think they've finally started\nregistering trainers for the next\nchallenge. If you want to join,\nhurry!"]
          : ["Isn't this city's Stadium amazing?", "Oh, I wish I could soon battle at\na Stadium as fabulous as this one!"]);
        return;
      case "PhenacCity_Stadium_EventScript_Man":
        if (story >= 44) {
          await say(["Hi, there! Did you two come to\nregister for the next challenge?"]);
          await say((await confirm("Here to register?")) ? ["Is that right? Actually, I came to\nenter the challenge, too.", "I intend to go all the way and\nscore that big cash prize. Just watch\nme!"]
            : ["Oh. Is that right. Don't you two\nhave any ambition?"]);
          return;
        }
        await say(["Hi! Are you here to take part in\nthe challenge, too?"]);
        await say((await confirm("Here to take part?")) ? ["Oh, yeah? Well, me, too. I came\nhere hoping to participate in the\nchallenge.", "But I was disappointed. By the\ntime I arrived, the challenge had\nalready started.",
          "I wanted to win this knockout\nchallenge. I would've liked to win\nthe cash prize and the Technical\nMachine (TM)."]
          : ["Oh, so you must be here to watch\nthe battles. It's great to see some\nawesome Pokémon moves in a live\nsetting.", "The winner gets cash and a TM,\nwhich is short for Technical Machine.",
            "A TM is used for teaching a move to a\nPokémon, so it's important."]);
        return;
    }
  }
  // After Miror B. (27): coming back into Pyrite, Fateen stops you two (M2_out #23290-#23293, Rui #23387-#23389).
  async function fateenOutside() {
    const f = player.flags, F = ORRE("FATEEN_OUT"), me = player.location;
    Overworld.addObject(F, { x: me.x, y: me.y - 3, facing: "down" });
    await Overworld.act([{ who: F, moves: ["walk_down", "walk_down"] }, { who: "player", moves: ["face_up"] }]);
    await say(["Fateen: Oh? Yoohoo, you two there.\nWhere are you bound in such haste?"]);
    await say(["Fateen: Ahhhhh… I might be imagining\nit, but the town's air feels somewhat\nless dirty.", "Fateen: But not all is well. I can\nfeel the presence of black auras\ncoming from Shadow Pokémon."]);
    await say(["Fateen: There is but nothing that\neludes the notice of my\nfortune-telling. Fwofwofwo.", "Fateen: The key to freeing Pokémon\nfrom that black aura… It is in the\nnorth."]);
    await say(["Rui: Wow! Fateen, nothing escapes\nyour notice.", "Rui: Up north… That's where my\ngrandpa lives, too…"]);
    await say(["Fateen: Fwofwofwo. That being north\nmay be no mere coincidence. Your\nanswer may be there."]);
    await say(["Rui: Oh! My grandpa was a famous\ntrainer when he was young.", "Rui: Maybe my grandpa would know\nsomething. Let's go see him,\n{PLAYER}."]);
    Screen.say("");
    await Overworld.act([{ who: F, moves: ["walk_up", "walk_up", "set_invisible"] }]);
    Overworld.removeObject(F);
    f.orreStory = 28;
    Orre.unlock(f, "AgateVillage");
    await persist();
  }
  // The Pyrite Colosseum's and Phenac Stadium's desks (Colosseum's own words): the story's knockout challenge at
  // Pyrite (the gear back, orreGear 3: win it and Nore leads you to the Pyrite Building), and both as Colosseum's
  // repeatable challenges after (Pyrite's once Miror B.'s gone, 27; Phenac's after the game, 44).
  const DESK = {
    PyriteTown_Colosseum_EventScript_Receptionist: {
      welcome: ["Hello! Welcome to the Pyrite\nColosseum! Would you like to join a\nknockout challenge?"], party: ["Okay! Will you be entering with\nthe Pokémon that you have in your\nparty now?"],
      rules: ["Colosseum battles are held in the\nDouble-Battle style with two Pokémon\nout from each party.", "You will win the challenge if you\ncan defeat four trainers in a row.",
        "The challenge winner will receive\nnot only a big cash prize, but a\nTechnical Machine (TM) as well!"],
      go: ["I hope you give it your best and\naim for victory."], declined: ["Oh, that's too bad. I hope you\nwill take part in the next challenge."],
      reparty: ["Please switch your party Pokémon\nto the one you want to enter using\nthe PC."],
      won: (money) => ["Congratulations! You're the\nchampion! You battled fabulously!", "Please accept your cash prize of\n¥" + money + "!"],
      prize: (item) => ["And, as a victory prize, please\nalso accept this " + item + "!"], lost: ["It's too bad things didn't work\nout for you this time. Please enter\nagain!"],
      bye: ["We'll be looking forward to your\nnext entry."] },
    PhenacCity_Stadium_EventScript_Receptionist: {
      welcome: ["Hello! Welcome to Phenac Stadium!\nWould you like to enter the knockout\nchallenge?"], party: ["Okay, so you will participate with\nthe Pokémon that you have in your\nparty now?"],
      rules: ["The Stadium battles are all played\nin Double-Battle style with the\ntrainers putting two Pokémon out each.", "You win the challenge if you\ndefeat four trainers in a row.",
        "The challenge champion wins not\nonly a cash prize, but also a TM\n(Technical Machine) with a Pokémon\nmove."],
      shadow: ["Rui: Hey, {PLAYER}… Do you think\nmaybe using Shadow Pokémon here won't\nbe a good idea?", "Rui: I think you should use only\nordinary Pokémon for this challenge."],
      go: ["Okay, please enter the Stadium\nthrough the doors to the right or\nleft side.", "I hope you give it your best\neffort and go for victory!"],
      declined: ["Oh. That's too bad. I hope you'll\njoin us for the next challenge!"],
      reparty: ["Please assemble the Pokémon party\nthat you wish to enter. If you need,\nuse the PC to switch the party\nPokémon in and out."],
      won: (money) => ["Congratulations! You're the\nchampion! Your battles were\nfantastic!", "The victory means you have won the\n¥" + money + " cash prize!"],
      prize: (item) => ["And, as a championship prize, you\nhave also won a " + item + "!"], lost: ["Too bad you couldn't win this\ntime! Please try again!"],
      bye: ["I hope you will participate again!"] }
  };
  async function colosseumDesk(script) {
    const t = Orre.TOURNAMENTS[script], w = DESK[script], f = player.flags, story = f.orreStory | 0, gear = f.orreGear | 0;
    const pyrite = script === "PyriteTown_Colosseum_EventScript_Receptionist";
    if (!pyrite && story < 44) {
      await say(["Welcome to Phenac Stadium.", "This is where we register trainers\nfor challenges.", "However, the current challenge has\nalready started. So, we are no longer\naccepting trainers for this\nchallenge.",
        "Please come back and enter the\nnext challenge."]);
      return;
    }
    const storyRun = pyrite && story < 27;
    if (storyRun) {
      if (gear >= 4) { await say(["Your winning streak was amazing! I\nhope you will participate again!"]); return; }
      if (gear === 1 || gear === 2) { await say(["We have a terrible problem! The\nColosseum doors suddenly stopped\nworking. They won't open!", "Oh, I don't know what to do! We\ncan't hold battles this way."]); return; }
      if (gear !== 3) {
        await say(story >= 23 ? ["Oh, good. You see, the challenge\nhas already started.", "Please take part in the next\nchallenge."] : ["I'm sorry, but the current\nchallenge is already under way.", "Please wait for the next\nchallenge's registration."]);
        return;
      }
      if (!f.orrePower) { await say(["Thank you for your patience! The\npower has been turned back on. I'll\nbe happy to accept registrations for\nthe next challenge."]); f.orrePower = true; }
      await say(["Welcome to Pyrite Colosseum! Are\nyou here to register for entry?"]);
    } else await say(w.welcome);
    const wins = (f.orreTourney = f.orreTourney || {});
    if (!(await confirm("Enter the challenge?"))) { await say(w.declined); return; }
    if (!wins[t.key]) await say(w.rules);
    await say(w.party);
    if (!(await confirm("Enter with this party?"))) { await say(w.reparty); return; }
    if (player.party.filter((r) => !r.egg).length < 2) { await say(w.reparty); return; }
    if (w.shadow && f.orreRui && player.party.some((r) => r.shadow)) await say(w.shadow);
    await say(w.go);
    const top = Math.max(...player.party.filter((r) => !r.egg).map((r) => r.level));
    // (Pyrite's entrants are Colosseum's own: the story's four, then its four tournaments in turn, Orre.pyriteDraw;
    // Phenac's are drawn, Orre.tournamentDraw. orreTourney.pyriteRun: Pyrite's tournaments won since the story.)
    const pd = pyrite ? Orre.pyriteDraw(t, wins.pyriteRun, storyRun) : null;
    const draw = pd ? pd.entrants : Orre.tournamentDraw(t, top, Player.levelCap(player)), heal = () => player.party.forEach(Party.heal);
    heal();
    for (let round = 0; round < 4; round++) {
      const e = draw[round];
      await say([round === 3 ? "The final! Your opponent: " + e.name + "!" : "Round " + (round + 1) + "! Your opponent:\n" + e.name + "!"]);
      Screen.say("");
      const outcome = await storyBattle({ foe: { name: e.name, team: teamOf(e.team), pic: e.pic }, prizeClass: e.cls, noBlackout: true,
        defeatText: e.defeat || [pickOne(["You're as tough as they said!", "Argh! I was so close!", "Well fought. Go win the\nwhole thing!", "Not bad… not bad at all."])] });
      heal();
      if (outcome !== "won") { await say(w.lost); await persist(); return; }
    }
    // (Pyrite: each challenge's own TM the first time it's won (orreTourney.pyriteTMs), its own prize money.)
    const got = (wins.pyriteTMs = wins.pyriteTMs || []);
    const firstTime = pd ? !got.includes(pd.first) : !wins[t.key], item = firstTime ? (pd ? pd.first : t.first) : pickOne(t.items);
    if (pd && firstTime) got.push(pd.first);
    if (pd && !storyRun) wins.pyriteRun = (wins.pyriteRun | 0) + 1;
    const money = pd ? pd.prize : t.prize;
    wins[t.key] = (wins[t.key] | 0) + 1;
    Player.addMoney(player, money);
    Player.addItem(player, item, 1);
    if (storyRun) {
      // (#20378 and #20727: the story's challenge won.)
      await say(["{PLAYER}, congratulations! You\nhave won the knockout challenge!", "You have won the ¥" + money + " cash prize and\nthe top " + Bag.name(item) + " prize!"]);
      await sayWithJingle(itemJingle(item), ["{PLAYER} obtained ¥" + money + "!", "{PLAYER} obtained the " + Bag.name(item) + "!"]);
      await pyriteChampion();
      return;
    }
    await sayWithJingle("mus_obtain_badge", w.won(money));
    await say(w.prize(Bag.name(item)));
    await sayWithJingle(itemJingle(item), "{PLAYER} received " + article(Bag.name(item)) + "!");
    await say(w.bye);
    await persist();
  }
  // The challenge's "gorgeous gift" (M2_out #20357): Nore leads you into the Pyrite Building (M2_building_1F #20427).
  async function pyriteChampion() {
    const f = player.flags, N = ORRE("LOBBY_NORE"), door = window.WORLD_MAPS.PyriteTown_Colosseum.warps[0];
    Overworld.addObject(N, { x: door.x, y: door.y - 1, facing: "up" }, { sprite: "orre_peon_m", width: 16, height: 32, frames: 9 });
    await Overworld.act([{ who: N, moves: ["walk_up"] }, { who: "player", moves: ["face_down"] }]);
    await say(["???: Hi, there! You must be the superb\ntrainer who has emerged triumphant in\nour latest battle challenge.",
      "???: Miror B., the town's true mover\nand shaker, wishes you to have a\ngorgeous gift.", "???: Now, follow me."]);
    Screen.say("");
    await Overworld.fadeToBlack();
    Overworld.removeObject(N);
    f.orreGear = 4;
    f.orreStory = Math.max(f.orreStory | 0, 24);
    player.location = { map: "PyriteTown_PyriteBuilding_1F", x: 14, y: 3, facing: "up" };
    await Overworld.teleport(player.location);
    await Overworld.fadeFromBlack();
    await say(["Nore: Right, I'm back with our latest\nchallenge champion.", "Nore: Let's present our lucky winner\nwith a Shadow Pokémon and watch chaos\nunleashed! Fufufu…"]);
    await persist();
    await pyriteNore();
  }
  async function pyriteArrival() {
    const f = player.flags;
    if ((f.orreStory | 0) === 27) { await fateenOutside(); return; }
    // (Colosseum's words: the townsman at the way in, then Rui.)
    await say(["Man: This is Pyrite, the town of\nearth, wind, and money.", "Man: You appear to be outsiders. You\nhad best beware. There are many\nne'er-do-well sorts here."]);
    await say(["Rui: {PLAYER}… It was here in this\nsquare that I saw that strange\nPokémon.", "Rui: I tried to leave town\nafterwards, and that's when those\ncreeps grabbed me.",
      "Rui: We should be careful. Even at\nthe best of times, there's nothing\nnormal about this town.", "Rui: Just as I thought! These guys\nhave those strange Pokémon!",
      "Rui: Why do the trainers here have\nthose strange Pokémon?", "Rui: I'm sure of it now. The town's\nhiding a big secret!"]);
    f.orreStory = 22;
    f.orreLevelCap = Math.max(f.orreLevelCap | 0, ORRE_PYRITE_CAP);
    await say("Your Pokémon can now grow up to\nLv. " + ORRE_PYRITE_CAP + " in Orre!");
    await persist();
  }
  // Duking's house: before the story, a busy man; at 23, Silva storms out and Marcia tells you about Plusle.
  async function dukingsHouse(script) {
    const f = player.flags, story = f.orreStory | 0;
    if (script === "PyriteTown_DukingsHouse_EventScript_Secc") {
      // (Colosseum's words, all of the house's.)
      await say(story >= 27 ? ["Secc: Waaah! You startled me! Oh,\nit's you guys again!", "Secc: Oh, yes. I didn't tell you my\nname yet.", "Secc: I'm Marcia's friend. My name is\nSecc. I'm glad we met you!",
        "Secc: I'm trying to get in touch with\nkids in other towns to gather\ninformation.", "Secc: After all, this is the age of\nnetworking!"]
        : story >= 24 ? ["Secc: Everything will be okay,\nMarcia. Those big people will…"] : ["Secc: That's why, Marcia. We've got\nto somehow Snag them from those\ncriminals…"]);
      return;
    }
    if (script === "PyriteTown_DukingsHouse_EventScript_Marcia") {
      await say(story >= 27 ? ["Marcia: I'm glad everything's fine,\nPapa! And Plusle, too!"]
        : story >= 24 ? ["Marcia: Big people, please help\nPlusle!"] : ["Marcia: Are you Papa's friends? I'm\nMarcia. I'm pleased to meet you.",
          "Marcia: But, sorry, we're busy. We're\ntalking about something that's quite\nimportant.", "Marcia: Please come visit and play\nwith us another time."]);
      return;
    }
    if (story >= 27) {
      await say(["Duking: {PLAYER}. We owe you a great\ndeal. Sincerely, thank you.", "Duking: If you were even a bit later,\nPlusle could have been made a Shadow\nPokémon. That's horrible.",
        "Duking: Miror B. may be gone, but\nthat doesn't mean their Shadow\nPokémon plan is finished.", "Duking: We have to move quickly. We\nneed to gather as much information as\npossible.",
        "Duking: {PLAYER}. I'm counting on\nyou."]);
      return;
    }
    // (While the windmill's gear is gone, #20390; back in, #23483; after the challenge, he's out.)
    const gear = f.orreGear | 0;
    if (story === 23 && (gear === 1 || gear === 2)) { await say(["Duking: What?! Silva cut the power to\nthe Colosseum? Grrr…"]); return; }
    if (story === 23 && gear === 3) { await say(["Duking: I know you can win! I'm\nsorry, but help me."]); return; }
    if (story !== 23) { await say(["Duking: The name's Duking. I run the\nColosseum here.", "Duking: Sorry, but I'm busy. You'll\nhave to excuse me."]); return; }
    // (Silva in the doorway; gone, he rips the windmill's gear out: orreGear 1, game/orre-pyrite.js.)
    const S = ORRE("SILVA"), door = window.WORLD_MAPS.PyriteTown_DukingsHouse.warps[0];
    // (Colosseum's words, all of the scene's: #20379, #20383, #20386; Silva #20760, #20383, #20762. Marcia's #20763 and
    // #20764 are in the Pyrite Building, M2_building_1F: pyriteNore.)
    await say(["Duking: The name's Duking. I run the\nColosseum here."]);
    await say(["Duking: …", "Duking: Sorry, but I'm busy. You'll\nhave to excuse me."]);
    sfx("se_door");
    Overworld.addObject(S, { x: door.x, y: door.y - 1, facing: "up" });
    await Overworld.act([{ who: S, moves: ["walk_up", "walk_up"] }]);
    await say(["???: Duking! How much more are you\ngoing to take from Miror B. and his\nstooges?!", "???: They're using you and the\nColosseum!",
      "???: What is the matter with you?\nHave they sucked the spirit right out\nof you?!"]);
    await say(["Duking: …"]);
    await say(["???: Tch. So you just clam up. I've\nlost faith in you!"]);
    Screen.say("");
    await Overworld.act([{ who: S, moves: ["walk_fast_down", "walk_fast_down", "set_invisible"] }]);
    sfx("se_door");
    Overworld.removeObject(S);
    f.orreGear = 1;
    Overworld.refreshPeople();
    await persist();
  }
  // The Pyrite Building: Nore on the stairs; then Duking.
  async function pyriteNore() {
    const f = player.flags, story = f.orreStory | 0;
    const shadows = Orre.shadowOf("Nore");
    // (Colosseum's words, Nore's and Duking's and Rui's, in Colosseum's order: Nore's #20427, #20429 (or #20430 when
    // you're back after losing), #20431 beaten, #20432 after.)
    if (story < 24) { await say(["Nore: Right, I'm back with our latest\nchallenge champion.", "Nore: Let's present our lucky winner\nwith a Shadow Pokémon and watch chaos\nunleashed! Fufufu…"]); return; }
    await say(f.orreNoreMet ? ["Nore: Huh, what?! You're back again?!", "Nore: I'll fix you so you never come\nback again!"]
      : ["Nore: Wh-What? That same guy who\nmessed with us in Phenac City?", "Nore: Gaaah! I didn't know that when\nI let him in here! I'll boot you back\nout!"]);
    f.orreNoreMet = true;
    const opts = { foe: { name: "Cipher Peon Nore", team: Orre.team("Nore"), pic: "cipher_peon" },
      prizeClass: "Team Rocket", noBlackout: true, snag: shadows.map((s) => s.species), defeatText: ["It's no surprise now how you\nmanaged to win the tournament."] };
    const outcome = await storyBattle(opts);
    if (outcome !== "won") return;
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    await say(["Nore: It's useless! I don't stand a\nchance of winning!"]);
    Screen.say("");
    const N = ORRE("NORE");
    await Overworld.act([{ who: N, moves: ["walk_fast_up", "set_invisible"] }]);
    Overworld.removeObject(N);
    // Duking, in at the door.
    const D = ORRE("BUILDING_DUKING"), door = window.WORLD_MAPS.PyriteTown_PyriteBuilding_1F.warps[0];
    sfx("se_door");
    Overworld.addObject(D, { x: door.x, y: door.y - 1, facing: "up" });
    await say(["Duking: Oh! You're safe! I heard you\nentered this building. It had me\nworried."]);
    await say(["Rui: Duking! This is where they were\ngiving Shadow Pokémon to the winners\nof battle challenges!"]);
    await say(["Duking: Shadow Pokémon? Those\nferocious Pokémon that even attack\npeople?!"]);
    await say(["Rui: Yes! They're giving away Shadow\nPokémon to thugs for some reason. It\ndoesn't look good."]);
    await say(["Duking: Grrr… They were using the\nColosseum to do that?!", "Duking: It's humiliating. But with\nPlusle in their filthy hands, my own\nhands are tied…"]);
    // (Marcia runs in: Colosseum's M2_building_1F #20763, #20764; Rui's #20573, then #20576 and #23076.)
    const MA = ORRE("BUILDING_MARCIA");
    sfx("se_door");
    Overworld.addObject(MA, { x: door.x + 1, y: door.y - 1, facing: "up" }, { sprite: "little_girl", width: 16, height: 16, frames: 10 });
    await say(["Marcia: Big lady! My papa… Papa's\nPokémon was taken away by Miror B. as\na prisoner!", "Marcia: It's Papa's Plusle. I'm so\nworried that they might be mean to\nit…"]);
    await say(["Rui: He did what?! Miror B. used a\ndirty move like that?"]);
    await say(["Rui: He's not getting away with this!\nThat rotten Miror B.!", "Rui: But we're here now! We'll get\nPlusle back for you! Right, {PLAYER}?"]);
    await say(["Rui: Duking, it's dangerous inside\nthis building. You've got to get\neveryone out to safety."]);
    await say(["Duking: Thanks for everything… I have\nto depend on you. I have no choice.", "Duking: Be careful always! Miror B.\nmight look like a clown, but his\nbattling is all business!"]);
    await say(["Rui: Giggle! I know I can always\ncount on you, {PLAYER}!"]);
    Screen.say("");
    await Overworld.act([{ who: D, moves: ["walk_down", "set_invisible"] }, { who: MA, moves: ["walk_down", "set_invisible"] }]);
    Overworld.removeObject(D); Overworld.removeObject(MA);
    f.orreStory = 25;
    Overworld.refreshPeople();
    await persist();
  }
  // The top floor (25): Miror B. and Nascour; Reath and Ferma; Silva; Miror B.'s dare.
  async function pyriteTopFloor() {
    const f = player.flags, M = ORRE("MIROR_B"), N = ORRE("NASCOUR"), R = ORRE("REATH"), F = ORRE("FERMA"), S = ORRE("BUILDING_SILVA");
    for (const [who, x, y, facing] of [[M, 14, 3, "left"], [N, 14, 2, "down"], [R, 5, 3, "left"], [F, 5, 4, "left"], [S, 12, 7, "up"]]) Overworld.addObject(who, { x, y, facing });
    // (Colosseum's words, all but where noted, in Colosseum's order.)
    await say(["Nascour: I trust things are going\naccording to plan, Miror B."]);
    await say(["Miror B.: Oh, yes indeed, Master\nNascour! Our plan is coming along in\na lovely, peachy-keen way.",
      "Miror B.: We have already broken\nDuking's spirit.", "Miror B.: We can do as we please at\nthe Colosseum without his meddling.",
      "Miror B.: We've been giving away\nShadow Pokémon on the sly to\nchallenge winners for gathering data."]);
    await say(["Nascour: Good. The others also appear\nto be doing their parts to implement\nour plan.", "Nascour: Our Shadow Pokémon plan is\nfalling into place quickly. The final\nphase is not far off."]);
    await say(["Miror B.: Fuhohoho! This is perking\nup my spirit and body! Oh, I feel\nlike dancing!"]);
    await say(["Nascour: Save your dancing until our\nplan succeeds. I'm off."]);
    Screen.say("");
    await Overworld.act([{ who: N, moves: ["walk_down", "walk_down", "walk_left", "walk_left", "set_invisible"] }]);
    Overworld.removeObject(N);
    // (Silva, beaten, and Miror B.'s Peons.)
    await say(["Silva: Grr… Wh-Where's Miror B.? I'm\ntaking him down!"]);
    await say(["Reath: Take him down? After the\nbeating you took? That's too funny!\nAhahah!"]);
    await say(["Silva: You wait, I'm going to drive\nall of you out of this town!"]);
    // (Who says which: Colosseum's unnamed lines #23188–#23191 come just before Reath's named #23192/#23193, so they're
    // hers; #23257–#23258 just before Ferma's #23260, so hers; #23261 hers after, then Reath's #23195, "Righto, Ferma!")
    await say(["Reath: Ahahah! Ooh, such a feisty\nboy!", "Reath: Don't tell me we have to take\nyour Pokémon hostage to make you\nsettle down. Like we did with Duking."]);
    sfx("se_pin");
    await Overworld.act([{ who: R, moves: ["emote_exclamation_mark", "face_right"] }, { who: F, moves: ["face_right"] }]);
    await say(["Reath: Oh? We seem to be getting a\nlot of unexpected company today.", "Reath: But that's no excuse for being\na bad host!"]);
    await say(["Reath: Hello, welcome! …You didn't\nreally expect me to say that and mean\nit?"]);
    await say(["Ferma: Darling, aren't you one of\nDuking's people?", "Ferma: What made you think that you\ncould simply waltz in here? Such a\nsilly boy.",
      "Ferma: Were you hired by Duking as\nhis bodyguards?", "Ferma: Let me warn you, if you mess\nwith us, you'd better be prepared for\nthe consequences!"]);
    const shadowsR = Orre.shadowOf("Reath"), shadowsF = Orre.shadowOf("Ferma");
    const opts = {
      foe: { name: "Miror B. Peon Reath", team: Orre.team("Reath"), pic: "cipher_peon_f" },
      foe2: { name: "Miror B. Peon Ferma", team: Orre.team("Ferma"), pic: "cipher_peon_f", prizeClass: "Team Rocket", defeatText: ["What just happened?!\nUnbelievable 2!"] },
      prizeClass: "Team Rocket", noBlackout: true, snag: shadowsR.concat(shadowsF).map((s) => s.species),
      defeatText: ["How did that happen?\nUnbelievable!"] };
    const outcome = await storyBattle(opts);
    if (outcome !== "won") { [M, R, F, S].forEach((w) => Overworld.removeObject(w)); return; }
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    await say(["Reath: My Pokémon couldn't muster\na thing! You're no ordinary trainer!"]);
    await say(["Ferma: Reath, let's make ourselves\nscarce for the time being!"]);
    await say(["Reath: Righto, Ferma!", "Reath: Ultra-super fire dash!"]);
    Screen.say("");
    await Overworld.act([{ who: R, moves: ["walk_fast_up", "set_invisible"] }, { who: F, moves: ["walk_fast_up", "walk_fast_up", "set_invisible"] }]);
    Overworld.removeObject(R); Overworld.removeObject(F);
    await say(["Silva: Urrrgggh… Wait… Wait, you two…", "Silva: Urgh… Owwww…", "Silva: Thank you. You saved me. Do\nyou people know Duking?"]);
    await say(["Rui: That's why we're here. We came\nto rescue Plusle."]);
    await say(["Silva: Okay… I'm a fool. I didn't\nknow what was happening at all…", "Silva: They'd taken Duking's Pokémon\nhostage! How could they do something\nso downright dirty?",
      "Silva: I'm going, too! Agh, owowow…"]);
    await say(["Rui: Not in your condition. You'll\nhave to wait here."]);
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(["Miror B.: Fuhohoho! We meet again,\nkiddies!"]);
    await say(["Silva: M-Miror B.! You cowardly\ncheat!"]);
    await say(["Miror B.: Cowardly cheat? That's so\nnot true!", "Miror B.: Taking a hostage is\nperfectly fine as a bargaining\ntactic!"]);
    await say(["Rui: You've got to be kidding! Where\nis it? Give it back!"]);
    await say(["Miror B.: Oh, the darling couldn't be\nany safer if it tried!", "Miror B.: I'm sure it will come to\nadore me before too much longer."]);
    await say(["Rui: You call that a tactic? Plusle\nhad better be okay!"]);
    await say(["Miror B.: Fuhohoho. No running or\nhiding for me! Come to the cave;\nthat's where I'll be.", "Miror B.: I'll be waiting for you, my\npretties! Fuhohoho!"]);
    Screen.say("");
    await Overworld.act([{ who: M, moves: ["walk_down", "walk_down", "walk_down", "set_invisible"] }]);
    Overworld.removeObject(M);
    await say(["Silva: Be careful when you go to the\ncave! The sentinel is tough!"]);
    Overworld.removeObject(S);
    f.orreStory = 26;
    applyPatches("PyriteCave");
    await persist();
  }
  // Miror B.'s hideout (26): the battle, then Plusle and Duking.
  async function mirorBHideout() {
    const f = player.flags, M = ORRE("HIDEOUT_MIROR_B");
    // (Colosseum's words, all but where noted.)
    await say(["Miror B.: Yeah, woot! It's about\ntime, darlings! I'm so frightfully\ntired of waiting for you.", "Miror B.: Stop the music!"]);
    await say(["Miror B.: Oh, you kept me waiting for\nso long, I decided to work up a\nlittle perspiration! Fuhohoho.",
      "Miror B.: But, my, you have been busy\nbeing naughty and messing up our\nplans.", "Miror B.: It was oh-so-close for\neverything to turn out just right,\njust the way we hoped.",
      "Miror B.: But I can salvage our plan\nby beating you, little man. And so…", "Miror B.: There's time for one last\nfrantic dance before the grand\nfinale!",
      "Miror B.: Let the music play!"]);
    const shadows = Orre.shadowOf("Miror B.");
    const opts = { foe: { name: "Cipher Admin Miror B.", team: Orre.team("Miror B."), pic: "rocker" },
      prizeClass: "Leader", noBlackout: true, snag: shadows.map((s) => s.species), defeatText: ["I can't keep up with the tempo!\nOh, no, no, what a no-no!"] };
    const outcome = await storyBattle(opts);
    if (outcome !== "won") { await say(["Miror B.: Fwohohoho! My dancing is\nsheer perfection today!"]); return; }
    if ((opts.snagged || []).length) (f.orreShadowSnagged = f.orreShadowSnagged || []).push(...opts.snagged);
    await say(["Miror B.: How, how, how dare you!\nDon't you dare think you'll get away\nwith your latest outrage!",
      "Miror B.: One of these days, I will\ntake great pleasure in kicking you\nabout with my elegant dance steps!", "Miror B.: Oh, and I'm not giving up\nour Shadow Pokémon plan!",
      "Miror B.: Let's go! Escape!"]);
    Screen.say("");
    await Overworld.act([{ who: M, moves: ["walk_fast_left", "walk_fast_left", "walk_fast_down", "set_invisible"] }]);
    Overworld.removeObject(M);
    cry("Plusle");
    await say(["Rui: {PLAYER}! Did you hear those\ncries? It must be Plusle!", "Rui: I think those cries came from\nbehind that door."]);
    const P = ORRE("HIDEOUT_PLUSLE"), D = ORRE("HIDEOUT_DUKING");
    sfx("se_door");
    Overworld.addObject(D, { x: 7, y: 4, facing: "down" });
    await Overworld.act([{ who: D, moves: ["walk_down", "walk_down"] }]);
    await say(["Duking: Gasp, gasp… {PLAYER}, you're\nsafe! Oh! And Plusle!"]);
    await Overworld.act([{ who: P, moves: ["walk_left", "walk_left", "walk_up"] }]);
    cry("Plusle");
    await say(["Duking: Even that Miror B.'s been\ndriven out, thanks to {PLAYER}.", "Duking: Hm, what's that, Plusle?\nFeeling hungry out of relief?\nWahahah!",
      "Duking: Okay, {PLAYER}! Let's quit\nthis moldy cavern, and quick!"]);
    Screen.say("");
    await Overworld.fadeToBlack();
    Overworld.removeObject(P); Overworld.removeObject(D);
    f.orreStory = 27;
    Overworld.refreshPeople();
    await Overworld.fadeFromBlack();
    await say(["Rui: Miror B. got away, but things\nwill be back to normal here."]);
    // (Back in town, Fateen stops you and points you north: fateenOutside, orreStory 28.)
    await persist();
  }
  // Es Cade, at home.
  async function esCade() {
    const story = player.flags.orreStory | 0;
    if (story >= 21) {
      await say(["Es Cade: Ah, it's you two! I'm so glad\nto see that you're safe!", "I have heard. The thugs from our\nneighboring town came here, even going\nso far as entering my own home!",
        "They did this deliberately while I was\naway. How dare they!", "I will continue with our investigation.\nWhatever you do, please take care!"]);
      return;
    }
    await say(["Es Cade: Ah, a traveler! Welcome to\nPhenac City! I am Es Cade, the Mayor.", "You appear to be a Pokémon Trainer\nyourself.",
      "If so, I urge you to visit our city's\npride and joy, our Pokémon Stadium!"]);
  }
  // The bartender: a hot meal (the party rested) any time, and the bar's
  // stock once Folly and Trudly have gone with their delivery.
  async function orreBartender() {
    await say(["Welcome to the Outskirt Stand!"]);
    if (await confirm("You look beat. How about a hot meal?\nOn the house, for a new face.")) {
      player.party.forEach(Party.heal);
      await sayWithJingle("mus_heal", "{PLAYER} and the Pokémon ate their fill.\nEveryone's rested!");
    }
    if ((player.flags.orre | 0) < 2) { await say(["Sorry, kid, the shop's shut till I've\nsorted out the morning's delivery."]); return; }
    await mart(Orre.SHOP);
  }
  // The jukebox: another song.
  const JUKEBOX = ["mus_game_corner", "mus_celadon", "mus_sevii_123", "mus_route24", "mus_cinnabar"];
  async function orreJukebox() {
    if (!(await confirm("It's a jukebox, lit up in every colour.\nPlay a song?"))) return;
    const f = player.flags;
    f.orreJukebox = ((f.orreJukebox | 0) + 1) % JUKEBOX.length;
    music(JUKEBOX[f.orreJukebox]);
    await say(["♪ A twangy tune starts up…"]);
  }

  // ---------- The Sevii Islands: Bill's trip ----------
  //
  // Beat Blaine and Bill's waiting outside his Gym (VAR_MAP_SCENE_CINNABAR_ISLAND
  // 1: flags.cinnabarScene): he'd like you to come with him to One Island. Say
  // no and he waits in Cinnabar's Pokémon Center. His pal's Seagallop takes
  // you to One Island, where he introduces you to Celio; you take a Meteorite
  // to Lostelle's dad on Two Island, find Lostelle in Three Island's Berry
  // Forest past the bikers, and Bill takes you home to Cinnabar.
  const CINNABAR_BILL = "LOCALID_CINNABAR_BILL", CINNABAR_SEAGALLOP = "LOCALID_CINNABAR_SEAGALLOP";

  // Off the boat at One Island (OneIsland_Harbor's and OneIsland's ON_FRAME
  // scenes): up out of the harbor, and Bill takes you to the Pokémon Center.
  const ONE_BILL = "LOCALID_ONE_ISLAND_BILL";

  // One Island's Pokémon Net Center (OneIsland_PokemonCenter_1F_EventScript_MeetCelioScene):
  // Bill introduces you to Celio, who can't get his PCs to link with Kanto's.
  // Bill stays to help, and gives you the Meteorite for Lostelle's dad on Two
  // Island; Celio gives you the Tri-Pass, and the Town Map's page of the
  // Sevii Islands. The PCs can't reach Bill's storage meanwhile.
  const PC_BILL = "LOCALID_ONE_ISLAND_POKEMON_CENTER_BILL", CELIO = "LOCALID_CELIO";
  const TWO_ISLAND_STOCK = {
    1: ["great-ball", "fresh-water"],
    2: ["ultra-ball", "great-ball", "soda-pop", "fresh-water"],
    3: ["ultra-ball", "great-ball", "lemonade", "soda-pop", "fresh-water", "moomoo-milk"],
    4: ["ultra-ball", "repeat-ball", "timer-ball", "lemonade", "soda-pop", "fresh-water", "moomoo-milk", "lava-cookie"]
  };

  // The Joyful Game Corner: Lostelle's dad, the biker, and Lostelle home.
  const GC_DADDY = "LOCALID_JOYFUL_GAME_CORNER_DADDY", GC_BIKER = "LOCALID_JOYFUL_GAME_CORNER_BIKER", GC_LOSTELLE = "LOCALID_JOYFUL_GAME_CORNER_LOSTELLE";
  const bigGuy = () => [Player.LOOKS[player.look] && Player.LOOKS[player.look].girl ? "big girl" : "big guy"];
  let capeBrinkJustTaught = false;

  // The Move Maniac (TwoIsland_House_EventScript_MoveManiac): a move a
  // Pokémon has forgotten (or could have learned by now), for two Tiny
  // Mushrooms or a Big Mushroom.
  let moveManiacMet = false;

  // ---------- Three Island ----------
  //
  // The bikers (ThreeIsland_EventScript_BikerArgumentScene and the rest): two
  // islanders face down a gang of bikers in the road north. Once a biker's
  // been to Two Island (the Joyful Game Corner), their boss Paxton turns up;
  // walk past and the gang takes you on, three bikers and then Paxton, and
  // they leave the island.
  const TB = { anti1: "LOCALID_THREE_ISLAND_ANTIBIKER1", anti2: "LOCALID_THREE_ISLAND_ANTIBIKER2", paxton: "LOCALID_PAXTON",
    b1: "LOCALID_THREE_ISLAND_BIKER1", b2: "LOCALID_THREE_ISLAND_BIKER2", b3: "LOCALID_THREE_ISLAND_BIKER3",
    b4: "LOCALID_THREE_ISLAND_BIKER4", b5: "LOCALID_THREE_ISLAND_BIKER5", b6: "LOCALID_THREE_ISLAND_BIKER6" };

  // ---------- Mt. Ember ----------
  //
  // Team Rocket's two grunts outside the Ruby Path: "We'll try digging here"
  // until Celio asks for the Ruby; then you overhear the Rocket Warehouse's
  // passwords ("Goldeen need log", "Yes, nah, Chansey") and they battle you,
  // and the way in opens. Moltres waits at the summit.
  const EMBER_GRUNTS = ["TRAINER_TEAM_ROCKET_GRUNT_43", "TRAINER_TEAM_ROCKET_GRUNT_44"];

  // Four Island's Day-Care (FourIsland_PokemonDayCare_EventScript_DaycareWoman
  // and FourIsland_EventScript_DaycareMan): FireRed's two-Pokémon Day-Care.
  // The lady takes up to two Pokémon to raise (game/daycare.js: a point of
  // Exp. a step, ¥100 and ¥100 a level to take one back); her husband outside
  // says how they're doing, and has the Eggs the two of them find
  // (game/breeding.js).
  const DC = (k) => T("DayCare_Text_" + k);
  // (Route 34's in Johto is the same Day-Care, its own: player.flags.johtoDayCare and johtoDayCareEggs.)
  const DAY_CARES = { unova: {list:"unovaDayCare",eggs:"unovaDayCareEggs",lady:null}, four: { list: "dayCare2", eggs: "dayCareEggs", lady: "LOCALID_FOUR_ISLAND_DAYCARE_WOMAN" }, johto: { list: "johtoDayCare", eggs: "johtoDayCareEggs", lady: null }, sinnoh: { list: "sinnohDayCare", eggs: "sinnohDayCareEggs", lady: null } };

  // Icefall Cave 1F's thin ice (IcefallCaveIcePerStepCallback): a step on it
  // cracks it, the next breaks it and you fall through to B1F. Whole again
  // once you've left (FireRed's FLAG_TEMP_1..9). { "x,y": 1 cracked, 2 broken }
  let icefallIce = {};

  // Icefall Cave's back (FourIsland_IcefallCave_Back_EventScript_LoreleiRocketsScene):
  // Lorelei, home on Four Island, catches Team Rocket poaching the cave's
  // Pokémon. She asks you to help, and battles two of them beside you (a
  // tag battle: this game's own; FireRed's is you against one); beaten, he won't say where
  // they've taken the Pokémon until her Lapras makes him, then they run off:
  // the Rocket Warehouse on Five Island.
  const ICEFALL_LORELEI = [["Dewgong", 40], ["Jynx", 40], ["Lapras", 42]];
  const ICEFALL_GRUNT2 = [["Sneasel", 38], ["Koffing", 38], ["Golbat", 39]];

  // The Memorial Pillar: a man scrubbing his Onix's grave. Leave a Lemonade
  // there and he gives you TM42 Facade (FiveIsland_MemorialPillar_EventScript_*).
  const MEMORIAL_MAN = "LOCALID_MEMORIAL_MAN", P5 = (k) => T("FiveIsland_MemorialPillar_Text_" + k);

  let stepEvolvers = null;
  const STEP_EVOLVERS = () => stepEvolvers || (stepEvolvers = new Set(Object.keys(window.EVOLUTIONS).filter((sp) => window.EVOLUTIONS[sp].some((e) => e.steps))));

  // ---------- Eggs (game/breeding.js) ----------
  //
  // Each step: the Four Island Day-Care's couple may find an Egg (it waits
  // with the Day-Care Man), and the Eggs in your party get nearer hatching.
  function eggStep() {
    const f = player.flags;
    // (And the steps Gen 9's walkers count: Pawmo, Bramblin and Rellor, up to the 1,000 they need.)
    for (const r of player.party) if (!r.egg && STEP_EVOLVERS().has(r.species) && (r.steps | 0) < 1000) r.steps = (r.steps | 0) + 1;
    if (f.dayCare2 && f.dayCare2.length === 2) Breeding.dayCareStep(f.dayCareEggs || (f.dayCareEggs = {}), f.dayCare2, Math.random, Player.itemCount(player,"oval-charm")>0);
    if (f.sinnohDayCare && f.sinnohDayCare.length === 2) Breeding.dayCareStep(f.sinnohDayCareEggs || (f.sinnohDayCareEggs = {}), f.sinnohDayCare, Math.random, Player.itemCount(player,"oval-charm")>0);
    if (f.johtoDayCare && f.johtoDayCare.length === 2) Breeding.dayCareStep(f.johtoDayCareEggs || (f.johtoDayCareEggs = {}), f.johtoDayCare, Math.random, Player.itemCount(player,"oval-charm")>0);
    if (f.unovaDayCare && f.unovaDayCare.length === 2) Breeding.dayCareStep(f.unovaDayCareEggs || (f.unovaDayCareEggs = {}), f.unovaDayCare, Math.random, Player.itemCount(player,"oval-charm")>0);
    const egg = Breeding.hatchStep(f.eggHatch || (f.eggHatch = {}), player.party);
    return egg ? { type: "egg-hatch", record: egg } : null;
  }
  // An Egg hatching (EventScript_EggHatch, then FireRed's egg hatch scene,
  // ui/egg-hatch.js): "Huh?", the screen fades, the Egg wobbles and bursts to
  // the evolution music, its cry, "X hatched from the Egg!" to its fanfare,
  // and a nickname if you like.
  async function eggHatches(egg) {
    await say("Huh?");
    Screen.say("");
    await Overworld.fadeToBlack();
    Breeding.hatch(egg, player.location.map);
    SinnohVilla.record(player,"eggs");
    Player.markCaught(player, egg.species);   // (AddHatchedMonToParty)
    // (Elm's Mystery Egg: he'll call about it, CALL_TRIGGER_ELM_EGG_HATCHED.)
    if (egg.species === "Togepi" && johto.flag("FLAG_GOT_EGG_FROM_ELMS_ASSISTANT") && !johto.flag("FLAG_SYS_HATCHED_TOGEPI_EGG")) {
      johto.setFlag("FLAG_SYS_HATCHED_TOGEPI_EGG", true);
      gear.setTrigger(0, true);
    }
    const name = Party.speciesName(egg.species);
    show("scene");
    clearMenu();
    music(null);
    const s = await EggHatchScene.open(scene, { mon: Screen.spriteUrl(egg.species, Party.form(egg), false, egg.shiny) });
    try {
      // (Task_EggHatchPlayBGM: the evolution intro, then a second later the evolution music.)
      const intro = GA && GA.se("mus_evolution_intro");
      setTimeout(() => music("mus_evolution"), intro ? intro * 1000 : 1000);
      await s.run();
      cry(egg.species);
      await sleep(1000);
      const jingle = fanfare("mus_evolved");
      await message(name + " hatched from the Egg!");
      await jingle;
      if (await confirm("Would you like to nickname the newly\nhatched " + name + "?")) {
        const typed = await enterText(name + "'s nickname?", name, 10);
        if (typed && typed !== name) egg.nickname = typed;
      } else await s.fadeOut();
    } finally {
      s.close();
    }
    Screen.say("");
    music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music);
    await persist();
  }

  // The Water Labyrinth's gentleman (FiveIsland_WaterLabyrinth_EventScript_EggGentleman):
  // a lead Pokémon as fond of you as can be, and he gives you the Egg he got
  // on his travels: a Togepi Egg (FireRed's giveegg SPECIES_TOGEPI). After, he remembers Daisy
  // when you have a Togepi or Togetic of your own with you.
  async function eggGentleman() {
    const f = player.flags, E = (k) => T("FiveIsland_WaterLabyrinth_Text_" + k);
    if (!f.gotTogepiEgg) {
      if (!f.noRoomForTogepiEgg) {
        await say(E("LetMeTakeLookAtMons"));
        if (!Sevii.leadFriendshipMax(player.party)) { await say(E("HmmISeeIsee")); return; }
        await say(E("TreatMonRightHaveThis"));
      }
      if (player.party.length >= Player.PARTY_SIZE) { f.noRoomForTogepiEgg = true; await say(E("DontHaveSpaceInYourParty")); return; }
      f.gotTogepiEgg = true;
      delete f.noRoomForTogepiEgg;
      await sayWithJingle("mus_level_up", E("ReceivedEggFromMan"));
      player.party.push(Breeding.giftEgg("Togepi", { map: player.location.map, from: "traveling-man" }));
      await say(E("GladIMetSomeoneLikeYou"));
      return;
    }
    const mine = player.party.find((r) => !r.egg && (r.species === "Togepi" || r.species === "Togetic") && r.ot && r.ot.id === player.trainerId);
    if (mine) await say(E("CuteMonRemindsMeOfDaisy"), ["", Party.speciesName(mine.species)]);
    else await say(E("GladIMetSomeoneLikeYou"));
  }

  // Resort Gorgeous: Selphy, lost in the Lost Cave (FiveIsland_LostCave_Room10_EventScript_FindSelphyScene),
  // battles you and asks you to take her home; at home she wants to see a
  // Pokémon (FiveIsland_ResortGorgeous_House_EventScript_Selphy) and her
  // butler thanks you for it.
  async function lostSelphy() {
    const f = player.flags, L = (k) => T("FiveIsland_LostCave_Room10_Text_" + k), S = "LOCALID_LOST_CAVE_SELPHY", id = "TRAINER_LADY_SELPHY";
    await Overworld.act([{ who: S, moves: M("FiveIsland_LostCave_Room10_Movement_SelphyWander") }]);
    await sleep(1667);
    await Overworld.act([{ who: S, moves: M("FiveIsland_LostCave_Room10_Movement_SelphyApproach") }]);
    await say(L("SelphyIntro"));
    if (!canBattle()) return;
    const data = window.WORLD_TRAINERS[id];
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: L("SelphyDefeat"), trainerId: id, prizeClass: data.className });
    if (outcome !== "won") return;
    show("world");
    await Overworld.resume();
    await say(L("MayIAskYouToTakeMeHome"));
    Screen.say("");
    f.lostCaveScene = 1;
    f.resortScene = 1;
    await Overworld.teleport({ map: "FiveIsland_ResortGorgeous", x: 39, y: 10, facing: "up" });
    await selphyHome();
  }
  // FiveIsland_ResortGorgeous_EventScript_SelphyReturnHomeScene.
  async function selphyHome() {
    const S = "LOCALID_RESORT_GORGEOUS_SELPHY";
    await say(T("FiveIsland_ResortGorgeous_Text_SelphyThanksYouMayGoNow"));
    Screen.say("");
    await Overworld.act([{ who: S, moves: M("Common_Movement_WalkInPlaceFasterUp") }]);
    sfx("se_door");
    await Overworld.act([{ who: S, moves: M("FiveIsland_ResortGorgeous_Movement_SelphyEnterHome") }]);
    Overworld.removeObject(S);
    player.flags.resortScene = 2;
  }
  async function selphy() {
    const f = player.flags, H = (k) => T("FiveIsland_ResortGorgeous_House_Text_" + k), Hm = (k) => M("FiveIsland_ResortGorgeous_House_Movement_" + k);
    const S = "LOCALID_RESORT_GORGEOUS_HOUSE_SELPHY", B = "LOCALID_RESORT_GORGEOUS_HOUSE_BUTLER", shown = "FiveIsland_ResortGorgeous_House:shown";
    const facing = Overworld.position().facing, turn = (who, dir) => ({ who, moves: M("Common_Movement_WalkInPlaceFaster" + dir) });
    if (tempFlags.has(shown)) { await say(H("SelphyWishYouBestOfLuck")); return; }
    const request = async () => {
      if (!f.resortRequest || f.resortRequest.expired) f.resortRequest = Sevii.resortRequest(player.pokedex.seen);
      await say(H("WishToSeeMonPlease"), [Party.speciesName(f.resortRequest.species)]);
    };
    const r = f.resortRequest;
    if (r && r.expired) { await say(H("OhImTiredOfWaiting")); await request(); return; }
    if (!r) { await say(H("PleaseHearMyWish")); await request(); return; }
    if (!player.party.some((m) => m.species === r.species && !m.egg)) { await request(); return; }
    await say(H("MonYouCaughtForMeThankYou"), [Party.speciesName(r.species)]);
    Overworld.addObject(B, { x: 6, y: 2, facing: "down" });
    await Overworld.act([{ who: B, moves: Hm("ButlerEnter") }]);
    await say(H("ButlerYesMyLady"));
    await Overworld.act([turn(S, "Up")]);
    await say(H("SelphyGiveTokenOfAppreciation"));
    await say(H("ButlerIShallDoAsYouBid"));
    Screen.say("");
    if (facing === "up") { await Overworld.act([turn(S, "Down"), { who: B, moves: Hm("ButlerApproachPlayerNorth") }]); await Overworld.act([turn("player", "Left")]); }
    else if (facing === "down") { await Overworld.act([{ who: B, moves: Hm("ButlerApproachPlayerSouth") }]); await Overworld.act([turn("player", "Up")]); }
    else if (facing === "right") { await Overworld.act([turn(S, "Left"), { who: B, moves: Hm("ButlerApproachPlayerEast") }]); await Overworld.act([turn("player", "Up")]); }
    else await Overworld.act([{ who: B, moves: Hm("ButlerApproachPlayerWest") }]);
    await say(H("ButlerPleaseAcceptThisAsHerThanks"));
    Player.addItem(player, r.reward);
    await sayWithJingle(itemJingle(r.reward), "{PLAYER} received " + article(Bag.name(r.reward)) + "!");
    tempFlags.add(shown);   // (FLAG_TEMP_2)
    delete f.resortRequest;
  }

  // ---------- Seven Island ----------
  //
  // Sevault Canyon's Chansey dance (SevenIsland_SevaultCanyon_House_EventScript_ChanseyDanceMan):
  // dance along and your Pokémon are healed, once a visit.
  const CHANSEY_DANCE = ["walk_in_place_down", "delay_16", "walk_in_place_down", "delay_16", "walk_in_place_down", "delay_16",
    "walk_in_place_down", "delay_16", "walk_in_place_faster_right", "delay_4", "walk_in_place_faster_up", "delay_4",
    "walk_in_place_faster_left", "delay_4", "walk_in_place_faster_down", "delay_4"];

  // The Tanoby Key (SevenIsland_SevaultCanyon_TanobyKey_EventScript_Switch1-7):
  // a boulder pushed onto each of its seven switches; the seventh, and far
  // away the Tanoby Ruins rumble open (FLAG_SYS_UNLOCKED_TANOBY_RUINS).
  const TANOBY_KEY = "SevenIsland_SevaultCanyon_TanobyKey";

  // ---------- Trainer Tower ----------
  //
  // FireRed's Trainer Tower (data/scripts/trainer_tower.inc, src/trainer_tower.c;
  // the rules are in game/trainer-tower.js). At the lobby's counter you choose
  // a challenge, Single, Double, Knockout or Mixed, and the clock starts: up
  // the stairs, a battle on each of eight floors (two Pokémon a side, a double
  // battle, or three trainers one after another), at your best Pokémon's
  // level, with no Exp. or money for winning and no healing on the way but
  // the lobby's. Lose and you're back in the lobby. The tower's owner waits
  // on the roof with the challenge's prize (once each) and your time, the
  // best of them on the lobby's Time Board.
  const TOWER = { D1: "LOCALID_TOWER_TRAINER_DOUBLES1", S: "LOCALID_TOWER_TRAINER_SINGLES", K: "LOCALID_TOWER_TRAINER_KNOCKOUT",
    D2: "LOCALID_TOWER_TRAINER_DOUBLES2" };
  const towerFloorNo = (map) => { const m = /^TrainerTower_(\d)F$/.exec(map || ""); return m ? +m[1] : 0; };
  const towerMode = () => (player.flags.tower ? player.flags.tower.mode : 0);
  const towerFloor = (n) => TrainerTower.floor(towerMode(), n);
  const towerLook = (gfx) => Object.assign({}, (window.WORLD_SPRITES || {})[gfx] || {});
  const lobbyText = (k) => T("TrainerTower_Lobby_Text_" + k);
  let towerCounterOpen = false;
  // ---------- Battle Points and the lobby's BP tutor (this game's own) ----------
  //
  // Each trainer beaten in Trainer Tower earns Battle Points (player.flags.bp):
  // 1 on floors 1-3, 2 on 4-6, 3 on 7 and 8. The man by the lobby's right-hand
  // counter teaches a Pokémon any of its tutor moves (every game's: its
  // learnset's tutor list, and FireRed's tutors' moves it can learn) for BP:
  // 16 for a status move, else by power: 8 up to 60, 16 up to 80, 24 up to
  // 100, 32 above.
  const towerBP = (floor) => (floor <= 3 ? 1 : floor <= 6 ? 2 : 3);
  function bpTutorPrice(move) {
    const m = window.MOVES[move];
    if (!m || m.cat === "Status" || !(m.power > 1)) return 16;
    return m.power <= 60 ? 8 : m.power <= 80 ? 16 : m.power <= 100 ? 24 : 32;
  }
  // (And Pokémon XD's: the four moves each of its Shadow Pokémon has on being
  // purified, window.XD_PURIFICATION_MOVES, Serebii's "Special Attacks".)
  function bpTutorMoves(record) {
    const set = window.LEARNSETS_GEN6[record.species] || window.LEARNSETS_GEN6[String(record.species).split("-")[0]] || {};
    const fr = Object.keys(window.TUTOR_LEARNERS || {}).filter((m) => window.TUTOR_LEARNERS[m].includes(record.species));
    const xd = window.XD_PURIFICATION_MOVES[Party.speciesName(record.species)] || [];
    return [...new Set((set.tutor || []).concat(fr, xd))].filter((m) => window.MOVES[m] && !Party.knowsMove(record, m)).sort();
  }
  // Orre's people's sprites at the size the rest of the game draws them (a Biker's bike, the cyclists, 32 pixels wide; the
  // little ones 16 high): Orre's map data and the people added to it took every sprite to be 16 by 32.
  {
    const size = {};
    for (const m of Object.values(window.WORLD_MAPS)) if (m.region !== "orre") for (const p of m.people || []) if (p.sprite && !size[p.sprite]) size[p.sprite] = p;
    for (const m of Object.values(window.WORLD_MAPS)) if (m.region === "orre") for (const p of m.people || []) {
      const c = size[p.sprite];
      if (c) Object.assign(p, { width: c.width, height: c.height, frames: c.frames });
    }
  }
  const BP_TUTOR = "TrainerTower_Lobby_EventScript_BPTutor";
  {
    const m = window.WORLD_MAPS.TrainerTower_Lobby;
    if (m && !m.people.some((p) => p.script === BP_TUTOR)) {
      m.people.push({ id: 951, x: 17, y: 12, movement: "face_left", rangeX: 0, rangeY: 0, script: BP_TUTOR, flag: null,
        text: null, localId: "LOCALID_TOWER_BP_TUTOR", sprite: "gentleman", width: 16, height: 32, frames: 10 });
    }
    SPECIAL.add(BP_TUTOR);
  }
  // ---------- Route 40's Battle Tower (Crystal's; this game's own) ----------
  //
  // Crystal's Battle Tower stands north of Route 40, through the gatehouse
  // where HGSS has its Battle Frontier (which this game hasn't got): FireRed's
  // Trainer Tower lobby, drawn again here, stands in for Crystal's. At the
  // counter (or its receptionist) choose a level, 10 to 100 by tens, and three
  // Pokémon at or under it, no two of one species, none holding the same item
  // as another, no Eggs (Crystal's rules); then seven battles in a row against
  // the Trainer Tower's trainers (three of their six Pokémon each, FireRed's
  // sets, at the chosen level), your three healed between battles, no Exp. or
  // money, and you may stop between them. The battles are in a room of their
  // own (Emerald's Battle Tower's battle room): each Trainer walks in, and out
  // again once beaten, and the next walks in. Battle Points for each win, and
  // a bonus for all seven with the level's prize (Crystal's vitamins and PP
  // Ups at the lower levels, Rare Candies and better above); lose and the
  // challenge ends. The nurse heals, the clerk is the BP Shop, and the BP
  // tutors (the Trainer Tower's) teach for BP. The stairs up are gone (no
  // floors above). The sign keeps your best streak at each level.
  const BATTLE_TOWER = "BattleTower_Lobby", BT_ENTRY = "BattleTower_Lobby_EventScript_EntryTrigger", BT_RECEPTION = "BattleTower_Lobby_EventScript_Receptionist",
    BT_NURSE = "BattleTower_Lobby_EventScript_Nurse", BT_SIGN = "BattleTower_Lobby_EventScript_Sign";
  const BT_BATTLES = 7;
  // (The level: your three's highest, the trainers' Pokémon scaled to it; the
  // BP by it, and the prizes Trainer Tower's, more of them the higher.)
  const btBP = (level) => 3 + Math.floor(level / 20), btWinBP = (level) => 1 + Math.floor(level / 50);
  const BT_ROOM = "BattleTower_BattleRoom", BT_FOE = "LOCALID_BATTLE_TOWER_OPPONENT";
  const btLevel = (team) => Math.max(...team.map((r) => r.level));
  const btRewards = (level) => TrainerTower.rewardsAt(level < 40 ? 1 : level < 70 ? 2 : 3, 2);
  {
    const src = window.WORLD_MAPS.TrainerTower_Lobby, gate = window.WORLD_MAPS.Route40_BattleFrontierGatehouse;
    if (src && gate && !window.WORLD_MAPS[BATTLE_TOWER]) {
      const m = JSON.parse(JSON.stringify(src));
      const person = (localId, script) => Object.assign({}, src.people.find((p) => p.localId === localId), { script, localId: localId.replace("TOWER", "BATTLE_TOWER") });
      Object.assign(m, { name: BATTLE_TOWER, title: "Battle Tower", region: "johto", image: "TrainerTower_Lobby", patches: {}, showName: true,
        warps: [{ x: 9, y: 15, map: "Route40_BattleFrontierGatehouse", warp: 1 }],
        signs: [{ x: 8, y: 10, script: BT_SIGN, text: null }],
        triggers: [{ x: 9, y: 7, script: BT_ENTRY }],
        people: [person("LOCALID_TOWER_NURSE", BT_NURSE), person("LOCALID_TOWER_MART_CLERK", "TrainerTower_Lobby_EventScript_MartClerk"),
          person("LOCALID_TOWER_RECEPTIONIST", BT_RECEPTION),
          // (The BP tutors, the Trainer Tower's: their moves, and the Egg moves.)
          { id: 951, x: 17, y: 12, movement: "face_left", rangeX: 0, rangeY: 0, script: "TrainerTower_Lobby_EventScript_BPTutor", flag: null,
            text: null, localId: "LOCALID_BATTLE_TOWER_BP_TUTOR", sprite: "gentleman", width: 16, height: 32, frames: 10 },
          { id: 952, x: 17, y: 14, movement: "face_left", rangeX: 0, rangeY: 0, script: "TrainerTower_Lobby_EventScript_BPEggTutor", flag: null,
            text: null, localId: "LOCALID_BATTLE_TOWER_BP_EGG_TUTOR", sprite: "old_woman", width: 16, height: 32, frames: 9 }] });
      // (No floors above: the stairs are walled over, the corridor's wall and floor drawn on, as the patch "nostairs"
      // (assets/world/maps/TrainerTower_Lobby-patch-nostairs.png: the corridor's column beside them); no elevator.)
      m.patches = { nostairs: { x: 9, y: 0, w: 3, h: 4, top: false, collision: [[10, 2, 0], [11, 2, 0], [10, 3, 0], [11, 3, 0]] } };
      m.collision[8 * m.width + 17] = 1;
      window.WORLD_MAPS[BATTLE_TOWER] = m;
      // (The battle room: Emerald's Battle Tower's, its attendant at the side.)
      const room = window.WORLD_MAPS.BattleFrontier_BattleTowerBattleRoom;
      if (room) window.WORLD_MAPS[BT_ROOM] = Object.assign(JSON.parse(JSON.stringify(room)), { name: BT_ROOM, title: "Battle Tower", region: "johto",
        image: room.name, music: m.music, showName: false, warps: [], signs: [], triggers: [], townMapSection: m.townMapSection,
        people: room.people.filter((p) => p.localId === "LOCALID_TOWER_BATTLE_ATTENDANT_1").map((p) => Object.assign({}, p, { script: null, flag: null })) });
      // (The gatehouse's door to the Battle Frontier's way in: HGSS's second, at its north wall; on the gatehouse
      // drawn from Pokémon Heart & Soul's, the door that leads there, where it is.)
      const fi = gate.warps.findIndex((w) => w.map === "BattleFrontier_FrontierAccess"), gi = gate.hgss && fi >= 0 ? fi : 1;
      gate.warps[gi] = Object.assign(gate.hgss && fi >= 0 ? { x: gate.warps[gi].x, y: gate.warps[gi].y } : { x: 4, y: 1 }, { map: BATTLE_TOWER, warp: 0 });
      m.warps[0].warp = gi;
    }
    for (const sc of [BT_ENTRY, BT_RECEPTION, BT_NURSE, BT_SIGN]) SPECIAL.add(sc);
  }
  const btRecords = () => player.flags.battleTower || (player.flags.battleTower = { best: {} });
  // Every Trainer Tower trainer who battles alone (the singles' and the
  // knockout trios'; the double battles' pairs share a name).
  const btTrainers = () => Object.values(window.TRAINER_TOWER.floors).flatMap((fl) => fl.trainers).filter((t) => !/&/.test(t.name));
  async function battleTowerEntry() {
    player.flags.battleTowerScene = 1;
    await Overworld.act([{ who: "player", moves: ["face_right"] }]);
    await say(["Welcome to the Battle Tower!", "Here, Trainers from far and wide take\non seven battles in a row, against\nPokémon as strong as their own."]);
    await battleTowerChallenge();
  }
  async function battleTowerReception() {
    await say("Welcome to the Battle Tower!");
    await battleTowerChallenge();
  }
  async function battleTowerSign() {
    const best = btRecords().best.open || 0;
    await say(["Battle Tower\nSeven battles in a row, against Pokémon\nas strong as your own."].concat(best ? ["Your best: " + best + " win" + (best > 1 ? "s" : "") + " in a row."] : ["No records yet."]));
  }
  // Why three Pokémon can't enter at `level` (Crystal's rules), or null.
  function btTeamProblem(team) {
    if (team.some((r) => r.egg)) return "An Egg can't enter.";
    const species = team.map((r) => Party.speciesName(r.species));
    if (new Set(species).size < species.length) return "No two of the same Pokémon\nmay enter.";
    const items = team.map((r) => r.item).filter(Boolean);
    if (new Set(items).size < items.length) return "No two may hold the same item.";
    return null;
  }
  async function battleTowerChallenge() {
    for (;;) {
      const i = await multichoice("Would you like to take the\nBattle Tower challenge?", 18, 6, ["Yes", "No", "Info"]);
      if (i === 2) {
        await say(["Choose three Pokémon. The Trainers'\nPokémon will be as strong as your\nstrongest.", "No two of the same Pokémon, and no\ntwo holding the same item.",
          "Every win earns Battle Points. Beat\nall seven Trainers in a row for\nprizes and bonus BP!", "Your Pokémon are healed between\nbattles."]);
        continue;
      }
      if (i !== 0) break;
      if (player.party.filter((r) => !r.egg).length < 3) { await say("You need three Pokémon to enter."); continue; }
      const chosen = await chooseBattleTeam(3);
      if (!chosen) continue;
      const team = chosen.map((k) => player.party[k]);
      const problem = btTeamProblem(team);
      if (problem) { await say(problem); continue; }
      await say("Then let the Battle Tower challenge\nbegin! Good luck!");
      Screen.say("");
      await battleTowerStreak(btLevel(team), chosen);
      return;
    }
    await say("Please come again!");
    Screen.say("");
  }
  // (The Trainer Tower's trainers, on the map: FireRed's people dressed as their class.)
  const BT_LOOKS = { biker: "rocker", fisherman: "fisher", engineer: "worker_m", aroma_lady: "woman_1", lady: "woman_2", pokemon_breeder: "woman_2",
    swimmer_m: "swimmer_m_land", swimmer_f: "swimmer_f_land", tuber_f: "lass", burglar: "balding_man", cue_ball: "balding_man", juggler: "man",
    psychic_m: "channeler", super_nerd: "poke_maniac", pokemon_ranger_f: "cooltrainer_f", pokemon_ranger_m: "cooltrainer_m" };
  const btLook = (pic) => ({ sprite: BT_LOOKS[pic] || (["sailor", "bug_catcher", "youngster", "camper", "hiker", "black_belt", "picnicker", "cooltrainer_f",
    "cooltrainer_m", "gentleman", "beauty", "lass", "rocker", "scientist", "crush_girl"].includes(pic) ? pic : "boy"), width: 16, height: 32, frames: 10 });
  async function battleTowerStreak(level, chosen) {
    const f = player.flags, team = chosen.map((k) => player.party[k]);
    team.forEach(Party.heal);
    const pool = btTrainers().slice();
    let wins = 0;
    const noteBest = () => { const best = btRecords().best; if (wins > (best.open || 0)) best.open = wins; };
    const earn = async (bp) => { f.bp = (f.bp || 0) + bp; await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)"); };
    // (In: through the room's door, up to the court; out: back to the lobby, at the corridor's top.)
    sfx("se_exit");
    await Overworld.teleport({ map: BT_ROOM, x: 4, y: 8, facing: "up" });
    await Overworld.act([{ who: "player", moves: ["walk_up", "walk_up", "walk_up", "face_right"] }]);
    const leave = async () => {
      Screen.say("");
      sfx("se_exit");
      await Overworld.teleport({ map: BATTLE_TOWER, x: 9, y: 3, facing: "down" });
      await persist();
    };
    for (let n = 1; n <= BT_BATTLES; n++) {
      const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      const mons = t.mons.slice().sort(() => Math.random() - 0.5).slice(0, 3).map((m) => TrainerTower.mon(m, level));
      Overworld.addObject(BT_FOE, { x: 5, y: 1, facing: "down" }, btLook(t.pic));
      await Overworld.act([{ who: BT_FOE, moves: ["walk_down", "walk_down", "walk_down", "walk_down", "face_left"] }]);
      await say("Battle " + n + " of " + BT_BATTLES + ":\n" + t.className + " " + t.name + "!");
      await say([t.intro]);
      const outcome = await battle("trainer", { foe: { name: t.className + " " + t.name, team: mons, pic: t.pic }, defeatText: [t.lose],
        noBlackout: true, noExp: true, noPrize: true, chosen });
      show("world");
      await Overworld.resume();
      if (outcome !== "won") {
        player.party.forEach(Party.heal);
        noteBest();
        await say(["Too bad... Your challenge ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]);
        Overworld.removeObject(BT_FOE);
        await leave();
        return;
      }
      wins++;
      team.forEach(Party.heal);
      await Overworld.act([{ who: BT_FOE, moves: ["walk_up", "walk_up", "walk_up", "walk_up"] }]);
      Overworld.removeObject(BT_FOE);
      await earn(btWinBP(level));
      if (n < BT_BATTLES) {
        await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
        if (!(await confirm("Go on to the next battle?"))) {
          noteBest();
          await say("Then your challenge ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ". Well done!");
          await leave();
          return;
        }
        Screen.say("");
      }
    }
    noteBest();
    await say(["Congratulations! You've beaten all\nseven Trainers!", "Here are your prizes."]);
    for (const prize of btRewards(level)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    await earn(btBP(level));
    await leave();
  }

  // ---------- Stadium Island (this game's own: Pokémon Stadium's Cups and Gym Leader Castle) ----------
  //
  // A Sevii island, by Seagallop from Vermilion with the Rainbow Pass (the
  // sailor offers it beside the Sevii Islands). Its Stadium's lobby is the
  // Trainer Tower's, cloned at load (the receptionist's counter is the Cups',
  // the clerk's the Gym Leader Castle's, and the nurse heals).
  //
  // The Cups (Pokémon Stadium's): the Pika Cup (Lv. 15-20, 50 in all, Pokémon
  // that can still evolve), the Petit Cup (Lv. 25-30, 80 in all, under 2 m and
  // 20 kg), the Poké Cup (Lv. 50-55, 155 in all, no Legendaries) and the Prime
  // Cup (Lv. 100, anything). Choose three; they're set to the level the rules
  // allow (copies: yours aren't touched), and eight Trainers in a row, three
  // Pokémon each, better and better ones; your three are healed between
  // battles and you may stop. Win all eight for the Cup's prize, Battle Points
  // and its trophy. The Gym Leader Castle: Kanto's eight Gym Leaders, then,
  // once you've beaten them, the Elite Four and the Champion, at your best's
  // level, your three as they are. game/trainer-tower.js's Stadium has the rules.
  const STADIUM_LOBBY = "StadiumIsland_Stadium", ST_CUPS = "StadiumIsland_Stadium_EventScript_Cups", ST_CASTLE = "StadiumIsland_Stadium_EventScript_Castle",
    ST_NURSE = "StadiumIsland_Stadium_EventScript_Nurse", ST_SIGN = "StadiumIsland_Stadium_EventScript_Sign";
  {
    const src = window.WORLD_MAPS.TrainerTower_Lobby, isle = window.WORLD_MAPS.StadiumIsland;
    if (src && isle && !window.WORLD_MAPS[STADIUM_LOBBY]) {
      const m = JSON.parse(JSON.stringify(src));
      const person = (localId, script) => Object.assign({}, src.people.find((p) => p.localId === localId), { script, localId: localId.replace("TOWER", "STADIUM") });
      Object.assign(m, { name: STADIUM_LOBBY, title: "Pokémon Stadium", image: "TrainerTower_Lobby", patches: {}, showName: true, townMapSection: "SEVEN_ISLAND",
        warps: [{ x: 9, y: 15, map: "StadiumIsland", warp: 0 }],
        signs: [{ x: 8, y: 10, script: ST_SIGN, text: null }], triggers: [],
        people: [person("LOCALID_TOWER_NURSE", ST_NURSE), person("LOCALID_TOWER_RECEPTIONIST", ST_CUPS), person("LOCALID_TOWER_MART_CLERK", ST_CASTLE)] });
      m.collision[2 * m.width + 9] = 1;
      m.collision[8 * m.width + 17] = 1;
      window.WORLD_MAPS[STADIUM_LOBBY] = m;
    }
    for (const sc of [ST_CUPS, ST_CASTLE, ST_NURSE, ST_SIGN, "StadiumIsland_EventScript_Sailor", "StadiumIsland_EventScript_StadiumSign",
      "StadiumIsland_EventScript_PierSign", "StadiumIsland_EventScript_Spectator"]) SPECIAL.add(sc);
  }
  const STADIUM_BANTER = ["I come here every week! The Cups are\nsomething else.", "They say the Prime Cup's trainers\nare ruthless.", "The Gym Leader Castle! I'd love to see\nthe Elite Four battle.",
    "The Stadium's so big! I got lost\ninside for ten minutes.", "Bring three Pokémon you trust.\nThat's the first rule here."];
  async function stadiumSpectator(person) {
    const k = ((person && person.id) | 0) % STADIUM_BANTER.length;
    await say(STADIUM_BANTER[k]);
  }
  // The Seagallop's sailor: home to Vermilion.
  async function stadiumSailor() {
    await say("Welcome to Stadium Island!\nWant to sail back to Vermilion?");
    if (!(await confirm("Sail to Vermilion City?"))) { await say("Take your time. The Cups aren't\ngoing anywhere."); return; }
    await say("Aye, aye! All aboard!");
    Screen.say("");
    const p = Sevii.port("VERMILION_CITY");
    await ferry({ map: p.map, x: p.x, y: p.y, facing: "up" }, true);
  }
  async function stadiumSign() {
    const r = Stadium.records(player.flags), keys = Object.keys(Stadium.CUPS);
    const lines = keys.map((k) => Stadium.CUPS[k].name + ": " + (r.cups[k] && r.cups[k].cleared ? "won x" + r.cups[k].cleared : "not won yet"));
    await say(["Pokémon Stadium\nHall of Trophies", lines.slice(0, 2).join("\n"), lines.slice(2).join("\n"),
      "Gym Leader Castle: " + (r.castle[0] ? "Round 1 cleared" : "Round 1 to win") + "\n" + (r.castle[1] ? "Round 2 cleared" : r.castle[0] ? "Round 2 open" : "Round 2 locked")]);
  }
  // Three of your Pokémon for a Stadium challenge (null: backed out).
  async function stadiumTeam(problemOf) {
    for (;;) {
      if (player.party.filter((r) => !r.egg).length < 3) { await say("You need three Pokémon to enter."); return null; }
      const chosen = await chooseBattleTeam(3);
      if (!chosen) return null;
      const problem = problemOf(chosen.map((k) => player.party[k]));
      if (problem) { await say(problem); continue; }
      return chosen;
    }
  }
  async function stadiumCups() {
    const f = player.flags, rec = Stadium.records(f), keys = Object.keys(Stadium.CUPS);
    await say("Welcome to the Pokémon Stadium!\nThe Cups are held right here.");
    for (;;) {
      const i = await multichoice("Which Cup will you enter?", 14, 2, keys.map((k) => Stadium.CUPS[k].name).concat(["Rules", "Exit"]));
      if (i < 0 || i === keys.length + 1) break;
      if (i === keys.length) { await say(keys.map((k) => Stadium.CUPS[k].name + "\n" + Stadium.CUPS[k].text)); continue; }
      const key = keys[i], cup = Stadium.CUPS[key];
      await say([cup.name + "!\n" + cup.text, "Eight Trainers in a row. Your Pokémon\nare set to Lv. " + Stadium.cupLevel(key) + " for it."]);
      if (!(await confirm("Enter the " + cup.name + "?"))) continue;
      const chosen = await stadiumTeam((team) => Stadium.cupProblem(key, team));
      if (!chosen) continue;
      await say("Then let the " + cup.name + "\nbegin! Good luck!");
      Screen.say("");
      await stadiumCup(key, chosen);
      return;
    }
    await say("Come back for the Cups anytime!");
    Screen.say("");
  }
  // Your three, scaled copies, as your party while the Cup lasts.
  async function stadiumCup(key, chosen) {
    const f = player.flags, rec = Stadium.records(f), cup = Stadium.CUPS[key], R = window.STADIUM.rounds;
    const orig = player.party;
    const clones = chosen.map((k) => Stadium.scaled(key, orig[k]));
    f.stadiumParty = orig;
    player.party = clones;
    let wins = 0;
    try {
      const personas = Stadium.rivals();
      for (let n = 1; n <= R; n++) {
        const foe = Stadium.opponent(key, n, personas[n - 1]);
        await say("Round " + n + " of " + R + ":\n" + foe.className + " " + foe.name + "!");
        await say([foe.intro]);
        const outcome = await battle("trainer", { foe: { name: foe.className + " " + foe.name, team: foe.mons, pic: foe.pic }, defeatText: [foe.lose],
          noBlackout: true, noExp: true, noPrize: true, chosen: [0, 1, 2], music: "mus_vs_gym_leader" });
        show("world");
        await Overworld.resume();
        if (outcome !== "won") { await say(["Too bad... Your " + cup.name + " ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]); break; }
        wins++;
        clones.forEach(Party.heal);
        if (n < R) {
          await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
          if (!(await confirm("Go on to the next round?"))) { await say("Then your " + cup.name + " ends at\n" + wins + " wins. Well done!"); break; }
        }
      }
    } finally {
      player.party = orig;
      delete f.stadiumParty;
    }
    const best = rec.cups[key] || (rec.cups[key] = { best: 0, cleared: 0 });
    if (wins > best.best) best.best = wins;
    if (wins < R) { await persist(); return; }
    best.cleared++;
    await say(["Congratulations! You've won the\n" + cup.name + "!", "Here are your prizes."]);
    for (const prize of TrainerTower.rewardsAt(cup.tier, cup.tier + 1)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    f.bp = (f.bp || 0) + cup.bp;
    await say("{PLAYER} earned " + cup.bp + " BP!\n(" + f.bp + " BP in total.)");
    await persist();
  }
  async function stadiumCastle() {
    const f = player.flags, rec = Stadium.records(f);
    await say("This is the Gym Leader Castle!\nBattle Kanto's Gym Leaders here.");
    for (;;) {
      const items = ["Round 1: Gym Leaders", rec.castle[0] ? "Round 2: Elite Four" : "Round 2 (locked)", "Info", "Exit"];
      const i = await multichoice("Which round will you challenge?", 11, 4, items);
      if (i < 0 || i === 3) break;
      if (i === 2) { await say(["Round 1: Brock, Misty, Lt. Surge, Erika,\nKoga, Sabrina, Blaine and Giovanni.", "Round 2, once Round 1's won: the Elite Four\nand the Champion.", "Choose three Pokémon. The Trainers'\nPokémon match your strongest's level."]); continue; }
      const round = i;
      if (round === 1 && !rec.castle[0]) { await say("Win Round 1 first!"); continue; }
      const chosen = await stadiumTeam(() => null);
      if (!chosen) continue;
      await say("Then let the battles begin!\nGood luck!");
      Screen.say("");
      await stadiumCastleRound(round, chosen);
      return;
    }
    await say("Come back anytime!");
    Screen.say("");
  }
  async function stadiumCastleRound(round, chosen) {
    const f = player.flags, rec = Stadium.records(f), team = chosen.map((k) => player.party[k]);
    team.forEach(Party.heal);
    const level = Math.min(100, Math.max(30, Math.max(...team.map((r) => r.level))) + (round ? 3 : 0));
    const list = window.STADIUM.castle[round];
    let wins = 0;
    for (let n = 0; n < list.length; n++) {
      const foe = Stadium.castleFoe(round, n, level);
      await say([foe.className + " " + foe.name + " waits!", foe.intro]);
      const outcome = await battle("trainer", { foe: { name: foe.className + " " + foe.name, team: foe.mons, pic: foe.pic }, defeatText: [foe.lose],
        noBlackout: true, noExp: true, noPrize: true, chosen, music: round ? "mus_vs_champion" : "mus_vs_gym_leader" });
      show("world");
      await Overworld.resume();
      if (outcome !== "won") {
        player.party.forEach(Party.heal);
        await say(["Too bad... Round " + (round + 1) + " ends at\n" + wins + " win" + (wins === 1 ? "" : "s") + ".", "Please try again!"]);
        return;
      }
      wins++;
      team.forEach(Party.heal);
      if (n < list.length - 1) {
        await say("That's " + wins + " in a row! Your Pokémon\nhave been healed.");
        if (!(await confirm("Go on to the next battle?"))) { await say("Then your challenge ends at\n" + wins + " wins. Well done!"); return; }
      }
    }
    const first = !rec.castle[round];
    rec.castle[round] = true;
    await say(round ? ["Congratulations! You've beaten the Elite Four\nand the Champion!", "Here are your prizes."] : ["Congratulations! You've beaten all\neight Gym Leaders!", "Here are your prizes."]);
    for (const prize of TrainerTower.rewardsAt(3, 3)) {
      Player.addItem(player, prize);
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name(prize) + "!");
    }
    if (round && first && window.STADIUM.castlePrizes.masterBall) {
      Player.addItem(player, "master-ball");
      await sayWithJingle("mus_level_up", "{PLAYER} received the " + Bag.name("master-ball") + "!");
    }
    const bp = window.STADIUM.castlePrizes.bp[round];
    f.bp = (f.bp || 0) + bp;
    await say("{PLAYER} earned " + bp + " BP!\n(" + f.bp + " BP in total.)");
    await persist();
  }
  // Its Egg moves (every game's): its own Egg list and its evolution line's,
  // the first stage's being where they're kept.
  function bpEggMoves(record) {
    const sets = window.LEARNSETS_GEN6, out = [];
    for (const sp of evolutionLine(record.species)) {
      const set = sets[sp] || sets[String(sp).split("-")[0]] || {};
      for (const m of set.egg || []) if (window.MOVES[m] && !Party.knowsMove(record, m) && !out.includes(m)) out.push(m);
    }
    return out.sort();
  }
  const BP_EGG_TUTOR = "TrainerTower_Lobby_EventScript_BPEggTutor";
  {
    const m = window.WORLD_MAPS.TrainerTower_Lobby;
    if (m && !m.people.some((p) => p.script === BP_EGG_TUTOR)) {
      m.people.push({ id: 952, x: 17, y: 14, movement: "face_left", rangeX: 0, rangeY: 0, script: BP_EGG_TUTOR, flag: null,
        text: null, localId: "LOCALID_TOWER_BP_EGG_TUTOR", sprite: "old_woman", width: 16, height: 32, frames: 9 });
    }
    SPECIAL.add(BP_EGG_TUTOR);
  }
  const bpTutor = () => bpTeacher(bpTutorMoves, ["I teach Pokémon moves from tutors\nall over the world.", "In exchange, I ask for the Battle\nPoints you earn in battle."]);
  // (The lady beside him: the Egg moves a Pokémon could have hatched knowing.)
  const bpEggTutor = () => bpTeacher(bpEggMoves, ["I teach Pokémon the moves they\ncould have hatched knowing.", "In exchange, I ask for the Battle\nPoints you earn in battle."]);
  async function bpTeacher(movesOf, intro) {
    const f = player.flags, bpTutorMoves = movesOf;
    await say(intro);
    for (;;) {
      if (!(await confirm("Shall I teach a Pokémon a move?\n(You have " + (f.bp || 0) + " BP.)"))) break;
      const notes = player.party.map((r) => (r.egg || !bpTutorMoves(r).length ? "NOT ABLE" : "ABLE"));
      const r = await choosePartyFor("Teach which {PKMN}?", null, notes);
      show("world");
      if (!r) continue;
      if (r.egg) { await say(T("TwoIsland_House_Text_CantTeachAnEgg")); continue; }
      const moves = bpTutorMoves(r);
      if (!moves.length) { await say("Sorry… There's no move I can teach\nthat Pokémon."); continue; }
      Screen.say("");
      clearMenu();
      // (The Move Relearner's screen, each move's price in BP.)
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves, known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        note: (m) => (m ? bpTutorPrice(m) + " BP (you have " + (f.bp || 0) + ")" : ""),
        price: (m) => bpTutorPrice(m) + " BP",
        afford: (m) => (f.bp || 0) >= bpTutorPrice(m), short: "You don't have enough BP.",
        forget: (m) => chooseMoveToForget(r, m),
        teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      if (move && Party.knowsMove(r, move)) {
        f.bp -= bpTutorPrice(move);
        await say("{PLAYER} handed over " + bpTutorPrice(move) + " BP.\n(" + f.bp + " BP left.)");
        await persist();
      }
    }
    await say("Earn more BP in the tower, and\ncome back anytime.");
  }
  // The lobby's shop takes BP instead of money (this game's own): Bottle Caps
  // (Gold, and Tin), every mint, the six vitamins and the competitive held
  // items (as the Battle Frontier's BP shops had them): 48 BP the staples,
  // 32 the rest, 16 the small ones.
  const BP_HELD = [
    ["choice-band", 48], ["choice-specs", 48], ["choice-scarf", 48], ["leftovers", 48], ["life-orb", 48], ["assault-vest", 48],
    ["rocky-helmet", 48], ["eviolite", 48], ["focus-sash", 48], ["eject-button", 32], ["red-card", 32], ["expert-belt", 32],
    ["weakness-policy", 32], ["shell-bell", 32], ["black-sludge", 32], ["light-clay", 32], ["big-root", 32], ["air-balloon", 32],
    ["safety-goggles", 32], ["destiny-knot", 32], ["ability-capsule", 32], ["ability-patch", 64],
    ["flame-orb", 16], ["toxic-orb", 16], ["scope-lens", 16], ["wide-lens", 16], ["muscle-band", 16], ["wise-glasses", 16],
    ["quick-claw", 16], ["razor-claw", 16], ["focus-band", 16], ["power-herb", 16], ["white-herb", 16],
    ["sitrus-berry", 16], ["lum-berry", 16]
  ].filter(([id]) => window.ITEMS[id]);
  const BP_SHOP = [["bottle-cap", 25], ["gold-bottle-cap", 75], ["tin-bottle-cap", 10]]
    .concat(Object.keys(window.ITEMS).filter((id) => Bag.mintNature(id)).sort().map((id) => [id, 25]))
    .concat(["hp-up", "protein", "iron", "calcium", "zinc", "carbos"].map((id) => [id, 2]))
    .concat(BP_HELD);
  async function bpShop() {
    const f = player.flags, at = Overworld.position(), [dx, dy] = (World.DIRS || {})[at.facing] || [1, 0];
    await say(["Welcome to the BP Shop!", "Battle Points from the tower buy\nthings here. (You have " + (f.bp || 0) + " BP.)"]);
    Screen.say("");
    clearMenu();
    await ShopScreen.open({
      frame: GameOptions.get().frame,
      items: BP_SHOP.map(([id, price]) => ({ id, name: Bag.name(id), price, desc: Bag.description(id), icon: Bag.sprite(id) })),
      money: () => f.bp || 0,
      currency: { label: "BP", unit: (n) => n + " BP", short: "You don't have enough BP." },
      inBag: (id) => Player.itemCount(player, id),
      limit: () => ({ max: 99 }),
      buy: (id, n) => {
        if (Player.itemCount(player, id) + n > 999) return { error: "You have no more room for this\nitem." };
        f.bp = (f.bp || 0) - BP_SHOP.find((x) => x[0] === id)[1] * n;
        Player.addItem(player, id, n);
        persist();
        return null;
      },
      map: { canvas: $("#world"), x: 112 + 16 * dx, y: 96 + 16 * dy }
    });
    ShopScreen.close();
    show("world");
    await say("Please come again!");
  }
  // The elevator down from the roof (TrainerTower_Elevator_EventScript_FloorSelect):
  // Rooftop or B1F (FireRed's names); down it goes, and out at the lobby's
  // counter, its barrier opening and shutting behind you
  // (TrainerTower_Lobby_EventScript_ExitElevator).
  async function towerElevator() {
    const f = player.flags, here = f.dynamicWarp && f.dynamicWarp.map === "TrainerTower_Lobby" ? 1 : 0, labels = ["Rooftop", "B1F"];
    GbaMenus.fieldWindow("floor", { label: labels[here] });
    await Screen.prompt(T("Text_WantWhichFloor")[0]);
    const v = await GbaMenus.multichoice($("#overlay"), { left: 0, top: 0, items: labels.concat(["Exit"]), cursor: here, frame: GameOptions.get().frame });
    GbaMenus.fieldWindow("floor", null);
    Screen.say("");
    if (v !== 1 || here === 1) return;
    setDynamicWarp({ map: "TrainerTower_Lobby", x: 17, y: 8 });
    sfx("se_elevator");
    await Overworld.shake(ELEVATOR_SHAKES[1]);
    sfx("se_ding_dong");
    await sleep(417);
    await Overworld.act([{ who: "player", moves: ["walk_in_place_faster_down", "delay_16", "walk_down", "walk_right", "walk_right"] }]);
    towerCounterOpen = true;
    await Overworld.teleport({ map: "TrainerTower_Lobby", x: 17, y: 8, facing: "down" });
    // (Out past the counter: FireRed's two steps leave you on its flap, (17, 10),
    // as it shuts; a third takes you clear of it.)
    await Overworld.act([{ who: "player", moves: ["walk_down", "walk_down", "walk_down"] }]);
    towerCounterOpen = false;
    applyPatches("TrainerTower_Lobby");
    sfx("se_click");
  }

  // The Gym's quiz machines (CinnabarIsland_Gym_EventScript_Quiz1..6): answer
  // right and the door past them opens; wrong, and the trainer guarding it
  // comes over to battle (once beaten, nobody comes), and beating them opens it too.
  // Each machine's answer (YES or NO), the trainer by it, and how they come over
  // from the left machine or the right one.
  const CINNABAR_QUIZ = {
    1: { yes: true, trainer: "TRAINER_BURGLAR_QUINN", who: "LOCALID_QUINN", name: "Quinn" },
    2: { yes: false, trainer: "TRAINER_SUPER_NERD_AVERY", who: "LOCALID_AVERY", name: "Avery" },
    3: { yes: false, trainer: "TRAINER_BURGLAR_RAMON", who: "LOCALID_RAMON", name: "Ramon" },
    4: { yes: false, trainer: "TRAINER_SUPER_NERD_DEREK", who: "LOCALID_DEREK", name: "Derek" },
    5: { yes: true, trainer: "TRAINER_BURGLAR_DUSTY", who: "LOCALID_DUSTY", name: "Dusty" },
    6: { yes: false, trainer: "TRAINER_SUPER_NERD_ZAC", who: "LOCALID_ZAC", name: "Zac" }
  };
  const quizDoorOpen = (n) => !!(player.flags.cinnabarQuiz && player.flags.cinnabarQuiz[n]);

  // The fossil doctor in the Lab's experiment room
  // (..._ExperimentRoom_EventScript_FossilScientist): show him a fossil (the
  // Helix or Dome Fossil from Mt. Moon, or the Old Amber) and he revives it;
  // it's ready once you've left and come back to the Lab (the entrance's
  // OnTransition: VAR_MAP_SCENE_..._REVIVE_STATE 1 -> 2). A Lv. 5 Omanyte,
  // Kabuto or Aerodactyl.
  const FOSSILS = [
    { item: "helix-fossil", species: "Omanyte", flag: "revivedHelix" },
    { item: "dome-fossil", species: "Kabuto", flag: "revivedDome" },
    { item: "old-amber", species: "Aerodactyl", flag: "revivedAmber" },
    // (And the fossils dug up mining, game/mining.js: Hoenn's and Sinnoh's too.)
    { item: "root-fossil", species: "Lileep", flag: "revivedRoot" },
    { item: "claw-fossil", species: "Anorith", flag: "revivedClaw" },
    { item: "skull-fossil", species: "Cranidos", flag: "revivedSkull" },
    { item: "armor-fossil", species: "Shieldon", flag: "revivedArmor" }
  ];
  // (This game's own: another such doctor in Pewter's Museum, in the Old
  // Amber's room, the same at it as Cinnabar's; a fossil left with either is
  // ready from either once you've left and come back.)
  const PEWTER_FOSSIL_SCIENTIST = "PewterCity_Museum_1F_EventScript_FossilScientist";
  {
    const m = window.WORLD_MAPS.PewterCity_Museum_1F;
    if (m && !m.people.some((p) => p.script === PEWTER_FOSSIL_SCIENTIST)) {
      m.people.push({ id: 950, x: 24, y: 3, movement: "face_down", rangeX: 0, rangeY: 0, script: PEWTER_FOSSIL_SCIENTIST, flag: null,
        text: null, localId: "LOCALID_PEWTER_FOSSIL_SCIENTIST", sprite: "scientist", width: 16, height: 32, frames: 10 });
    }
    SPECIAL.add(PEWTER_FOSSIL_SCIENTIST);
  }

  // ---------- The Safari Game ----------
  //
  // FireRed's (src/safari_zone.c, FuchsiaCity_SafariZone_Entrance's scripts):
  // ₽500 at the gate for 30 Safari Balls and 600 steps in the Safari Zone.
  // While it lasts (player.flags.safari: { balls, steps }, FLAG_SYS_SAFARI_MODE)
  // every wild Pokémon is a Safari battle (engine/safari.js), and the Start
  // menu can RETIRE. Out of steps or balls, the PA calls time and you're
  // back at the gate; walking back into the gate, you're asked if you're
  // leaving early.
  const SAFARI_GATE = "FuchsiaCity_SafariZone_Entrance";
  const safariOn = () => !!player.flags.safari;
  const G = (k) => T("FuchsiaCity_SafariZone_Entrance_Text_" + k);
  // On your way out from the counter: FireRed's two steps down leave you on
  // the entry trigger's row, where walking back up skips the attendant (a
  // scripted step onto a trigger doesn't set it off); this game's one step
  // more puts you below it, so going back in means paying again.
  const SAFARI_EXIT = () => M("FuchsiaCity_SafariZone_Entrance_Movement_Exit").concat("walk_down");
  // Hoenn's Safari Zone (Emerald's src/safari_zone.c): entered at Route 121's gate for ₽500 with the Pokéblock Case, 30
  // Safari Balls and 500 steps; its scripts are Emerald's own (EnterSafariMode and ExitSafariMode below, SafariZone_EventScript_*),
  // and its Pokéblock feeders take a block from the case, which draws Pokémon that like it (a nature that does, four times in
  // five) for 100 steps and five tiles round.
  const hoennSafari = {
    feeders: () => { const s = player.flags.safari; return s && s.hoenn ? (s.feeders || (s.feeders = [])) : []; },
    front: () => { const at = Overworld.position(), [dx, dy] = World.DIRS[at.facing || "down"]; return { map: player.location.map, x: at.x + dx, y: at.y + dy }; },
    feederInFront: () => { const f = hoennSafari.front(), i = hoennSafari.feeders().findIndex((d) => d.map === f.map && d.x === f.x && d.y === f.y); return i < 0 ? 65535 : i; },
    placeOnFeeder: (block) => { const f = hoennSafari.front(); hoennSafari.feeders().push({ map: f.map, x: f.x, y: f.y, block, steps: 100 }); },
    activeBlock: () => { const at = player.location, d = hoennSafari.feeders().find((f) => f.map === at.map && Math.abs(f.x - at.x) + Math.abs(f.y - at.y) <= 5); return d ? d.block : null; },
    step: () => { const list = hoennSafari.feeders(); for (let i = list.length - 1; i >= 0; i--) if (--list[i].steps <= 0) list.splice(i, 1); },
    // (PickWildMonNature: by a feeder's block, a nature that likes it, four times in five.)
    nature: () => {
      const b = hoennSafari.activeBlock();
      if (!b || Math.random() >= 0.8) return null;
      const liked = Object.keys(window.NATURES).filter((n) => HoennPokeblock.gain(n, b) > 0);
      return liked.length ? liked[Math.floor(Math.random() * liked.length)] : null;
    }
  };

  // Vermilion Gym's trash cans (VermilionCity_Gym_EventScript_TrashCan): a
  // switch is under one of the fifteen, and the second under one next to it
  // (SetVermilionTrashCans). Find the first and one beam goes off; then the
  // second, or both are hidden somewhere new. Both found, the way to Lt. Surge
  // stays open. Leaving the Gym hides them again.
  let gymCans = null, ticketChecked = false;
  // Which of a map's patches (WORLD_MAPS[..].patches) are on now.
  function mapPatches(map) {
    const f = player.flags;
    const sinnoh = Sinnoh.patches(map, player); if (sinnoh) return sinnoh;
    if (map === GOLDENROD_SWITCHES) return goldenrodSw.open.map((n) => "open" + n);
    // (The Space Center's sealed door, open once the Delta Episode's done and 2F's researcher has unsealed it;
    // its observation deck's rock aglow and stars in line while you wish.)
    if (map === "MossdeepCity_SpaceCenter_2F") return [(f.delta | 0) >= 4 ? "open" : "sealed"];
    if (map === "MossdeepCity_SpaceCenter_ObservationDeck") return [...deckFx];
    if (map === "OutskirtStand" || map === "PhenacCity" || map === "PyriteCave") return Orre.patches(map, f);
    if (map === "VermilionCity_Gym") {
      if (f.vermilionGymLocksOpen) return ["off"];
      if (gymCans && gymCans.foundFirst) return ["half"];
    }
    // (The Dojo's back room, once its Karate Master's beaten and has opened it: data/raid-den-rooms.js.)
    if (map === "SaffronCity_Dojo") return f.TRAINER_BLACK_BELT_KOICHI && f.dojoDenDoor ? ["denroom"] : [];
    // (Mr. Psychic's back room, once he's given you his TM; the way to Celadon's Berry Farm, always: the same file.)
    if (map === "SaffronCity_MrPsychicsHouse") return f.gotTM29 ? ["denroom"] : [];
    if (map === "CeladonCity") return ["farmpath"];
    // (Route 40's Battle Tower: no stairs.)
    if (map === "BattleTower_Lobby") return ["nostairs"];
    // (The League gate's ways west and east, to Johto's Routes 26 and 28: data/johto-maps.js.)
    if (map === "Route22_NorthEntrance") return ["johto", "johto-east"];
    // (Cianwood's Gym, its falls stopped once the winch is turned: ui/johto-gymmicks.js.)
    if (map === "CianwoodCity_Gym") return gymmicks.patches(map);
    // (Johto's Safari Zone: its Areas where the layout has them, ui/johto-safari.js.)
    if (map === JohtoSafari.MAP) return johtoSafari.patches(map);
    if (map === "CeladonCity_GameCorner") return (f.openedRocketHideout ? [] : ["hidden"]).concat(["cardroom"]);
    if (map === "RocketHideout_B1F" && !f.TRAINER_TEAM_ROCKET_GRUNT_12) return ["barrier"];
    if (map === "RocketHideout_B4F" && !(f.TRAINER_TEAM_ROCKET_GRUNT_16 && f.TRAINER_TEAM_ROCKET_GRUNT_17)) return ["barrier"];
    // The Seafoam Islands' currents (game/seafoam.js).
    if (/^SeafoamIslands_B[34]F$/.test(map)) return Seafoam.patches(f, map);
    // The Pokémon League's doors: the way in shut behind you, the way on open
    // once that room's trainer's beaten.
    if (/^PokemonLeague_/.test(map)) return League.patches(f, map);
    // Victory Road's rock barriers, until their floor switches are pressed.
    if (/^VictoryRoad_\dF$/.test(map)) return LeagueRoad.barriers(f, map, Object.keys((window.WORLD_MAPS[map] || {}).patches || {}));
    // One Island's Network Machine: the Ruby in it (OneIsland_PokemonCenter_1F_OnLoad),
    // then the Sapphire and its screens on. Mt. Ember's Ruby Path opens once
    // Celio's asked for the Ruby; the Dunsparce Tunnel's dug out once you're Champion.
    if (map === "OneIsland_PokemonCenter_1F") {
      return [].concat((f.celioScene || 0) >= 5 || f.celioRubyIn ? ["ruby"] : [], f.canLinkWithRS || f.celioSapphireIn ? ["sapphire"] : [],
        f.canLinkWithRS ? ["on"] : []);
    }
    if (map === "MtEmber_Exterior") return (f.celioScene || 0) >= 4 ? ["cave"] : [];
    if (map === "ThreeIsland_DunsparceTunnel") return f.gameClear ? ["dugout"] : [];
    // (Saffron's Magnet Train station's door, always there: tools/build-magnet-train.js.)
    if (map === "SaffronCity") return ["magnettrain"];
    // (New Bark Town's Pokémon Center, this game's own: tools/build-new-bark-center.js.)
    if (map === "NewBarkTown") return ["pokecenter"];
    // Five Island: the Rocket Warehouse's door open (FiveIsland_Meadow_OnLoad),
    // its arrows turned round once the Admin by them is beaten
    // (FiveIsland_RocketWarehouse_OnLoad); Icefall Cave 1F's ice, cracked or broken.
    if (map === "FiveIsland_Meadow") return f.unlockedRocketWarehouse ? ["unlocked"] : [];
    if (map === "FiveIsland_RocketWarehouse") return f.TRAINER_TEAM_ROCKET_ADMIN ? ["arrows"] : [];
    if (map === "FourIsland_IcefallCave_1F") return Sevii.icefallPatches(icefallIce);
    // Six Island: the Dotted Hole's door, open once Cut's been used on it
    // (SixIsland_RuinValley_OnLoad). Trainer Tower: each floor laid out for
    // the challenge's kind of battle (sFloorLayouts); the lobby's counter open
    // as you come out of the elevator.
    if (map === "SixIsland_RuinValley") return f.usedCutOnRuinValleyBraille ? ["open"] : [];
    if (towerFloorNo(map)) { const type = towerFloor(towerFloorNo(map)).type; return type === "double" ? ["doubles"] : type === "knockout" ? ["knockout"] : []; }
    if (map === "TrainerTower_Lobby") return towerCounterOpen ? ["counter"] : [];
    // The Pokémon Mansion's doors, by its switch.
    if (/^PokemonMansion_/.test(map)) return f.mansionSwitch ? ["pressed"] : [];
    // Cinnabar Gym's quiz doors: each open once answered (or its trainer
    // beaten); all of them once Blaine's beaten (CinnabarIsland_Gym_OnLoad).
    if (map === "CinnabarIsland_Gym") return [1, 2, 3, 4, 5, 6].filter((n) => f.TRAINER_LEADER_BLAINE || quizDoorOpen(n)).map((n) => "door" + n);
    // Silph Co.: each card-key door shut until you open it.
    const silph = /^SilphCo_(\d+)F$/.exec(map), patches = (window.WORLD_MAPS[map] || {}).patches;
    if (silph && patches) {
      const doors = Object.keys(patches).filter((p) => /^close\d+$/.test(p)).map((p) => +p.slice(5));
      return doors.map((k) => (f[silphDoorFlag(silph[1], k, doors.length === 1)] ? "open" : "close") + k);
    }
    return [];
  }
  // Sets a map's collision and behaviours for the patches on now (the rest as built).
  const baseCollision = {}, baseBehavior = {};
  function applyPatches(map) {
    const m = window.WORLD_MAPS[map];
    if(m&&map===SinnohUnderground.data().base){const base=baseCollision[map]||(baseCollision[map]=m.collision.slice());m.collision=base.slice();for(const[x,y]of SinnohUnderground.overlay(player,map).solid)m.collision[y*m.width+x]=1;}
    if (!m || !m.patches) return;
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice());
    const baseB = baseBehavior[map] || (baseBehavior[map] = m.behavior.slice());
    for (const pt of Object.values(m.patches)) for (const [x, y] of pt.collision) {
      m.collision[y * m.width + x] = base[y * m.width + x];
      m.behavior[y * m.width + x] = baseB[y * m.width + x];
    }
    for (const p of mapPatches(map)) for (const [x, y, c, b] of m.patches[p].collision) {
      m.collision[y * m.width + x] = c;
      if (b != null) m.behavior[y * m.width + x] = b;
    }
  }

  // ---------- The S.S. Aqua ----------
  //
  // HGSS's ship between Olivine and Vermilion: Olivine's port boards you
  // (its scripts: VAR_BOAT_DIRECTION 1, sailing for Vermilion) and the voyage
  // goes as HGSS has it; once it's arrived (FLAG_BOAT_ARRIVED) the ship's way
  // off is to Vermilion: FireRed's dock, where the S.S. Anne was. Back from
  // Vermilion, its sailor on the dock takes you (with the S.S. Ticket) to
  // Olivine's port.
  function ssAquaExit() {
    const m = window.WORLD_MAPS.SSAqua_1F, w = m && m.warps[0];
    if (!w) return;
    const vermilion = +johto.getVar("VAR_BOAT_DIRECTION") === 1 && johto.flag("FLAG_BOAT_ARRIVED");
    // (Off at Olivine: where the ship's door leads, HGSS's port outside, or on the ship drawn from Pokémon Heart &
    // Soul's, its port building, as it's built: kept the first time.)
    if (!w.olivine) w.olivine = w.map === "SSAnne_Exterior" ? { map: "SSAqua_OlivinePortExterior", warp: 1 } : { map: w.map, warp: w.warp };
    Object.assign(w, vermilion ? { map: "SSAnne_Exterior", warp: 0 } : w.olivine);
    // (Off in Vermilion, the ship's next voyage is back to Olivine.)
    if (vermilion) johto.setVar("VAR_BOAT_DIRECTION", 0);
  }
  // Olivine's port: the S.S. Aqua's gangway (and the port's sailor) ask where you're sailing, once you've beaten
  // Johto's Pokémon League: Vermilion City (HGSS's voyage, as its port's sailor sets it going) or, this game's own,
  // Slateport City in Hoenn (the first time, the moving truck's inside, as Emerald begins: sailToHoenn).
  // The Hoenn Ticket (this game's own), for the S.S. Aqua's run to Slateport: from Oak in the Hall of Fame once you've
  // beaten Johto's League, or from the S.S. Aqua's clerk if you'd beaten it before there was one.
  async function giveHoennTicket(from) {
    if (Player.itemCount(player, "hoenn-ticket")) return;
    await say(from === "Oak" ? ["Oak: Oh, and {PLAYER}…", "This came for Johto's new Champion.\nIt's from the Fast Ship S.S. Aqua!", "A ticket to sail from Olivine City\nto Slateport City, in Hoenn."]
      : ["Ah, Champion! This was left for you.", "A ticket for our run to Slateport City,\nin Hoenn."]);
    Player.addItem(player, "hoenn-ticket", 1);
    await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the " + Bag.name("hoenn-ticket") + "!"));
  }
  async function ssAquaBoard() {
    if (Overworld.position().facing === "down") return;   // (off the ship, down the gangway)
    const away = async () => { if (player.location.map === "SSAqua_OlivinePortExterior") await Overworld.act([{ who: "player", moves: ["walk_down"] }]); };
    if (!player.flags.johtoLeagueClear) {
      await say(["Welcome to Fast Ship S.S. Aqua.", "I'm sorry, but the S.S. Aqua sails\nonly for Trainers who have beaten", "the Pokémon League here in Johto."]);
      await away();
      return;
    }
    // (Slateport City with the Hoenn Ticket: Oak's, from the Hall of Fame; a save already past it gets it here.)
    if (!Player.itemCount(player, "hoenn-ticket")) await giveHoennTicket("the S.S. Aqua's clerk");
    const dests = ["Vermilion City"].concat(Player.itemCount(player, "hoenn-ticket") ? ["Slateport City"] : [], ["Cancel"]);
    const i = await multichoice("Welcome to Fast Ship S.S. Aqua.\nWhere would you like to sail?", 17, 12 - 2 * dests.length, dests);
    if (i < 0 || dests[i] === "Cancel") { await say("We hope to see you again!"); await away(); return; }
    Screen.say("");
    if (dests[i] === "Slateport City") { await say("{PLAYER} flashed the Hoenn Ticket."); await sailToHoenn(true); return; }
    await say(["Welcome aboard the S.S. Aqua!", "We sail for Vermilion City in Kanto."]);
    Screen.say("");
    johto.setVar("VAR_BOAT_DIRECTION", 1);
    johto.setVar("VAR_UNK_40DC", 0);
    johto.setFlag("FLAG_BOAT_ARRIVED", false);
    johto.setFlag("FLAG_UNK_22C", true);
    johto.setFlag("FLAG_UNK_22B", true);
    sfx("se_exit");
    // (Aboard at the ship's door, where its scene walks you in.)
    const door = window.WORLD_MAPS.SSAqua_1F.warps[0];
    await Overworld.teleport({ map: "SSAqua_1F", x: door.x, y: door.y, facing: "down" });
    const js = johto.frameScript("SSAqua_1F");
    if (js) await runJohto(js, null);
  }
  async function ssAquaToOlivine() {
    if (!Player.itemCount(player, "ss-ticket")) { await say(["This is the S.S. Aqua's dock.", "You'll need an S.S. Ticket to sail\nto Olivine City in Johto."]); return; }
    if (!(await confirm("The S.S. Aqua sails for Olivine City.\nWould you like to board?"))) { await say("We hope to see you again!"); return; }
    await say(["{PLAYER} flashed the S.S. Ticket.", "Welcome aboard the S.S. Aqua!"]);
    Screen.say("");
    sfx("se_ship");
    // (Off at the gangway: HGSS's, below the ship; on the port drawn from Pokémon Heart & Soul's, at the pier's end,
    // the step off the boat's way aboard.)
    const port = window.WORLD_MAPS.SSAqua_OlivinePortExterior, plank = port && port.hgss && port.warps.find((w) => w.map === "SSAqua_1F");
    await Overworld.teleport(plank ? { map: "SSAqua_OlivinePortExterior", x: plank.x, y: plank.y + 1, facing: "down" } : { map: "SSAqua_OlivinePortExterior", x: 27, y: 21, facing: "down" });
    await say("We've arrived in Olivine City.\nWe hope to see you again!");
  }

  // ---------- Escape Rope ----------
  //
  // As in FireRed: it works only where the map allows escaping (caves, Viridian
  // Forest), and takes you back to where you last went from outdoors (a town,
  // city or route) through a door or cave entrance: the "escape warp".

  const OUTDOORS = ["town", "city", "route", "ocean_route"];
  // The Town Map's sections you've been to (for its dungeon icons and the
  // Pokédex's AREA MODE).
  function visitSection(map) {
    Sinnoh.visit(player, map);
    const sec = window.TOWN_MAP && window.TOWN_MAP.mapSections[map];
    if (!sec) return;
    const list = player.flags.visitedSections || (player.flags.visitedSections = []);
    if (!list.includes(sec)) list.push(sec);
    // (Going into a place's Pokémon Center counts for Fly: Route 4's.)
    for (const [k, spot] of Object.entries(window.TOWN_MAP.fly || {})) if (spot.center === map && !list.includes(k)) list.push(k);
  }
  function onWarp(from, to) {
    // (Through a hole: FireRed's fall warp.)
    seafoamFell = World.blockAt(from.map, from.x, from.y).behavior === World.MB.FALL_WARP ? to.map : null;
    leftPallet(to.map);
    visitSection(to.map);
    const a = window.WORLD_MAPS[from.map], b = window.WORLD_MAPS[to.map];
    // (FireRed's UpdateEscapeWarp: where an Escape Rope or Dig brings you out,
    // a tile south of the entrance, unless you went in facing south. Standing
    // in front of a door you're already off it.)
    if (a && b && OUTDOORS.includes(a.type) && !OUTDOORS.includes(b.type)) {
      const onWarp = !!World.warpAt(from.map, from.x, from.y), facing = Overworld.position().facing;
      player.flags.escapeWarp = { map: from.map, x: from.x, y: from.y + (onWarp && facing !== "down" ? 1 : 0) };
    }
    // Into an elevator: its doors open back where you got in until you choose a floor.
    if (/_Elevator$/.test(to.map) && !/_Elevator$/.test(from.map)) setDynamicWarp({ map: from.map, x: from.x, y: from.y });
  }
  async function useEscapeRope() {
    const here = player.location && window.WORLD_MAPS[player.location.map];
    const to = player.flags.escapeWarp;
    // (In front of the Ruins of Alph's wall that says ESCAPE: it opens, and the rope's kept.)
    if (alphReaction("escape-rope")) return true;
    if (!here || !here.allowEscaping || !to) { await message("Oak: " + player.name + "! This isn't the time to use that!"); return false; }
    Player.removeItem(player, "escape-rope");
    await message(player.name + " used the Escape Rope.");
    // (Back on the map, FireRed's Escape Rope warp: spinning up and away, and
    // down again at the way in.)
    fieldAction = async () => {
      Screen.say("");
      await Overworld.escapeRopeOut();
      await Overworld.escapeRopeIn({ map: to.map, x: to.x, y: to.y, facing: "down" });
      await persist();
    };
    return true;
  }

  // Where Teleport takes you: outside the last Pokémon Center (its Town Map Fly spot, else inside it), as blacking out
  // goes (in Hoenn, Hoenn's only), or else your room in Littleroot (in Hoenn) or home.
  function teleportTarget() {
    const inHoennNow = isHoenn(player.location.map), last = player.flags.lastCenter;
    const ok = last && (!inHoennNow || isHoenn(last)) && centerOf(last);
    if (ok) {
      const spot = Object.values(window.TOWN_MAP.fly || {}).find((s) => s.center === last);
      return spot ? { map: spot.map, x: spot.x, y: spot.y } : { map: ok.map, x: ok.x, y: ok.y };
    }
    return inHoennNow ? (player.flags.hoennRespawn || hoennBedroom()) : Object.assign({}, Player.HOME);
  }

  // Where you come to in a Pokémon Center after blacking out: Kanto's
  // (Player.CENTERS), or one of Johto's, FireRed's own room (data/johto-maps.js).
  // (A map's own `center`, where its counter is: Sinnoh's, from the Essentials project.)
  const centerOf = (map) => Player.CENTERS[map] || ((window.WORLD_MAPS[map] || {}).pokemonCenter ? Object.assign({ map, x: 7, y: 4, facing: "up" }, window.WORLD_MAPS[map].center) : null);

  // ---------- The Rejuvenator (this game's own) ----------
  //
  // In the Indigo Plateau's Pokémon Center: off to a new region, where the
  // level caps (Player.levelCap) start again at 15, a Pokémon can be made Lv. 5
  // again, keeping everything else: what it's evolved into, its moves, its
  // EVs and IVs, its nature and ability. It's fully healed, too.
  const REJUVENATED_LEVEL = 5;
  function rejuvenate(record) {
    record.level = REJUVENATED_LEVEL;
    record.exp = Experience.expForLevel(Experience.growthRate(record.species), REJUVENATED_LEVEL);
    Party.heal(record);
  }
  async function rejuvenator() {
    await say(["I'm the Rejuvenator!", "Off to a new region? Your Pokémon\nwill have to grow up all over again\nthere.",
      "I can make a Pokémon young again:\nback to Lv. 5!", "It keeps everything else: its moves,\nits training, even what it's evolved\ninto."]);
    for (;;) {
      if (!(await confirm("Shall I rejuvenate one of\nyour Pokémon?"))) { await say("Come back any time!"); return; }
      const notes = player.party.map((r) => (!r.egg && r.level > REJUVENATED_LEVEL ? "ABLE" : "NOT ABLE"));
      const r = await choosePartyFor("Rejuvenate which {PKMN}?", null, notes);
      show("world");
      if (!r) { await say("Come back any time!"); return; }
      const name = Party.displayName(r);
      if (r.egg) { await say("An Egg is as young as it gets!"); continue; }
      if (r.level <= REJUVENATED_LEVEL) { await say(name + " is young enough already!"); continue; }
      if (!(await confirm("Make " + name + " Lv. " + REJUVENATED_LEVEL + " again?"))) continue;
      rejuvenate(r);
      await sayWithJingle("mus_heal", name + " became Lv. " + REJUVENATED_LEVEL + " again!");
      await persist();
    }
  }

  // ---------- Johto's field scripts (ui/johto-script.js) ----------
  //
  // Johto's maps run HeartGold's own scripts (compiled into data/johto-maps.js
  // by tools/build-johto.js): what its people say and do, its signs, the
  // scenes its steps start and its maps' own scripts, with HGSS's flags and
  // vars, starting where a new HGSS game starts. Its trainers battle as
  // Kanto's do (their HGSS parties and lines), and its item balls, small
  // trees and breakable rocks work as Kanto's; its Apricorn trees bear an
  // Apricorn a day.
  const KANTO_BADGES = ["boulder", "cascade", "thunder", "rainbow", "soul", "marsh", "volcano", "earth"];
  const gymmicks = JohtoGymmicks.create({ sfx: (name) => sfx(name), shake: (n, opts) => Overworld.shake(n, opts),
    people: () => Overworld.people(), beaten: (id) => !!player.flags[id] });
  // The Bug-Catching Contest (ui/bug-contest.js): HGSS's, in the National Park.
  const bugContest = BugContest.create({
    player: () => player, party: Party, receive: (r) => Player.receive(player, r), national: () => Player.nationalDex(player),
    battle: (opts) => battle("wild", opts), wildMon, say: (pages) => say(pages), confirm: (question) => confirm(question),
    resume: async () => { show("world"); await Overworld.resume(); },
    setFlag: (name, on) => johto.setFlag(name, on), setVar: (name, val) => johto.setVar(name, val),
    runStd: (name) => runJohto(johtoStd(name), null),
    judging: async () => { await Overworld.teleport(Object.assign({ facing: "up" }, window.JohtoCoords ? window.JohtoCoords.toMap("NationalPark", 46, 50) : { map: "NationalPark", x: 46, y: 50 })); await runJohto(johto.frameScript("NationalPark"), null); }
  });
  // (A std script by name, compiled as a zone of its own: { zone, label }.)
  const johtoStd = (name) => { const s = (window.JOHTO_SCRIPTS.std || {})[name]; return s ? { zone: s[0], label: s[1] } : null; };
  // (Only to Johto's maps that are built: HGSS's world coordinates, as theirs.
  // Into one that isn't, as Route 34's Day Care, you stay where you are.)
  async function johtoWarp(mapConst, x, y, facing) {
    // (A map by its number, as the scripts' Warp has it: J.mapIds.)
    const J = window.JOHTO_SCRIPTS, name = J.mapConsts[typeof mapConst === "number" ? (J.mapIds || {})[mapConst] : mapConst], o = name && J.origins[J.maps[name]];
    if (!o) { await Overworld.fadeFromBlack(); return; }
    // (HGSS's map and tile: where they are now, Heart & Soul's, ui/johto-coords.js.)
    const to = window.JohtoCoords ? window.JohtoCoords.toMap(name, x - o.x, y - o.y) : { map: name, x: x - o.x, y: y - o.y };
    if (!window.WORLD_MAPS[to.map]) { await Overworld.fadeFromBlack(); return; }
    await Overworld.teleport({ map: to.map, x: to.x, y: to.y, facing });
  }
  // Johto's scripts' coordinates, HGSS's, on this map (Heart & Soul's, ui/johto-coords.js), and back; an HGSS
  // map's door, by its number there, here.
  const johtoMapOfZone = (zone) => { const J = window.JOHTO_SCRIPTS; for (const [m, z] of Object.entries(J.maps)) if (z === zone) return m; return null; };
  const johtoHere = (zone, x, y) => {
    const S = johtoMapOfZone(zone);
    if (!S || !window.JohtoCoords) return { x, y };
    const t = window.JohtoCoords.toMap(S, x, y);
    return { x: t.x, y: t.y };
  };
  const johtoThere = (zone, x, y) => {
    const map = player.location.map, m = window.WORLD_MAPS[map];
    if (!m || !m.hgss || !window.JohtoCoords) return { x, y };
    const t = window.JohtoCoords.toHgss(map, x, y, johtoMapOfZone(zone));
    return { x: t.x, y: t.y };
  };
  const johtoWarpIndex = (zone, i) => {
    const list = ((window.JOHTO_COORDS || {}).warps || {})[johtoMapOfZone(zone)];
    return list && list[i] != null ? list[i] : i;
  };
  // (A scene's walks re-planned for the map, where it's Heart & Soul's: ui/johto-coords.js retarget.)
  const johtoAct = (tracks) => {
    const map = player.location.map;
    if (!window.JohtoCoords || !(window.WORLD_MAPS[map] || {}).hgss) return Overworld.act(tracks);
    const at = (who) => (who === "player" ? Overworld.position() : who === "obj_partner_poke" ? Overworld.follower.position()
      : who === 253 || /^#/.test(String(who)) ? null : Overworld.personPosition(who));
    const others = (who) => [Overworld.position()].concat(tracks.filter((t) => t.who !== who && t.who !== "player").map((t) => at(t.who)).filter(Boolean));
    // (A scene the map's table walks its own way on Heart & Soul's ground: sceneMoves, tools/data/hns-johto-maps.json.)
    // (A key may say where you are, "@x>=14": Goldenrod's Underground has a room at each entrance.)
    const own = (window.WORLD_MAPS[map].sceneMoves || {}), you = Overworld.position();
    const where = (c) => { const r = /^@([xy])(>=|<)(\d+)$/.exec(c); return r && (r[2] === ">=" ? you[r[1]] >= +r[3] : you[r[1]] < +r[3]); };
    const mine = (t) => {
      const k = t.who + " " + String(t.label || "").replace(/^\w+:/, "");
      const c = Object.keys(own).find((n) => n.startsWith(k + " @") && where(n.slice(k.length + 1)));
      return own[c || k];
    };
    const planned = window.JohtoCoords.retarget(tracks.filter((t) => !mine(t)), {
      map, at, free: (x, y, who) => !others(who).some((p) => p && p.x === x && p.y === y && who !== "player")
    }).map((t) => (t.who === "obj_partner_poke" ? followerWalk(map, tracks.find((u) => u.who === t.who)) : t));
    return Overworld.act(tracks.map((t) => (mine(t) ? Object.assign({}, t, { moves: sceneWalk(map, t.who, mine(t), tracks) }) : planned.shift())));
  };
  // (Its steps, with "to:x,y" for the shortest way to a tile, round walls and everyone standing about, and "at:x,y".)
  function sceneWalk(map, who, moves, tracks) {
    const m = window.WORLD_MAPS[map];
    let at = who === "player" ? Overworld.position() : Overworld.personPosition(who);
    const out = [];
    for (const mv of moves) {
      // ("at:x,y": there now, as Lyra coming up the stairs of the room you're in.)
      const a = /^at:(-?\d+),(-?\d+)$/.exec(mv);
      if (a && who !== "player") { at = { x: +a[1], y: +a[2] }; Overworld.addObject(who, { x: at.x, y: at.y, facing: "down" }); continue; }
      // ("face:<who>": turned to someone where they are now, as you to Kurt's granddaughter come over to you.)
      const fc = /^face:(.+)$/.exec(mv);
      if (fc) {
        const them = fc[1] === "player" ? Overworld.position() : Overworld.personPosition(fc[1]);
        if (them && at) { const dx = them.x - at.x, dy = them.y - at.y; out.push("face_" + (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down"))); }
        continue;
      }
      const r = /^to:(-?\d+),(-?\d+)$/.exec(mv), toYou = mv === "to:player";
      if (!r && !toYou) { out.push(mv); continue; }
      if (!at) continue;
      const me = Overworld.position(), crowd = Overworld.people().filter((p) => p.def.localId !== who && !tracks.some((t) => t.who === p.def.localId));
      const taken = (x, y) => (who !== "player" && x === me.x && y === me.y) || crowd.some((p) => p.x === x && p.y === y);
      const ok = (x, y) => x >= 0 && y >= 0 && x < m.width && y < m.height && !m.collision[y * m.width + x] && !taken(x, y);
      // ("to:player": the shortest way to a tile beside you, then facing you: Kurt's granddaughter with his number.)
      if (toYou) {
        let best = null;
        for (const [d, dx, dy] of [["up", 0, 1], ["down", 0, -1], ["left", 1, 0], ["right", -1, 0]]) {
          const t = { x: me.x + dx, y: me.y + dy };
          const here = t.x === at.x && t.y === at.y, steps = here ? [] : ok(t.x, t.y) ? window.JohtoCoords.path(m, at, t, ok) : null;
          if (steps && (here || steps.length) && (!best || steps.length < best.steps.length)) best = { t, steps, d };
        }
        if (!best) continue;
        for (const d of best.steps) out.push("walk_" + d);
        out.push("face_" + best.d);
        at = best.t;
        continue;
      }
      const to = { x: +r[1], y: +r[2] };
      for (const d of window.JohtoCoords.path(m, at, to, ok)) out.push("walk_" + d);
      at = to;
    }
    return out;
  }
  // (Your walking Pokémon in a scene, on Heart & Soul's ground: HGSS's walk ends facing someone, as Ilex Forest's
  // Kimono Girl, so it goes the shortest way round to the tile beside whoever it faces, no one in its way; with no one
  // near, back behind you. Then what it does there: HGSS's steps in place.)
  function followerWalk(map, t) {
    const m = window.WORLD_MAPS[map], from = Overworld.follower.position();
    if (!from) return t;
    const moves = [].concat(t.moves), lastWalk = moves.map((mv) => /^walk(_slow|_fast|_faster)?_(up|down|left|right)$/.test(mv)).lastIndexOf(true);
    const after = moves.slice(lastWalk + 1), faced = /^(?:walk_in_place(?:_fast)?|face)_(up|down|left|right)$/.exec(after[0] || "");
    const me = Overworld.position(), D = World.DIRS, crowd = Overworld.people().filter((p) => !p.def.inanimate);
    const near = faced && crowd.map((p) => ({ p, d: Math.abs(p.x - from.x) + Math.abs(p.y - from.y) })).filter((c) => c.d <= 10).sort((a, b) => a.d - b.d)[0];
    const to = near ? { x: near.p.x - D[faced[1]][0], y: near.p.y - D[faced[1]][1] } : { x: me.x - D[me.facing][0], y: me.y - D[me.facing][1] };
    const taken = (x, y) => (x === me.x && y === me.y) || crowd.some((p) => p.x === x && p.y === y);
    if (m.collision[to.y * m.width + to.x] || taken(to.x, to.y)) return Object.assign({}, t, { moves: after });
    const steps = window.JohtoCoords.path(m, from, to, (x, y) => !m.collision[y * m.width + x] && !taken(x, y));
    return Object.assign({}, t, { moves: steps.map((d) => "walk_" + d).concat(after) });
  }
  // The Magnet Train between Goldenrod and Saffron (ui/magnet-train.js).
  const magnetTrain = MagnetTrain.create({
    player: () => player, johto: { setFlag: (name, on) => johto.setFlag(name, on) }, music: (song) => music(song),
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)), fadeOut: () => Overworld.fadeToBlack(), warp: johtoWarp,
    teleport: (loc) => Overworld.teleport(loc)
  });
  const johtoEnv = {
    player: () => player,
    bugContest,
    pcSpace: () => player.boxes.reduce((n, box) => n + box.filter((r) => !r).length, 0),
    say: (pages) => say(pages),
    confirm: (question) => confirm(fill(question)),   // (its {PLAYER}, as say()'s)
    choose: async (texts, question) => { const i = await multichoice(question || null, 0, 0, texts); Screen.say(""); return i; },
    close: () => Screen.say(""),
    facePlayer: (person) => Overworld.act([{ who: person.localId || "#" + person.id, moves: ["face_player"] }]),
    act: (tracks) => johtoAct(tracks),
    here: johtoHere, there: johtoThere, warpIndex: johtoWarpIndex,
    // (Someone a flag hid, onto the map where it has them, or where the map's script put them.)
    show: (id) => {
      const def = (window.WORLD_MAPS[player.location.map] || { people: [] }).people.find((p) => p.localId === id);
      if (!def) return;
      const at = johto.placed(id) || { x: def.x, y: def.y, facing: (/^face_(\w+)/.exec(def.movement || "") || [, "down"])[1] };
      Overworld.addObject(id, { x: at.x, y: at.y, facing: at.facing });
    },
    hide: (id) => Overworld.removeObject(id),
    // (Beyond the map's edge too: Silver comes into Cherrygrove from Route 29's side, off its east edge.)
    place: (id, x, y, facing) => {
      const map = window.WORLD_MAPS[player.location.map], at = Overworld.personPosition(id);
      if (at && x >= -16 && y >= -16 && x < map.width + 16 && y < map.height + 16) Overworld.addObject(id, { x, y, facing: facing || at.facing });
    },
    // (253: HGSS's follower Pokémon, obj_partner_poke.)
    personAt: (id) => (id === "player" ? Overworld.position() : id === 253 ? Overworld.follower.position() : Overworld.personPosition(id)),
    origin: (zone) => window.JOHTO_SCRIPTS.origins[zone],
    giveItem: async (id, n, verb) => {
      if (!window.ITEMS[id]) return false;   // (one the game hasn't got)
      Player.addItem(player, id, n);
      if (id === "coin-case") player.flags.gotCoinCase = true;   // (Mr. Game's: Kanto's Game Corner takes it too)
      if (!verb) return true;   // (GiveItem: the script says so itself)
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} " + verb + " " + (n > 1 ? n + " " + itemPlural(name) : Bag.isKeyItem(id) ? "the " + name : article(name)) + "!");
    },
    hasItem: (id, n) => Player.itemCount(player, id) >= n,
    takeItem: (id, n) => Player.removeItem(player, id, n),
    itemCount: (id) => Player.itemCount(player, id),
    cry: (species) => { if (window.DEX[species]) cry(species); },
    fade: (out) => (out ? Overworld.fadeToBlack() : Overworld.fadeFromBlack()),
    trainerBattle: (id) => johtoBattle("trainer", id),
    wildBattle: (species, level) => johtoBattle("wild", species, level),
    createRoamer: (i) => { const sp = JOHTO_ROAMERS[i]; if (sp) (player.flags.johtoRoamers || (player.flags.johtoRoamers = {}))[sp] = true; },
    warp: johtoWarp,
    // (The Magnet Train's ride, ScrCmd_722: ui/magnet-train.js.)
    magnetTrain: (toward, mapConst, x, y) => magnetTrain.ride(toward, mapConst, x, y),
    // (Kanto's Badges count once Johto's League is won: HGSS's scripts take a
    // Kanto Badge to mean that, as the Gym Leaders' days off do, and here you
    // come to Johto with all eight.)
    hasBadge: (n) => (n >= 8 ? !!player.flags.johtoLeagueClear && player.badges.includes(KANTO_BADGES[n - 8]) : player.badges.includes(Player.REGION_BADGES.johto[n])),
    giveBadge: (n) => {
      const b = n >= 8 ? KANTO_BADGES[n - 8] : Player.REGION_BADGES.johto[n];
      if (b && !player.badges.includes(b)) player.badges.push(b);
      if (b === "rising") player.flags.rockClimbDue = true;
    },
    givePokedex: () => { player.flags.pokedex = true; },
    itemName: (id) => (window.ITEMS[id] ? Bag.name(id) : String(id)),
    giveMon: async (species, level, item) => {
      if (!window.DEX[species]) return false;
      let record = null;
      const ok = await giftMon(species, level, ["{PLAYER} received " + Party.speciesName(species) + "!"], [], () => {
        record = player.party[player.party.length - 1];
      });
      // (Holding its item, if it joined your party.)
      if (ok && item && window.ITEMS[item] && record && record.species === species && !record.item) record.item = item;
      return ok;
    },
    setDynamicWarp: (mapConst, x, y) => { const name = window.JOHTO_SCRIPTS.mapConsts[mapConst]; if (name) setDynamicWarp({ map: name, x, y }); },
    dynamicWarpMap: () => (player.flags.dynamicWarp || {}).map,
    money: () => player.money,
    addMoney: (n) => { player.money = Math.max(0, Math.min(999999, player.money + n)); },
    coins: () => coins(),
    addCoins: (n) => addCoins(n),
    // (The Game Corner: the Coins window at the top right, Voltorb Flip, a prize's pocket.)
    coinsBox: (on) => coinsBox(on ? 20 : null, 0),
    casinoGame: () => voltorbFlip(),
    itemPocket: (id) => (window.ITEMS[id] ? Bag.pocket(id) : ""),
    beaten: (id) => !!player.flags["HGSS_" + String(id).replace(/^HGSS_/, "")],
    setBeaten: (id, on) => { const k = "HGSS_" + String(id).replace(/^HGSS_/, ""); if (on) player.flags[k] = true; else delete player.flags[k]; },
    sleep, isGirl, onBike: () => Overworld.avatar() === "bike",
    chooseStarter: johtoStarter,
    nickname: async (i) => {
      const r = typeof i === "object" ? i : player.party[i];   // (or a Pokémon not in your party: the contest's bug)
      if (!r) return;
      const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", Party.displayName(r), 10);
      if (typed && typed !== Party.speciesName(r.species)) r.nickname = typed;
    },
    nameRival: async (name) => (await enterText("His name?", name, 7)) || name,
    healParty: () => player.party.forEach(Party.heal),
    // (The Gyms' gimmicks: ui/johto-gymmicks.js.)
    violetLift: () => gymmicks.violetLift(),
    turnWinch: () => { const turned = gymmicks.turnWinch(); applyPatches(player.location.map); return turned; },
    // (The Ruins of Alph: ui/johto-alph.js.)
    shake: (n, opts) => Overworld.shake(n, opts),
    alphPuzzle: (n) => alphPuzzle(n),
    alphWall: (n) => alphOverlay((c) => JohtoAlph.wall(c, n)),
    unownCaught: () => player.flags.unownCaught || [],
    // (The Safari Zone: ui/johto-safari.js.)
    safariAction: (n) => johtoSafari.action(n), safariChallenge: (n) => johtoSafari.challenge(n), areaCustomizer: () => johtoSafari.customizer(), safariStamp: () => johtoSafari.stamp(),
    giveEgg: async (species) => { Player.receive(player, Breeding.giftEgg(species, { map: player.location.map })); },
    mart: (stock) => mart(stock),
    kurt: (op) => johtoField.kurt(op), followerIdle: () => Overworld.follower.idle(), followerHide: (on) => Overworld.follower.hide(on),
    // (The Pokégear: ui/pokegear.js.)
    phoneCall: (who, kind, n) => gear.call(who, kind, n), registerCard: (n) => gear.registerCard(n),
    phoneRematch: (n) => gear.rematch(n), phoneTrigger: (n, on) => gear.setTrigger(n, on), buenaPassword: () => gear.passwordSet(),
    // (HGSS's tiers: none with no Badges, then by twos; Johto's Badges here.)
    martStock: (list) => {
      const n = Player.REGION_BADGES.johto.filter((b) => player.badges.includes(b)).length;
      const tier = n === 0 ? 1 : n <= 2 ? 2 : n <= 4 ? 3 : n <= 6 ? 4 : n === 7 ? 5 : 6;
      return list.filter(([, t]) => tier >= t).map(([id]) => id);
    },
    // (Choosing a Pokémon, its trades and loans, its moves: below.)
    choosePartyMon: async (message) => { const r = await choosePartyFor(message); show("world"); return r ? player.party.indexOf(r) : -1; },
    npcTrade: (trade, i) => tradeFor(i, johtoTradeMon(trade, player.party[i].level), trade.ot.name),
    giveLoanMon: async (trade, level, n) => {
      const r = Object.assign(johtoTradeMon(trade, level), { loan: n }, n === 7 ? { mail: "kenya" } : {});
      Player.receive(player, r);
    },
    setMove: (i, slot, move) => { if (window.MOVES[move]) Party.teachMove(player.party[i], move, slot); },
    chooseMoveToForget: async (i, move) => {
      const r = player.party[i];
      // (The Move Deleter's: which move, as Kanto's asks.)
      const k = move ? await chooseMoveToForget(r, move) : await ask("Which move should be forgotten?",
        r.moves.map((m, j) => ({ label: m.name, value: j, className: "type-" + MOVES[m.name].type })).concat([back()]));
      show("world");
      return k == null || k === "back" ? -1 : k;
    },
    canLearnTutor: (i, move) => tutorCanLearn(player.party[i], move),
    relearnable: (i) => relearnable(player.party[i]).length,
    relearn: async (i, moves) => {
      const r = player.party[i];
      Screen.say("");
      clearMenu();
      const move = await MoveRelearner.open({
        name: Party.displayName(r), moves: moves || relearnable(r), known: r.moves.map((m) => m.name), frame: GameOptions.get().frame,
        forget: (m) => chooseMoveToForget(r, m), teach: (m, slot) => Party.teachMove(r, m, slot == null ? undefined : slot)
      });
      show("world");
      return !!(move && Party.knowsMove(r, move));
    },
    // (A song, or the map's own again, or none.)
    music: (song) => music(song === null ? avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music : song || null),
    fanfare: (song) => (song ? fanfare(song) : Promise.resolve()),
    se: (name) => sfx(name),
    shake: (n, opts) => Overworld.shake(n, opts),
    moneyBox: (on) => moneyBox(on ? 0 : null, 0),
    moveWarp: (map, i, x, y) => { const w = ((window.WORLD_MAPS[map || player.location.map] || {}).warps || [])[i]; if (w) Object.assign(w, { x, y }); },
    pcSpace: () => player.boxes.reduce((n, box) => n + box.filter((r) => !r).length, 0),
    itemPocket: (id) => (window.ITEMS[id] ? Bag.pocket(id) : "Items")
  };
  const johto = JohtoScript.create(johtoEnv);

  // ---------- Hoenn (Emerald's scripts: ui/hoenn-script.js, tools/build-hoenn.js) ----------
  //
  // Its maps are data/emerald-maps.js's, with `region: "hoenn"`; its people say and do what
  // Emerald's scripts say (window.HOENN_SCRIPTS), with this game's own battles, shops and menus.
  const isHoenn = (map) => (window.WORLD_MAPS[map] || {}).region === "hoenn";
  let hoennEntering = null;
  const hoennEnv = Object.assign({}, johtoEnv, {
    // (While a map you're coming into runs its OnTransition and OnLoad, it's that map, not the one you left.)
    map: () => hoennEntering || player.location.map,
    // (Someone a flag hid, onto the map where it has them, or where the script put them.)
    show: (id) => {
      const map = player.location.map, def = (window.WORLD_MAPS[map] || { people: [] }).people.find((p) => p.localId === id);
      if (!def) return;
      hoenn.setShown(map, id, true);
      const at = hoenn.placed(map, id) || { x: def.x, y: def.y }, v = hoennVisible(def, map);
      Overworld.addObject(id, { x: at.x, y: at.y, facing: (/^face_(\w+)/.exec((v && v.movement) || def.movement || "") || [, "down"])[1] }, v && v !== true ? v : null);
    },
    // (Emerald's removeobject sets the person's flag too, so they're gone for good: May off Route 103 once beaten.)
    hide: (id) => {
      const def = ((window.WORLD_MAPS[player.location.map] || {}).people || []).find((p) => p.localId === id);
      if (def && def.flag && !def.item && /^FLAG_/.test(def.flag)) hoenn.setFlag(def.flag, true);
      hoenn.setShown(player.location.map, id, false); Overworld.removeObject(id);
    },
    place: (id, x, y, facing) => {
      const at = Overworld.personPosition(id);
      if (at) Overworld.addObject(id, { x, y, facing: facing || at.facing });
    },
    setMovement: (id, movement) => Overworld.setPersonMovement(id, movement),
    // Mr. Briney's boat (ui/hoenn-script.js voyage): aboard, out of sight, your Pokémon back in its Ball; the sea on
    // screen (the map you set out from and those joined to it); and landing on another map, on its boat.
    boardBoat: async () => {
      const at = Overworld.position(), m = window.WORLD_MAPS[at.map];
      if (!m || !m.people.some((p) => /_BOAT$/.test(p.localId || "") && /BRINEY/.test(p.flag || ""))) return null;
      Overworld.follower.hide(true);
      await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
      return at;
    },
    sailable: (map, x, y) => {
      const m = window.WORLD_MAPS[map];
      if (x >= 0 && y >= 0 && x < m.width && y < m.height) return true;
      return m.connections.some((c) => {
        const n = c.map && window.WORLD_MAPS[c.map];
        if (!n) return false;
        const [ox, oy] = World.connectionOrigin(m, c);
        return x >= ox && y >= oy && x < ox + n.width && y < oy + n.height;
      });
    },
    landBoat: async (v, mapConst) => {
      const name = mapConst && window.HOENN_SCRIPTS.consts[mapConst];
      let x = v.x, y = v.y;
      if (name && name !== v.map) {
        // (Where you are on that map: the maps' places from the joins between them, out from the one you set out from.)
        const at = { [v.map]: [0, 0] }, queue = [v.map];
        while (queue.length && !at[name]) {
          const mn = queue.shift(), m = window.WORLD_MAPS[mn];
          for (const c of m.connections || []) {
            if (!c.map || at[c.map] || !window.WORLD_MAPS[c.map]) continue;
            const [ox, oy] = World.connectionOrigin(m, c);
            at[c.map] = [at[mn][0] + ox, at[mn][1] + oy];
            queue.push(c.map);
          }
        }
        if (at[name]) { x -= at[name][0]; y -= at[name][1]; }
        if (!v.dark) await Overworld.fadeToBlack();
        Screen.say("");
        await Overworld.teleport({ map: name, x, y, facing: "down", hidden: true });
        // (Its boat under you, as you came in on it.)
        const boat = (window.WORLD_MAPS[name].people || []).find((p) => /_BOAT$/.test(p.localId || "") && /BRINEY/.test(p.flag || ""));
        if (boat) { hoenn.setShown(name, boat.localId, true); Overworld.addObject(boat.localId, { x, y: y + 1, facing: "down" }); }
        await Overworld.act([{ who: "player", moves: ["set_visible"] }]);
        await Overworld.fadeFromBlack();
      } else {
        await Overworld.act([{ who: "player", moves: ["set_visible"] }]);
        if (v.dark) await Overworld.fadeFromBlack();
      }
      Overworld.follower.hide(false);
    },
    personAt: (id) => (id === "player" ? Overworld.position() : Overworld.personPosition(id)),
    moveTo: (x, y) => Overworld.moveTo(x, y),
    giveItem: async (id, n, verb) => {
      if (!window.ITEMS[id]) return false;
      Player.addItem(player, id, n);
      if (!verb) return true;
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} " + (verb === "found" ? "found " : "obtained ") + (n > 1 ? n + " " + itemPlural(name) : Bag.isKeyItem(id) ? "the " + name : article(name)) + "!");
    },
    beaten: (id) => !!player.flags[id],
    // (The PokéNav's Match Call: the Hoenn trainers registered, in Emerald's state: ui/pokegear.js.)
    registerMatchCall: (id) => { const s = hoenn.state(), mc = s.mc || (s.mc = []); if (mc.includes(id)) return false; mc.push(id); return true; },
    matchCallRegistered: (id) => ((hoenn.state().mc || []).includes(id)),
    setBeaten: (id, on) => { if (on) player.flags[id] = true; else delete player.flags[id]; },
    trainerBattle: (id, o) => hoennBattle(id, o),
    // (The weather the legendaries bring: Kyogre's rain, Groudon's sun, Rayquaza's winds.)
    wildBattle: (species, level, item) => johtoBattle("wild", species, level, { weather: ({ Kyogre: "PrimordialSea", Groudon: "DesolateLand", Rayquaza: "DeltaStream" })[species],
      teach: species === "Rayquaza" ? "Dragon Ascent" : undefined }),
    warp: (mapConst, at) => hoennWarp(mapConst, at),
    setWeather: (name) => { hoennSaved = hoennKind(name); },
    decorMart: (keys) => hoennDecor.mart(keys),
    decorAdd: (key) => { const d = hoennDecor.byKey(key); return !!d && hoennDecor.give(d.id); },
    decorSpace: (key) => { const d = hoennDecor.byKey(key); return !!d && hoennDecor.count(d.cat) < HoennDecor.CAPACITY[d.cat]; },
    decorGive: async (key) => {
      const d = hoennDecor.byKey(key);
      if (!d || !hoennDecor.give(d.id)) return 0;
      await sayWithJingle("mus_obtain_item", "{PLAYER} obtained the " + d.name + "!");
      return 1;
    },
    metatileAt: (map, x, y) => metatileAt(map, x, y),
    setLayout: (map, layout) => hoennLayout(map, layout),
    syncSpecial: (name, api) => hoennSyncSpecial(name, api),
    fieldEffect: async (name) => { if (name === "FLDEFF_HALL_OF_FAME_RECORD") await HallOfFame.recordFlash($("#overlay")); },
    badge: (n, on) => {
      const b = Player.REGION_BADGES.hoenn[n];
      if (!b) return;
      if (on && !player.badges.includes(b)) player.badges.push(b);
      else if (!on) player.badges = player.badges.filter((x) => x !== b);
    },
    hasBadge: (n) => player.badges.includes(Player.REGION_BADGES.hoenn[n]),
    save: () => persist(),
    // (Emerald's system flags, as this game's: the Pokédex Birch gives you.)
    onFlag: (name, on) => { if (name === "FLAG_SYS_POKEDEX_GET") player.flags.pokedex = on; },
    // (The Game Corner's slot machines: ui/slot-machine.js.)
    slotMachine: async (id) => {
      Screen.say("");
      player.flags.coins = await window.SlotMachine.play({ machineId: id, coins: coins(), maxCoins: MAX_COINS, sfx, fanfare });
      show("world");
      await Overworld.resume();
    },
    showPicture: (species) => showPicture(species), hidePicture: () => hidePicture(),
    setMetatile: (map, x, y, id, impassable) => hoennMetatile(map, x, y, id, impassable),
    braille: (s) => braille(s),
    setDynamicWarp: (mapConst, x, y) => { const name = window.HOENN_SCRIPTS.consts[mapConst]; if (name) setDynamicWarp({ map: name, x, y }); },
    respawn: (id) => { const h = window.HOENN_SCRIPTS.heal[id]; if (h) player.flags.hoennRespawn = h; },
    special: (name, api) => hoennSpecial(name, api)
  });
  const hoenn = HoennScript.create(hoennEnv);
  // The Battle Frontier (ui/hoenn-frontier.js): Emerald's lobbies and battle rooms run their own scripts; this is what they ask for.
  const hoennFrontier = HoennFrontier.create({
    player: () => player, map: () => player.location.map, pyramidApply: () => pyramidApply(), getVar: (n) => hoenn.getVar(n), flag: (n) => hoenn.flag(n),
    createMon: (species, level, o) => Party.create(species, level, o),
    say: (t) => say(t), caught: (sp) => Player.hasCaught(player, sp), itemName: (id) => Bag.name(id),
    itemConst: (id) => "ITEM_" + String(id).toUpperCase().replace(/-/g, "_"),
    giveItem: async (id) => { if (!window.ITEMS[id]) return false; Player.addItem(player, id, 1); return true; },
    chooseParty: async ({ max, check, party }) => {
      // (Choosing among some of them: those stand in for your party while you choose.)
      const real = player.party;
      if (party) player.party = party;
      try { return await chooseBattleTeam(max, { check }); } finally { player.party = real; }
    },
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    battle: (spec) => frontierBattle(spec),
    lastRecord: () => lastRecord, saveRecord: (rec) => { player.flags.hoennBattleRecord = rec; lastRecord = null; },
    // (The Apprentice asks what a Pokémon should hold: the Bag, for an item to suggest, which stays yours.)
    chooseItem: async () => {
      const r = await BagScreen.open({ pockets: bagPockets, pocketName: bagPocket, frame: GameOptions.get().frame, female: isGirl(),
        actions: (it) => (holdable(it.id) ? [{ label: "Suggest", value: "give" }] : []) });
      BagScreen.close();
      show("world");
      return r ? r.id : null;
    },
    bpBox: (on, n) => GbaMenus.fieldWindow("bp", on ? { x: 0, y: 0, amount: n, label: "BP", text: String(n || 0) } : null),
    // (The Factory's rental and swap screens and the Dome's tourney tree: ui/hoenn-frontier-screens.js.)
    factorySelect: async (mons) => { Screen.say(""); const r = await HoennFrontierScreens.factorySelect($("#overlay"), { mons, summary: (i) => summary(i, mons) }); show("world"); await Overworld.resume(); return r; },
    factorySwap: async (mine, theirs) => { Screen.say(""); const r = await HoennFrontierScreens.factorySwap($("#overlay"), { mine, theirs, summary: (which, i) => summary(i, which ? theirs : mine) }); show("world"); await Overworld.resume(); return r; },
    domeTree: async (d) => { Screen.say(""); await HoennFrontierScreens.tourneyTree($("#overlay"), d); show("world"); await Overworld.resume(); },
    // (A challenge you pause is saved where you started it: the lobby. Then the game starts over, as Emerald's soft reset.)
    markHome: () => { const at = Overworld.position(); hoennFrontier.state().home = { map: player.location.map, x: at.x, y: at.y, facing: at.facing || "down" }; },
    save: async (paused) => {
      tick();
      const s = hoennFrontier.state(), here = player.location;
      if (paused && s.home) player.location = Object.assign({}, s.home);
      try { Save.write(player); } finally { player.location = here; }
    },
    softReset: async () => { window.location.reload(); await new Promise(() => {}); }
  });
  hoennEnv.frontierOp = (op, a, api) => hoennFrontier.op(op, a, api);
  // The Contests (ui/hoenn-contest.js).
  const hoennContest = HoennContest.create({
    player: () => player, say: (t) => say(t), gameClear: () => !!player.flags.gameClear,
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    choosePartyMon: (prompt) => hoennEnv.choosePartyMon(prompt)
  });
  hoennEnv.contestOp = (op, a, api) => hoennContest.op(op, a, api);
  // Pokéblocks (ui/hoenn-pokeblock.js): the Berry Blender (ui/berry-blender.js), the Pokéblock Case, feeding them.
  const hoennPokeblock = HoennPokeblock.create({
    player: () => player, say: (t) => say(t), confirm: (q) => confirm(q), flag: (n) => hoenn.flag(n), itemName: (id) => Bag.name(id), fanfare, sfx, rand: Math.random,
    pick: async (title, labels) => { const i = await multichoice(title, 0, 0, labels); Screen.say(""); return i; },
    chooseBerry: () => berryEnv.chooseBerry("Use"), choosePartyMon: (prompt) => hoennEnv.choosePartyMon(prompt),
    blender: async (players) => { show("scene"); clearMenu(); Screen.say(""); const r = await BerryBlender.run(scene, { players }); show("world"); await Overworld.resume(); return r; },
    feederInFront: () => hoennFeederInFront(), placeOnFeeder: (b) => hoennPlaceOnFeeder(b)
  });
  hoennEnv.healParty = () => { player.party.forEach(Party.heal); hoennFrontier.healTeam(); };
  // (The Safari Zone's Pokéblock feeders: hoennSafari below.)
  const hoennFeederInFront = () => (typeof hoennSafari !== "undefined" && hoennSafari.feederInFront ? hoennSafari.feederInFront() : 65535);
  const hoennPlaceOnFeeder = (b) => { if (typeof hoennSafari !== "undefined" && hoennSafari.placeOnFeeder) hoennSafari.placeOnFeeder(b); };
  // ---------- The Battle Pyramid's floor ----------
  const PYRAMID_FLOOR = "BattleFrontier_BattlePyramidFloor";
  // Its walls (and the way out, with its step) in place of the plain floor the map's drawn as.
  function pyramidApply() {
    const m = window.WORLD_MAPS[PYRAMID_FLOOR], F = hoennFrontier.pyramidLayout();
    if (!m || !F) return;
    restoreMetatiles(PYRAMID_FLOOR);
    for (const t of F.tiles) hoennMetatile(PYRAMID_FLOOR, t.x, t.y, "#" + t.m, !!t.c);
    m.triggers = F.exit ? [{ x: F.exit.x, y: F.exit.y, script: "hoenn:BattlePyramid_WarpToNextFloor", var: "VAR_TEMP_0", value: 0 }] : [];
  }
  // Its trainers and items, looking as Emerald's classes do.
  function pyramidPeople() {
    return hoennFrontier.pyramidPeople().map((p) => {
      if (p.pyramid == null) return p;
      const look = window.HOENN_SCRIPTS.gfx[p.look] || window.HOENN_SCRIPTS.gfx.OBJ_EVENT_GFX_BOY_1;
      window.WORLD_TRAINERS[p.trainer.id] = { className: p.className, name: p.name, pic: p.pic, party: [], music: "em_encounter_male", double: false, intro: p.trainer.intro, defeat: p.trainer.defeat };
      return Object.assign({}, look, p);
    });
  }
  TRAINER_SCRIPTS.add("Game_EventScript_PyramidTrainer");
  // A trainer on the floor: the same walk up and word as anyone's, then a battle for the challenge's three, and the floor's scripts see how it went.
  async function pyramidFight(person, approach, facing) {
    const t = person.trainer, who = "#" + person.id, map = player.location.map, s = hoennFrontier.state();
    const spec = hoennFrontier.pyramidTrainer(person.pyramid);
    if (!spec) return;
    music("em_encounter_male");
    if (approach != null) {
      await Overworld.act([{ who, moves: ["emote_exclamation_mark"].concat(Array(approach).fill("walk_" + facing)) }]);
      await Overworld.act([{ who: "player", moves: ["face_" + World.OPPOSITE[facing]] }]);
    }
    await say(t.intro);
    const outcome = await frontierBattle(spec);
    if (outcome === "won") player.flags[t.id] = true;
    s.outcome = outcome === "won" ? 1 : 2;
    if (outcome === "lost") show("world");
    await hoenn.resume(map);
    const label = hoenn.frameScript(player.location.map, false);
    if (label) await runHoenn(label);
    if (outcome === "won") await say(hoennFrontier.pyramidHint(person.pyramid, Overworld.position()));
  }
  async function pikeWildBattle(ev) {
    const s = hoennFrontier.state(), real = player.party, map = player.location.map;
    player.party = s.team;
    let outcome;
    try {
      outcome = await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(ev.species, ev.level, ev.moves ? { moves: ev.moves } : {}))] }, noExp: true, noBlackout: true, noGimmicks: true, noCatch: true });
    } finally { player.party = real; }
    s.outcome = ({ won: 1, lost: 2, ran: 4 })[outcome] || 1;
    show("world"); await Overworld.resume();
    await hoenn.resume(map);
    const label = hoenn.frameScript(player.location.map, false);
    if (label) await runHoenn(label);
  }
  // A challenge's battle: the challenge's own Pokémon stand in for your party for its length.
  async function frontierBattle(spec) {
    if (!canBattle()) return "lost";
    // (For the bots that play-test it: HOENN_FORCE_WIN = "won" | "lost" settles each battle at once.)
    if (window.HOENN_DEBUG && window.HOENN_FORCE_WIN) return window.HOENN_FORCE_WIN;
    const real = player.party;
    player.party = spec.team;
    let outcome;
    try {
      const opts = { foe: spec.foe, defeatText: spec.defeatText, double: !!spec.double, noExp: true, noPrize: true, noBlackout: true, noGimmicks: true, arena: !!spec.arena, palace: !!spec.palace, record: true };
      if (spec.partner) { opts.partner = spec.partner; opts.chosen = spec.team.map((r, i) => i).slice(0, 2); }
      if (spec.foe2) opts.foe2 = spec.foe2;
      outcome = await battle("trainer", opts);
    } finally { player.party = real; }
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // The label of Emerald's script for what you've come to (a person, a sign, a step), unless this game has its own:
  // the nurses and clerks, the trainers on their sight lines, item balls, trees and rocks.
  function hoennScriptFor(ev) {
    const thing = ev.person || ev.sign || ev.trigger;
    if (!thing || !isHoenn(ev.map || player.location.map)) return null;
    const script = thing.script || "";
    // (A secret base spot: the way into your base once it's yours, into someone else's if it's theirs, the way to make one if not.)
    if (ev.sign && ev.sign.spot) {
      const npc = !hoennOwnSpot(ev.sign) && hoennNpcBaseAt(ev.map || player.location.map, ev.sign.spot);
      if (npc) { player.flags.hoennVisit = npc.id; return hoenn.scriptOf({ script: "SecretBase_EventScript_Enter" }); }
      return hoenn.scriptOf({ script: hoennOwnSpot(ev.sign) ? "SecretBase_EventScript_Enter" : "SecretBase_EventScript_CheckEntrance" });
    }
    // (The PC in someone else's base registers it: SecretBase_EventScript_RecordMixingPC.)
    if (ev.sign && script === "SecretBase_EventScript_PC" && hoennVisiting() && player.location.map === hoennVisiting().room) return hoenn.scriptOf({ script: "SecretBase_EventScript_RecordMixingPC" });
    if (SPECIAL.has(script) || /^EventScript_(CutTree|RockSmash|StrengthBoulder)$/.test(script)) return null;
    if (ev.person && ((ev.person.trainer && ev.person.trainer.id) || ev.person.item)) return null;
    return hoenn.scriptOf(thing);
  }
  // Whether someone's on a Hoenn map now: Emerald's flag for them (FLAG_HIDE_*), where a script put them, how they look.
  function hoennVisible(person, map) {
    if (map === PYRAMID_FLOOR && /^LOCALID_BATTLE_FRONTIER_BATTLE_PYRAMID_FLOOR_\d+$/.test(person.localId || "")) return false;   // (the floor's own people are put there as it's made: pyramidPeople)
    const f = player.flags, id = person.localId, shown = hoenn.shown(map, id);
    if (shown === false) return false;
    // (A tree you've cut or a rock you've smashed, till you leave the map: cutDown, smashRock.)
    if (person.flag && tempFlags.has(map + ":" + person.flag)) return false;
    if (person.item) { if (f[person.flag]) return false; }
    else if (person.flag && hoenn.flag(person.flag) && shown !== true) return false;
    const out = {};
    if (person.gfxVar) {
      const look = window.HOENN_SCRIPTS.gfx[hoenn.getVar(person.gfxVar)];
      if (!look) return false;
      Object.assign(out, look);
    }
    const at = hoenn.placed(map, id), mv = hoenn.movement(map, id);
    if (at) { out.x = at.x; out.y = at.y; }
    if (mv) out.movement = mv;
    return Object.keys(out).length ? out : true;
  }
  // Prof. Birch's rating on the PokéNav (Match Call's MC_TYPE_BIRCH: BufferPokedexRatingForMatchCall): Hoenn's seen and
  // caught, and what he says of it.
  function birchRatingPages() {
    const T = window.HOENN_SCRIPTS.t, seen = hoennDexCount("seen", true), caught = hoennDexCount("caught", true);
    const head = (T.gBirchDexRatingText_SoYouveSeenAndCaught || []).map((p) => fill(p, [String(seen), String(caught)]));
    const done = caught >= 200;
    return head.concat((T[done ? "gBirchDexRatingText_DexCompleted" : "gBirchDexRatingText_LessThan" + Math.min(200, (Math.floor(caught / 10) + 1) * 10)] || []).map((p) => fill(p)));
  }
  // A Pokémon from a map's grass (a registered trainer's call: STR_SPECIES_IN_ROUTE), by its constant.
  function wildOnMap(mapConst) {
    const m = window.WORLD_MAPS[(window.HOENN_SCRIPTS.consts || {})[mapConst]], slots = m && m.wild && m.wild.slots;
    return slots && slots.length ? Party.speciesName(slots[Math.floor(Math.random() * slots.length)].species) : null;
  }
  // A trainer's battle in a script (EM_ ids: data/emerald-maps.js): "won" or "lost".
  async function hoennBattle(id, o) {
    if (!canBattle()) return "lost";
    const data = window.WORLD_TRAINERS[id];
    if (!data) return "won";
    const outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
      defeatText: (o && o.defeat) || data.defeat || ["…"], trainerId: id, prizeClass: data.className, double: !!((o && o.double) || data.double) && canDouble() });
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // warp MAP, x, y (or a warp's number): out of the way you were, into the map.
  async function hoennWarp(mapConst, at) {
    const name = window.HOENN_SCRIPTS.consts[mapConst], dest = name && window.WORLD_MAPS[name];
    if (!dest) { await Overworld.fadeFromBlack(); return; }
    let x, y;
    if (at && at.warp != null && at.warp !== 255 && dest.warps[at.warp]) ({ x, y } = dest.warps[at.warp]);
    else if (at && at.x != null && at.x >= 0) ({ x, y } = at);
    else ({ x, y } = dest.warps[0] || { x: 0, y: 0 });
    // (A Battle Pyramid floor: made as you go in, and you start where its way in is.)
    if (name === PYRAMID_FLOOR && hoennFrontier.pyramidLayout) { ({ x, y } = hoennFrontier.pyramidLayout().start); pyramidApply(); }
    Screen.say("");
    await Overworld.teleport({ map: name, x, y, facing: "down" });
  }
  // Emerald's setmetatile: the tile is drawn over the map (from its sheet: assets/world/maps/<Map>-mt.png) and
  // opens or closes the way, until you leave the map (its scripts put them back as you come in).
  // A Gym's puzzle reads the metatiles too (src/field_specials.c): those maps keep theirs (`blocks`).
  const metatileSet = {}, metatileNow = {};
  function hoennMetatile(map, x, y, label, impassable) {
    const m = window.WORLD_MAPS[map];
    if (!m || x < 0 || y < 0 || x >= m.width || y >= m.height) return;
    const i = y * m.width + x, t = m.mt && m.mt[label];
    const base = baseCollision[map] || (baseCollision[map] = m.collision.slice()), baseB = baseBehavior[map] || (baseBehavior[map] = m.behavior.slice());
    void base; void baseB;
    m.collision[i] = impassable ? 1 : 0;
    if (t) {
      m.behavior[i] = t[1]; (metatileSet[map] = metatileSet[map] || {})[i] = t[0];
      if (m.blocks) (metatileNow[map] = metatileNow[map] || m.blocks.slice())[i] = t[2];
    }
  }
  // The metatile at a tile now (its number), and one set by its number (a Gym's special: the sheet has it, by label or "#number").
  const metatileAt = (map, x, y) => { const m = window.WORLD_MAPS[map]; return ((metatileNow[map] || m.blocks || [])[y * m.width + x]); };
  function hoennMetatileId(map, x, y, id, impassable) {
    const m = window.WORLD_MAPS[map], key = Object.keys(m.mt || {}).find((k) => m.mt[k][2] === id);
    if (key) hoennMetatile(map, x, y, key, impassable);
    else { m.collision[y * m.width + x] = impassable ? 1 : 0; if (m.blocks) (metatileNow[map] = metatileNow[map] || m.blocks.slice())[y * m.width + x] = id; }
  }
  // A layout a script swaps in (setmaplayoutindex): the tiles it changes, as setmetatile would (tools/build-hoenn.js has the differences).
  function hoennLayout(map, layout) {
    const m = window.WORLD_MAPS[map], list = m && m.layouts && m.layouts[layout];
    if (list) for (const [x, y, id, col] of list) hoennMetatileId(map, x, y, id, !!col);
  }
  // Coming into a Hoenn map: its own tiles again, before its scripts change them.
  function restoreMetatiles(map) {
    const m = window.WORLD_MAPS[map];
    if (!m || !baseCollision[map]) return;
    m.collision = baseCollision[map].slice(); m.behavior = baseBehavior[map].slice();
    delete metatileSet[map]; delete metatileNow[map];
  }
  const hoennOverlay = (map) => {
    const set = metatileSet[map], m = window.WORLD_MAPS[map];
    return set ? Object.keys(set).map((i) => [i % m.width, Math.floor(i / m.width), set[i]]) : null;
  };
  // Petalburg Gym's sliding doors (PetalburgGymSetDoorMetatiles): a room's doors, by Norman's rooms' numbers.
  const PETALBURG_DOORS = { 1: [[1, 104], [7, 104]], 2: [[1, 78], [7, 78]], 3: [[1, 91], [7, 91]], 4: [[7, 39]], 5: [[1, 52], [7, 52]], 6: [[1, 65]], 7: [[7, 13]], 8: [[1, 26]] };
  function petalburgDoors(room, frame) {
    const map = "PetalburgCity_Gym", m = window.WORLD_MAPS[map], id = m.mt["METATILE_PetalburgGym_SlidingDoor_Frame" + frame][2];
    for (const [x, y] of PETALBURG_DOORS[room] || []) { hoennMetatileId(map, x, y, id, frame < 4); hoennMetatileId(map, x, y + 1, id + 8, frame < 4); }   // (Open at the last frame.)
  }
  // Mauville Gym's beams and switches (MauvilleGymSetDefaultBarriers and MauvilleGymDeactivatePuzzle, which turn the
  // whole puzzle over, or off), by the tiles' names; MauvilleGymPressSwitch (the switch you stepped on is pressed).
  function mauvilleGym(what, switchNo) {
    const map = "MauvilleCity_Gym", m = window.WORLD_MAPS[map], L = (n) => m.mt["METATILE_MauvilleGym_" + n][2];
    const name = (id) => { const k = Object.keys(m.mt).find((q) => m.mt[q][2] === id); return k ? k.replace("METATILE_MauvilleGym_", "") : null; };
    const SWITCHES = [[0, 15], [4, 12], [3, 9], [8, 9]];
    if (what === "press") {
      SWITCHES.forEach(([x, y], i) => hoennMetatileId(map, x, y, L(i === switchNo ? "PressedSwitch" : "RaisedSwitch"), false));
      return;
    }
    const set = (x, y, n, imp) => hoennMetatileId(map, x, y, L(n), !!imp);
    if (what === "off") SWITCHES.forEach(([x, y]) => hoennMetatileId(map, x, y, L("PressedSwitch"), false));
    for (let y = 5; y < 17; y++) for (let x = 0; x < 9; x++) {
      const n = name(metatileAt(map, x, y)), beam = /^(Green|Red)BeamH(\d)_(On|Off)$/.exec(n || "");
      if (beam) {
        // (Each horizontal beam is turned over: on to off, and off to on, where its two top-most are walls: H3 and H4.)
        if (beam[3] === "On") set(x, y, beam[1] + "BeamH" + beam[2] + "_Off");
        else if (what === "flip") set(x, y, beam[1] + "BeamH" + beam[2] + "_On", beam[2] >= 3);
        continue;
      }
      switch (n) {
        case "GreenBeamV1_On": set(x, y, "PoleBottom_On", true); break;
        case "RedBeamV1_On": set(x, y, "PoleBottom_Off", true); break;
        case "GreenBeamV2_On": case "RedBeamV2_On": set(x, y, "FloorTile"); break;
        case "PoleTop_On": set(x, y, "PoleTop_Off"); break;
        case "PoleBottom_On": if (what === "flip") set(x, y, "GreenBeamV1_On", true); break;
        case "PoleBottom_Off": if (what === "flip") set(x, y, "RedBeamV1_On", true); break;
        case "PoleTop_Off": if (what === "flip") set(x, y, "PoleTop_On", true); break;
        case "FloorTile":
          if (what === "flip") set(x, y, name(metatileAt(map, x, y - 1)) === "GreenBeamV1_On" ? "GreenBeamV2_On" : "RedBeamV2_On", true);
          break;
      }
    }
  }
  if (window.HOENN_DEBUG) window.HoennDebug = Object.assign(window.HoennDebug || {}, { petalburgDoors, mauvilleGym, metatileAt, setWeather: (k) => { hoennSaved = k; } });
  // Runs a script; then whatever the map's frame table has due (a scene it set going).
  async function runHoenn(label, person) {
    const seen = new Set();
    for (let n = 0; label && n < 8; n++) {
      seen.add(label);
      await hoenn.run(label, { person });
      person = null;
      Screen.say("");
      label = hoenn.frameScript(player.location.map, false);
      if (label && seen.has(label)) break;
    }
    await persist();
  }
  // ---------- Hoenn's weather (src/field_weather.c; ui/weather.js draws it) ----------
  //
  // The map's own as you come in (its header: SetSavedWeatherFromCurrMapHeader), then what its scripts and the steps
  // you take put on it (setweather; src/coord_event_weather.c). Routes 119 and 123's cycle with the game's days, and the
  // abnormal weather of Kyogre and Groudon's fight swings between a downpour and a drought.
  const WEATHER_CYCLES = { route119_cycle: ["sunny", "rain", "thunderstorm", "rain"], route123_cycle: ["sunny", "sunny", "rain", "sunny"] };
  const WEATHER_ALIASES = { rain_thunderstorm: "thunderstorm", underwater_bubbles: "underwater" };
  let hoennSaved = "", hoennLastType = "", hoennCameFrom = "";   // (hoennCameFrom: the last map's type, while a map's scripts run as you come in)
  const hoennKind = (c) => {
    const k = String(c || "").replace(/^(COORD_EVENT_)?WEATHER_/, "").toLowerCase();
    return !k || k === "none" ? "" : WEATHER_ALIASES[k] || k;
  };
  const hoennOutdoors = (type) => /^(town|city|route|ocean_route|underwater)$/.test(type || "");
  function hoennWeatherNow() {
    let k = hoennSaved;
    if (WEATHER_CYCLES[k]) k = WEATHER_CYCLES[k][Player.gameTime(player).day % 4];
    else if (k === "abnormal") k = Math.floor(performance.now() / 25000) % 2 ? "drought" : "downpour";
    return k || "none";
  }
  // Coming into a map: its header's weather (before its scripts change it).
  function hoennWeatherEnter(name) {
    const m = window.WORLD_MAPS[name];
    hoennSaved = (m && m.weatherHeader) || "";
    return m;
  }
  // The steps that change it.
  function hoennWeatherStep() {
    const m = window.WORLD_MAPS[player.location.map];
    if (!m || m.region !== "hoenn" || !m.weatherSteps || !m.weatherSteps.length) return;
    const at = Overworld.position(), s = m.weatherSteps.find((q) => q.x === at.x && q.y === at.y);
    if (s) hoennSaved = s.weather;
  }
  // Hoenn's braille puzzles (Emerald's src/braille_puzzles.c): where the field move opens a way in, and the flag
  // that says it's open. Dig under the Sealed Chamber's DIG HERE; Rock Smash before the Desert Ruins' braille
  // (Regirock); Flash in the middle of the Ancient Tomb (Registeel). Island Cave's (Regice) is a lap of its room:
  // hoennRegiceStep.
  const BRAILLE_PUZZLES = {
    Dig: { map: "SealedChamber_OuterRoom", at: [[9, 3], [10, 3], [11, 3]], door: [9, 1], flag: "FLAG_SYS_BRAILLE_DIG" },
    "Rock Smash": { map: "DesertRuins", at: [[5, 23], [6, 23], [7, 23]], door: [7, 19], flag: "FLAG_SYS_REGIROCK_PUZZLE_COMPLETED" },
    Flash: { map: "AncientTomb", at: [[8, 25]], door: [7, 19], flag: "FLAG_SYS_REGISTEEL_PUZZLE_COMPLETED" }
  };
  function braillePuzzle(move) {
    const p = BRAILLE_PUZZLES[move], at = Overworld.position();
    if (!p || at.map !== p.map || hoenn.flag(p.flag) || !p.at.some(([x, y]) => x === at.x && y === at.y)) return null;
    return async () => {
      // (The doorway, its middle below the way in: DoBrailleRegirockEffect and the like.)
      const [x, y] = p.door;
      ["TopLeft", "TopMid", "TopRight", "BottomLeft", "BottomMid", "BottomRight"].forEach((part, i) =>
        hoennMetatile(p.map, x + (i % 3), y + (i < 3 ? 0 : 1), "METATILE_Cave_SealedChamberEntrance_" + part, i !== 4));
      sfx("se_bang");
      hoenn.setFlag(p.flag, true);
    };
  }
  // Island Cave (ShouldDoBrailleRegicePuzzle): once you've read its braille, a lap of the room along its wall, each
  // of these steps, then back to the braille; a step anywhere else and it's to start again (from the braille).
  const REGICE_PATH = [[4, 21], [5, 21], [6, 21], [7, 21], [8, 21], [9, 21], [10, 21], [11, 21], [12, 21], [12, 22], [12, 23], [13, 23],
    [13, 24], [13, 25], [13, 26], [13, 27], [12, 27], [12, 28], [4, 29], [5, 29], [6, 29], [7, 29], [8, 29], [9, 29], [10, 29], [11, 29],
    [12, 29], [4, 28], [4, 27], [3, 27], [3, 26], [3, 25], [3, 24], [3, 23], [4, 23], [4, 22]];
  // The S.S. Tidal's cruise (CountSSTidalStep): 205 steps on board and it's halfway, or there.
  function hoennCruiseStep() {
    if (!hoenn.flag("FLAG_SYS_CRUISE_MODE")) return null;
    const n = hoenn.getVar("VAR_CRUISE_STEP_COUNT") + 1;
    hoenn.setVar("VAR_CRUISE_STEP_COUNT", n);
    return n >= 205 ? { type: "hoenn-script", label: "SSTidalCorridor_EventScript_ReachedStepCount" } : null;
  }
  function hoennRegiceStep() {
    const at = Overworld.position();
    if (at.map !== "IslandCave" || hoenn.flag("FLAG_SYS_BRAILLE_REGICE_COMPLETED") || !hoenn.flag("FLAG_TEMP_REGICE_PUZZLE_STARTED") || hoenn.flag("FLAG_TEMP_REGICE_PUZZLE_FAILED")) return null;
    const i = REGICE_PATH.findIndex(([x, y]) => x === at.x && y === at.y);
    if (i < 0) { hoenn.setFlag("FLAG_TEMP_REGICE_PUZZLE_FAILED", true); hoenn.setFlag("FLAG_TEMP_REGICE_PUZZLE_STARTED", false); return null; }
    const v = "VAR_REGICE_STEPS_" + (1 + (i >> 4));
    hoenn.setVar(v, hoenn.getVar(v) | (1 << (i & 15)));
    if (hoenn.getVar("VAR_REGICE_STEPS_1") !== 0xffff || hoenn.getVar("VAR_REGICE_STEPS_2") !== 0xffff || hoenn.getVar("VAR_REGICE_STEPS_3") !== 0xf) return null;
    if (at.x !== 8 || at.y !== 21) return null;
    return { type: "hoenn-script", label: "IslandCave_EventScript_OpenRegiEntrance" };
  }
  // Cracked floors (Emerald's CrackedFloorPerStepCallback): the floor gives way under you and you fall to the floor
  // below (where the map's OnResume's setholewarp says), unless the Bicycle's going flat out: then it gives way
  // behind you. A hole stays a hole till you come back.
  const HOLE_WARPS = { GraniteCave_B1F: "GraniteCave_B2F", SkyPillar_2F: "SkyPillar_1F", SkyPillar_4F: "SkyPillar_3F", MirageTower_2F: "MirageTower_1F", MirageTower_3F: "MirageTower_2F" };
  function hoennCrackedStep() {
    const at = Overworld.position(), m = window.WORLD_MAPS[at.map];
    const c = m && m.cracked && HOLE_WARPS[at.map] && m.cracked.find((q) => q[0] === at.x && q[1] === at.y);
    if (!c) return null;
    const now = metatileSet[at.map] && metatileSet[at.map][at.y * m.width + at.x], hole = m.mt[c[2]][0];
    if (now != null && now !== hole) return null;   // (a sound floor laid over it: Sky Pillar's, before Rayquaza wakes)
    hoennMetatile(at.map, at.x, at.y, c[2], false);
    if (now == null && Overworld.bikeFastest()) return null;
    return { type: "hoenn-fall", map: HOLE_WARPS[at.map] };
  }
  // EventScript_FallDownHole: down to the same spot on the floor below (warphole).
  async function hoennFall(to) {
    const at = Overworld.position();
    await sleep(333);
    await Overworld.act([{ who: "player", moves: ["set_invisible"] }]);
    sfx("se_fall");
    await sleep(1000);
    await Overworld.teleport({ map: to, x: at.x, y: at.y, facing: at.facing });
  }
  // Ash on Route 113's and Jagged Pass's grass (Emerald's AshGrassPerStepCallback): walk through it and it falls off,
  // the grass under it showing till you come back, and with the Soot Sack it's gathered (VAR_ASH_GATHER_COUNT, to
  // 9,999: the Glass Workshop's).
  function hoennAshStep() {
    const map = player.location.map, m = window.WORLD_MAPS[map];
    if (!m || !m.ash) return;
    const at = Overworld.position(), a = m.ash.find((q) => q[0] === at.x && q[1] === at.y);
    if (!a || (metatileSet[map] && metatileSet[map][at.y * m.width + at.x] != null)) return;
    hoennMetatile(map, at.x, at.y, a[2], false);
    if (Player.itemCount(player, "soot-sack") > 0) hoenn.setVar("VAR_ASH_GATHER_COUNT", Math.min(9999, hoenn.getVar("VAR_ASH_GATHER_COUNT") + 1));
  }
  // Specials of Route 119 and 123's transitions: the cycle, unless you walked in from another route.
  function hoennSyncSpecial(name, api) {
    if (name === "SetRoute119Weather" || name === "SetRoute123Weather") {
      if (!hoennOutdoors(hoennCameFrom)) hoennSaved = name === "SetRoute119Weather" ? "route119_cycle" : "route123_cycle";
      return true;
    }
    // The Mirage Tower shows itself on half the days, until its event is done (src/mirage_tower.c).
    if (name === "SetMirageTowerVisibility") {
      const done = hoenn.getVar("VAR_MIRAGE_TOWER_STATE");
      hoenn.setFlag("FLAG_MIRAGE_TOWER_VISIBLE", !done && (hoenn.flag("FLAG_FORCE_MIRAGE_TOWER_VISIBLE") || Math.random() < 0.5));
      return true;
    }
    // Mirage Island is there on the days one of your Pokémon's personality matches the day's number (src/field_specials.c).
    if (name === "IsMirageIslandPresent") {
      const f = player.flags, day = Player.gameTime(player).day;
      if (f.mirageDay !== day) { f.mirageDay = day; f.mirageRnd = Math.floor(Math.random() * 0x10000); }
      api.set(player.party.some((r) => !r.egg && r.personality != null && (r.personality & 0xffff) === f.mirageRnd) ? 1 : 0);
      return true;
    }
    return false;
  }
  // Emerald's tutors' moves, in TUTOR_MOVE_ order (include/constants/party_menu.h).
  const HOENN_TUTOR_MOVES = ["Mega Punch", "Swords Dance", "Mega Kick", "Body Slam", "Double-Edge", "Counter", "Seismic Toss", "Mimic", "Metronome", "Soft-Boiled",
    "Dream Eater", "Thunder Wave", "Explosion", "Rock Slide", "Substitute", "Dynamic Punch", "Rollout", "Psych Up", "Snore", "Icy Wind", "Endure", "Mud-Slap",
    "Ice Punch", "Swagger", "Sleep Talk", "Swift", "Defense Curl", "Thunder Punch", "Fire Punch", "Fury Cutter"];
  let hoennTradeMon = null;
  const speciesNumber = (name) => Object.keys(window.DEX).indexOf(name) + 1;
  // The specials Emerald's scripts call that this game answers itself.
  let ssTidalPick = 127;   // (the S.S. Tidal's sailing just picked at Lilycove: ScriptMenu_CreateLilycoveSSTidalMultichoice)
  // How much of the Hoenn Pokédex you've seen or caught (`noMythicals`: but Jirachi and Deoxys, its last two).
  function hoennDexCount(which, noMythicals) {
    const list = (window.HOENN_SCRIPTS.hoennDex || []).slice(0, noMythicals ? -2 : undefined);
    const have = new Set(player.pokedex[which === "seen" ? "seen" : "caught"].map(Player.dexNumber));
    return list.filter((s) => have.has(Player.dexNumber(s))).length;
  }
  async function hoennSpecial(name, api) {
    // (The Safari Zone: in and out, Emerald's EnterSafariMode and ExitSafariMode.)
    if (name === "EnterSafariMode") { player.flags.safari = { balls: 30, steps: 500, hoenn: true, feeders: [], caught: 0 }; return true; }
    if (name === "ExitSafariMode") { delete player.flags.safari; return true; }
    // (A Secret Base owner's battle: SPECIAL_BATTLE_SECRET_BASE, in their base.)
    if (name === "DoSpecialTrainerBattle" && hoennVisiting() && player.location.map === hoennVisiting().room && /SECRET_BASE|^1$/.test(String(api.getVar("VAR_0x8004")))) { await api.flush(); await npcBaseBattle(api); return true; }
    if (await hoennFrontier.special(name, api)) return true;
    if (await hoennContest.special(name, api)) return true;
    if (await hoennPokeblock.special(name, api)) return true;
    switch (name) {
      // The Gyms' puzzles (src/field_specials.c).
      case "PetalburgGymSlideOpenRoomDoors": {
        await api.flush();
        sfx("se_unlock");
        for (let frame = 0; frame < 5; frame++) { petalburgDoors(+api.getVar("VAR_0x8004"), frame); await sleep(frame ? 70 : 20); }
        return true;
      }
      case "PetalburgGymUnlockRoomDoors": petalburgDoors(+api.getVar("VAR_0x8004"), 4); return true;
      case "MauvilleGymPressSwitch": mauvilleGym("press", +api.getVar("VAR_0x8004")); return true;
      case "MauvilleGymSetDefaultBarriers": mauvilleGym("flip"); return true;
      case "MauvilleGymDeactivatePuzzle": mauvilleGym("off"); return true;
      // The move tutors (src/data/move_tutors? Emerald's own list, party_menu.h): VAR_0x8005 is which, and VAR_RESULT says if it was taught.
      case "ChooseMonForMoveTutor": {
        await api.flush();
        const move = HOENN_TUTOR_MOVES[+api.getVar("VAR_0x8005")];
        api.setVar("VAR_RESULT", 0);
        if (!move) return true;
        const notes = player.party.map((r) => (r.egg || !tutorCanLearn(r, move) ? "NOT ABLE" : Party.knowsMove(r, move) ? "LEARNED" : "ABLE"));
        for (;;) {
          const record = await choosePartyFor("Teach which {PKMN}?", null, notes);
          show("world");
          if (!record) return true;
          const nm = Party.displayName(record);
          if (record.egg || !tutorCanLearn(record, move)) { await say(nm + " can't learn " + move + "."); continue; }
          if (Party.knowsMove(record, move)) { await say(nm + " already knows " + move + "."); continue; }
          await learnMove(record, move);
          if (Party.knowsMove(record, move)) api.setVar("VAR_RESULT", 1);
          return true;
        }
      }
      // In-game trades (src/trade.c): what they ask for, a Pokémon of yours, and what you get.
      case "GetInGameTradeSpeciesInfo": {
        const t = window.HOENN_SCRIPTS.trades[api.getVar("VAR_0x8004")];
        if (!t) { api.set(0); return true; }
        api.setBuffer(1, t.requested); api.setBuffer(2, t.species);
        api.set(speciesNumber(t.requested));
        return true;
      }
      case "GetTradeSpecies": { const r = player.party[+api.getVar("VAR_0x8005")]; api.set(!r || r.egg ? 0 : speciesNumber(r.species)); return true; }
      case "CreateInGameTradePokemon": {
        const t = window.HOENN_SCRIPTS.trades[api.getVar("VAR_0x8004")], mine = player.party[+api.getVar("VAR_0x8005")];
        if (!t || !mine) return true;
        const r = Party.create(t.species, mine.level, { nickname: t.nickname, shiny: false });
        const [hp, atk, def, spe, spa, spd] = t.ivs;
        Object.assign(r, { ivs: { hp, atk, def, spa, spd, spe }, personality: t.personality, ot: { name: t.otName, id: t.otId }, met: { level: mine.level, map: player.location.map, traded: true } });
        const dex = window.DEX[t.species], ab = dex.abilities[t.ability] || dex.abilities[0];
        if (ab) r.ability = ab;
        if (t.item && window.ITEMS[t.item]) r.item = t.item;
        r.hp = Party.maxHp(r);
        hoennTradeMon = r;
        return true;
      }
      case "DoInGameTradeScene": {
        await api.flush();
        const slot = +api.getVar("VAR_0x8005"), mine = player.party[slot];
        if (!mine || !hoennTradeMon) return true;
        await say(["Sending off " + Party.displayName(mine) + "…", "Please take good care of it!"]);
        sfx("se_ball");
        player.party[slot] = hoennTradeMon;
        Player.markSeen(player, hoennTradeMon.species);
        Player.markCaught(player, hoennTradeMon.species);
        await say([Party.displayName(hoennTradeMon) + " was received!"]);
        hoennTradeMon = null;
        await persist();
        return true;
      }
      // Naming a Pokémon you've been given (Common_EventScript_NameReceivedPartyMon, the Name Rater's).
      case "ChangePokemonNickname": {
        await api.flush();
        const r = player.party[+api.getVar("VAR_0x8004")];
        if (r) {
          const typed = await enterText(Party.speciesName(r.species) + "'s nickname?", Party.displayName(r), 10);
          if (typed && typed !== Party.speciesName(r.species)) r.nickname = typed;
          else if (typed === Party.speciesName(r.species)) delete r.nickname;
        }
        show("world");
        return true;
      }
      case "IsMonOTIDNotPlayers": { const r = player.party[+api.getVar("VAR_0x8004")]; api.set(r && r.ot && (r.ot.id !== player.trainerId || r.ot.name !== player.name) ? 1 : 0); return true; }
      // (Shoal Cave's tide, by the clock, as you come in from outside: high from 21:00 to 2:59 and 9:00 to 14:59.)
      case "UpdateShoalTideFlag": {
        if (hoennOutdoors(hoennCameFrom)) { const h = Player.gameTime(player).hour; hoenn.setFlag("FLAG_SYS_SHOAL_TIDE", h < 3 || (h >= 9 && h < 15) || h >= 21); }
        return true;
      }
      // Birch's Pokédex rating (src/birch_pc.c): the Hoenn Pokédex's seen and caught (VAR_0x8004 0), or the National's
      // (1, and yours is), and what he makes of the Hoenn count; and the Game Designer's diploma (all of the Hoenn
      // Pokédex but Jirachi and Deoxys).
      case "ScriptGetPokedexInfo": {
        const national = +api.getVar("VAR_0x8004") !== 0;
        api.setVar("VAR_0x8005", national ? Player.dexCount(player, "seen") : hoennDexCount("seen"));
        api.setVar("VAR_0x8006", national ? Player.dexCount(player, "caught") : hoennDexCount("caught"));
        api.set(1);
        return true;
      }
      case "ShowPokedexRatingMessage": {
        await api.flush();
        const n = +api.getVar("VAR_0x8004"), T = window.HOENN_SCRIPTS.t;
        const done = n >= 200 && hoennDexCount("caught", true) >= 200;
        await say((T[done ? "gBirchDexRatingText_DexCompleted" : "gBirchDexRatingText_LessThan" + Math.min(200, (Math.floor(n / 10) + 1) * 10)] || []).map(fill));
        return true;
      }
      // The news flash's Pokémon (src/roamer.c's InitRoamer): red, Latias; blue, Latios. It roams Hoenn till caught.
      case "InitRoamer": player.flags.hoennRoamer = +api.getVar("VAR_0x8004") === 1 ? "Latios" : "Latias"; return true;
      // (Steven's question at his house, after Dive: Latias or Latios, at Southern Island. This game's own.)
      case "Game_StevenEonQuestion": await api.flush(); await stevenEonQuestion(); return true;
      // The S.S. Tidal's sailings from Lilycove (src/script_menu.c's CreateLilycoveSSTidalMultichoice; its
      // GetLilycoveSSTidalSelection is done here too): Slateport, the Battle Frontier once you've met Scott on board,
      // and an island for a ticket (or the Old Sea Map) that's good (VAR_0x8004 1: only those just shown).
      case "ScriptMenu_CreateLilycoveSSTidalMultichoice": {
        await api.flush();
        const shown = +api.getVar("VAR_0x8004") === 1, sel = [];
        if (!shown) { sel.push(0); if (hoenn.flag("FLAG_MET_SCOTT_ON_SS_TIDAL")) sel.push(1); }
        // (Not Navel Rock's or Birth Island's: this game hasn't them.)
        for (const [i, item, on, seen] of [[2, "eon-ticket", "FLAG_ENABLE_SHIP_SOUTHERN_ISLAND", "FLAG_SHOWN_EON_TICKET"], [5, "old-sea-map", "FLAG_ENABLE_SHIP_FARAWAY_ISLAND", "FLAG_SHOWN_OLD_SEA_MAP"]]) {
          if (!Player.itemCount(player, item) || !hoenn.flag(on)) continue;
          if (!shown) sel.push(i); else if (!hoenn.flag(seen)) { sel.push(i); hoenn.setFlag(seen, true); }
        }
        // (This game's own: Sinnoh, with Norman's ticket from after the Hall of Fame; a save already past him gets it
        // here. Its run isn't sailing yet: it's back to the desk.)
        if (!shown && hoenn.flag("FLAG_SYS_GAME_CLEAR") && hoenn.flag("FLAG_RECEIVED_SS_TICKET") && !Player.itemCount(player, "sinnoh-ticket")) {
          await say(fill("Oh, {PLAYER}! The ferry company left\nthis for Hoenn's new Champion."));
          Player.addItem(player, "sinnoh-ticket", 1);
          await sayWithJingle("mus_obtain_key_item", fill("{PLAYER} received the " + Bag.name("sinnoh-ticket") + "!"));
        }
        if (!shown && Player.itemCount(player, "sinnoh-ticket")) sel.push(7);
        sel.push(6);
        const k = await hoennEnv.choose(sel.map((i) => ({ 0: "Slateport City", 1: "Battle Frontier", 2: "Southern Island", 5: "Faraway Island", 6: "Exit", 7: "Sinnoh" })[i]), null);
        // (Sinnoh: off at once, to Sandgem Town's beach: sailToSinnoh.)
        if (sel[k] === 7) {
          await say(["The S.S. Tidal for Sinnoh.\nYou have your Sinnoh Ticket?", "All aboard! We'll be setting sail\nshortly."]);
          afterScript = sailToSinnoh;
          api.cut();
          return true;
        }
        ssTidalPick = k < 0 ? 127 : sel[k];
        return true;
      }
      // (The script's switch reads it from here: the menu's pick, as Emerald's GetLilycoveSSTidalSelection gives it.)
      case "GetLilycoveSSTidalSelection": api.set(ssTidalPick); return true;
      // A scrollable menu (src/field_specials.c's ShowScrollableMultichoice), VAR_0x8004's: the Battle Frontier's prize
      // desks and move tutors, Slateport's Berry Powder shop.
      case "ShowScrollableMultichoice": {
        const items = (window.HOENN_SCRIPTS.scrollMulti || [])[+api.getVar("VAR_0x8004")];
        if (!items) { api.set(127); return true; }
        await api.flush();
        const k = await hoennEnv.choose(items, null);
        api.set(k < 0 ? 127 : k);
        return true;
      }
      // (On board, the voyage goes on as you walk about the ship: src/field_specials.c's cruise steps, 205 of them.)
      case "SetSSTidalFlag": hoenn.setFlag("FLAG_SYS_CRUISE_MODE", true); hoenn.setVar("VAR_CRUISE_STEP_COUNT", 0); return true;
      case "ResetSSTidalFlag": hoenn.setFlag("FLAG_SYS_CRUISE_MODE", false); return true;
      // (The Match Call tutorial in Rustboro: this game's Start menu has no PokéNav to pick, so it's picked for you.)
      case "ScriptMenu_CreateStartMenuForPokenavTutorial": api.set(3); return true;
      case "OpenPokenavForTutorial": return true;
      case "HasAllHoennMons": api.set(hoennDexCount("caught", true) >= 200 ? 1 : 0); return true;
      // (The Sealed Chamber: Wailord first in the party, and Relicanth last.)
      case "CheckRelicanthWailord": { const p = player.party, last = p[p.length - 1]; api.set(p[0] && !p[0].egg && p[0].species === "Wailord" && last && !last.egg && last.species === "Relicanth" ? 1 : 0); return true; }
      case "MonOTNameNotPlayer": { const r = player.party[+api.getVar("VAR_0x8004")]; api.set(r && r.ot && r.ot.name !== player.name ? 1 : 0); return true; }
      // The Hall of Fame (ending the story: EverGrandeCity_HallOfFame): the team on record, the Hall of Fame screen, then home.
      case "GameClear": {
        await api.flush();
        hoenn.setFlag("FLAG_SYS_GAME_CLEAR", true);   // (Emerald's GameClear sets it, for the post-game's scripts, and the Delta Episode)
        const f = player.flags, h = f.hoennRespawn || hoennBedroom();
        League.reset(f);
        player.party.forEach(Party.heal);
        const entry = League.record(f, player.party.filter((r) => !r.egg).map((r) => Object.assign({}, r, { form: Party.form(r) })),
          { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs });
        player.location = Object.assign({ facing: "down" }, h);
        music(null);
        await Overworld.fadeToBlack();
        await HallOfFame.show($("#overlay"), entry, {
          cry, sfx, music, player: { name: player.name, id: player.trainerId, playTimeMs: player.playTimeMs, pic: Player.LOOKS[player.look].front },
          save: async () => { tick(); Save.write(player); savePromptAt = player.playTimeMs; }
        }).catch((e) => { console.error(e); tick(); Save.write(player); });
        // Then Emerald's credits: you and your rival biking through Hoenn, the Pokémon you caught between.
        await HallOfFame.hoennCredits($("#overlay"), { skippable: true, music, girl: isGirl(), caught: player.pokedex.caught.slice(),
          starter: ["Treecko", "Torchic", "Mudkip"][+api.getVar("VAR_STARTER_MON")] || "Treecko" }).catch((e) => console.error(e));
        $("#overlay").classList.add("hidden");
        show("world");
        await Overworld.teleport({ map: h.map, x: h.x, y: h.y, facing: "down" });
        await Overworld.fadeFromBlack();
        return true;
      }
      // Mt. Chimney's cable car: across to the other station (the ride's scene isn't built).
      case "CableCarWarp": return true;
      case "CableCar": {
        await api.flush();
        const to = +api.getVar("VAR_0x8004") ? "Route112_CableCarStation" : "MtChimney_CableCarStation";
        Screen.say("");
        await Overworld.fadeToBlack();
        await Overworld.teleport({ map: to, x: 6, y: 4, facing: "up" });
        await Overworld.fadeFromBlack();
        return true;
      }
      // Sootopolis' sky: Groudon and Kyogre's fight, then Rayquaza's coming (src/rayquaza_scene.c; ui/rayquaza-scene.js).
      case "Script_DoRayquazaScene": {
        await api.flush();
        Screen.say("");
        await RayquazaScene.play($("#overlay"), +api.getVar("VAR_0x8004") ? 1 : 0, { cry, sfx, music });
        $("#overlay").classList.add("hidden");
        show("world");
        return true;
      }
      // The Mirage Tower's end (Route 111): the ground shakes, you fall, the tower comes apart a row at a time.
      case "StartMirageTowerShake": await api.flush(); sfx("se_ice_crack"); await Overworld.shake(40, { x: 1, y: 1, delay: 2 }); return true;
      case "StartPlayerDescendMirageTower": await sleep(700); return true;
      case "StartMirageTowerDisintegration": {
        const list = ((window.WORLD_MAPS.Route111.layouts || {}).LAYOUT_ROUTE111_NO_MIRAGE_TOWER || []).slice().sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        for (let i = 0; i < list.length; i += 3) {
          for (const [x, y, id, col] of list.slice(i, i + 3)) hoennMetatileId("Route111", x, y, id, !!col);
          sfx("se_ball_throw");
          await sleep(160);
        }
        return true;
      }
      case "StartMirageTowerFossilFallAndSink": sfx("se_fall"); await sleep(900); return true;
      case "DoMirageTowerCeilingCrumble": await api.flush(); sfx("se_ice_crack"); await Overworld.shake(30, { x: 1, y: 1, delay: 2 }); return true;
      // The Secret Base (data/scripts/secret_base.inc).
      case "GetSecretBaseTypeInFrontOfPlayer": {
        const s = spotAhead();
        if (s) api.setVar("VAR_0x8007", window.HOENN_SCRIPTS.numConsts["SECRET_BASE_" + s.spot.replace(/^SECRET_BASE_/, "").replace(/\d+_\d+$/, "")] || 0);
        return true;
      }
      case "CheckPlayerHasSecretBase": api.set(secretBase() ? 1 : 0); return true;
      case "SetPlayerSecretBase": {
        const s = spotAhead();
        if (s) player.flags.secretBase = { map: BASE_ROOM(s.spot), spot: { map: player.location.map, x: s.x, y: s.y, id: s.spot } };
        return true;
      }
      case "EnterSecretBase": {
        await api.flush();
        const v = hoennVisiting(), s = spotAhead();
        hoennSpotOpen(player.location.map);
        if (v && s && s.spot === v.id && !hoennOwnSpot(s)) await baseGo(v.room, v, true);
        else { delete player.flags.hoennVisit; await secretBaseGo(true); }
        return true;
      }
      case "EnterNewlyCreatedSecretBase": await api.flush(); hoennSpotOpen(secretBase().spot.map); await persist(); return true;
      case "ClearAndLeaveSecretBase": await api.flush(); await secretBaseGo(false); secretBaseClear(); await persist(); return true;
      case "MoveOutOfSecretBase": await api.flush(); await secretBaseGo(false); secretBaseClear(); await persist(); return true;
      case "MoveOutOfSecretBaseFromOutside": secretBaseClear(); await persist(); return true;
      case "GetSecretBaseNearbyMapName": { const b = secretBase(); api.setBuffer(1, b ? (window.WORLD_MAPS[b.spot.map] || {}).title || "" : ""); return true; }
      case "IsCurSecretBaseOwnedByAnotherPlayer": { const s = spotAhead(); api.set(s && !hoennOwnSpot(s) && hoennNpcBaseAt(player.location.map, s.spot) ? 1 : 0); return true; }
      // Someone else's base: its owner (secret_base.c's GetSecretBaseOwnerAndState and the rest), once a day.
      case "SetSecretBaseOwnerGfxId": { const v = hoennVisiting(); if (v) api.setVar("VAR_OBJ_GFX_ID_F", NPC_BASE_LOOKS[v.type]); return true; }
      case "GetSecretBaseOwnerAndState": { const v = hoennVisiting(); api.setVar("VAR_0x8004", v ? v.type : 0); api.set(v && v.battledDay === dayKey() ? 1 : 0); return true; }
      case "SetBattledOwnerFromResult": { const v = hoennVisiting(); if (v) v.battledDay = +api.getVar("VAR_RESULT") ? dayKey() : null; return true; }
      case "CopyCurSecretBaseOwnerName_StrVar1": { const v = hoennVisiting(); api.setBuffer(1, v ? v.name : ""); return true; }
      case "GetCurSecretBaseRegistrationValidity": { const v = hoennVisiting(); api.set(!v ? 2 : v.registered ? 1 : hoennNpcBases().filter((b) => b.registered).length >= 10 ? 2 : 0); return true; }
      case "ToggleCurSecretBaseRegistry": { const v = hoennVisiting(); if (v) v.registered = !v.registered; return true; }
      case "PrepSecretBaseBattleFlags": case "DeclinedSecretBaseBattle": case "WonSecretBaseBattle": case "LostSecretBaseBattle": case "DrewSecretBaseBattle":
      case "CheckInteractedWithFriendsDollDecor": case "CheckInteractedWithFriendsCushionDecor": return true;
      case "ShowSecretBaseDecorationMenu": await api.flush(); Screen.say(""); await hoennDecor.menu("base", player.location.map); return true;
      case "InitSecretBaseDecorationSprites": case "InitSecretBaseVars": case "DoSecretBasePCTurnOffEffect": case "DoPCTurnOnEffect": case "DoPCTurnOffEffect": case "ShowSecretBaseRegistryMenu": return true;
      // The red and blue orbs' light.
      case "DoOrbEffect": await api.flush(); sfx("se_orb"); await sleep(700); return true;
      case "FadeOutOrbEffect": await sleep(400); return true;
      case "FieldShowRegionMap": await api.flush(); await townMap(); show("world"); return true;
      // Wally's catching lesson (Petalburg's OnFrame; Emerald's StartWallyTutorialBattle and LoadWallyZigzagoon): a
      // wild Ralts, Lv. 5, and Wally with Norman's Zigzagoon, Lv. 7, knowing only Tackle; the battle plays itself
      // (ui/battle-screen.js's wallyLoop) and the Ralts is caught. Your own party isn't touched.
      case "LoadWallyZigzagoon": case "SavePlayerParty": case "LoadPlayerParty": return true;
      case "StartWallyTutorialBattle": {
        await api.flush();
        const zig = Party.create("Zigzagoon", 7);
        zig.moves = zig.moves.filter((m) => m.name === "Tackle").slice(0, 1);
        if (!zig.moves.length) zig.moves = [{ name: "Tackle", pp: 35 }];
        const ralts = Party.create("Ralts", 5);
        ralts.gender = "M";   // (CreateMaleMon)
        music("em_vs_wild");
        await Overworld.battleTransition();
        show("field");
        await BattleScreen.run({
          p1: { name: "Wally", team: [Party.toBattleSet(zig)] }, p2: { name: "Wild", team: [Party.toBattleSet(ralts)] }, wild: true, wally: true,
          trainer: "wally", exp: false, levelCap: 100, terrain: battleTerrain({}), bag: {}, bagPockets: () => [],
          opponent: randomMove, forgetMove: () => 0, summary: () => null
        }).catch((e) => console.error(e));
        show("world");
        await Overworld.resume();
        music(null);
        return true;
      }
      case "ChooseStarter": {
        await api.flush();
        const picks = ["Treecko", "Torchic", "Mudkip"];
        for (;;) {
          const i = await multichoice("Which Pokémon will you choose?", 0, 0, picks);
          Screen.say("");
          if (i < 0 || i >= picks.length) continue;
          showPicture(picks[i]);
          cry(picks[i]);
          const yes = await confirm("You'll take " + picks[i] + ", the " + ["Grass", "Fire", "Water"][i] + "-type Pokémon?");
          hidePicture();
          if (!yes) continue;
          api.setVar("VAR_STARTER_MON", i);
          api.setVar("VAR_HOENN_STARTER_SPECIES", picks[i]);   // (Birch's "{PLAYER} received the ...": ui/hoenn-changes.js)
          const record = Party.create(picks[i], 5);
          // (Birch's first battle, a wild Poochyena, Lv. 2, is the Pokémon's own, whoever leads your party; with your
          // party full, it's with you for the battle and goes to the PC after.)
          const full = player.party.length >= 6;
          if (full) player.party.push(record); else Player.receive(player, record);
          await say("{PLAYER} received " + picks[i] + "!");
          await johtoBattle("wild", "Poochyena", 2, { chosen: [player.party.indexOf(record)] });
          if (full) {
            player.party.splice(player.party.indexOf(record), 1);
            const to = Player.receive(player, record);
            if (to) await say(Party.displayName(record) + " was sent to the PC" + (to.startsWith("box ") ? " (Box " + to.slice(4) + ")" : "") + ".");
          }
          // (Back from the battle to Route 101, faded in: Emerald's ChooseStarter returns to the field so.)
          await Overworld.fadeFromBlack();
          return true;
        }
      }
    }
    return false;
  }
  // HGSS's walking Pokémon (ui/follower.js), and Johto's Headbutt trees and
  // Kurt's Apricorn Balls (ui/johto-field.js).
  const follower = Follower.create({
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q), cry: (species) => cry(species),
    hop: () => Overworld.follower.hop(),
    giveItem: async (id) => { Player.addItem(player, id); await sayWithJingle(itemJingle(id), "{PLAYER} received " + article(Bag.name(id)) + "!"); },
    here: () => {
      const at = Overworld.position(), ahead = Overworld.ahead();
      return { map: at.map, grass: World.isGrass(World.blockAt(at.map, at.x, at.y)), water: !!ahead.water };
    }
  });
  const johtoField = JohtoField.create({
    player: () => player, say: (pages) => say(pages), confirm: (q) => confirm(q),
    choose: async (texts) => { const i = await multichoice(null, 0, 0, texts); Screen.say(""); return i; },
    quantity: async (text, max) => { const n = await chooseQuantity(text, max); Screen.say(""); return n; },
    apricornBox: () => apricornBox("give"),
    itemName: (id) => Bag.name(id), text: (id) => window.JOHTO_SCRIPTS.messages[id] || null,
    choosePartyFor: async (message, notes) => { const r = await choosePartyFor(message, null, notes); show("world"); return r; },
    learnMove: (record, move) => learnMove(record, move),
    wildBattle: (species, level) => johtoBattle("wild", species, level),
    shake: () => { Screen.say(""); return Overworld.shake(8, { x: 1, y: 0, delay: 3 }); },
    johtoState: () => johto.state(), takeItem: (id, n) => Player.removeItem(player, id, n)
  });

  // An in-game trade's Pokémon (JOHTO_SCRIPTS.trades, HGSS's NPCTrade): its
  // nickname, trainer, IVs, nature, ability, gender and held item, never shiny.
  function johtoTradeMon(t, level) {
    const r = Party.create(t.gives, level, { nickname: t.nickname, shiny: false });
    Object.assign(r, { ivs: Object.assign({}, t.ivs), nature: t.nature, gender: t.gender, personality: t.personality, ot: { name: t.ot.name, id: t.ot.id },
      met: { level, map: player.location.map, traded: true } });
    const dex = window.DEX[t.gives];
    if (t.ability && (dex.abilities.includes(t.ability) || dex.hiddenAbility === t.ability)) r.ability = t.ability;
    if (t.item && window.ITEMS[t.item]) r.item = t.item;
    r.hp = Party.maxHp(r);
    return r;
  }
  // HeartGold's Pokégear (ui/pokegear.js): its phone (HGSS's people and
  // their calls, and the trainers' rematches), the Town Map and the radio.
  const gear = Pokegear.create({
    player: () => player, johto: () => johto, map: () => player.location.map, isGirl, sfx, music, fanfare, pokenav: () => hasPokenav(),
    // (The PokéNav's: Emerald's flags and state, its words filled in, Prof. Birch's rating, a map's wild Pokémon, your battles.)
    hoenn: () => hoenn, fill: (s, vars) => fill(s, vars), birchCall: () => birchRatingPages(), wildOn: (mapConst) => wildOnMap(mapConst),
    trainerBattles: () => Object.keys(player.flags).filter((k) => /^(EM_|HGSS_)?TRAINER_/.test(k) && player.flags[k] === true).length,
    mapMusic: () => music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[player.location.map] || {}).music),
    townMap: () => townMap(), say: (pages) => say(pages), confirm: (q) => confirm(q),
    choose: async (texts, question) => { const i = await multichoice(question || null, 0, 0, texts); Screen.say(""); return i; },
    amount: async (text, max, o) => { Screen.say(text); clearMenu(); const n = await Pokegear.amount($("#overlay"), Object.assign({ max, frame: GameOptions.get().frame }, o)); Screen.say(""); return n; },
    giveItem: async (id, n) => {
      if (!window.ITEMS[id]) return;
      Player.addItem(player, id, n || 1);
      const name = Bag.name(id);
      await sayWithJingle(itemJingle(id), "{PLAYER} received " + (n > 1 ? n + " " + itemPlural(name) : article(name)) + "!");
    },
    hasItem: (id) => Player.itemCount(player, id) > 0,
    money: () => player.money, addMoney: (n) => Player.addMoney(player, n), removePerson: (person) => Overworld.removePerson(person),
    gameClear: () => !!player.flags.johtoLeagueClear || johto.flag("FLAG_GAME_CLEAR"),
    beaten: (id) => !!player.flags[id], setBeaten: (id, on) => { if (on) player.flags[id] = true; else delete player.flags[id]; },
    rematch: async (person, id, intro) => {
      const data = window.WORLD_TRAINERS[id];
      if (!data || !canBattle()) return "lost";
      music(johtoEyes(data));
      await say(intro);
      return johtoBattle("trainer", id);
    },
    badges: () => ({ johto: Player.REGION_BADGES.johto.filter((b) => player.badges.includes(b)).length, all: player.badges.length }),
    dex: () => ({ seen: Player.dexCount(player, "seen"), caught: Player.dexCount(player, "caught") }),
    caught: (species) => Player.hasCaught(player, species),
    dayCare: () => [].concat(player.flags.johtoDayCare || []).map((r) => r && Party.displayName(r.mon || r)).filter(Boolean),
    frame: () => GameOptions.get().frame,
    baobaCall: (script) => johtoSafari.phoneCall(script)   // (Baoba's calls: ui/johto-safari.js)
  });
  // The Pokéathlon Dome's courses, Athlete Points and Athlete Shop (ui/pokeathlon.js), for its scripts.
  Pokeathlon.attach({
    player: () => player, say: (pages) => say(pages), sfx, music, fanfare, persist, show, scene: () => scene,
    choosePartyFor: async (message, notes, cursor) => { const r = await openParty({ message, notes, cursor }); PartyMenu.close(); return r ? player.party[r.slot] : null; },
    displayName: (r) => Party.displayName(r),
    resume: () => Overworld.resume(), setFlag: (name, on) => johto.setFlag(name, on), frame: () => GameOptions.get().frame,
    mapView: () => ({ canvas: $("#world"), x: 112, y: 80 }), fieldWindow: (name, spec) => GbaMenus.fieldWindow(name, spec),
    moneyBox: (on) => (on ? moneyBox(20, 1) : moneyBox()), boxCount: () => Player.boxed(player).length, nationalDex: () => Player.nationalDex(player)
  });
  // Johto's Safari Zone (ui/johto-safari.js): its Areas and their Pokémon, the
  // Safari Game, Baoba's tests and the Area Customizer.
  const johtoSafari = JohtoSafari.create({
    player: () => player, say: (pages) => say(pages), confirm: (question) => confirm(question),
    choose: async (texts, o) => { const i = await multichoice(o.question, 0, 0, texts, o.shown ? { shown: o.shown } : {}); Screen.say(""); return i; },
    teleport: (to) => Overworld.teleport(to), getVar: (name) => johto.getVar(name), setVar: (name, v) => johto.setVar(name, v),
    applyPatches: (map) => applyPatches(map), sfx: (name) => sfx(name),
    // (The scene the room's frame table has due once you're there: the attendant seeing you out.)
    frameScript: async () => { const js = johto.frameScript(player.location.map); if (js) await runJohto(js, null); },
    roomFor: () => player.party.length < Player.PARTY_SIZE || player.boxes.some((b) => Player.firstEmpty(b) >= 0),
    // (Object Arrangement: Baoba's calls on the Pokégear, and the arranging screen, ui/johto-safari-objects.js.)
    isGirl, phone: () => gear.has(), phoneTrigger: (n, on) => gear.setTrigger(n, on), nationalDex: () => Player.nationalDex(player),
    here: () => ({ x: player.location.x, y: player.location.y }),
    arrange: (api) => JohtoSafariObjects.open(api, { frame: GameOptions.get().frame })
  });
  // Prof. Elm's three Pokémon (HGSS's ChooseStarter): each one's picture, and
  // "Will you take it?", until you choose. It joins your party (or the PC);
  // returns where it is in the party, or -1.
  const JOHTO_STARTERS = ["Chikorita", "Cyndaquil", "Totodile"];
  const JOHTO_STARTER_LEVEL = 5;
  async function johtoStarter() {
    for (;;) {
      const i = await multichoice("Which Pokémon will you choose?", 0, 0, JOHTO_STARTERS);
      Screen.say("");
      if (i < 0 || i >= JOHTO_STARTERS.length) continue;
      const species = JOHTO_STARTERS[i];
      showPicture(species);
      cry(species);
      const yes = await confirm("You'll take " + species + ", the " + ["Grass", "Fire", "Water"][i] + "-type Pokémon?");
      hidePicture();
      if (!yes) continue;
      const record = Party.create(species, JOHTO_STARTER_LEVEL);
      const where = Player.receive(player, record);
      return where === "party" ? player.party.indexOf(record) : -1;
    }
  }
  // A battle a script starts: a trainer (HGSS's, window.WORLD_TRAINERS) or a wild Pokémon.
  async function johtoBattle(kind, id, level, extra) {
    if (!canBattle()) return "lost";
    let outcome;
    if (kind === "trainer") {
      const data = window.WORLD_TRAINERS[id];
      if (!data) return "won";
      outcome = await battle("trainer", { foe: { name: data.className + " " + data.name, team: trainerTeam(id), pic: data.pic },
        defeatText: data.defeat || ["…"], trainerId: id, prizeClass: data.className, double: !!data.double && canDouble() });
    } else {
      if (!window.DEX[id]) return "won";
      const mon = wildMon(Party.create(id, level));
      // (A move it has as Omega Ruby and Alpha Sapphire's has it: the Sky Pillar's Rayquaza, Dragon Ascent.)
      if (extra && extra.teach && !Party.knowsMove(mon, extra.teach)) Party.teachMove(mon, extra.teach, mon.moves.length >= 4 ? 0 : undefined);
      outcome = await battle("wild", Object.assign({ foe: { name: "Wild", team: [mon] } }, extra));
    }
    if (outcome !== "lost") { show("world"); await Overworld.resume(); }
    return outcome;
  }
  // Runs a script; then whatever the map's frame table has due (a scene it set going).
  async function runJohto(js, person) {
    const seen = new Set();
    for (let n = 0; js && n < 5; n++) {
      seen.add(js.zone + ":" + js.label);
      await johto.run(js.zone, js.label, { person });
      person = null;
      Screen.say("");
      js = johto.frameScript(player.location.map);
      if (js && seen.has(js.zone + ":" + js.label)) break;
    }
    await oakRockClimb();
    await persist();
  }
  // HGSS's Prof. Oak gives you HM08 Rock Climb in his lab once you've all
  // sixteen Badges (scr_seq_T01R0301); here, as you come to Johto with
  // Kanto's eight, he calls on the Pokégear as you get the Rising Badge, and
  // it's this game's HM11.
  async function oakRockClimb() {
    if (!player.flags.rockClimbDue) return;
    delete player.flags.rockClimbDue;
    if (Player.itemCount(player, "hm11")) return;
    await say(["Professor Oak is calling on the Pokégear…", "Professor Oak: Good to see you!\nThis is what I've wanted to give to you!"]);
    Player.addItem(player, "hm11");
    await sayWithJingle(itemJingle("hm11"), "{PLAYER} received " + Bag.name("hm11") + "!");
    await say(["Professor Oak: That Hidden Machine\ncontains the move Rock Climb!", "When you teach it to a Pokémon,\nyou can go up rock walls that have\nsteps carved in them."]);
  }
  // The Ruins of Alph (ui/johto-alph.js): a chamber's stone panel, the words
  // on its wall and the Unown Report, on the overlay canvas.
  async function alphOverlay(screen) {
    const c = overlayCanvas();
    c.classList.remove("hidden");
    try { return await screen(c); } finally { c.classList.add("hidden"); Screen.say(""); }
  }
  // HGSS's Apricorn Box (ui/apricorn-box.js): "view" from the Bag, "give" for Kurt.
  const apricornBox = (mode) => alphOverlay((c) => ApricornBox.open(c, { bag: player.bag, mode, frame: GameOptions.get().frame, sfx,
    itemName: (id) => Bag.name(id), confirm: async (q) => { const yes = await confirm(q); Screen.say(""); return yes; } }));
  // (Put together: the flag the script's to set, FLAG_SYS_ALPH_PUZZLE_*.)
  const alphPuzzle = (n) => alphOverlay(async (c) => ((await JohtoAlph.puzzle(c, n, { frame: GameOptions.get().frame, sfx,
    confirm: async (q) => { const yes = await confirm(q); Screen.say(""); return yes; } })) ? JohtoAlph.PUZZLE_FLAGS[n] : null));
  const alphSolved = () => JohtoAlph.PUZZLE_FLAGS.map((f) => johto.flag(f));
  // A wall in front of you that an Escape Rope, Flash or a Water Stone opens
  // (src/alph_checks.c): its script, once the menus close; true if it's that wall.
  function alphReaction(what, before) {
    const js = JohtoAlph.chamberReaction(player.location.map, Overworld.position(), what);
    if (!js) return false;
    fieldAction = async () => { Screen.say(""); if (before) await before(); await runJohto(js); };
    return true;
  }
  // An Apricorn tree: an Apricorn of its colour, once a day (the game's clock's).
  async function apricornTree(tree, colour) {
    const s = johto.state(), today = Player.gameTime().today;
    const picked = s.apricorns || (s.apricorns = {});
    if (picked[tree] === today) { await say(["There's nothing on this Apricorn\ntree right now.", "It should bear fruit again tomorrow."]); return; }
    const item = colour + "-apricorn";
    await say("It's an Apricorn tree, bearing\n" + article(Bag.name(item)) + "!");
    picked[tree] = today;
    Player.addItem(player, item);
    await sayWithJingle("mus_obtain_item", "{PLAYER} found " + article(Bag.name(item)) + "!");
    await persist();
  }

  // ---------- Tera Raid dens (game/raid-dens.js) ----------
  //
  // A den sleeps until you use a Lure on it; then it glows with a raid of 1
  // to 5 stars until you win it. The raid: a wild battle with one Pokémon you
  // choose (no catching mid-way) against its Pokémon, Terastallized into the den's type with more HP,
  // won within its turns (RaidDens.TURNS) or you're blown out of the den;
  // losing, you're thrown out of the den (your Pokémon are fine) and it keeps
  // glowing. Won: the battle goes on, to catch it in any Ball if you like (it
  // can't miss); then the rewards (money, Exp. Candies, vitamins, Berries and
  // Tera Shards) on their own screen (ui/raid-rewards.js).
  // Inviting Gym Leaders you've beaten to a raid, up to three: A on a name
  // invites them, B takes back the last one invited (B with nobody invited
  // leaves with nobody), "Done" when you're ready (the rest are the region's
  // trainers).
  // (Each brings a Pokémon from their highest-levelled team as this game battles them: RaidDens.setTeams.)
  {
    const team = (id) => (window.WORLD_TRAINERS[id] ? swappedTeam(id) : []);
    const listed = (list) => list.map(([sp, lv]) => ({ species: sp, level: lv }));
    const johto = (name) => (window.JOHTO_LEAGUE || []).flatMap((J) => [J.trainer, J.rematch])
      .filter((id) => id && window.WORLD_TRAINERS[id] && window.WORLD_TRAINERS[id].name === name).map(team);
    const teams = {};
    for (const L of RaidDens.LEADERS) {
      const re = Object.values(KANTO_REMATCH).find((k) => k.id === L.id);
      teams[L.name] = () => [team(L.id)].concat(re ? [re.team()] : []);
    }
    for (const o of RaidDens.OTHERS) if (o.ids && /^(Lorelei|Bruno|Agatha|Lance)$/.test(o.name))
      teams[o.name] = () => o.ids.filter((id) => /^TRAINER_/.test(id)).map(team).concat(johto(o.name), o.name === "Lance" ? ["HGSS_TRAINER_CHAMPION_LANCE", "HGSS_TRAINER_CHAMPION_LANCE_2"].map(team) : []);
    const mega = (key) => listed(MEGA_RIVALS.find((r) => r.key === key).team());
    teams.Blue = () => [listed(VICTORY_ROAD_RIVAL_TEAM), mega("gary")];
    teams.Red = () => [championTeam(false), championTeam(true), team("HGSS_TRAINER_PKMN_TRAINER_RED_RED"), mega("red")];
    teams.Leaf = () => [route22LeafTeam(), mega("leaf")];
    RaidDens.setTeams(teams, { Blue: () => player.rival });
  }
  async function inviteLeaders() {
    const who = RaidDens.leaders(player.flags), can = who.map((L) => L.name), shown = who.map((L) => L.label);
    if (!can.length || !(await confirm("Invite others to the raid?"))) return [];
    const picked = [];
    let cursor = 0;
    for (;;) {
      // ("+" before those coming; the ▶ stays where it was.)
      // (A list that scrolls, six rows, so it stays clear of the text box.)
      const v = await multichoice("Invite whom? (" + picked.length + "/3)", 0, 0,
        can.map((n, i) => (picked.includes(n) ? "+" : " ") + shown[i]).concat([" Done"]), { cursor, shown: 6 });
      Screen.say("");
      if (v < 0) {
        if (!picked.length) return [];
        cursor = can.indexOf(picked.pop());   // (the ▶ goes back to them)
        continue;
      }
      if (v >= can.length) return picked;
      cursor = v;
      const n = can[v];
      if (picked.includes(n) || picked.length >= 3) { sfx("se_failure"); continue; }
      picked.push(n);
      if (picked.length === 3) cursor = can.length;   // (full: the ▶ moves to "Done")
    }
  }
  const LURES = ["lure", "super-lure", "max-lure"];
  const RAID_MUSIC = [null, "mus_vs_wild", "mus_vs_wild", "mus_vs_trainer", "mus_vs_legend", "mus_vs_legend"];
  async function raidDen(den) {
    const f = player.flags;
    let raid = RaidDens.active(f, den.id);
    if (!raid) {
      await say(["It's " + article(den.type) + "-type Tera Raid den.", "It's quiet… Something seems to be\nsleeping deep inside it."]);
      const have = LURES.filter((id) => Player.itemCount(player, id) > 0);
      if (!have.length) { await say("Maybe a Lure would wake it…"); return; }
      let lure = have[0];
      if (have.length > 1) {
        const v = await multichoice("Use a Lure on the den?", 0, 0, have.map((id) => Bag.name(id)).concat(["Cancel"]));
        Screen.say("");
        if (v < 0 || v >= have.length) return;
        lure = have[v];
      } else if (!(await confirm("Use " + article(Bag.name(lure)) + " on the den?"))) return;
      Player.removeItem(player, lure);
      raid = RaidDens.start(f, den, lure, player.badges.length);
      await say(player.name + " used the " + Bag.name(lure) + "!");
      Screen.say("");
      sfx("se_m_cosmic_power");
      Overworld.refreshPeople();
      await sleep(600);
      await persist();
      await say("The den began to glow!");
    }
    const name = Party.speciesName(raid.species);
    await say(["It's a " + raid.stars + "-star Tera Raid!", "A Tera " + den.type + "-type " + name + " (Lv. " + raid.level + ")\nis waiting in the den!"]);
    if (!canBattle()) return;
    if (!(await confirm("Will you take on the Tera Raid?"))) { await say("The den keeps glowing…"); return; }
    // (One Pokémon only, as in Scarlet and Violet: you choose which.)
    let pick;
    for (;;) {
      pick = await choosePartyFor("Send which POKéMON?");
      show("world");
      if (!pick) { await say("The den keeps glowing…"); return; }
      if (Party.canFight(pick)) break;
      await say(pick.egg ? "An Egg can't battle!" : Party.displayName(pick) + " is in no condition\nto battle!");
    }
    const chosen = [player.party.indexOf(pick)];
    // The other three: the Gym Leaders you invite, then the region's trainers (RaidDens.allies).
    const allies = RaidDens.allies(den, raid, await inviteLeaders());
    await say(RaidDens.joinedText(allies.map((a) => a.trainer)));
    const boss = RaidDens.boss(den, raid);
    const ro = { foe: { name: "Wild", team: [boss], tera: true }, raid: raid.stars, noCatch: true, noBlackout: true,
      music: RAID_MUSIC[raid.stars], chosen, raidAllies: allies.map((a) => ({ set: Party.toBattleSet(a.record), trainer: a.trainer })) };
    const outcome = await battle("wild", ro);
    if (outcome !== "won") {
      show("world");
      await Overworld.resume();
      if (outcome === "lost") await say(["You were blown out of the den…", "Your Pokémon were restored."]);
      // (Out of turns: blown out too, the den still glowing.)
      else if (outcome === "timeout") {
        player.party.forEach(Party.heal);
        await say(["The den is still glowing…", "Your Pokémon were restored."]);
      }
      return;
    }
    RaidDens.finish(f, den.id);
    // Caught in the battle (it keeps the den's Tera Type).
    if (ro.raidBall) {
      Player.removeItem(player, ro.raidBall);
      delete boss.teraAce;
      Object.assign(boss, { ball: ro.raidBall, status: "" });
      Party.heal(boss);
      await addCaught(boss);
    }
    // The rewards, and FireRed's style of screen for them.
    const r = RaidDens.rewards(raid.stars, Math.random, den.type);
    Player.addMoney(player, r.money);
    for (const [id, n] of r.items) Player.addItem(player, id, n);
    await persist();
    Screen.say("");
    show("world");
    await RaidRewardsScreen.show({ stars: raid.stars, type: den.type, name, level: raid.level, money: r.money, items: r.items,
      caught: !!ro.raidBall, frame: GameOptions.get().frame });
    Overworld.refreshPeople();
    await Overworld.resume();
    music((window.WORLD_MAPS[player.location.map] || {}).music);
  }

  // ---------- Repels and Lures ----------
  //
  // For 100 / 200 / 250 steps, wild Pokémon weaker than the lead Pokémon (the
  // first that can battle) stay away (Gen 3: below its level). A Lure (Let's
  // Go, Pikachu! and Eevee!'s, this game's way: as long as a Repel of its
  // kind, and sold beside it) does the opposite: wild Pokémon turn up twice
  // as often. One or the other at a time.

  // (This game's own: a Lure always brings two wild Pokémon at once, when two of yours can battle; a Max Lure, a
  // horde. A Super Lure only makes them come more often.)
  const REPEL_STEPS = { "repel": 100, "super-repel": 200, "max-repel": 250 };
  const lureOn = () => (player.lureSteps > 0 ? player.flags.lastLure || null : null);
  // (The map's table of wild Pokémon where you are: on the water, its water's.)
  const wildTable = (m) => (!m ? null : Overworld.avatar() === "surf" ? m.water || null : m.wild || null);
  const LURE_STEPS = { "lure": 100, "super-lure": 200, "max-lure": 250 };
  function repelStep() {
    if (player.lureSteps > 0) {
      player.lureSteps--;
      return player.lureSteps === 0 ? { type: "lure-ended" } : null;
    }
    if (!(player.repelSteps > 0)) return null;
    player.repelSteps--;
    return player.repelSteps === 0 ? { type: "repel-ended" } : null;
  }
  // A horde from the map's own (game/hordes.js), five wild Pokémon at once;
  // false if there's none, or a Repel keeps it away (it's weaker than your lead).
  // (A Max Lure's, `table`: where the map has no hordes, five from that table of its wild Pokémon.)
  async function hordeBattle(mapName, terrain, table) {
    const mons = (table && Overworld.avatar() === "surf" ? null : Hordes.pick(mapName)) || (table ? Hordes.fromTable((rng) => World.pickWild(window.WORLD_MAPS[mapName], rng, table), 5) : null);
    if (!mons || !mons.every(repelAllows)) return false;
    await battle("wild", { horde: true, terrain, foe: { name: "Wild", team: mons.map((m) => wildMon(Party.create(m.species, m.level))) } });
    return true;
  }
  // Two wild Pokémon at once (game/hordes.js): `first` (the encounter's) and another from the same table; false if
  // the table has no other, or a Repel keeps one away.
  async function wildDoubleBattle(first, mapName, terrain, table) {
    const second = World.pickWild(window.WORLD_MAPS[mapName], Math.random, table);
    if (!second) return false;
    const mons = [first, second];
    if (!mons.every(repelAllows)) return false;
    await battle("wild", { wildDouble: true, terrain, foe: { name: "Wild", team: mons.map((m) => wildMon(Party.create(m.species, m.level,
      { unown: SinnohLeisure.unownLetter(mapName) || Sevii.unownLetter(mapName, m.slot) || JohtoAlph.unownLetter(mapName, alphSolved()) }))) } });
    return true;
  }
  const ableToBattle = () => player.party.filter(Party.canFight).length;
  function repelAllows(wild) {
    if (!(player.repelSteps > 0)) return true;
    const lead = player.party.find(Party.canFight);
    return !lead || wild.level >= lead.level;
  }
  // A Repel or a Lure, from the Bag.
  async function useRepel(item) {
    const lure = item in LURE_STEPS;
    if (player.repelSteps > 0 || player.lureSteps > 0) {
      await message("But the effects of a " + (player.lureSteps > 0 ? "Lure" : "Repel") + " lingered from earlier.");
      return;
    }
    Player.removeItem(player, item);
    if (lure) { player.lureSteps = LURE_STEPS[item]; player.flags.lastLure = item; }
    else { player.repelSteps = REPEL_STEPS[item]; player.flags.lastRepel = item; }
    await message(player.name + " used the " + Bag.name(item) + ".");
  }
  // When a Repel (or a Lure) wears off you're offered another of the same
  // kind, if you have one (as in Black and White).
  async function repelWoreOff(lure) {
    const item = player.flags[lure ? "lastLure" : "lastRepel"], what = lure ? "Lure" : "Repel";
    if (!item || !Player.itemCount(player, item)) { await say(what + "'s effect wore off…"); return; }
    if (await confirm(what + "'s effect wore off… Would you like to use another " + Bag.name(item) + "? (" +
      Player.itemCount(player, item) + " left)")) await useRepel(item);
    await persist();
  }

  async function explore() {
    Unova.recover(player);
    Unova.visit(player,player.location.map);
    SinnohDaily.correctLocation(player);
    SinnohPark.recover(player);
    SinnohOptional.recover(player);
    SinnohFrontier.recover(player);
    SinnohPoffins.recover(player);
    Orre.correctLocation(player);
    World.setDynamicWarp(player.flags.dynamicWarp);
    for (;;) {
      show("world");
      // (Continuing a save, the area's name shows: FieldCB_ShowMapNameOnContinue.)
      if (continued) {
        continued = false;
        if ((window.WORLD_MAPS[player.location.map] || {}).showName) Overworld.showAreaName(player.location.map);
      }
      const ev = await Overworld.explore({
        player, rivalName: player.rival, visible,
        special,
        onWarp,
        // (A double battle's trainers don't see you without two Pokémon that
        // can fight: FireRed's CheckTrainer.)
        trainerWaiting: (person) => trainerWaiting(person) && !(person.trainer.double && !canDouble()),
        hiddenItem: (h) => !player.flags[h.flag], patches: mapPatches, metatiles: hoennOverlay, decor: (map) => SinnohUnderground.owns(map)?SinnohUnderground.overlay(player,map).tiles:hoennDecor.overlay(map).tiles, extraPeople,
        // (HGSS's: the Pokémon walking behind you, and Johto's Headbutt trees.)
        follower: (map) => follower.look(map), headbuttTree: (map, x, y) => johtoField.headbuttTree(map, x, y),
        diveHere: (avatar) => diveHere(avatar),
        canSurf: () => !!FieldMoves.user(player, "Surf"), strength: () => strengthOn,
        // (Johto's Gyms: Ecruteak's darkness, Violet's lift.)
        iceBlockStopped: def => { if (Sinnoh.snowballStopped(player, def, Overworld.personPosition(def.localId))) { applyPatches(player.location.map); Overworld.removePerson(def); } },
        darkness: (map) => Sinnoh.darkness(map) || (map === PYRAMID_FLOOR ? hoennFrontier.pyramidDark() : gymmicks.darkness(map)), drawMap: (g, map, x, y) => { gymmicks.drawMap(g, map, x, y); johtoSafari.drawMap(g, map, x, y); SinnohRadar.draw(g,map,x,y,player); Unova.draw(g,map,x,y,player); },
        faced: (map, x, y, surfing) => johtoSafari.faced(map, x, y, surfing),
        boulderFell: (def) => {
          // (3F's boulder through the hole: it's on 2F now.)
          if (def.flag === "FLAG_HIDE_VICTORY_ROAD_3F_BOULDER") LeagueRoad.dropBoulder(player.flags);
          else Seafoam.drop(player.flags, def);
        },
        boulderSwitch: (map, x, y) => Sinnoh.distortionSwitch(player, map, x, y) || tanobySwitch(map, x, y) || victoryRoadSwitch(map, x, y),
        // (The Tanoby Ruins' chambers are dark until the Tanoby Key's solved: EventScript_TryDarkenRuins.)
        weather: (map) => (WORLD_MAPS[map]?.unovaSandstorm ? "sandstorm" : Sinnoh.fog(map, player) ? "fog_horizontal" : isHoenn(map) ? hoennWeatherNow() : Sevii.tanobyLocked(player.flags, map) ? "shade" : null),
        // (Off the water: on foot, or back on the Bicycle on Cycling Road, where you can't walk.)
        landAvatar: () => (onCyclingRoad() ? "bike" : "walk"),
        onAvatar: (mode) => {if(mode!=="walk")SinnohRadar.clear(player);music(avatarMusic(mode) || (window.WORLD_MAPS[player.location.map] || {}).music);},
        onStep: () => {
          Player.advanceClock(player);   // (the game's clock: Player.gameTime)
          leftPallet(player.location.map); DayCare.step(player.flags.dayCare); DayCare.step(player.flags.dayCare2); DayCare.step(player.flags.johtoDayCare); DayCare.step(player.flags.sinnohDayCare); DayCare.step(player.flags.unovaDayCare); friendshipStep();
          Sevii.resortStep(player.flags.resortRequest);   // (Selphy waiting to see a Pokémon)
          farawayStep();
          johtoSafari.tick();   // (the Safari Zone's days, Baoba's calls)
          hoennWeatherStep(); hoennAshStep(); berryFarm.step(); hoennBerries.step(); sinnohBerries.step();     // (the berry trees growing: Celadon's Berry Farm's, Hoenn's)
          SinnohLegends.syncForms(player);
          return unovaStory.step() || sinnohStory.step() || orreCallStep() || heartStep() || viridianStopStep() || hoennRegiceStep() || hoennCrackedStep() || hoennCruiseStep() || icefallStep() || redForestStep() || leafVermilionStep() || jessieJamesStep() || laterJessieJamesStep() || safariStep() || bugContest.step() || cinnabarBillStep() || eggStep() || repelStep() || gear.step() || saveReminderStep();
        }, encounterScale: () => gear.encounterRate() * Encounters.leadRateScale(leadMon()) * SinnohCompletion.rate(player),
        adjustWild: (mon, table) => { SinnohDaily.apply(player); const m = roamerWild(Encounters.leadWild(mon, leadMon(), table), table); return !m ? m : player.location.map === "BattleFrontier_BattlePikeRoomWildMons" ? hoennFrontier.pikeWild(m) : player.location.map === PYRAMID_FLOOR ? hoennFrontier.pyramidWild(m) : m; }, allowWild: (mon) => !SinnohPark.suppresses(player) && !SinnohRadar.suppresses(player) && !Sevii.tanobyLocked(player.flags, player.location.map) &&
          !JohtoAlph.locked(player.location.map, alphSolved()) && repelAllows(mon),
        onMap: (m) => {
          Unova.visit(player,m);
          SinnohRoamers.onMap(player,m); SinnohRadar.onMap(player,m);
          if (m !== tempFlagsMap && m === "VermilionCity_Gym") hideVermilionSwitches();
          if (m !== "VermilionCity") ticketChecked = false;
          if (m !== tempFlagsMap) strengthOn = false;
          // (Flying, blacking out or teleporting out of the Safari Zone ends the
          // Safari Game: Overworld_ResetStateAfterFly and the like.)
          if (player.flags.safari && !player.flags.safari.hoenn && !player.flags.safari.sinnoh && !player.flags.safari.park && !/^SafariZone_/.test(m) && m !== SAFARI_GATE) delete player.flags.safari;
          if (player.flags.safari && player.flags.safari.sinnoh && !/^PlatinumMarsh[1-6]$/.test(m)) delete player.flags.safari;
          if (player.flags.safari && player.flags.safari.hoenn && !/^HoennSafariZone_/.test(m) && m !== "Route121_SafariZoneEntrance") delete player.flags.safari;
          bugContest.onMap(m);   // (and away from the National Park, the Bug-Catching Contest)
          // (And off Cycling Road: VAR_MAP_SCENE_ROUTE16 back to 0.)
          if (player.flags.cyclingRoad && !CYCLING_ROAD_MAPS.includes(m)) delete player.flags.cyclingRoad;
          // The Seafoam Islands' boulders and currents (Route20_OnTransition,
          // SeafoamIslands_B3F/B4F_OnTransition).
          if (m !== tempFlagsMap) { if (m === "Route20") Seafoam.route20(player.flags); Seafoam.transition(player.flags, m); }
          // The Sevii Islands' ON_TRANSITION scripts (game/sevii.js has the flags).
          if (m !== tempFlagsMap) { seviiTransition(m); capeBrinkJustTaught = false; moveManiacMet = false; icefallIce = {}; }
          // Route 23 puts Victory Road back as it was: barriers up, boulders back (Route23_OnTransition).
          if (m !== tempFlagsMap && m === "Route23") LeagueRoad.reset(player.flags);
          // (Into a Johto map: its OnTransition script, before its people are placed.)
          if (m !== tempFlagsMap && m === GOLDENROD_SWITCHES) goldenrodSwitchesEnter();
          if (m !== tempFlagsMap) { hoennCameFrom = hoennLastType; magnetTrain.enter(m); johto.transition(m); gymmicks.enter(m); johtoSafari.arrive(m); if (isHoenn(m)) { restoreMetatiles(m); hoennWeatherEnter(m); hoennDecorApply(m); hoennSpotOpen(m); hoennEntering = m; hoenn.transition(m).then(() => { if (hoennEntering === m) hoennEntering = null; }); } hoennLastType = (window.WORLD_MAPS[m] || {}).type; }
          if (m === "SSAqua_1F") ssAquaExit();
          forgetTrainerSpots(m); clearTempFlags(m); applyPatches(m); visitSection(m);
          if (Sinnoh.cyclingRequired({ ...Overworld.position(), map: m }) && Sinnoh.cyclingAllowed(player)) Overworld.setAvatar("bike");
          if (!gear.radioOn(m)) music(avatarMusic(Overworld.avatar()) || (window.WORLD_MAPS[m] || {}).music); }   // (the Pokégear's radio plays on)
      });
      if (ev.type === "menu") {
        await startMenu();
        if (fieldAction) { const act = fieldAction; fieldAction = null; await act(); }
      }
      else if (ev.type === "select") await useRegistered();
      else if (ev.type === "water") await surfPrompt();
      else if (ev.type === "dive") await dive();
      else if (ev.type === "waterfall") await waterfall();
      else if (ev.type === "whirlpool") await whirlpool();
      else if (ev.type === "rockclimb") await rockClimb();
      else if (ev.type === "follower") {if(SinnohLeisure.active(player))await sinnohStory.run("pt:leisure-amity-companion");else await follower.talk();}
      else if (ev.type === "headbutt") await johtoField.headbutt(ev.map, ev.x, ev.y);
      else if (ev.type === "safari-object") await johtoSafari.fieldObject(ev.x, ev.y);
      else if (ev.type === "repel-ended" || ev.type === "lure-ended") await repelWoreOff(ev.type === "lure-ended");
      else if (ev.type === "egg-hatch") await eggHatches(ev.record);
      else if (ev.type === "phone") await gear.ring();
      else if (ev.type === "orre-call") await orreOakCall();
      else if (ev.type === "heart-open") await say(ev.text);
      else if (ev.type === "viridian-stop") await viridianOldManStop();
      else if (ev.type === "red-forest") await redForest();
      else if (ev.type === "leaf-vermilion") await leafVermilion();
      else if (ev.type === "save-prompt") await savePrompt();
      else if (ev.type === "jessie-james") await jessieJames();
      else if (ev.type === "jessie-james-later") await laterJessieJames();
      else if (ev.type === "safari-over") { if (ev.hoenn) await runHoenn("SafariZone_EventScript_TimesUp"); else await safariOver(ev.text, false); }
      else if (ev.type === "johto-script") await runJohto(ev.js, null);
      else if (ev.type === "hoenn-script") await runHoenn(ev.label);
      else if (ev.type === "hoenn-fall") await hoennFall(ev.map);
      else if (ev.type === "wild") {
        if (!canBattle() && !safariOn()) continue;
        // Grass on routes; caves (and other maps) use their own scene.
        const here = window.WORLD_MAPS[player.location.map];
        // (On the water: FireRed's pond or sea.)
        const at = player.location, b = World.blockAt(at.map, at.x, at.y).behavior;
        const terrain = Overworld.avatar() === "surf" ? (b === 0x10 ? "pond" : "water")
          : here && ["route", "town", "city"].includes(here.type) ? "grass" : undefined;
        if (safariOn()) await safariBattle(ev.species, ev.level, terrain, player.flags.safari.hoenn ? hoennSafari.nature() : null);
        // (The Bug-Catching Contest's own wild Pokémon, in its park.)
        else if (bugContest.here(at.map)) await bugContest.battle(terrain);
        // (The Tanoby Ruins' Unown: each slot's letter, sUnownLetterSlots; the
        // Ruins of Alph's, a letter its solved puzzles have woken.)
        // (The Battle Pike's hall of wild Pokémon: your challenge's three fight it, and the room's own scripts see how it went.)
        else if (at.map === "BattleFrontier_BattlePikeRoomWildMons" || at.map === PYRAMID_FLOOR) await pikeWildBattle(ev);
        else if (Sinnoh.isRoamer(player,ev.species) && here.region === "sinnoh") await battle("wild", {foe:{name:"Wild",team:[Party.create(ev.species,ev.level)]},terrain,noGimmicks:true});
        else if (ev.unovaDark && ableToBattle()>=2 && Math.random()<.4) await wildDoubleBattle(ev,at.map,terrain,Unova.landTable(player,at.map));
        // (A Max Lure on: always a horde, from the map's hordes or its own wild Pokémon (on the water, its water's).)
        else if (lureOn() === "max-lure" && !towerGhost() && wildTable(here) && await hordeBattle(at.map, terrain, wildTable(here))) { /* (fought) */ }
        // (X and Y's hordes: one grass or cave encounter in twenty, where the map has them; never on the water.)
        else if (Overworld.avatar() !== "surf" && !towerGhost() && Hordes.roll(at.map) && await hordeBattle(at.map, terrain)) { /* (fought) */ }
        // (Two wild Pokémon, with two of yours able to battle: one land encounter in Hordes.DOUBLE_CHANCE; a Lure on, always.)
        else if (!towerGhost() && ableToBattle() >= 2 && wildTable(here) && (lureOn() === "lure" || (Overworld.avatar() !== "surf" && Hordes.rollDouble()))
          && await wildDoubleBattle(ev, at.map, terrain, wildTable(here))) { /* (fought) */ }
        else await battle("wild", { foe: { name: "Wild", team: [wildMon(Party.create(ev.species, ev.level,
          { unown: SinnohLeisure.unownLetter(at.map) || Sevii.unownLetter(at.map, ev.slot) || JohtoAlph.unownLetter(at.map, alphSolved()) }))] },
          terrain, ghost: towerGhost() });
      } else {
        await story(ev);
        // (A voyage a script set off, once it's done: the S.S. Tidal to Sinnoh, from Lilycove's harbor.)
        if (afterScript) { const act = afterScript; afterScript = null; await act(); }
      }
      await persist();
    }
  }

  async function main() {
    // FireRed's opening movie and title screen; left alone, the title goes back to the movie.
    // B on the main menu goes back to the title screen.
    show("intro");
    play: for (;;) {
      await Intro.movie();
      for (;;) {
        if ((await Intro.titleScreen()) !== "start") continue play;
        Intro.stop();
        if ((await title()) !== "back") break play;
        show("intro");
      }
    }
    lastTick = Date.now();
    await explore();
  }


  window.Game = { get player() { return player; }, get pokegear() { return gear; }, get hoenn() { return hoenn; }, runHoenn: (label) => runHoenn(label),
    // (for the browser tests: a wild battle with this species, then back to the map)
    // (opts.terrain: a backdrop, assets/battle/<terrain>.png.)
    wildBattle: async (species, level, opts) => { await battle("wild", { terrain: opts && opts.terrain, foe: { name: "Wild", team: [wildMon(Party.create(species, level))] } }); show("world"); await Overworld.resume(); },
    // (A horde of `n` of a kind, or of the species listed: for trying them out.)
    hordeBattle: async (species, level, n, opts) => {
      const kinds = Array.isArray(species) ? species : new Array(n || 5).fill(species);
      await battle("wild", { horde: true, terrain: opts && opts.terrain, foe: { name: "Wild", team: kinds.map((sp) => wildMon(Party.create(sp, level))) } });
      show("world"); await Overworld.resume();
    },
    // (Two wild Pokémon at once: the two species given.)
    wildDoubleBattle: async (species, level, opts) => {
      await battle("wild", { wildDouble: true, terrain: opts && opts.terrain, foe: { name: "Wild", team: species.map((sp) => wildMon(Party.create(sp, level))) } });
      show("world"); await Overworld.resume();
    }, townMap: (o) => townMap(o),
    // (the Game Corner's tables, for the browser tests)
    pokerTable: () => pokerTable(), mahjongTable: () => mahjongTable(),
    // (and Bill's PC's boxes: "withdraw", "deposit", "move" or "items")
    storage: (mode) => storage(mode), mart: (stock) => mart(stock),
    // (your first Pokémon evolving into `into`, the scene and all)
    evolveFirst: async (into) => { await evolve(player.party[0], { into }, false); show("world"); await Overworld.resume(); },
    // (The trade scene, your first Pokémon for `theirs`, for trying it out: nothing's actually traded.)
    tradeScene: async (theirs) => { await tradeScene(player.party[0], Party.create(theirs || "Rattata", 10), "Tradeback Guy"); show("world"); await Overworld.resume(); },
    // (A Tera Raid against `species`, `stars` stars, your first Pokémon and allies of the species given, for trying it out.)
    raidBattle: async (species, level, stars, allies) => {
      const boss = Object.assign(wildMon(Party.create(species, level)), { teraType: "Fire", teraAce: true });
      await battle("wild", { foe: { name: "Wild", team: [boss], tera: true }, raid: stars || 3, noCatch: true, noBlackout: true, chosen: [0],
        raidAllies: (allies || []).map((sp, i) => ({ set: Party.toBattleSet(Party.create(sp, level)), trainer: ["Brock", "Misty", "Erika"][i] || "Ace" })) });
      show("world"); await Overworld.resume();
    }, sailToHoenn: () => sailToHoenn(), slateportSailor: () => slateportSailor() };
  main();
})();
