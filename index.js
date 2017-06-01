'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Mirror = _interopDefault(require('react-mirror'));
var invariant = _interopDefault(require('invariant'));
var most = _interopDefault(require('most'));

var counter = 0;

var newId = function newId() {
  counter++;
  return counter.toString(36);
};

var CollectionController = Mirror({
  name: 'COLLECTION',
  state: function state(mirror) {
    var _props = this.props,
        target = _props.target,
        empty = _props.empty,
        _props$getEntries = _props.getEntries,
        getEntries = _props$getEntries === undefined ? function (collection) {
      return collection instanceof Array ? collection : Object.keys(collection).map(function (id) {
        return { id: id, value: collection[id] };
      });
    } : _props$getEntries,
        _props$setEntries = _props.setEntries,
        setEntries = _props$setEntries === undefined ? function (collection, entries, changed) {
      if (collection instanceof Array) return entries;
      changed.forEach(function (i) {
        return collection[entries[i].id] = entries[i].value;
      });
      return collection;
    } : _props$setEntries,
        _props$clone = _props.clone,
        clone = _props$clone === undefined ? function (collection) {
      return collection instanceof Array ? collection.slice() : Object.assign({}, collection);
    } : _props$clone,
        _props$changed = _props.changed,
        changed = _props$changed === undefined ? function (previous, current) {
      return previous !== current;
    } : _props$changed,
        _props$reducer = _props.reducer,
        reducer = _props$reducer === undefined ? function (previous, _ref) {
      var type = _ref.type,
          payload = _ref.payload;

      payload = Object.assign({}, payload);
      delete payload.id;
      return payload;
    } : _props$reducer,
        _props$cloneOn = _props.cloneOn,
        cloneOn = _props$cloneOn === undefined ? {} : _props$cloneOn;


    Object.assign(cloneOn, { transform: true, stateChange: true }, cloneOn);

    invariant(target, 'target is required');
    invariant(empty, 'empty is required');

    var collection = clone(empty);

    mirror.$actions.forEach(function (_ref2) {
      var type = _ref2.type;

      if (type === 'CLONE') collection = clone(collection);
    });

    return most.mergeArray([target(mirror).$state.map(function (stores) {
      var storeEntries = {};
      stores.forEach(function (state) {
        return state.id && (storeEntries[state.id] = state);
      });
      var changedIndexes = [];
      var nextEntries = getEntries(collection).map(function (_ref3, i) {
        var id = _ref3.id,
            value = _ref3.value;

        if (changed(value, storeEntries[i])) {
          changedIndexes.push(i);
          value = reducer(value, {
            type: 'STATE_CHANGE',
            payload: storeEntries[id]
          });
        }
        return { id: id, value: value };
      });
      if (cloneOn.stateChange) collection = clone(collection);
      collection = setEntries(collection, nextEntries, changedIndexes);
      return collection;
    }), mirror.$actions.filter(function (_ref4) {
      var type = _ref4.type;
      return type === 'CLONE';
    }).map(function () {
      collection = clone(collection);
      return collection;
    }), mirror.$actions.filter(function (_ref5) {
      var type = _ref5.type;
      return type === 'TRANSFORM';
    }).map(function (_ref6) {
      var transform = _ref6.payload;

      if (cloneOn.transform) collection = clone(collection);
      var previousEntries = {};
      getEntries(collection).forEach(function (_ref7) {
        var id = _ref7.id,
            value = _ref7.value;
        return previousEntries[id] = value;
      });
      var nextCollection = transform(collection);
      var changedIndexes = [];
      var nextEntries = getEntries(nextCollection).map(function (_ref8, i) {
        var id = _ref8.id,
            value = _ref8.value;

        if (changed(previousEntries[id] && previousEntries[id], value)) {
          changedIndexes.push(i);
          value = reducer(previousEntries[id], {
            type: 'TRANSFORM',
            payload: value
          });
        }
        return { id: id, value: value };
      });
      collection = setEntries(nextCollection, nextEntries, changedIndexes);
      return collection;
    })]);
  },

  pure: { state: false }
})();

exports.newId = newId;
exports['default'] = CollectionController;
//# sourceMappingURL=index.js.map
