import Mirror from 'react-mirror'
import invariant from 'invariant'
import most from 'most'

let counter = 0

const newId = () => {
  counter++
  return counter.toString(36)
}

const CollectionController = Mirror({
  name: 'COLLECTION',
  state(mirror) {
    const {
      target,
      empty,
      getEntries = collection => {
        return collection instanceof Array
          ? collection
          : Object.keys(collection).map(id => ({id, value: collection[id]}))
      },
      setEntries = (collection, entries, changed) => {
        if (collection instanceof Array) return entries
        else {
          changed.forEach(i => (collection[entries[i].id] = entries[i].value))
          return collection
        }
      },
      clone = collection => {
        return collection instanceof Array
          ? collection.slice()
          : Object.assign({}, collection)
      },
      changed = (previous, current) => previous !== current,
      reducer = (previous, {type, payload}) => {
        if (payload === undefined) return previous
        payload = Object.assign({}, payload)
        delete payload.id
        return payload
      }
    } = this.props

    invariant(target, 'target is required')
    invariant(empty, 'empty is required')

    let collection = clone(empty)

    return most.merge(
      target(mirror).$state.map(stores => {
        const storeEntries = {}
        stores.forEach(state => state.id && (storeEntries[state.id] = state))
        const changedIndexes = []
        const nextEntries = getEntries(collection).map(({id, value}, i) => {
          if (changed(value, storeEntries[i])) {
            changedIndexes.push(i)
            value = reducer(value, {
              type: 'STATE_CHANGE',
              payload: storeEntries[id]
            })
          }
          return {id, value}
        })
        collection = clone(collection)
        collection = setEntries(collection, nextEntries, changedIndexes)
        return collection
      }),
      mirror.$actions
        .filter(({type}) => type === 'TRANSFORM')
        .map(({payload: transform}) => {
          collection = clone(collection)
          const previousEntries = {}
          getEntries(collection).forEach(({id, value}) => (previousEntries[id] = value))
          const nextCollection = transform(collection)
          const changedIndexes = []
          const nextEntries = getEntries(nextCollection).map(({id, value}, i) => {
            if (changed(previousEntries[id] && previousEntries[id], value)) {
              changedIndexes.push(i)
              value = reducer(previousEntries[id], {
                type: 'TRANSFORM',
                payload: value
              })
            }
            return {id, value}
          })
          collection = setEntries(nextCollection, nextEntries, changedIndexes)
          return collection
        })
    )
  },
  pure: {state: false}
})()

export {newId}
export default CollectionController
