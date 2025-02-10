const roll = (nDice = 2, sides = 6) => 
    Array(nDice).fill().map(() => Math.floor(Math.random() * sides) + 1)

const rollDice = (dice = "2d6") =>
    roll(...(/^(\d+)d(\d+)$/i.exec(dice) ?? [0, 1, -1]).slice(1).map(v => Number.parseInt(v)))
    .reduce((p, c) => p + c)

/** @param {number} money */
const denominations = (money) =>
    Object.fromEntries([500, 100, 50, 20, 10, 5, 1].map(d => {
        let m = Math.floor(money / d)
        money %= d
        return [d, m]
    }))

class InfIter {
    /** @type {number} */
    min = 0
    /** @type {number} */
    max = 1
    /** @type {number} */
    currValue = 0

    /**
     * @param {number=} start
     * @param {number} stop (uninclusive)
     * @param {number=} currValue
     */
    constructor(start, stop, currValue) {
        if (currValue && this.currValue < currValue)
            currValue = start
        if (!stop)
            if (this.max < start - 1) {
                this.max = start - 1
                return
            }
        if (this.min < start)
            this.min = start
        this.max = this.min + 1
        if (this.max < stop - 1)
            this.max = stop - 1
    }

    next(currValue = this.currValue) {
        this.currValue = currValue + 1
        if (this.max < this.currValue)
            this.currValue = this.min
        return this.currValue
    }

    prev(currValue = this.currValue) {
        this.currValue = currValue - 1
        if (this.currValue < this.min)
            this.currValue = this.max
        return this.currValue
    }

    /** @param {number} value */
    includes(value)
        { this.min <= value && value <= this.max }
}

/** @param {number} nTiles */
function move(nTiles) {
    p = GAME.currPlayer
    while (nTiles) {
        p.pos
    }
}

/** @param {number} tile */
function goTo(tile) {
    p = GAME.currPlayer
    while (p.pos < tile) {
        p.pos.next()
        if (p.pos == 0)
            GAME.bank.debt[p.name] = 200
    }
    return p.pos
}

class Property {
    /** @type {InfIter} @readonly Board position */
    pos
    /** @type {string} @readonly Display name */
    name
    /** @type {string} Set name*/
    #set
    /** @type {number} Printed value */
    #price
    /** @type {number[]} @readonly List of rent values */
    #rent
    /** @type {Inventory} */
    owner = GAME.bank
    /** @type {number} */
    houses = 0
    /** @type {boolean} */
    isMortgaged = false

    /** @param {JSON} jsonObject */
    constructor(jsonObject) {
        let set = jsonObject["set"]
        if (!(set in GAME.propertySets))
            GAME.propertySets[set] = new Set()
        GAME.propertySets[set].add(this)
        this.pos = InfIter(40, Number.parseInt(jsonObject["position"]))
        this.name = jsonObject["name"]
        this.#set = set
        this.#price
            = this.#set === "railroad" ? 200
            : this.#set === "utility" ? 150
            : Number.parseInt(jsonObject["price"])
        this.#rent = jsonObject["rent"]
    }

    get position()
        { return this.pos.currValue }
    
    move(nTiles = 0) {
        while (nTiles !== 0) {
            nTiles > 0
                ? (this.pos.next(), nTiles--)
                : (this.pos.prev(), nTiles++)
            if (this.pos == 0)
                GAME.bank.debt[this.name] = 200
        }
        return this.position
    }

    /** @param {number} tile */
    goTo(tile) {
        if (!this.pos.includes(tile))
            return this.pos
        while (this.position !== tile)
            this.move(1)
        return this.position
    }

