import Mirror from 'react-mirror'
import invariant from 'invariant'
import most from 'most'

let keyCounter = 0

const generateKey = () => {
  keyCounter++
  return keyCounter.toString(36)
}

const clone = (collection, {empty, getIds, getValue, getKey, setValue, setKey}) => {
  const result = empty()

  getIds(collection)
    .map(id => ({id, value: getValue(collection, id), key: getKey(collection, id)}))
    .forEach(({id, value, key}) => {
      setValue(result, id, value)
      setKey(result, id, key || generateKey())
    })

  return result
}

const CollectionController = Mirror({
  name: 'COLLECTION',
  state(mirror) {
    const {
      target,
      empty,
      getIds = collection => Object.keys(collection),
      getValue = (collection, id) => collection[id] && collection[id].value,
      getKey = (collection, id) => collection[id] && collection[id].key,
      setValue = (collection, id, value) => Object.assign({}, collection[id], {value}),
      setKey = (collection, id, key) => Object.assign({}, collection[id], {key}),
      changed = (previous, current) => previous !== current,
      reducer = (previous, {type, payload}) => payload,
      cloneOn = {}
    } = this.props

    const config = {empty, getIds, getValue, getKey, setValue, setKey}

    Object.assign({transform: true, stateChange: true}, cloneOn)

    invariant(target, 'target is required')
    invariant(empty, 'empty is required')

    let collection = empty()

    mirror.$actions.forEach(({type}) => {
      if (type === 'CLONE') collection = clone(collection)
    })

    return most.mergeArray([
      target(mirror).map(state => {
        const values = state
          .filter(state => state.id && changed(getValue(collection, state.id), state))
          .map(state => ({
            id: state.id,
            value: reducer(getValue(collection, state.id), {
              type: 'STATE_CHANGE',
              payload: state
            })
          }))
        if (cloneOn.stateChange) collection = clone(collection, config)
        values.forEach(({id, value}) => setValue(collection, id, value))
        return collection
      }),
      mirror.$actions.filter(({type}) => type === 'CLONE').map(() => {
        collection = clone(collection)
        return collection
      }),
      mirror.$actions
        .filter(({type}) => type === 'TRANSFORM')
        .map(({payload: transform}) => {
          if (cloneOn.transform) collection = clone(collection, config)
          const next = transform(collection)
          getIds(next).forEach(id => {
            const previous = getValue(collection, id)
            const value = getValue(next, id)
            if (changed(previous, value)) {
              setValue(next, id, reducer(previous, {type: 'TRANSFORM', payload: value}))
            }
            if (!getKey(next, id)) {
              setKey(next, id, generateKey())
            }
          })
          collection = next
          return next
        })
    ])
  },
  pure: {state: false}
})()

export default CollectionController