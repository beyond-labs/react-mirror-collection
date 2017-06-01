import React from 'react'
import Mirror, {handleActions, combineSimple} from 'react-mirror'
import CollectionController, {newId} from '../../index'

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
    <CollectionController
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
    <pre>
      <code>{JSON.stringify(collection.map(({value}) => value), null, 2)}</code>
    </pre>
  </div>
))

export default Todos
