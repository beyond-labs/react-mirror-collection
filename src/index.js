import Mirror, {shallowEqual} from 'react-mirror'
import invariant from 'invariant'
import * as most from 'most'

let counter = 0

const newId = () => {
  counter++
  return counter.toString(36)
}

const CollectionModel = Mirror({
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
      changed = (previous, next) => {
        next = Object.assign({}, next)
        delete next.id
        return !shallowEqual(previous, next)
      },
      reducer = (previous, {type, payload}) => {
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
        const previousEntries = getEntries(collection)
        const nextEntries = previousEntries.map(({id, value}, i) => {
          if (changed(value, storeEntries[id]) && storeEntries[id] !== undefined) {
            changedIndexes.push(i)
            value = reducer(value, {
              type: 'STATE_CHANGE',
              payload: storeEntries[id]
            })
          }
          return {id, value}
        })
        Object.assign(this, {
          changedIndexes,
          previousIds: previousEntries.map(({id}) => id),
          nextIds: nextEntries.map(({id}) => id)
        })
        collection = clone(collection)
        collection = setEntries(collection, nextEntries, changedIndexes)
        return collection
      }),
      mirror.$actions
        .filter(({type}) => type === 'TRANSFORM')
        .map(({payload: transform}) => {
          collection = clone(collection)
          const previousEntries = getEntries(collection)
          const previousIds = previousEntries.map(({id}) => id)
          const previousEntriesMap = {}
          previousEntries.forEach(({id, value}) => (previousEntriesMap[id] = value))
          const nextCollection = transform(collection)
          const changedIndexes = []
          const nextEntries = getEntries(nextCollection).map(({id, value}, i) => {
            if (changed(previousEntriesMap[id] && previousEntriesMap[id], value)) {
              changedIndexes.push(i)
              value = reducer(previousEntriesMap[id], {
                type: 'TRANSFORM',
                payload: value
              })
            }
            return {id, value}
          })
          Object.assign(this, {
            changedIndexes,
            previousIds,
            nextIds: nextEntries.map(({id}) => id)
          })
          collection = setEntries(nextCollection, nextEntries, changedIndexes)
          return collection
        })
    )
  },
  pure: {
    stateEqual(prev, next) {
      return (
        prev !== undefined &&
        !this.changedIndexes.length &&
        shallowEqual(this.previousIds, this.nextIds)
      )
    }
  }
})()

export {newId}
export default CollectionModel
