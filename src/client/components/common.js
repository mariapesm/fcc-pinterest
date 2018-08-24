import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

export function Loading(props) {
  return <span {...props} className={'icon-spin6 animate-spin ' + (props.className || '')} />
}

export class ErrorMessage extends PureComponent {
  static propTypes = {
    error: PropTypes.string
  }
  state = {
    error: this.props.error,
  }
  onClick = () => {
    this.setState({ error: '' })
  }
  render() {
    const { error: _, ...rest } = this.props
    const { error } = this.state
    if (!error) return null
    return (
      <span
        className="red"
        {...rest}
      >
        {error}
        <button
          className={buttonClass + ' border-none bold red'}
          onClick={this.onClick}
        >
          ✕
        </button>
      </span>
    )
  }
}

export const inputClassBase = ' p1 outline-none  '
export const inputClass = inputClassBase + ' border border-silver '

export const buttonClassBase = inputClassBase + ' pointer button '
export const buttonClass = buttonClassBase + ' border '

export const borderRadius = '6px'
