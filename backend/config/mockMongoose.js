const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../.data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

const generateId = () => {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
};

function readJSON(file) {
    const filePath = path.join(DATA_DIR, file);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
        return [];
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        return [];
    }
}

function writeJSON(file, data) {
    const filePath = path.join(DATA_DIR, file);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

class QueryChain {
    constructor(data, modelName) {
        this.data = JSON.parse(JSON.stringify(data)); // clone
        this.modelName = modelName;
    }

    populate(pathName, select) {
        if (pathName === 'restaurant') {
            const restaurants = readJSON('restaurants.json');
            this.data.forEach(item => {
                if (item.restaurant) {
                    const r = restaurants.find(x => x._id === item.restaurant.toString());
                    if (r) item.restaurant = r;
                }
            });
        }
        if (pathName === 'items.menuItem') {
            const menuitems = readJSON('menuitems.json');
            this.data.forEach(item => {
                if (item.items && Array.isArray(item.items)) {
                    item.items.forEach(it => {
                        if (it.menuItem) {
                            const m = menuitems.find(x => x._id === it.menuItem.toString());
                            if (m) it.menuItem = m;
                        }
                    });
                }
            });
        }
        if (pathName === 'customer') {
            const users = readJSON('users.json');
            this.data.forEach(item => {
                if (item.customer) {
                    const u = users.find(x => x._id === item.customer.toString());
                    if (u) {
                        if (select) {
                            const filteredUser = {};
                            select.split(' ').forEach(f => {
                                filteredUser[f] = u[f];
                            });
                            filteredUser._id = u._id;
                            item.customer = filteredUser;
                        } else {
                            item.customer = u;
                        }
                    }
                }
            });
        }
        if (pathName === 'driverId') {
            const users = readJSON('users.json');
            this.data.forEach(item => {
                if (item.driverId) {
                    const u = users.find(x => x._id === item.driverId.toString());
                    if (u) item.driverId = u;
                }
            });
        }
        if (pathName === 'ownerId') {
            const users = readJSON('users.json');
            this.data.forEach(item => {
                if (item.ownerId) {
                    const u = users.find(x => x._id === item.ownerId.toString());
                    if (u) item.ownerId = u;
                }
            });
        }
        return this;
    }

    sort(criteria) {
        if (criteria && criteria.createdAt) {
            const direction = criteria.createdAt; // 1 or -1
            this.data.sort((a, b) => {
                const da = new Date(a.createdAt || 0);
                const db = new Date(b.createdAt || 0);
                return direction === -1 ? db - da : da - db;
            });
        }
        return this;
    }

    select() {
        return this;
    }

    then(onFulfilled, onRejected) {
        const ModelClass = models[this.modelName];
        const instances = this.data.map(item => new ModelClass(item));
        return Promise.resolve(instances).then(onFulfilled, onRejected);
    }
}

class SingleQueryChain {
    constructor(data, modelName) {
        this.data = data ? JSON.parse(JSON.stringify(data)) : null;
        this.modelName = modelName;
    }

    populate(pathName, select) {
        if (!this.data) return this;
        if (pathName === 'restaurant' && this.data.restaurant) {
            const restaurants = readJSON('restaurants.json');
            const r = restaurants.find(x => x._id === this.data.restaurant.toString());
            if (r) this.data.restaurant = r;
        }
        if (pathName === 'items.menuItem' && this.data.items) {
            const menuitems = readJSON('menuitems.json');
            this.data.items.forEach(it => {
                if (it.menuItem) {
                    const m = menuitems.find(x => x._id === it.menuItem.toString());
                    if (m) it.menuItem = m;
                }
            });
        }
        if (pathName === 'customer' && this.data.customer) {
            const users = readJSON('users.json');
            const u = users.find(x => x._id === this.data.customer.toString());
            if (u) {
                if (select) {
                    const filteredUser = {};
                    select.split(' ').forEach(f => {
                        filteredUser[f] = u[f];
                    });
                    filteredUser._id = u._id;
                    this.data.customer = filteredUser;
                } else {
                    this.data.customer = u;
                }
            }
        }
        if (pathName === 'driverId' && this.data.driverId) {
            const users = readJSON('users.json');
            const u = users.find(x => x._id === this.data.driverId.toString());
            if (u) this.data.driverId = u;
        }
        if (pathName === 'ownerId' && this.data.ownerId) {
            const users = readJSON('users.json');
            const u = users.find(x => x._id === this.data.ownerId.toString());
            if (u) this.data.ownerId = u;
        }
        return this;
    }

    select() {
        return this;
    }

    then(onFulfilled, onRejected) {
        const ModelClass = models[this.modelName];
        const instance = this.data ? new ModelClass(this.data) : null;
        return Promise.resolve(instance).then(onFulfilled, onRejected);
    }
}

class Schema {
    constructor(definition) {
        this.definition = definition;
    }
}
Schema.Types = { ObjectId: 'ObjectId' };

const models = {};

function model(modelName, schema) {
    if (models[modelName]) return models[modelName];

    let plural = `${modelName.toLowerCase()}s.json`;
    if (modelName === 'MenuItem') plural = 'menuitems.json';

    class Model {
        constructor(data) {
            if (schema && schema.definition) {
                for (let key in schema.definition) {
                    const fieldDef = schema.definition[key];
                    if (Array.isArray(fieldDef)) {
                        this[key] = [];
                    } else if (fieldDef && typeof fieldDef === 'object') {
                        if (fieldDef.default !== undefined) {
                            let defVal = fieldDef.default;
                            if (typeof defVal === 'function') {
                                if (defVal === Date.now) {
                                    defVal = new Date().toISOString();
                                } else {
                                    defVal = defVal();
                                }
                            }
                            this[key] = defVal;
                        }
                    }
                }
            }
            Object.assign(this, data);
            if (!this._id) {
                this._id = generateId();
            }
            if (!this.createdAt) {
                this.createdAt = new Date().toISOString();
            }
        }

        static find(query = {}) {
            let data = readJSON(plural);
            let filtered = data.filter(item => {
                for (let key in query) {
                    if (query[key] && typeof query[key] === 'object') {
                        if (query[key].$in) {
                            return query[key].$in.includes(item[key]);
                        }
                    }
                    if (item[key] != query[key]) return false;
                }
                return true;
            });
            return new QueryChain(filtered, modelName);
        }

        static findOne(query = {}) {
            let data = readJSON(plural);
            let found = data.find(item => {
                for (let key in query) {
                    if (item[key] != query[key]) return false;
                }
                return true;
            });
            return found ? new Model(found) : null;
        }

        static findById(id) {
            let data = readJSON(plural);
            let found = data.find(item => item._id === id.toString());
            return new SingleQueryChain(found ? new Model(found) : null, modelName);
        }

        static findByIdAndUpdate(id, update, options = {}) {
            let data = readJSON(plural);
            let index = data.findIndex(item => item._id === id.toString());
            if (index !== -1) {
                const updatedItem = { ...data[index], ...update };
                data[index] = updatedItem;
                writeJSON(plural, data);
                return Promise.resolve(new Model(updatedItem));
            }
            return Promise.resolve(null);
        }

        static deleteMany() {
            writeJSON(plural, []);
            return Promise.resolve({ deletedCount: 0 });
        }

        async save() {
            let data = readJSON(plural);
            let index = data.findIndex(item => item._id === this._id);
            
            const itemToSave = { ...this };
            if (itemToSave.restaurant && typeof itemToSave.restaurant === 'object' && itemToSave.restaurant._id) {
                itemToSave.restaurant = itemToSave.restaurant._id;
            }
            if (itemToSave.customer && typeof itemToSave.customer === 'object' && itemToSave.customer._id) {
                itemToSave.customer = itemToSave.customer._id;
            }
            if (itemToSave.driverId && typeof itemToSave.driverId === 'object' && itemToSave.driverId._id) {
                itemToSave.driverId = itemToSave.driverId._id;
            }
            if (itemToSave.ownerId && typeof itemToSave.ownerId === 'object' && itemToSave.ownerId._id) {
                itemToSave.ownerId = itemToSave.ownerId._id;
            }
            if (itemToSave.items && Array.isArray(itemToSave.items)) {
                itemToSave.items = itemToSave.items.map(it => {
                    if (it.menuItem && typeof it.menuItem === 'object' && it.menuItem._id) {
                        return { ...it, menuItem: it.menuItem._id };
                    }
                    return it;
                });
            }

            if (index !== -1) {
                data[index] = itemToSave;
            } else {
                data.push(itemToSave);
            }
            writeJSON(plural, data);
            return this;
        }
    }

    models[modelName] = Model;
    return Model;
}

module.exports = {
    connect: () => Promise.resolve(),
    Schema,
    model,
    Types: { ObjectId: (id) => id }
};
