Mirror Collection
=================

When designing Mirror-based applications you should try to localise state whenever possible. However, it's important to acknowledge contextual requirements can conflict with this ideal. For instance, a Todos app has the following requirements:

* Initialize a Todo with some text (from parent)
* Modify text by dispatching actions from Todo
* Render Todos in a particular, deterministic order
* Re-order, remove, or insert Todos at arbitrary locations
* Unmount Todo (& don't forget state) by applying filter
* Remove filter & remount Todo with cached state

You might struggle to achieve this with localised stores & reactive subscriptions. The obvious solution is to move all state to a higher-level contextual store & pass props down - but by doing this individual Todos will no be longer self-contained & many of Mirror's advantages are lost.

So, like... umm... Mirror Collection uses contextual stores (via the `CollectionModel`), but! It makes linking collection entries to local stores easy. Collections as a whole (& their entries) can be manipulated by dispatching `TRANSFORM` actions to the `CollectionModel`. When collection entries are linked to stores those entries can also be updated via `$state` events.

Collections can be any arbitrary object, capable of storing collection entries (a value & matching id). By default `CollectionModel` supports collections shapes like `[{id, value}, {id, value}]` & `{[id]: value, [id]: value}`. Other shapes require some configuration. Mirror Collection links target stores (targets are indicated with a `mirror` cursor) to entries when they receive `id` as a prop.

## Notes

Mirror Collection keeps `collection` up-to-date & nothing else. How `collection` is used is your decision, for instance you could:

* Initialize local stores by reading from the collection (via props), then only write updates (like the example)
* Have local stores combine prop / state streams to always reflect the collection entries' latest value
* Add a `REPLACE_STATE` action handler to local stores & dispatch `REPLACE_STATE` when the reducer is called
* Modify the reducer to buffer actions, which are dispatched to a local store when it mounts

Picking the right approach requires trading-off reusability vs complexity vs requirements (of course varying by use-case)

## Example

```js
import React from 'react'
import Mirror, {handleActions, combineSimple} from 'react-mirror'
import CollectionModel, {newId} from '../../index'

const TodoItem = Mirror({
  name: 'todo-item',
  state(mirror, dispatch) {
    return mirror.$actions
      .tap(
        handleActions({
          REMOVE: () => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              const index = arr.findIndex(({id}) => id === this.props.id)
              arr.splice(index, 1)
              return arr
            })
          },
          SHIFT: ({payload: shift}) => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              const index = arr.findIndex(({id}) => id === this.props.id)
              arr.splice(index + shift, 0, arr.splice(index, 1)[0])
              return arr
            })
          }
        })
      )
      .scan(
        handleActions(
          {
            UPDATE: (state, {payload: title}) => ({...state, title}),
            MARK_ACTIVE: state => ({...state, complete: false}),
            MARK_COMPLETE: state => ({...state, complete: true})
          },
          this.props
        )
      )
  }
})(({title, complete, dispatch}) => (
  <div>
    <input onChange={evt => dispatch('UPDATE', evt.target.value)} value={title} />
    <input
      onChange={evt => dispatch(evt.target.checked ? 'MARK_COMPLETE' : 'MARK_ACTIVE')}
      type="checkbox"
      checked={complete}
    />
    <button onClick={() => dispatch('SHIFT', -1)}>▲</button>
    <button onClick={() => dispatch('SHIFT', 1)}>▼</button>
    <button onClick={() => dispatch('REMOVE')}>✖</button>
  </div>
))

const ENTER = 13

const Todos = Mirror({
  state(mirror, dispatch) {
    const $state = mirror.$actions
      .tap(
        handleActions({
          ADD_TODO: ({payload: title}) => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              return arr.concat({value: {title, complete: false}, id: newId()})
            })
          }
        })
      )
      .scan(
        handleActions(
          {
            SET_FILTER: (state, {payload: filter}) => ({...state, filter}),
            INPUT: (state, {payload: input}) => ({...state, input})
          },
          {input: '', filter: 'ALL'}
        )
      )

    return combineSimple(
      $state,
      mirror.child('COLLECTION/todos').$state
    ).map(([state = {input: '', filter: 'ALL'}, [collection = []]]) => ({
      ...state,
      collection
    }))
  }
})(({collection, filter, input, dispatch}) => (
  <div>
    <CollectionModel
      withName="COLLECTION/todos"
      empty={[]}
      target={mirror => mirror.root().children('todo-item')}
    />
    <input
      onKeyDown={evt => {
        if (evt.keyCode === ENTER) {
          evt.preventDefault()
          dispatch('ADD_TODO', evt.target.value)
          dispatch('INPUT', '')
        }
      }}
      onChange={evt => dispatch('INPUT', evt.target.value)}
      value={input}
    />
    {collection
      .filter(({value}) => {
        if (filter === 'ALL') return true
        if (filter === 'ACTIVE') return !value.complete
        if (filter === 'COMPLETE') return value.complete
        return true
      })
      .map(({value, id}, i) => {
        return <TodoItem {...value} key={id} id={id} />
      })}
    <div>
      <button onClick={() => dispatch('SET_FILTER', 'ALL')}>All</button>
      <button onClick={() => dispatch('SET_FILTER', 'ACTIVE')}>Active</button>
      <button onClick={() => dispatch('SET_FILTER', 'COMPLETE')}>Complete</button>
    </div>
  </div>
))
```

## Props

Changing any of the props passed to `CollectionModel` once it's mounted has no effect.

#### `target`

Function which accepts a `mirror` cursor & returns a cursor matching every target store.

Example: `mirror => mirror.parent('todo-list').children('todo-item')`

#### `empty`

Collection with no entries.

Example: `[]`

#### `getEntries`

Default value:

```js
collection => {
  return collection instanceof Array
    ? collection
    : Object.keys(collection).map(id => ({id, value: collection[id]}))
}
```

#### `setEntries`

Accepts 3 values: the `collection` to update, the serialized up-to-date `entries` inside that collection & the indexes of entries that were `changed` by the latest update

Default value:

```js
(collection, entries, changed) => {
  if (collection instanceof Array) return entries
  else {
    changed.forEach(i => (collection[entries[i].id] = entries[i].value))
    return collection
  }
}
```

#### `clone`

Cloning the collection during updates adds some safety (referential + against mutations) & forces pure components relying on the collection to re-render when it changes.

Default value:

```js
collection => {
  return collection instanceof Array
    ? collection.slice()
    : Object.assign({}, collection)
}
```

#### `changed`

Used to check whether a value was changed by `TRANSFORM` or `$state`. Values which have changed are passed to `reducer`.

Default value:

```js
(previous, next) => {
  next = Object.assign({}, next)
  delete next.id
  return !shallowEqual(previous, next)
}
```

#### `reducer`

Returns the "true" value of an entry whenever one is updated. `type` is either `"STATE_CHANGE"` or `"TRANSFORM"`

Default value:

```js
(previous, {type, payload}) => {
  payload = Object.assign({}, payload)
  delete payload.id
  return payload
}
```