    get set()
        { return GAME.propertySets[this.#set] }

    get value()
        { return this.isMortgaged ? this.mortgage : this.#price }

    get mortgage()
        { return this.#price / 2 }

    get unmortgage()
        { return this.mortgage * 1.1 }

    get housePrice()
        { return 50 * Math.ceil(this.pos * .1) }
    
    get isMonopoly()
        { return this.set.every(p => p.owner === this.owner) }

    rent(roll = 0) {
        if (this.isMortgaged)
            { return 0 }
        let count = this.set.filter(p => p.owner === this.owner).length
        switch (this.#set) {
            case "railroad":
                return 12.5 * 2 ** count
            case "utility" :
                return count === 2
                    ? 10 * roll
                    :  4 * roll
            default:
                return !this.houses && this.isMonopoly
                    ? this.#rent[0] * 2
                    : this.#rent[this.houses] 
        }
    }

    get canDowngrade() {
        if (this.houses > 4 && !GAME.bank.houses
        || [...this.set].some(p => this.houses < p.houses))
            { return false }
        return !this.isMortgaged
    }

    downgrade() {
        if (!this.canDowngrade)
            { return false }
        if (!this.houses) {
            this.isMortgaged = true
            return GAME.bank.pay(this.owner.money, this.mortgage)
        }
        this.houses > 4
            ? GAME.bank.hotels++
            : GAME.bank.houses++
        return GAME.bank.pay(this.owner, this.housePrice / 2)
    }

    get canUpgrade() {
        if ([...this.set].some(p => p.houses < this.houses)
        ||  this.isMortgaged && this.owner.money < this.unmortgage
        || !this.isMortgaged && this.owner.money < this.housePrice)
            { return false }
        switch(this.houses) {
            case  5: return false
            case  4: return !!GAME.bank.hotels
            default: return !!GAME.bank.houses
        }
    }

    upgrade() {
        if (!this.canUpgrade)
            { return false }
        if (this.isMortgaged) {
            if (!this.owner.pay(GAME.bank, this.unmortgage))
                { return false }
            this.isMortgaged = false
            { return true }
        }
        this.houses < 4
            ? GAME.bank.houses--
            : GAME.bank.hotels--
        this.houses++
        return true
    }
}

/** @extends {Array<Card>} */
class Deck extends Array {
    draw = this.shift
    bottom = this.push
    
    shuffle() {
        return this.forEach((c, i) => {
            let r = Math.floor(Math.random() * this.length)
            this[i] = this[r]
            this[r] = c
        })
    }
}

class Card {
    /** @type {"Chance" | "Community Chest"} @readonly */
    deck
    /** @type {string} @readonly */
    text
    /** @type {Function} @readonly */
    effect

    /**
     * @param {"Chance" | "Community Chest"} deck 
     * @param {string} text
     * @param {Function} effect
     */
    constructor(deck, text, effect) {
        this.deck = deck
        this.text = text
        this.effect = effect
    }
}

class Inventory {
    /** @type {number} */
    money = 0
    /** @type {Set<Property>} */
    props = new Set()
    /** @type {Set<Card>} */
    cards = new Set()
    /** @type {Object<string, number>} */
    debt = {}

    /** @param {number} amount */
    canPay(amount) { return this.money >= amount }

    /**
     * @param {Inventory} inv
     * @param {number} amount
     */
    pay(inv, amount) {
        return !this.canPay(amount) ? false
            : (inv.money += amount, this.money -= amount, true)
    }

    /** @param {Inventory} inv */
    takeAll(inv) {
        inv.pay(this, inv.money)
        inv.cards.forEach(c => {
            inv.cards.delete(c)
            this.cards.add(c)
        })
        inv.props.forEach(p => {
            inv.props.delete(p)
            this.props.add(p)
            p.owner = this
        })
    }
}

class Trade extends Inventory {
    /** @type {Player} */
    owner

    /** @param {Player} owner */
    constructor(owner)
        { this.owner = owner }

    /** @param {number | Card | Property} item */
    addItem(item) {
        typeof(item) === "number"
            ? this.owner.money < item ? false
            : (this.money += item, true)
        : p.owner !== this.owner ? false
        : item instanceof Property
            ? (this.props.add(item), true)
            : (this.cards.add(item), true)
    }

    /** @param {Trade} t */
    canTrade(t) {
        return [this, t].every(t => t.money > 0 || t.props.size > 0 || t.cards.size > 0)
            && [this.props, t.props].some(p => p.size > 0)
    }

    /** @param {Trade} t */
    trade(t) {
        if (!this.canTrade(t))
            { return false }
        this.money > t.money
            ? this.owner.pay(t.owner, this.money - t.money)
            : t.owner.pay(this.owner, t.money - this.money)
        this.cards.forEach(c => (this.owner.cards.delete(c), t.owner.cards.add(c)))
        this.props.forEach(p => (this.owner.props.delete(p), t.owner.cards.add(p)))
        t.cards.forEach(c => (t.owner.cards.delete(c), this.owner.cards.add(c)))
        t.props.forEach(p => (t.owner.props.delete(p), this.owner.props.add(p)))
        return true
    }
}

class Player extends Inventory {
    /** @type {string} */
    name
    /** @type {number} */
    money = 1500
    /** @type {boolean} */
    inJail = false
    /** @type {number} */
    bailRolls = 0
    /** @type {number} */
    pos = 0

    /** @param {Inventory} toWhom */
    bankrupt(toWhom) {
        GAME.players.delete(this)
        if (toWhom instanceof Player && !(toWhom instanceof Bank)) {
            toWhom.takeAll(this)
            { return true }
        }
        this.cards.forEach(c => GAME.decks[c.deck].bottom(c))
        this.props.forEach(p => {
            while(p.houses)
                p.downgrade()
            GAME.bank.props.add(p)
            p.owner = GAME.bank
        })
        if (Array.isArray(toWhom)) {
            this.props.forEach(p => (p.owner = GAME.bank, GAME.bank.props.add(p)))
            this.props.forEach(p => {
                p.isMortgaged
                    ? GAME.bank.pay(this, p.mortgage)
                    : GAME.bank.pay(this, p.value)
            })
            let payout = Math.floor(this.money / GAME.players.size)
            GAME.players.forEach(p => this.pay(p, payout))
            // All properties returned to the bank this way are auctioned, in order of board position
            // return
        }
        { return true }
    }

    /** @param {number} nTiles */
    advance(nTiles) {
        this.pos -= nTiles
        if (this.pos < 0)
            this.pos = 40 - this.pos
    }

    load() {} // Loads the player's inventory into the UI
}

class Bank extends Inventory {
    /** @type {number} */
    houses = 12
    /** @type {number} */
    hotels = 32

    /**
     * @param {Inventory} inv
     * @param {number} amount
     */
    pay(inv, amount) {
        inv.money += amount
        return true
    }
}

/** @global */
const GAME = {
    /** @type {Bank} */
    bank: new Bank(),
    /** @type {Set<Player>} */ 
    players: new Set(),
    /** @type {Object<string, Set<Property>>} */
    propertySets: {},
    /** @type {Player} */
    currPlayer: null,
    /** @type {(() => void)[]} */
    board: new Array(),
    /** @type {Object<string, Deck>} */
    decks: {
        "Chance": new Deck(),
        "Community Chest": new Deck()
    }
}

// --------------------------------

let p = new Player()
GAME.players.add(p)
GAME.players.add(1)
console.log(JSON.stringify(GAME))
console.log(JSON.stringify(Array.from(GAME.players)))
