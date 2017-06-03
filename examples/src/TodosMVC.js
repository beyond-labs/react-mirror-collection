import './style/todos.scss'
import React from 'react'
import cl from 'classnames'
import Mirror, {handleActions, combineSimple} from 'react-mirror'
import CollectionModel, {newId} from '../../index'
import Input, {actions as actions_input} from './Input'

const filters = {
  ALL: 'ALL',
  ACTIVE: 'ACTIVE',
  COMPLETE: 'COMPLETE'
}

const actions = {
  INITIALIZE: 'INITIALIZE',

  UPDATE_TITLE: 'UPDATE_TITLE',
  MARK_COMPLETE: 'MARK_COMPLETE',
  MARK_ACTIVE: 'MARK_ACTIVE',
  START_EDITING: 'START_EDITING',
  STOP_EDITING: 'STOP_EDITING',

  SET_FILTER: 'SET_FILTER',
  ADD_TODO: 'ADD_TODO',
  REMOVE_TODO: 'REMOVE_TODO',
  CLEAR_COMPLETED: 'CLEAR_COMPLETED',
  DEHYDRATE: 'DEHYDRATE',
  REHYDRATE: 'REHYDRATE'
}

const ENTER = 13

const TodoModel = Mirror({
  name: 'todos-model',
  state(mirror, dispatch) {
    return combineSimple(
      mirror
        .child('COLLECTION')
        .$state.map(([collection = []]) => {
          return collection.map(({id, value}) => ({id, ...value}))
        })
        .tap(todos => dispatch(actions.DEHYDRATE, todos)),
      mirror.$actions
        .tap(
          handleActions({
            [actions.INITIALIZE]: () => {
              dispatch(
                actions.REHYDRATE,
                JSON.parse(sessionStorage.getItem('todos') || '[]')
              )
            },
            [actions.CLEAR_COMPLETED]: () => {
              dispatch.child('COLLECTION')('TRANSFORM', arr => {
                return arr.filter(({value: {complete}}) => !complete)
              })
            },
            [actions.ADD_TODO]: ({payload: title}) => {
              dispatch.child('COLLECTION')('TRANSFORM', arr => {
                return arr.concat({
                  value: {title, editing: false, complete: false},
                  id: newId()
                })
              })
            },
            [actions.REMOVE_TODO]: ({payload: remove}) => {
              dispatch.child('COLLECTION')('TRANSFORM', arr => {
                return arr.filter(({id}) => id !== remove)
              })
            },
            [actions.DEHYDRATE]: ({payload: todos}) => {
              todos = todos.map(({id, ...todo}) => ({...todo, editing: false}))
              sessionStorage.setItem('todos', JSON.stringify(todos))
            },
            [actions.REHYDRATE]: ({payload: todos}) => {
              dispatch.child('COLLECTION')('TRANSFORM', () => {
                return todos.map(todo => ({value: todo, id: newId()}))
              })
            }
          })
        )
        .scan(
          handleActions(
            {
              [actions.SET_FILTER]: (state, {payload: filter}) => ({...state, filter})
            },
            {filter: filters.ALL}
          )
        )
    ).map(([todos, state]) => ({todos, ...state}))
  }
})(() => <CollectionModel empty={[]} target={mirror => mirror.all('todos-item')} />)

const TodosItem = Mirror({
  name: 'todos-item',
  state(mirror, dispatch) {
    return mirror.$actions.scan(
      handleActions(
        {
          [actions.UPDATE_TITLE]: (state, {payload: title}) => ({...state, title}),
          [actions.MARK_COMPLETE]: state => ({...state, complete: true}),
          [actions.MARK_ACTIVE]: state => ({...state, complete: false}),
          [actions.START_EDITING]: state => ({...state, editing: true}),
          [actions.STOP_EDITING]: state => {
            if (!state.title) {
              dispatch.parent('todos').child('todos-model')(actions.REMOVE_TODO, state.id)
            }
            return {...state, editing: false}
          }
        },
        this.props
      )
    )
  }
})(({complete = false, editing = false, title = '', id, dispatch}) => (
  <li
    className={cl({complete, editing})}
    onDoubleClick={() => dispatch(actions.START_EDITING)}
  >
    <div className="view">
      <Input
        withName="todos-item/complete-toggle"
        className="toggle"
        type="checkbox"
        onChange={e => {
          const action = e.target.checked ? actions.MARK_COMPLETE : actions.MARK_ACTIVE
          dispatch(action)
        }}
        checked={complete}
      />
      <label>
        {title}
      </label>
      <button
        className="destroy"
        onClick={() => {
          dispatch.parent('todos').child('todos-model')(actions.REMOVE_TODO, id)
        }}
      />
    </div>
    <Input
      withName="todos-item/title-input"
      className="edit"
      onBlur={() => dispatch(actions.STOP_EDITING)}
      onKeyDown={e => {
        if (e.keyCode === ENTER) dispatch(actions.STOP_EDITING)
      }}
      onChange={evt => {
        dispatch(actions.UPDATE_TITLE, evt.target.value || '')
      }}
      value={title}
    />
  </li>
))

