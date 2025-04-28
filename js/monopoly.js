"use strict";
(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);

  // src/monopoly.ts
  var require_monopoly = __commonJS({
    "src/monopoly.ts"() {
      var _value;
      var Die = class {
        constructor(sides = 6) {
          __publicField(this, "sides");
          __privateAdd(this, _value, 1);
          this.sides = sides;
        }
        get value() {
          return __privateGet(this, _value);
        }
        roll() {
          return __privateSet(this, _value, ~~(Math.random() * this.sides) + 1);
        }
      };
      _value = new WeakMap();
      var Dice = class extends Array {
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
      };
      var _min, _max, _curr;
      var WrapIter = class {
        /** `f(a) => (stop = a)` */
        constructor(start, stop, currVal) {
          __privateAdd(this, _min);
          __privateAdd(this, _max);
          __privateAdd(this, _curr);
          __privateSet(this, _min, !stop ? 0 : Math.max(start, 0));
          __privateSet(this, _max, !stop ? Math.max(start - 1, __privateGet(this, _min) + 1) : Math.max(stop - 1, __privateGet(this, _min) + 1));
          __privateSet(this, _curr, !currVal ? __privateGet(this, _min) : Math.min(Math.max(currVal, __privateGet(this, _min)), __privateGet(this, _max)));
        }
        get currVal() {
          return __privateGet(this, _curr);
        }
        set currVal(newVal) {
          this.includes(newVal) ? __privateSet(this, _curr, newVal) : console.error(`Value ${newVal} is not in range ${__privateGet(this, _min)}..${__privateGet(this, _max)}`);
        }
        next(currVal = __privateGet(this, _curr)) {
          return __privateSet(this, _curr, currVal > __privateGet(this, _max) ? __privateGet(this, _min) : currVal + 1);
        }
        prev(currVal = __privateGet(this, _curr)) {
          return __privateSet(this, _curr, __privateGet(this, _min) > currVal ? __privateGet(this, _max) : currVal - 1);
        }
        includes(value) {
          return __privateGet(this, _min) <= value && value <= __privateGet(this, _max);
        }
      };
      _min = new WeakMap();
      _max = new WeakMap();
      _curr = new WeakMap();
      var Deck = class extends Array {
        constructor() {
          super(...arguments);
          __publicField(this, "draw", this.shift);
          __publicField(this, "bottom", this.push);
        }
        shuffle() {
          return this.forEach((c, i) => {
            let r = ~~(Math.random() * this.length);
            this[i] = this[r];
            this[r] = c;
          }), this;
        }
      };
      var Inventory = class {
        constructor() {
          __publicField(this, "money", 0);
          __publicField(this, "props", /* @__PURE__ */ new Set());
          __publicField(this, "cards", /* @__PURE__ */ new Set());
          __publicField(this, "debt", {});
        }
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
      };
      var Player = class _Player extends Inventory {
        constructor(name, piece) {
          super();
          __publicField(this, "name");
          __publicField(this, "money", 1500);
          __publicField(this, "inJail", false);
          __publicField(this, "doubles", 0);
          __publicField(this, "bailRolls", 0);
          __publicField(this, "piece");
          __publicField(this, "pos", new WrapIter(GAME.boardmap.length));
          this.name = name;
          this.piece = piece;
          GAME.boardmap[0].appendChild(this.piece);
        }
        get position() {
          return this.pos.currVal;
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
          this.updatePosition();
          if (nTiles < 0) {
            this.pos.prev();
            return this.moveN(nTiles - 1);
          }
          if (nTiles > 0) {
            this.pos.next();
            return this.moveN(nTiles + 1);
          }
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
          setTimeout(() => {
          }, 200);
          let piece = document.getElementById(`piece.${this.piece}`);
          if (!piece)
            return console.warn("updatePosition: Piece not found."), 404;
          piece.remove();
          GAME.boardmap[this.position].appendChild(piece);
          return this.position;
        }
        goToJail() {
          this.inJail = true;
          this.doubles = 0;
          this.pos.currVal = 11;
          this.updatePosition();
          return this.position;
        }
        bankrupt(toWhom) {
          GAME.players.delete(this);
          if (toWhom instanceof _Player && !(toWhom instanceof Bank)) {
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
      };
      var Bank = class extends Inventory {
        constructor() {
          super(...arguments);
          __publicField(this, "houses", 12);
          __publicField(this, "hotels", 32);
        }
        pay(inv, amount) {
          inv.money += amount;
          return true;
        }
      };
      var INVENTORY = document.getElementById("inv");
      var BOARD = document.getElementById("board");
      var PROMPT = document.getElementById("prompt");
      var GAME = {
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
      var PROMPT_BUTTONS = Object.fromEntries(Object.entries({
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
          fn: () => {
          }
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
        button.value = v.text;
        button.onclick = v.fn;
        return [k, button];
      }));
      var PROMPTS = Object.fromEntries(Object.entries({
        roll: ["roll"],
        mainPhase: ["roll", "trade", "manage"],
        endStep: ["pass", "trade", "manage"],
        unowned: ["buy", "auction"],
        canPay: ["pay", "trade", "manage"],
        // chance cards bankrupt if no money?
        cantPay: ["bankrupt", "trade", "manage"],
        bankrupt: ["bankrupt"],
        bail: ["pay", "roll", "trade", "manage"],
        bailRoll: ["roll", "trade", "manage"],
        payBail: ["pay"]
        // can you manage properties or do you just go bankrupt?
      }).map(([k, ps]) => [k, ps.map((p) => PROMPT_BUTTONS[p])]));
      var PIECES = Object.fromEntries(Object.entries({
        DOG: "dog",
        CAT: "cat"
      }).map(([k, v]) => {
        let img = document.createElement("img");
        img.id = `piece.${v}`;
        img.src = `./images/${v}.png`;
        img.alt = v;
        img.style.width = "3vh";
        img.style.height = "3vh";
        img.style.maxWidth = "3vw";
        img.style.maxHeight = "3vw";
        img.style.aspectRatio = "1/1";
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
        PROMPTS["roll"].load();
      }
    }
  });
  require_monopoly();
})();
//# sourceMappingURL=monopoly.js.map
