class Die {
    readonly sides: number
    
    #value = 1
    get value() { return this.#value }

    constructor(sides = 6) { this.sides = sides }
    
    roll(sides?: number): Die {
        return (sides)
            ? new Die(sides).roll()
            : (
                this.#value = ~~(Math.random() * this.sides) + 1,
                this
            )
    }
}

class Dice extends Array<Die> {
    constructor(count: number | string = 2, sides = 6) {
        if (typeof(count) === "string" && /^\d+d\d+$/.test(count))
            [count, sides] = count.split('d').map(v => +v)
        super(...[...Array(+count)].map(() => new Die(sides)))
    }

    roll(): Dice
        { return (this.map((_, i) => this[i].roll()), this) }

    peek(): number[]
        { return this.map(d => d.value) }

    sum(): number
        { return this.peek().reduce((p, c) => p + c) }
}

function denominations(money: number) {
    return Object.fromEntries([500, 100, 50, 20, 10, 5, 1].map(k => {
        let v = ~~(money / k)
        return (money %= k, [k, v])
    }))
}

/** Iterator that wraps around */
class WrapIter {
    readonly #min: number
    readonly #max: number

    #curr: number
    get currVal() { return this.#curr }
    set currVal(newVal: number) {
        if (this.includes(newVal))
            this.#curr = newVal
    }

    /** `f(a) => (stop = a)` */
    constructor(start: number, stop?: number, currVal?: number) {
        this.#min = stop
            ? Math.max(start, 0)
            : 0
        this.#max = stop
            ? Math.max(stop  - 1, this.#min + 1)
            : Math.max(start - 1, this.#min + 1)
        this.#curr = currVal
            ? Math.min(Math.max(currVal, this.#min), this.#max)
            : this.#min
    }

    next(currVal = this.#curr): number {
        return this.#curr = currVal <= this.#max
            ? currVal + 1
            : this.#min
    }

    prev(currVal = this.#curr): number {
        return this.#curr = this.#min <= currVal
            ? currVal - 1
            : this.#max
    }

    includes(value: number): boolean
        { return this.#min <= value && value <= this.#max }
}

class Property {
    readonly position: number
    readonly name: string
    readonly price: number
    owner: Inventory = GAME.bank
    houses = 0
    isMortgaged = false

    readonly #rent: number[]
    get rent() {
        if (this.isMortgaged)
            { return 0 }
        let count = [...this.set]
            .filter(p => p.owner === this.owner).length
        switch (this.#set) {
            case "railroad":
                return 12.5 * 2 ** count
            case "utility" :
                return count === 2
                    ? 10 * GAME.dice.sum()
                    :  4 * GAME.dice.sum()
            default:
                return !this.houses && this.isMonopoly
                    ? this.#rent[0] * 2
                    : this.#rent[this.houses] 
        }
    }

    readonly #set: string
    get set() { return GAME.propertySets[this.#set] }
    
    get isMonopoly() { return [...this.set].every(p => p.owner === this.owner) }

    constructor(jsonObject: JSON) {
        let set = jsonObject["set"]
        if (!(set in GAME.propertySets))
            GAME.propertySets[set] = new Set()
        GAME.propertySets[set].add(this)
        this.position = Number.parseInt(jsonObject["position"])
        this.name = jsonObject["name"]
        this.#set = set
        this.price
            = this.#set === "railroad" ? 200
            : this.#set === "utility" ? 150
            : Number.parseInt(jsonObject["price"])
        this.#rent = jsonObject["rent"]
    }

    get value() { return this.isMortgaged ? this.mortgage : this.price }

    get mortgage() { return this.price / 2 }

    get unmortgage() { return this.mortgage * 1.1 }

    get housePrice() { return 50 * Math.ceil(this.position / 10) }

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
            return GAME.bank.pay(this.owner, this.mortgage)
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

    upgrade(): boolean {
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

    auction() {} // TODO
}

class Deck extends Array<Card> {
    readonly draw = this.shift
    readonly bottom = this.push
    
    shuffle(): Deck {
        return (this.forEach((c, i) => {
            let r = ~~(Math.random() * this.length)
            this[i] = this[r]
            this[r] = c
        }), this)
    }
}

type Card = {
    readonly deck: "Chance" | "Community Chest"
    readonly text: string
    readonly effect: () => { }
}

class Inventory {
    money: number = 0
    readonly props = new Set<Property>()
    readonly cards = new Set<Card>()
    readonly debt: { [key: string]: number } = { }

    canPay(amount: number): boolean
        { return this.money >= amount }

    pay(inv: Inventory, amount: number): boolean {
        return this.canPay(amount)
            ? (inv.money += amount, this.money -= amount, true)
            : false
    }

    takeAll(inv: Inventory) {
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
    owner: Player

    constructor(owner: Player) {
        super()
        this.owner = owner
    }

    addItem(item: number | Card | Property): boolean {
        if (typeof(item) === "number")
            return (this.money += item, true)
        if (!(item instanceof Property))
            return (this.cards.add(item), true)
        if (item.owner === this.owner)
            return (this.props.add(item), true)
        return false
    }

    canTrade(t: Trade): boolean {
        return [this, t].every(t => t.money > 0 || t.props.size > 0 || t.cards.size > 0)
            && [this.props, t.props].some(p => p.size > 0)
    }

    trade(t: Trade): boolean {
        if (!this.canTrade(t))
            { return false }
        this.money > t.money
            ? this.owner.pay(t.owner, this.money - t.money)
            : t.owner.pay(this.owner, t.money - this.money)
        this.cards.forEach(c => (this.owner.cards.delete(c), t.owner.cards.add(c)))
        this.props.forEach(p => (this.owner.props.delete(p), t.owner.props.add(p)))
        t.cards.forEach(c => (t.owner.cards.delete(c), this.owner.cards.add(c)))
        t.props.forEach(p => (t.owner.props.delete(p), this.owner.props.add(p)))
        return true
    }
}

class Player extends Inventory {
    readonly name: string
    money = 1500
    inJail = false
    bailRolls = 0
    piece: string

    readonly pos = new WrapIter(GAME.boardmap.length)
    get position() { return this.pos.currVal }

    moveN(nTiles: number): number {
        setTimeout(() => this.updatePosition(), 500)
        if (nTiles < 0) {
            this.pos.prev()
            return this.moveN(nTiles - 1)
        }
        if (nTiles > 0) {
            this.pos.next()
            return this.moveN(nTiles + 1)
        }
        return this.position
    }

    moveTo(tile: number): number {
        setTimeout(() => this.updatePosition(), 500)
        if (!this.pos.includes(tile)
        || this.position == tile)
            return this.position
        this.pos.next()
        return this.moveTo(tile)
    }

    updatePosition() {
        let piece = document.getElementById(`piece.${this.piece}`)
        if (!piece)
            return (console.warn("updatePosition: Piece not found."), 404)
        piece.remove()
        GAME.boardmap[this.position].appendChild(piece)
        return this.position
    }

    goToJail(): number {
        this.inJail = true
        this.pos.currVal = 11
        this.updatePosition()
        return this.position
    }

    bankrupt(toWhom: Inventory): boolean {
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
            let payout = ~~(this.money / GAME.players.size)
            GAME.players.forEach(p => this.pay(p, payout))
            // TODO: All properties returned to the bank this
            // way are auctioned, in order of board position
        }
        { return true }
    }

    loadInventory() {} // TODO: Load the player's inventory into the UI

    takeTurn() {} // TODO
}

class Bank extends Inventory {
    houses = 12
    hotels = 32

    pay(inv: Inventory, amount: number): true {
        inv.money += amount
        return true
    }
}

const GAME = {
    bank: new Bank(),
    players: new Set<Player>(),
    propertySets: <{ [key: string]: Set<Property> }>{ },
    currPlayer: <Player | null>null,
    board: new Array<() => { }>(),
    decks: {
        "Chance": new Deck(),
        "Community Chest": new Deck()
    },
    dice: new Dice(),
    boardmap: ((range => [
        range.map(i => ({ row: 10,     col: 10 - i })), // {10, 10}..{10,  1}..
        range.map(i => ({ row: 10 - i, col:  0     })), // {10,  0}..{ 1,  0}..
        range.map(i => ({ row:  0,     col:  i     })), // { 0,  0}..{ 0,  9}..
        range.map(i => ({ row:  i,     col: 10     }))  // { 0, 10}..{ 9, 10}
    ].flat())([...Array(10).keys()]))
        .map(({row, col}) =>
            document.getElementById("board")!
                    .getElementsByTagName("tr")[row]
                    .getElementsByTagName("td")[col]) // table[10][10]..table[10][1]..
}
