'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Mirror = require('react-mirror');
var Mirror__default = _interopDefault(Mirror);
var invariant = _interopDefault(require('invariant'));
var most = _interopDefault(require('most'));

var counter = 0;

var newId = function newId() {
  counter++;
  return counter.toString(36);
};

var CollectionModel = Mirror__default({
  name: 'COLLECTION',
  state: function state(mirror) {
    var _this = this;

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
      if (collection instanceof Array) return entries;else {
        changed.forEach(function (i) {
          return collection[entries[i].id] = entries[i].value;
        });
        return collection;
      }
    } : _props$setEntries,
        _props$clone = _props.clone,
        clone = _props$clone === undefined ? function (collection) {
      return collection instanceof Array ? collection.slice() : Object.assign({}, collection);
    } : _props$clone,
        _props$changed = _props.changed,
        changed = _props$changed === undefined ? function (previous, next) {
      next = Object.assign({}, next);
      delete next.id;
      return !Mirror.shallowEqual(previous, next);
    } : _props$changed,
        _props$reducer = _props.reducer,
        reducer = _props$reducer === undefined ? function (previous, _ref) {
      var type = _ref.type,
          payload = _ref.payload;

      payload = Object.assign({}, payload);
      delete payload.id;
      return payload;
    } : _props$reducer;


    invariant(target, 'target is required');
    invariant(empty, 'empty is required');

    var collection = clone(empty);

    return most.merge(target(mirror).$state.map(function (stores) {
      var storeEntries = {};
      stores.forEach(function (state) {
        return state.id && (storeEntries[state.id] = state);
      });
      var changedIndexes = [];
      var previousEntries = getEntries(collection);
      var nextEntries = previousEntries.map(function (_ref2, i) {
        var id = _ref2.id,
            value = _ref2.value;

        if (changed(value, storeEntries[id]) && storeEntries[id] !== undefined) {
          changedIndexes.push(i);
          value = reducer(value, {
            type: 'STATE_CHANGE',
            payload: storeEntries[id]
          });
        }
        return { id: id, value: value };
      });
      Object.assign(_this, {
        changedIndexes: changedIndexes,
        previousIds: previousEntries.map(function (_ref3) {
          var id = _ref3.id;
          return id;
        }),
        nextIds: nextEntries.map(function (_ref4) {
          var id = _ref4.id;
          return id;
        })
      });
      collection = clone(collection);
      collection = setEntries(collection, nextEntries, changedIndexes);
      return collection;
    }), mirror.$actions.filter(function (_ref5) {
      var type = _ref5.type;
      return type === 'TRANSFORM';
    }).map(function (_ref6) {
      var transform = _ref6.payload;

      collection = clone(collection);
      var previousEntries = getEntries(collection);
      var previousIds = previousEntries.map(function (_ref7) {
        var id = _ref7.id;
        return id;
      });
      var previousEntriesMap = {};
      previousEntries.forEach(function (_ref8) {
        var id = _ref8.id,
            value = _ref8.value;
        return previousEntriesMap[id] = value;
      });
      var nextCollection = transform(collection);
      var changedIndexes = [];
      var nextEntries = getEntries(nextCollection).map(function (_ref9, i) {
        var id = _ref9.id,
            value = _ref9.value;

        if (changed(previousEntriesMap[id] && previousEntriesMap[id], value)) {
          changedIndexes.push(i);
          value = reducer(previousEntriesMap[id], {
            type: 'TRANSFORM',
            payload: value
          });
        }
        return { id: id, value: value };
      });
      Object.assign(_this, {
        changedIndexes: changedIndexes,
        previousIds: previousIds,
        nextIds: nextEntries.map(function (_ref10) {
          var id = _ref10.id;
          return id;
        })
      });
      collection = setEntries(nextCollection, nextEntries, changedIndexes);
      return collection;
    }));
  },

  pure: {
    stateEqual: function stateEqual(prev, next) {
      return prev !== undefined && !this.changedIndexes.length && Mirror.shallowEqual(this.previousIds, this.nextIds);
    }
  }
})();

exports.newId = newId;
exports['default'] = CollectionModel;
//# sourceMappingURL=index.js.map