const TodosList = Mirror({
  name: 'todos-list',
  state(mirror) {
    return mirror.parent('todos').child('todos-model').$state.map(([state]) => state)
  }
})(({todos, filter, dispatch}) => (
  <section className="main" style={todos.length ? undefined : {display: 'none'}}>
    <Input
      className="toggle-all"
      type="checkbox"
      onChange={e => {
        const action = e.target.checked ? actions.MARK_COMPLETE : actions.MARK_ACTIVE
        dispatch.children('todos-item')(action)
      }}
      checked={todos.every(todo => todo.complete)}
    />
    <label htmlFor="toggle-all">Mark all as complete</label>
    <ul className="todo-list">
      {todos
        .filter(({complete}) => {
          if (filter === 'ALL') return true
          if (filter === 'ACTIVE') return !complete
          if (filter === 'COMPLETE') return complete
          return true
        })
        .map(todo => <TodosItem key={todo.id} {...todo} />)}
    </ul>
  </section>
))

const Header = Mirror()(({dispatch}) => (
  <header className="header">
    <h1>todos</h1>
    <Input
      className="new-todo"
      onKeyDown={e => {
        if (e.keyCode === ENTER && e.target.value) {
          dispatch.parent('todos').child('todos-model')(actions.ADD_TODO, e.target.value)
          dispatch.child('input')(actions_input.UPDATE_VALUE, '')
        }
      }}
      placeholder="What needs to be done?"
    />
  </header>
))

const Footer = Mirror({
  state(mirror) {
    return mirror
      .parent('todos')
      .child('todos-model')
      .$state.map(([state = {todos: []}]) => ({
        todosCount: state.todos.length,
        activeTodosCount: state.todos.filter(({complete}) => !complete).length,
        filter: state.filter
      }))
  }
})(({todosCount, activeTodosCount, filter, dispatch}) => {
  dispatch = dispatch.parent('todos').child('todos-model')

  return (
    <footer className="footer" style={todosCount ? undefined : {display: 'none'}}>
      <span className="todo-count">
        <strong>{activeTodosCount}</strong>{' '}
        {activeTodosCount === 1 ? 'item' : 'items'} left
      </span>
      <ul className="filters">
        <li>
          <a
            className={cl({selected: filter === filters.ALL})}
            onClick={() => dispatch(actions.SET_FILTER, filters.ALL)}
          >
            All
          </a>
        </li>
        <li style={{listStyle: 'none'}}><span /></li>
        <li>
          <a
            className={cl({selected: filter === filters.ACTIVE})}
            onClick={() => dispatch(actions.SET_FILTER, filters.ACTIVE)}
          >
            Active
          </a>
        </li>
        <li style={{listStyle: 'none'}}><span /></li>
        <li>
          <a
            className={cl({selected: filter === filters.COMPLETE})}
            onClick={() => dispatch(actions.SET_FILTER, filters.COMPLETE)}
          >
            Completed
          </a>
        </li>
      </ul>
      {todosCount > activeTodosCount
        ? <button
            className="clear-completed"
            onClick={() => dispatch(actions.CLEAR_COMPLETED)}
          >
            Clear completed
          </button>
        : null}
    </footer>
  )
})

const Todos = Mirror({name: 'todos'})(() => (
  <div className="todoContainer">
    <div className="background" />
    <section className="todoapp">
      <Header />
      <TodosList />
      <Footer />
      <TodoModel />
    </section>
  </div>
))

export default Todos
