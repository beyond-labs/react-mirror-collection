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

Mirror Collection is a no-compromises solution to these requirements. Collections as a whole (& their entries) can be manipulated by dispatching `TRANSFORM` actions to a `CollectionController`. When collection entries are linked to stores they can also be updated via `$state` events.

The collection itself can be any arbitrary object, so long as it can store key-value pairs. By default `CollectionController` supports collections shapes like `[{value, key}, {value, key}]` & `{[id]: {value, key}, [id]: {value, key}}`. Other shapes require some configuration.

## How it Works

Each collection entry stores 3 pieces of information:

* `key` - Generated & set by Mirror Collection. Links entries returned by `TRANSFORM` to previous entries. Can be passed to React components (inside arrays) for reconciliation.
* `value` - Last value emitted by scanning update actions. Update actions are dispatched whenever a linked store emits a `$state` value or a value is modified via `TRANSFORM`.
* `id` - An implicitly-stored address for retrieving key / value pairs (eg, an array index). Links `$state` events from target stores to entries (`$state` events from target stores should contain an `id` property).

## Example

```js
import Mirror, {handleActions, combineSimple} from 'react-mirror'
import CollectionController from 'react-mirror-collection'

const TodoItem = Mirror({
  name: 'todo-item',
  state(mirror, dispatch) {
    return mirror.$actions
      .tap(
        handleActions({
          REMOVE: () => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              arr.splice(this.props.id, 1)
              return arr
            })
          },
          SHIFT: ({payload: shift}) => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              const index = this.props.id
              arr.splice(index + shift, 0, arr.splice(index, 1)[0])
              return arr
            })
          }
        })
      )
      .scan(
        handleActions(
          {
            UPDATE: (state, {payload: value}) => ({...state, value}),
            MARK_ACTIVE: state => ({...state, complete: false}),
            MARK_COMPLETE: state => ({...state, complete: true})
          },
          {value: '', complete: false}
        )
      )
      .startWith(this.props)
  }
})(({value, complete, dispatch}) => (
  <div>
    <input onChange={evt => dispatch('UPDATE', evt.target.value)} value={value} />
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
          ADD_TODO: ({payload: value}) => {
            dispatch.one('COLLECTION/todos')('TRANSFORM', arr => {
              return arr.concat({value, complete: false})
            })
          }
        })
      )
      .scan(
        handleActions({
          SET_FILTER: (state, {payload: filter}) => ({...state, filter}),
          INPUT: (state, {payload: input}) => ({...state, input})
        }),
        {input: '', filter: 'ALL'}
      )

    return combineSimple(
      $state,
      mirror.child('COLLECTION/todos').$state
    ).map(([state, [collection]]) => ({
      ...state,
      collection
    }))
  }
})(({collection, filter, input, dispatch}) => (
  <div>
    <CollectionController
      name="COLLECTION/todos"
      empty={() => []}
      target={mirror => mirror.parent().children('todo-item').$state}
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
      .map(({value, key}, index) => {
        return <TodoItem {...value} key={key} id={index} />
      })}
    <button onClick={() => dispatch('SET_FILTER', 'ALL')}>All</button>
    <button onClick={() => dispatch('SET_FILTER', 'ACTIVE')}>Active</button>
    <button onClick={() => dispatch('SET_FILTER', 'COMPLETE')}>Complete</button>
  </div>
))
```

## Props

Changing any of the props passed to `CollectionController` once it's mounted has no effect.

#### `target`

Function which accepts a `mirror` cursor & returns a state stream matching every target store.

#### `empty`

Function which returns a collection with no entries.

#### `getIds`

Default value: `collection => Object.keys(collection)`

#### `getValue`

Default value: `(collection, id) => collection[id] && collection[id].value`

#### `getKey`

Default value: `(collection, id) => collection[id] && collection[id].key`

#### `setValue`

Default value: `(collection, id, value) => Object.assign({}, collection[id], {value})`

#### `setKey`

Default value: `(collection, id, key) => Object.assign({}, collection[id], {key})`

#### `changed`

After a `TRANSFORM` action Mirror Collection checks every value for changes & then updates modified entries.

Default value: `(previous, current) => previous !== current`

#### `reducer`

Returns the "true" value of an entry whenever one is updated. `type` is either `"STATE_CHANGE"` or `"TRANSFORM"`

Default value: `(previous, {type, payload}) => payload`

#### `cloneOn`

Controls collection cloning behaviour. Cloning the collection means that:

* `TRANSFORM` actions won't mutate the collection
* References to `collection` are safe
* Pure components depending on the collection re-render when it changes
* In extreme cases, performance could degrade

Default value: `{transform: true, stateChange: true}`

Note: you can dispatch `CLONE` to manually trigger collection cloning.
