const roll = (nDice = 2, sides = 6) => 
    Array(nDice).fill().map(() => Math.floor(Math.random() * sides) + 1)

const rollDice = (dice = "2d6") =>
    roll(...(/^(\d+)d(\d+)$/i.exec(dice) ?? [0, 1, -1]).slice(1).map(v => Number.parseInt(v)))
    .reduce((p, c) => p + c)

/** @global */
const GAME = {
    /** @type {Bank} */
    bank: new Bank(),
    /** @type {Object<string, Player>} */ 
    players: [],
    /** @type {Object<string, Set<Property>>} */
    propertySets: {}
}

class Property {
    /** @type {number} @readonly */
    position;
    /** @type {string} @readonly */
    name;
    /** @type {string} @readonly @private */
    _set;
    /** @type {number} @readonly */
    price;
    /** @type {number} @readonly @private */
    _rent;
    /** @type {number} @readonly */
    mortgage;
    /** @type {number} @readonly */
    unmortgage;
    /** @type {number} @readonly */
    housePrice;
    /** @type {Player} */
    owner = GAME.bank;
    /** @type {number} */
    houses = 0;
    /** @type {boolean} */
    isMortgaged = false;

    /** @param {JSON} jsonObject */
    constructor(jsonObject) {
        let set = jsonObject["set"]
        if (!(set in GAME.propertySets))
            GAME.propertySets[set] = new Set()
        GAME.propertySets[set].add(this)
        this.position = jsonObject["position"]
        this.name = jsonObject["name"]
        this._set = set
        this.price
            = this._set === "railroad" ? 200
            : this._set === "utility" ? 150
            : jsonObject["price"]
        this._rent = jsonObject["rent"]
        this.mortgage = this.price / 2
        this.unmortgage = this.mortgage * 1.1
        this.housePrice = 50 * Math.ceil(this.position * .1)
    }

    get set()
        { return GAME.propertySets[this._set] }
    
    /** @returns {boolean} @readonly */
    get isMonopoly()
        { return this.set.every(p => p.owner === this.owner) }

    rent(roll = 0) {
        let count = this.set.filter(p => p.owner === this.owner).length
        if (this._set === "railroad")
            return 12.5 * 2 ** count
        if (this._set === "utility")
            return count === 2
                ? 10 * roll
                :  4 * roll
        return !this.houses && this.isMonopoly
            ? this._rent[0] * 2
            : this._rent[this.houses]
    }

    downgrade() {
        if (this.isMortgaged)
            { return }
        if (!this.houses) {
            GAME.bank.pay(this.owner.money, this.mortgage)
            this.isMortgaged = true
            return
        }
        //TODO
    }

    upgrade() {
        if (this.houses === 5)
            { return }
        if (this.isMortgaged) {
            if (this.owner.money < this.unmortgage)
                { return }
            this.owner.pay(GAME.bank, this.unmortgage)
            this.isMortgaged = false
            return
        }
        if ([...this.set].some(p => p.houses < this.houses))
            { return }
        if (this.houses === 4) {
            if (!GAME.bank.hotels)
                { return }
            this.owner.pay(GAME.bank, this.housePrice)
            GAME.bank.hotels--
            this.houses++
            return
        }
        //TODO
    }
}

class Player {
    //TODO
}

class Bank extends Player {
    //TODO
}