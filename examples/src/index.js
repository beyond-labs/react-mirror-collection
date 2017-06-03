import React from 'react'
import {storiesOf} from '@storybook/react'
import TodosDefault from './TodosDefault'
import TodosMVC from './TodosMVC'

storiesOf('Todos', module)
  .add('default', () => <TodosDefault />)
  .add('Todos MVC', () => <TodosMVC />)
