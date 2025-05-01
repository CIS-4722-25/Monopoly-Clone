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
    return this.map((_, i) => this[i].roll()), this;
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
    return this.#curr = currVal > this.#max ? this.#min : currVal + 1;
  }
  prev(currVal = this.#curr) {
    return this.#curr = this.#min > currVal ? this.#max : currVal - 1;
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
    if (this.owner === GAME.currPlayer) {
      return;
    }
    if (this.owned) {
      GAME.currPlayer.debt = [this.owner, this.rent];
      return;
    }
    this.price <= GAME.currPlayer.money ? loadPrompt(PROMPTS.unownedCanAfford) : loadPrompt(PROMPTS.unownedCantAfford);
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
  pos = new WrapIter(GAME.boardmap.length - 1);
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
      if (++this.doubles == 3)
        this.goToJail();
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
      if (nTiles > 0) {
        this.pos.next();
        this.updatePosition();
        return this.moveN(nTiles - 1);
      }
    }, 300);
    return this.position;
  }
  moveTo(tile) {
    this.updatePosition();
    if (!this.pos.includes(tile) || this.position == tile)
      return this.position;
    this.pos.next();
    return this.moveTo(tile);
  }
  updatePosition() {
    let piece = GAME.currPlayer?.piece;
    if (!piece)
      return console.warn("updatePosition: Piece not found."), 404;
    piece.remove();
    GAME.boardmap[this.position].appendChild(piece);
    return this.position;
  }
  doTile() {
  }
  // TODO
  goToJail() {
    this.inJail = true;
    this.doubles = 0;
    this.pos.currVal = 11;
    this.updatePosition();
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
  // loadInventory() {
  //     let cards = [...document.getElementsByClassName("card")]
  //     cards.forEach(c => c.classList.add("unowned"))
  //     let owned = [...this.props].map(p => p.card)
  //     owned.forEach(c => c.classList.remove("unowned"))
  // }
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
  prompt.forEach((b) => PROMPT.appendChild(b));
  return prompt;
}
const INVENTORY = document.getElementById("inv");
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
    fn: () => {
    }
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
    fn: () => {
    }
  },
  "auction": {
    // unowned
    text: "Aunction",
    fn: () => {
    }
  },
  "payRent": {
    // owe rent
    text: "Pay Rent",
    fn: () => {
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
  "": {
    // new option
    text: "",
    fn: () => {
    }
  }
}).map(([k, v]) => {
  let button = document.createElement("button");
  button.textContent = v.text;
  button.onclick = v.fn;
  return [k, button];
}));
const PROMPTS = Object.fromEntries(Object.entries({
  roll: ["roll"],
  mainPhase: ["roll", "trade", "manage"],
  endStep: ["pass", "trade", "manage"],
  unownedCanAfford: ["buy", "auction"],
  unownedCantAfford: ["auction", "trade", "manage"],
  canPay: ["pay"],
  // chance cards bankrupt if no money?
  cantPay: ["bankrupt", "trade", "manage"],
  bankrupt: ["bankrupt"],
  jail: ["pay", "roll", "trade", "manage"],
  bailRoll: ["roll", "trade", "manage"],
  payBail: ["pay"]
  // can you manage properties or do you just go bankrupt?
}).map(([k, ps]) => [k, ps.map((p) => PROMPT_BUTTONS[p])]));
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
  loadPrompt(PROMPTS["roll"]);
}
