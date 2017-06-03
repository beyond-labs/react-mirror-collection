import React from 'react'
import Mirror, {handleActions} from 'react-mirror'

const actions = {
  UPDATE_VALUE: 'UPDATE_VALUE'
}

const Input = Mirror({
  name: 'input',
  state(mirror) {
    return mirror.$actions.scan(
      handleActions(
        {
          UPDATE_VALUE: (state, {payload: value}) => ({value})
        },
        {value: this.props.initialValue || this.props.value || ''}
      )
    )
  },
  mapToProps(state, {withName, ...props}) {
    const value = props.value !== undefined
      ? props.value
      : state.value !== undefined ? state.value : ''
    const checked = props.checked !== undefined
      ? props.checked
      : state.checked !== undefined ? state.checked : ''
    return {...props, ...state, value, checked}
  }
})(function Input({dispatch, ...props}) {
  return (
    <input
      onChange={e => {
        dispatch(actions.UPDATE_VALUE, e.target.value)
        if (props.onChange) props.onChange(e)
      }}
      {...props}
    />
  )
})

export {actions}
export default Input
