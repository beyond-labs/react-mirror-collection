'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var Mirror = require('react-mirror');
var Mirror__default = _interopDefault(Mirror);
var invariant = _interopDefault(require('invariant'));
var most = _interopDefault(require('most'));

var keyCounter = 0;

var generateKey = function generateKey() {
  keyCounter++;
  return keyCounter.toString(36);
};

var clone = function clone(collection, _ref) {
  var empty = _ref.empty,
      getIds = _ref.getIds,
      getValue = _ref.getValue,
      getKey = _ref.getKey,
      setValue = _ref.setValue,
      setKey = _ref.setKey;

  var result = empty();

  getIds(collection).map(function (id) {
    return { id: id, value: getValue(collection, id), key: getKey(collection, id) };
  }).forEach(function (_ref2) {
    var id = _ref2.id,
        value = _ref2.value,
        key = _ref2.key;

    setValue(result, id, value);
    setKey(result, id, key || generateKey());
  });

  return result;
};

var CollectionController = Mirror__default({
  name: 'COLLECTION',
  state: function state(mirror) {
    var _props = this.props,
        target = _props.target,
        empty = _props.empty,
        _props$getIds = _props.getIds,
        getIds = _props$getIds === undefined ? function (collection) {
      return Object.keys(collection);
    } : _props$getIds,
        _props$getValue = _props.getValue,
        getValue = _props$getValue === undefined ? function (collection, id) {
      return collection[id] && collection[id].value;
    } : _props$getValue,
        _props$getKey = _props.getKey,
        getKey = _props$getKey === undefined ? function (collection, id) {
      return collection[id] && collection[id].key;
    } : _props$getKey,
        _props$setValue = _props.setValue,
        setValue = _props$setValue === undefined ? function (collection, id, value) {
      if (!collection[id]) collection[id] = {};
      collection[id].value = value;
    } : _props$setValue,
        _props$setKey = _props.setKey,
        setKey = _props$setKey === undefined ? function (collection, id, key) {
      if (!collection[id]) collection[id] = {};
      collection[id].key = key;
    } : _props$setKey,
        _props$changed = _props.changed,
        changed = _props$changed === undefined ? function (previous, current) {
      return previous !== current;
    } : _props$changed,
        _props$reducer = _props.reducer,
        reducer = _props$reducer === undefined ? function (previous, _ref3) {
      var type = _ref3.type,
          payload = _ref3.payload;
      return payload;
    } : _props$reducer,
        _props$cloneOn = _props.cloneOn,
        cloneOn = _props$cloneOn === undefined ? {} : _props$cloneOn;


    var config = { empty: empty, getIds: getIds, getValue: getValue, getKey: getKey, setValue: setValue, setKey: setKey };

    Object.assign(cloneOn, { transform: true, stateChange: true }, cloneOn);

    invariant(target, 'target is required');
    invariant(empty, 'empty is required');

    var collection = empty();

    mirror.$actions.forEach(function (_ref4) {
      var type = _ref4.type;

      if (type === 'CLONE') collection = clone(collection);
    });

    var cursor = target(mirror);
    cursor.$state.forEach(function (evt) {
      return console.log('state', evt);
    });
    cursor.$props.forEach(function (evt) {
      return console.log('props', evt);
    });

    return most.mergeArray([Mirror.combineNested({
      state: cursor.$state,
      props: cursor.$props
    }).map(function (stores) {
      var ids = getIds(collection);
      var values = stores.filter(function (_ref5) {
        var props = _ref5.props,
            state = _ref5.state;
        return props && props.id && changed(getValue(collection, props.id), state) && (ids.includes(props.id) || ids.includes(String(props.id)));
      }).map(function (_ref6) {
        var props = _ref6.props,
            state = _ref6.state;
        return {
          id: props.id,
          value: reducer(getValue(collection, props.id), {
            type: 'STATE_CHANGE',
            payload: state
          })
        };
      });
      if (cloneOn.stateChange) collection = clone(collection, config);
      values.forEach(function (_ref7) {
        var id = _ref7.id,
            value = _ref7.value;
        return setValue(collection, id, value);
      });
      return collection;
    }), mirror.$actions.filter(function (_ref8) {
      var type = _ref8.type;
      return type === 'CLONE';
    }).map(function () {
      collection = clone(collection);
      return collection;
    }), mirror.$actions.filter(function (_ref9) {
      var type = _ref9.type;
      return type === 'TRANSFORM';
    }).map(function (_ref10) {
      var transform = _ref10.payload;

      var next = transform(cloneOn.transform ? clone(collection, config) : collection);
      getIds(next).forEach(function (id) {
        var previous = getValue(collection, id);
        var value = getValue(next, id);
        if (changed(previous, value)) {
          setValue(next, id, reducer(previous, { type: 'TRANSFORM', payload: value }));
        }
        if (!getKey(next, id)) {
          setKey(next, id, generateKey());
        }
      });
      collection = next;
      return next;
    })]);
  },

  pure: { state: false }
})();

module.exports = CollectionController;
//# sourceMappingURL=index.js.map
