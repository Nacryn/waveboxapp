import React from 'react'
import PropTypes from 'prop-types'
import shallowCompare from 'react-addons-shallow-compare'
import { withStyles } from '@material-ui/core/styles'
import ElectronAccelerator from './ElectronAccelerator'

const styles = {
  kbd: {
    display: 'inline-block',
    margin: 1,
    padding: '1px 4px',
    fontFamily: 'Arial',
    fontSize: '11px',
    lineHeight: '1.4',
    color: '#242729',
    textShadow: '0 1px 0 #FFF',
    backgroundColor: '#e1e3e5',
    border: '1px solid #adb3b9',
    borderRadius: 3,
    boxShadow: '0 1px 0 rgba(12,13,14,0.2), 0 0 0 2px #FFF inset',
    whiteSpace: 'nowrap'
  }
}

@withStyles(styles)
class SettingsListKeyboardShortcutText extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    shortcut: PropTypes.string
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  render () {
    const { classes, shortcut, ...passProps } = this.props

    const isValid = ElectronAccelerator.isValid(shortcut)
    if (isValid) {
      return (
        <ElectronAccelerator
          {...passProps}
          showPlus={false}
          accelerator={shortcut}
          keyClassName={classes.kbd} />
      )
    } else {
      return false
    }
  }
}

export default SettingsListKeyboardShortcutText
