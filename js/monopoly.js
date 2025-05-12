"use strict";
class Die {
  sides;
  #value = 1;
  get value() {
    return this.#value;
  }
  constructor(sides = 6) {
    this.sides = sides;
  }
  roll() {
    return this.#value = ~~(Math.random() * this.sides) + 1;
  }
}
class Dice extends Array {
  constructor(count = 2, sides = 6) {
    if (typeof count === "string" && /^\d+d\d+$/.test(count))
      [count, sides] = count.split("d").map((v) => +v);
    super(...[...new Array(+count)].map(() => new Die(sides)));
  }
  roll() {
    this.map((_, i) => this[i].roll());
    this.display();
    return this;
  }
  peek() {
    return this.map((d) => d.value);
  }
  sum() {
    return this.peek().reduce((p, c) => p + c);
  }
  unique() {
    return new Set(this.peek()).size;
  }
  display() {
    const DICE = ["\u2680", "\u2681", "\u2682", "\u2683", "\u2684", "\u2685"];
    const CELL = document.getElementById("board").getElementsByTagName("tr")[5].getElementsByTagName("td")[5];
    CELL.innerText = "";
    CELL.classList.add("dice");
    CELL.style.transform = `rotate(${Math.random() * 360}deg)`;
    this.peek().map((d) => {
      let die = document.createElement("div");
      die.style.transform = `rotate(${Math.random() * 360}deg)`;
      die.style.paddingTop = `${Math.random() * 0.5}em`;
      die.innerText = DICE[d - 1];
      CELL.appendChild(die);
    });
  }
}
function denominations(money) {
  return Object.fromEntries([500, 100, 50, 20, 10, 5, 1].map((k) => {
    let v = ~~(money / k);
    return money %= k, [k, v];
  }));
}
class WrapIter {
  #min;
  #max;
  #curr;
  get currVal() {
    return this.#curr;
  }
  set currVal(newVal) {
    this.includes(newVal) ? this.#curr = newVal : console.error(`Value ${newVal} is not in range ${this.#min}..${this.#max}`);
  }
  /** `f(a) => (stop = a)` */
  constructor(start, stop, currVal) {
    this.#min = !stop ? 0 : Math.max(start, 0);
    this.#max = !stop ? Math.max(start - 1, this.#min + 1) : Math.max(stop - 1, this.#min + 1);
    this.#curr = !currVal ? this.#min : Math.min(Math.max(currVal, this.#min), this.#max);
  }
  next(currVal = this.#curr) {
    return this.#curr = this.#max <= currVal ? this.#min : currVal + 1;
  }
  prev(currVal = this.#curr) {
    return this.#curr = currVal <= this.#min ? this.#max : currVal - 1;
  }
  includes(value) {
    return this.#min <= value && value <= this.#max;
  }
}
class Property {
  position;
  name;
  price;
  // readonly card: HTMLElement
  owner = GAME.bank;
  get owned() {
    return this.owner !== GAME.bank;
  }
  houses = 0;
  isMortgaged = false;
  #rent;
  get rent() {
    if (this.isMortgaged) {
      return 0;
    }
    let count = [...this.set].filter((p) => p.owner === this.owner).length;
    switch (this.#set) {
      case "railroad":
        return 12.5 * 2 ** count;
      case "utility":
        return count === 2 ? 10 * GAME.dice.sum() : 4 * GAME.dice.sum();
      default:
        return !this.houses && this.isMonopoly ? this.#rent[0] * 2 : this.#rent[this.houses];
    }
  }
  #set;
  get set() {
    return GAME.propertySets[this.#set];
  }
  get isMonopoly() {
    return [...this.set].every((p) => p.owner === this.owner);
  }
  constructor(jsonObject) {
    let set = jsonObject["set"];
    if (!(set in GAME.propertySets))
      GAME.propertySets[set] = /* @__PURE__ */ new Set();
    GAME.propertySets[set].add(this);
    this.position = Number.parseInt(jsonObject["position"]);
    this.name = jsonObject["name"];
    this.#set = set;
    this.price = this.#set === "railroad" ? 200 : this.#set === "utility" ? 150 : Number.parseInt(jsonObject["price"]);
    this.#rent = jsonObject["rent"];
  }
  get value() {
    return this.isMortgaged ? this.mortgage : this.price;
  }
  get mortgage() {
    return this.price / 2;
  }
  get unmortgage() {
    return this.mortgage * 1.1;
  }
  get housePrice() {
    return 50 * Math.ceil(this.position / 10);
  }
  get canDowngrade() {
    if (this.houses > 4 && !GAME.bank.houses || [...this.set].some((p) => this.houses < p.houses)) {
      return false;
    }
    return !this.isMortgaged;
  }
  downgrade() {
    if (!this.canDowngrade) {
      return false;
    }
    if (!this.houses) {
      this.isMortgaged = true;
      return GAME.bank.pay(this.owner, this.mortgage);
    }
    this.houses > 4 ? GAME.bank.hotels++ : GAME.bank.houses++;
    return GAME.bank.pay(this.owner, this.housePrice / 2);
  }
  get canUpgrade() {
    if ([...this.set].some((p) => p.houses < this.houses) || this.isMortgaged && this.owner.money < this.unmortgage || !this.isMortgaged && this.owner.money < this.housePrice) {
      return false;
    }
    switch (this.houses) {
      case 5:
        return false;
      case 4:
        return !!GAME.bank.hotels;
      default:
        return !!GAME.bank.houses;
    }
  }
  upgrade() {
    if (!this.canUpgrade) {
      return false;
    }
    if (this.isMortgaged) {
      if (!this.owner.pay(GAME.bank, this.unmortgage)) {
        return false;
      }
      this.isMortgaged = false;
      {
        return true;
      }
    }
    this.houses < 4 ? GAME.bank.houses-- : GAME.bank.hotels--;
    this.houses++;
    return true;
  }
  auction() {
  }
  // TODO
  action() {
    let p = GAME.currPlayer;
    if (this.owner === p) {
      return;
    }
    if (this.owned) {
      p.debt = [this.owner, this.rent];
      p.doDebt();
      {
        return;
      }
    }
    p.doUnowned();
  }
}
class Deck extends Array {
  draw = this.shift;
  bottom = this.push;
  shuffle() {
    return this.forEach((c, i) => {
      let r = ~~(Math.random() * this.length);
      this[i] = this[r];
      this[r] = c;
    }), this;
  }
}
class Inventory {
  money = 0;
  props = /* @__PURE__ */ new Set();
  cards = /* @__PURE__ */ new Set();
  debt = [];
  canPay(amount) {
    return this.money >= amount;
  }
  pay(inv, amount) {
    if (!this.canPay(amount))
      return false;
    inv.money += amount;
    this.money -= amount;
    return true;
  }
  takeAll(inv) {
    inv.pay(this, inv.money);
    inv.cards.forEach((c) => {
      inv.cards.delete(c);
      this.cards.add(c);
    });
    inv.props.forEach((p) => {
      inv.props.delete(p);
      this.props.add(p);
      p.owner = this;
    });
  }
}
class Trade extends Inventory {
  owner;
  constructor(owner) {
    super();
    this.owner = owner;
  }
  addItem(item) {
    if (typeof item === "number")
      return this.money += item, true;
    if (!(item instanceof Property))
      return this.cards.add(item), true;
    if (item.owner === this.owner)
      return this.props.add(item), true;
    return false;
  }
  canTrade(t) {
    return [this, t].every((t2) => t2.money > 0 || t2.props.size > 0 || t2.cards.size > 0) && [this.props, t.props].some((p) => p.size > 0);
  }
  trade(t) {
    if (!this.canTrade(t)) {
      return false;
    }
    this.money > t.money ? this.owner.pay(t.owner, this.money - t.money) : t.owner.pay(this.owner, t.money - this.money);
    this.cards.forEach((c) => (this.owner.cards.delete(c), t.owner.cards.add(c)));
    this.props.forEach((p) => (this.owner.props.delete(p), t.owner.props.add(p)));
    t.cards.forEach((c) => (t.owner.cards.delete(c), this.owner.cards.add(c)));
    t.props.forEach((p) => (t.owner.props.delete(p), this.owner.props.add(p)));
    return true;
  }
}
class Player extends Inventory {
  name;
  money = 1500;
  inJail = false;
  doubles = 0;
  bailRolls = 0;
  piece;
  pos = new WrapIter(GAME.boardmap.length);
  get position() {
    return this.pos.currVal;
  }
  constructor(name, piece) {
    super();
    this.name = name;
    this.piece = piece;
    GAME.boardmap[0].appendChild(this.piece);
  }
  roll() {
    let d = GAME.dice.roll();
    if (d.unique() === 1) {
      this.doubles++;
      if (this.doubles == 3) {
        this.goToJail();
        {
          return;
        }
      }
    }
    this.moveN(d.sum());
  }
  moveN(nTiles) {
    setTimeout(() => {
      if (nTiles < 0) {
        this.pos.prev();
        this.updatePosition();
        return this.moveN(nTiles + 1);
      }
      if (0 < nTiles) {
        this.pos.next();
        this.updatePosition();
        return this.moveN(nTiles - 1);
      }
      this.doTile();
    }, 300);
    return this.position;
  }
  updatePosition() {
    let piece = GAME.currPlayer?.piece;
    if (!piece)
      return console.warn("updatePosition: Piece not found."), 404;
    piece.remove();
    GAME.boardmap[this.position].appendChild(piece);
    if (this.position === 0)
      GAME.bank.pay(this, 200);
    return this.position;
  }
  get propertyTile() {
    return PROPS.filter((p) => p.position === this.position)[0];
  }
  doDebt() {
    loadPrompt(PROMPTS[this.money < GAME.currPlayer.debt[1] ? "debtCantAfford" : "debtCanAfford"]);
  }
  doUnowned() {
    loadPrompt(PROMPTS[this.propertyTile.value <= this.money ? "unownedCanAfford" : "unownedCantAfford"]);
  }
  doNextPhase() {
    loadPrompt(PROMPTS[GAME.dice.unique() === 1 ? "mainPhase" : "endStep"]);
  }
  draw(deckName) {
    let deck = GAME.decks[deckName];
    let card = deck.draw();
    console.log(card.text);
    card.effect();
    deck.bottom(card);
  }
  doTile() {
    let pos = this.position;
    switch (pos) {
      case 4:
        this.debt = [GAME.bank, 200];
        this.doDebt();
        {
          return;
        }
      case 30:
        this.goToJail();
        {
          return;
        }
      case 38:
        this.debt = [GAME.bank, 100];
        this.doDebt();
        {
          return;
        }
      case 2:
      case 17:
      case 33:
        this.draw("Community Chest");
        {
          return;
        }
      case 7:
      case 22:
      case 36:
        this.draw("Chance");
        {
          return;
        }
    }
    let prop = [...PROPS].filter((p) => p.position === pos)[0];
    if (prop)
      prop.action();
  }
  doStartTurn() {
    this.loadInventory();
    loadPrompt(PROMPTS[!this.inJail ? "mainPhase" : 50 < this.money ? "bailCanAfford" : "bailCantAfford"]);
  }
  doPass() {
    GAME.currPlayer.doubles = 0;
    let p = new WrapIter(GAME.turnOrder.length);
    GAME.currPlayer = GAME.turnOrder[p.next(GAME.turnOrder.indexOf(this))];
    GAME.currPlayer.doStartTurn();
  }
  doBuy() {
    let p = this.propertyTile;
    this.pay(GAME.bank, p.value);
    this.props.add(p);
    p.owner = this;
  }
  goToJail() {
    this.inJail = true;
    this.doubles = 0;
    this.pos.currVal = 10;
    this.updatePosition();
    loadPrompt(PROMPTS["endStep"]);
    return this.position;
  }
  bankrupt(toWhom) {
    GAME.players.delete(this);
    if (toWhom instanceof Player && !(toWhom instanceof Bank)) {
      toWhom.takeAll(this);
      {
        return true;
      }
    }
    this.cards.forEach((c) => GAME.decks[c.deck].bottom(c));
    this.props.forEach((p) => {
      while (p.houses)
        p.downgrade();
      GAME.bank.props.add(p);
      p.owner = GAME.bank;
    });
    if (Array.isArray(toWhom)) {
      this.props.forEach((p) => (p.owner = GAME.bank, GAME.bank.props.add(p)));
      this.props.forEach((p) => {
        p.isMortgaged ? GAME.bank.pay(this, p.mortgage) : GAME.bank.pay(this, p.value);
      });
      let payout = ~~(this.money / GAME.players.size);
      GAME.players.forEach((p) => this.pay(p, payout));
    }
    {
      return true;
    }
  }
  loadInventory() {
    INV.innerHTML = "";
    let ul = document.createElement("ul");
    this.props.forEach((p) => {
      let li = document.createElement("li");
      li.innerText = p.name;
      ul.appendChild(li);
    });
    INV.appendChild(ul);
    document.getElementById("money").innerText = `${this.name}: $${this.money}`;
  }
}
class Bank extends Inventory {
  houses = 12;
  hotels = 32;
  pay(inv, amount) {
    inv.money += amount;
    return true;
  }
}
function loadPrompt(prompt) {
  PROMPT.innerHTML = "";
  prompt.forEach((b) => PROMPT.appendChild(PROMPT_BUTTONS[b]));
  Object.values(PROMPT_BUTTONS).forEach((b) => b.disabled = false);
  return prompt;
}
const INV = document.getElementById("inv");
const BOARD = document.getElementById("board");
const PROMPT = document.getElementById("prompt");
const GAME = {
  bank: new Bank(),
  players: /* @__PURE__ */ new Set(),
  propertySets: {},
  turnOrder: [],
  currPlayer: null,
  board: new Array(),
  decks: {
    "Chance": new Deck(),
    "Community Chest": new Deck()
  },
  dice: new Dice(),
  boardmap: ((range) => [
    range.map((i) => ({ row: 10, col: 10 - i })),
    // {10, 10}..{10,  1}..
    range.map((i) => ({ row: 10 - i, col: 0 })),
    // {10,  0}..{ 1,  0}..
    range.map((i) => ({ row: 0, col: i })),
    // { 0,  0}..{ 0,  9}..
    range.map((i) => ({ row: i, col: 10 }))
    // { 0, 10}..{ 9, 10}
  ].flat())([...new Array(10).keys()]).map(({ row, col }) => BOARD.getElementsByTagName("tr")[row].getElementsByTagName("td")[col])
  // table[10][10]..table[10][1]..
};
const PROMPT_BUTTONS = Object.fromEntries(Object.entries({
  "trade": {
    // priority
    text: "Trade",
    fn: () => {
    }
  },
  "manage": {
    // priority
    text: "Manage Properties",
    fn: () => {
    }
  },
  "bankrupt": {
    // owe money
    text: "Bankrupt",
    fn: () => {
    }
  },
  "roll": {
    // roll
    text: "Roll",
    fn: () => GAME.currPlayer?.roll()
  },
  "pass": {
    // no roll
    text: "End Turn",
    fn: () => GAME.currPlayer?.doPass()
  },
  "bailRoll": {
    // jail
    text: "Roll",
    fn: () => {
    }
  },
  "payBail": {
    // jail
    text: "Pay Bail",
    fn: () => {
    }
  },
  "buy": {
    // unowned
    text: "Buy",
    fn: () => ((p) => {
      p.doBuy();
      p.loadInventory();
      p.doNextPhase();
    })(GAME.currPlayer)
  },
  "dontBuy": {
    text: "Don't Buy",
    fn: () => GAME.currPlayer.doNextPhase()
  },
  "auction": {
    // unowned
    text: "Auction",
    fn: () => {
    }
  },
  "pay": {
    // owe
    text: "Pay",
    fn: () => {
      let p = GAME.currPlayer;
      p.pay(p.debt[0], p.debt[1]);
      p.doNextPhase();
    }
  },
  "bid": {
    // auction
    text: "Place Bid",
    fn: () => {
    }
  },
  "drop": {
    // auction
    text: "Drop Out",
    fn: () => {
    }
  },
  "back": {
    text: "Back",
    fn: () => GAME.currPlayer.doNextPhase()
  },
  "": {
    // new option
    text: "",
    fn: () => {
    }
  }
}).map(([k, v]) => {
  let button = document.createElement("button");
  button.textContent = v.text;
  button.onclick = () => Object.values(PROMPT_BUTTONS).forEach((b) => b.disabled = true);
  button.addEventListener("click", v.fn);
  return [k, button];
}));
const PROMPTS = Object.fromEntries(Object.entries({
  mainPhase: ["roll", "manage"],
  endStep: ["pass", "manage"],
  unownedCanAfford: ["buy", "dontBuy"],
  unownedCantAfford: ["manage"],
  debtCanAfford: ["pay", "manage"],
  // chance cards bankrupt if no money?
  debtCantAfford: ["bankrupt", "manage"],
  bankrupt: ["bankrupt"],
  bailCanAfford: ["pay", "roll", "manage"],
  bailCantAfford: ["roll", "manage"],
  mustPayBail: ["pay"],
  // can you manage properties or do you just go bankrupt?
  manage: ["trade", "back"],
  reset: []
}));
const PIECES = Object.fromEntries(Object.entries({
  DOG: "dog",
  CAT: "cat"
}).map(([k, v]) => {
  let img = document.createElement("img");
  img.id = `piece.${v}`;
  img.src = `./images/${v}.png`;
  img.alt = v;
  img.classList.add("piece");
  return [k, img];
}));
const PROPS = [
  {
    "position": 1,
    "name": "Mediterranean Avenue",
    "set": "brown",
    "price": 60,
    "rent": [2, 10, 30, 90, 160, 250]
  },
  {
    "position": 3,
    "name": "Baltic Avenue",
    "set": "brown",
    "price": 60,
    "rent": [4, 20, 60, 180, 320, 450]
  },
  {
    "position": 6,
    "name": "Oriental Avenue",
    "set": "sky",
    "price": 100,
    "rent": [6, 30, 90, 270, 400, 550]
  },
  {
    "position": 8,
    "name": "Vermont Avenue",
    "set": "sky",
    "price": 100,
    "rent": [6, 30, 90, 270, 400, 550]
  },
  {
    "position": 9,
    "name": "Connecticut Avenue",
    "set": "sky",
    "price": 120,
    "rent": [8, 40, 100, 300, 450, 600]
  },
  {
    "position": 11,
    "name": "St. Charles Place",
    "set": "magenta",
    "price": 140,
    "rent": [10, 50, 150, 450, 625, 750]
  },
  {
    "position": 13,
    "name": "States Avenue",
    "set": "magenta",
    "price": 140,
    "rent": [10, 50, 150, 450, 625, 750]
  },
  {
    "position": 14,
    "name": "Virginia Avenue",
    "set": "magenta",
    "price": 160,
    "rent": [12, 60, 180, 500, 700, 900]
  },
  {
    "position": 16,
    "name": "St. James Place",
    "set": "orange",
    "price": 180,
    "rent": [14, 70, 200, 550, 750, 950]
  },
  {
    "position": 17,
    "name": "Tennessee Avenue",
    "set": "orange",
    "price": 180,
    "rent": [14, 70, 200, 550, 750, 950]
  },
  {
    "position": 18,
    "name": "New York Avenue",
    "set": "orange",
    "price": 200,
    "rent": [16, 80, 220, 600, 800, 1e3]
  },
  {
    "position": 21,
    "name": "Kentucky Avenue",
    "set": "red",
    "price": 220,
    "rent": [18, 90, 250, 700, 875, 1050]
  },
  {
    "position": 23,
    "name": "Indiana Avenue",
    "set": "red",
    "price": 220,
    "rent": [18, 90, 250, 700, 875, 1050]
  },
  {
    "position": 24,
    "name": "Illinois Avenue",
    "set": "red",
    "price": 240,
    "rent": [20, 100, 300, 750, 925, 1100]
  },
  {
    "position": 26,
    "name": "Atlantic Avenue",
    "set": "yellow",
    "price": 260,
    "rent": [22, 110, 330, 800, 975, 1150]
  },
  {
    "position": 27,
    "name": "Ventnor Avenue",
    "set": "yellow",
    "price": 260,
    "rent": [22, 110, 330, 800, 975, 1150]
  },
  {
    "position": 29,
    "name": "Marvin Gardens",
    "set": "yellow",
    "price": 280,
    "rent": [24, 120, 360, 850, 1025, 1200]
  },
  {
    "position": 31,
    "name": "Pacific Avenue",
    "set": "green",
    "price": 300,
    "rent": [26, 130, 390, 900, 1100, 1275]
  },
  {
    "position": 32,
    "name": "North Carolina Avenue",
    "set": "green",
    "price": 300,
    "rent": [26, 130, 390, 900, 1100, 1275]
  },
  {
    "position": 34,
    "name": "Pennsylvania Avenue",
    "set": "green",
    "price": 320,
    "rent": [28, 150, 450, 1e3, 1200, 1400]
  },
  {
    "position": 37,
    "name": "Park Place",
    "set": "blue",
    "price": 350,
    "rent": [35, 175, 500, 1100, 1300, 1500]
  },
  {
    "position": 39,
    "name": "Boardwalk",
    "set": "blue",
    "price": 400,
    "rent": [50, 200, 600, 1400, 1700, 2e3]
  },
  {
    "position": 5,
    "name": "Reading Railroad",
    "set": "railroad"
  },
  {
    "position": 15,
    "name": "Pennsylvania Railroad",
    "set": "railroad"
  },
  {
    "position": 25,
    "name": "B. & O. Railroad",
    "set": "railroad"
  },
  {
    "position": 35,
    "name": "Short Line",
    "set": "railroad"
  },
  {
    "position": 12,
    "name": "Electric Company",
    "set": "utility"
  },
  {
    "position": 28,
    "name": "Water Works",
    "set": "utility"
  }
].map((p) => new Property(p));
initialize();
function initialize() {
  [
    new Player("Player 1", PIECES.DOG),
    new Player("Player 2", PIECES.CAT)
  ].forEach((p) => {
    GAME.players.add(p);
    GAME.turnOrder.push(p);
  });
  GAME.currPlayer = GAME.turnOrder[0];
  GAME.players.forEach((a) => a.piece);
  [
    {
      deck: "Community Chest",
      text: "Advance to Go",
      effect: () => {
        GAME.currPlayer.pos.currVal = 0;
        GAME.currPlayer.updatePosition();
      }
    },
    {
      deck: "Community Chest",
      text: "From sale of stock you get $50",
      effect: () => GAME.bank.pay(GAME.currPlayer, 50)
    },
    {
      deck: "Community Chest",
      text: "Go to Jail. Go directly to jail, do not pass Go, do not collect $200",
      effect: () => {
        GAME.currPlayer.pos.currVal = 10;
        GAME.currPlayer.updatePosition();
      }
    }
  ].forEach((card) => GAME.decks["Community Chest"].push(card));
  [
    {
      deck: "Chance",
      text: "Go back 3 spaces",
      effect: () => {
        GAME.currPlayer?.moveN(-3);
      }
    },
    {
      deck: "Chance",
      text: "Advance to Boardwalk.",
      effect: () => {
        GAME.currPlayer.pos.currVal = 39;
        GAME.currPlayer.updatePosition();
      }
    },
    {
      deck: "Chance",
      text: "Speeding fine $15.",
      effect: () => {
        GAME.currPlayer.pay(GAME.bank, 15);
        GAME.currPlayer.loadInventory();
      }
    }
  ].forEach((card) => GAME.decks["Chance"].push(card));
  GAME.decks["Chance"].shuffle();
  GAME.decks["Community Chest"].shuffle();
  GAME.dice.display();
  loadPrompt(PROMPTS["mainPhase"]);
  GAME.currPlayer.loadInventory();
}
