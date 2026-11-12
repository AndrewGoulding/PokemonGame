// A clothes shop's stock for FireRed's Poké Mart buy screen (ui/shop-screen.js), as every regional
// boutique and team outfitter (game/team-fashion.js) and Kalos's boutiques (game/kalos-fashion.js) sell it: the pieces of the collection you're
// wearing, one of each (one you own shows "-----", as a TM does), an icon for each in its
// own colour, and you in it, in the screen's fitting window, before you buy.
//
//   BoutiqueMart.offers(player, shop, { coupon })   // (shop: a vendor, or a Kalos boutique's city) -> ShopScreen's options: items, inBag, soldOut, limit, buy, preview
//                                         //    (and .bought: the ids bought, as they're bought)
//   BoutiqueMart.ready()                  // (a promise: the picture previews are drawn on, loaded)
(function () {
  "use strict";

  // The icons, 16 by 16 in the middle of the screen's 24: # the outline, o the piece's
  // colour, x its shade, + its light.
  const ICONS = {
    hat: ["", "", "", "     ######", "    #++oooo#", "   #+oooooox#", "   #ooooooox#", "   #ooooooox#", "  ##xxxxxxxx##", " #oooooooooooo#", " #xxxxxxxxxxxx#", "  ############"],
    shirt: ["", "   ###    ###", "  #+oo####oox#", " #+oooxxxxooox#", "#oooooooooooooo#", "#oo#oooooooo#ox#", " ## #oooooox# ##", "    #oooooox#", "    #oooooox#", "    #oooooox#", "    #oooooox#", "    #oooooox#", "    #xxxxxxx#", "     #######"],
    pants: ["", "   ##########", "   #xxxxxxxx#", "   #+ooooooo#", "   #+oooooox#", "   #+oo##oox#", "   #+oo##oox#", "   #+o#  #ox#", "   #+o#  #ox#", "   #+o#  #ox#", "   #+o#  #ox#", "   #+o#  #ox#", "   #xx#  #xx#", "   ####  ####"],
    skirt: ["", "", "    ########", "    #xxxxxx#", "    #+ooooo#", "   #+ooooox#", "   #+ooooox#", "  #+oooooooox#", "  #+oooooooox#", " #+oooooooooox#", " #oooxoooxooox#", " #xxxxxxxxxxxx#", "  ############"],
    dress: ["", "    ##    ##", "    #o#  #o#", "    #oo##oo#", "    #+oooox#", "     #ooox#", "     #xxxx#", "    #+oooox#", "   #+ooooox#", "   #+ooooox#", "  #+oooooooox#", "  #oooxooxoox#", "  #xxxxxxxxxx#", "   ##########"],
    socks: ["", "  ####   ####", "  #xx#   #xx#", "  #+o#   #+o#", "  #+o#   #+o#", "  #+o#   #+o#", "  #+o#   #+o#", "  #+o#   #+o#", "  #+o##  #+o##", "  #oooo# #oooo#", "  #xxxx# #xxxx#", "   ####   ####"],
    shoes: ["", "", "", "", "   ###", "  #+oo#", "  #+oo#", "  #+ooo##", "  #+oooooo###", "  #ooooooooox#", "  #xxxxxxxxxx#", "  ############", "  ############"],
    bag: ["", "     ######", "    #      #", "    #      #", "  ############", "  #+oooooooox#", "  #+oooooooox#", "  #ooo####oox#", "  #ooo#++#oox#", "  #ooo####oox#", "  #oooooooooox#", "  #xxxxxxxxxx#", "  ############"]
  };
  const WORDS = { hat: "Headwear", shirt: "A top", pants: "Bottoms", dress: "A dress", socks: "Legwear", shoes: "Footwear", bag: "A bag", accessory: "An accessory" };
  const kind = (a) => (a.category === "pants" && /Skirt|Kilt/.test(a.name) ? "skirt" : a.category);

  const icons = {};
  function icon(a) {
    const rgb = (window.KalosFashionArt && window.KalosFashionArt.colors[a.color]) || [160, 160, 168], key = kind(a) + ":" + rgb;
    if (icons[key]) return icons[key];
    const c = Object.assign(document.createElement("canvas"), { width: 24, height: 24 }), g = c.getContext("2d");
    const tone = (s) => "rgb(" + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v * s + (s > 1 ? 40 : 0))))).join(",") + ")";
    // (A black piece's outline shows against it: lighter.)
    const dark = rgb[0] + rgb[1] + rgb[2] < 180;
    const ink = { "#": dark ? "#8a8794" : "#41414f", o: tone(1), x: tone(0.72), "+": tone(1.15) };
    (ICONS[kind(a)] || ICONS.bag).forEach((row, y) => [...row].forEach((ch, x) => { if (ink[ch]) { g.fillStyle = ink[ch]; g.fillRect(4 + x, 5 + y, 1, 1); } }));
    return (icons[key] = c.toDataURL());
  }

  // You, in a piece: the trainer picture the wardrobe draws on.
  const picture = typeof Image === "undefined" ? { loaded: Promise.resolve() } : new Image();   // (none headless: tests)
  if (!picture.loaded) {
    picture.loaded = new Promise((r) => { picture.onload = picture.onerror = r; });
    picture.src = "assets/sprites/trainers/front/player_character.png";
  }
  function preview(p, id) {
    const F = window.KalosFashion, look = F.preview(p, id);
    if (!look || !picture.naturalWidth) return null;
    const A = window.KalosActivities.state(p);
    return window.CharacterStyle.render(picture, Object.assign({}, p, { flags: Object.assign({}, p.flags, { kalos: Object.assign({}, p.flags.kalos, { activities: Object.assign({}, A, { appearance: look }) }) }) }));
  }

  // `shop`: a team outfitter's or regional boutique's vendor (game/team-fashion.js), or its shop's key; or one of
  // Kalos's boutiques' cities (game/kalos-fashion.js), which sell what they have in today.
  const keyOf = (shop) => (typeof shop === "string" ? shop : shop.shop);
  function stock(p, shop) {
    const F = window.KalosFashion, line = F.collection(p), key = keyOf(shop), vendor = window.TeamFashion && window.TeamFashion.vendor(key);
    return vendor ? window.TeamFashion.items.filter((a) => a.faction === vendor.faction && a.collection === line)
      : F.stock(p, key, { today: true, collection: line });
  }
  // opts.coupon: a Discount Coupon handed over (Kalos's): everything bought this visit at half price, the coupon
  // gone with the first piece.
  function offers(p, shop, opts) {
    const F = window.KalosFashion, line = F.collection(p), key = keyOf(shop), bought = [];
    let coupon = opts && opts.coupon ? true : false;
    // (A piece sold in several colours, Kalos's "Logo Cap": its colour in its name.)
    const list = stock(p, shop), named = (a) => (list.filter((b) => b.name === a.name).length > 1 ? a.color + " " + a.name : a.name);
    const items = list.map((a) => ({ id: a.id, name: named(a), get price() { return coupon ? Math.floor(a.price / 2) : a.price; },
      icon: typeof document === "undefined" ? null : icon(a),
      desc: named(a) + ".\n" + (WORDS[a.category] || "A piece") + " in " + a.color.toLowerCase() + ", cut for the " + (line === "female" ? "Serena" : "Calem") + " collection." }));
    return {
      items, bought, smallNames: true,
      money: () => p.money,
      inBag: (id) => (F.owned(p, id) ? 1 : 0),
      soldOut: (id) => F.owned(p, id),
      limit: (id) => (F.owned(p, id) ? { max: 0, why: "You already own that.\nIt's in your wardrobe." } : { max: 1 }),
      buy: (id) => {
        const r = F.buy(p, [id], key, coupon, bought.length > 0);
        if (r.error) return { error: r.error };
        bought.push(id);
        if (coupon === true) coupon = "used";
        return null;
      },
      preview: (id) => preview(p, id)
    };
  }

  window.BoutiqueMart = { offers, stock, icon, preview, ready: () => picture.loaded };
})();
