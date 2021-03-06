import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogContent } from '@material-ui/core'
import shallowCompare from 'react-addons-shallow-compare'
import { withStyles } from '@material-ui/core/styles'
import { accountStore, accountActions } from 'stores/account'
import { settingsStore } from 'stores/settings'
import Zoom from '@material-ui/core/Zoom'
import { ipcRenderer } from 'electron'
import SwitcherServiceCell from './SwitcherServiceCell'
import {
  WB_QUICK_SWITCH_HIGHLIGHT_NEXT,
  WB_QUICK_SWITCH_HIGHLIGHT_PREV,
  WB_QUICK_SWITCH_SELECT
} from 'shared/ipcEvents'
import ElectronAccelerator from 'wbui/ElectronAccelerator'

const TRANSITION_DURATION = 50

const styles = {
  dialog: {
    maxWidth: '100%',
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: 10
  },
  dialogContent: {
    padding: '0px !important'
  },
  serviceScroller: {
    textAlign: 'center',
    overflow: 'auto',
    whiteSpace: 'nowrap',
    paddingTop: 12,
    paddingLeft: 12,
    paddingRight: 12,
    paddingBottom: 6
  },
  acceleratorContainer: {
    height: 20,
    fontSize: '10px',
    lineHeight: '20px',
    textAlign: 'center',
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 6
  },
  accelerator: {
    display: 'inline-block',
    margin: '0px 0.5ch',
    color: 'rgb(130, 130, 130)'
  },
  kbd: {
    display: 'inline-block',
    border: '1px solid rgb(130, 130, 130)',
    color: 'rgb(130, 130, 130)',
    paddingLeft: 4,
    paddingRight: 4,
    borderRadius: 4,
    margin: '0px 0.4ch',
    minWidth: 30,
    textAlign: 'center',
    fontFamily: 'inherit',
    lineHeight: '16px'
  }
}

@withStyles(styles)
class SwitcherScene extends React.Component {
  /* **************************************************************************/
  // Class
  /* **************************************************************************/

  static propTypes = {
    match: PropTypes.shape({
      params: PropTypes.shape({
        mode: PropTypes.oneOf(['next', 'prev'])
      })
    })
  }

  /* **************************************************************************/
  // Lifecycle
  /* **************************************************************************/

  constructor (props) {
    super(props)

    this.scrollerRef = null
  }

  /* **************************************************************************/
  // Component lifecycle
  /* **************************************************************************/

  componentDidMount () {
    // Purposefully don't update this.state.serviceIds to help with jank.
    // We don't want the order to change mid-flow for the user.
    // Also don't listen to params.mode changes this again is just an initializer
    // argument which can be ignored afterwards

    window.addEventListener('blur', this.handleClose)
    window.addEventListener('keydown', this.handleKeypress)
    ipcRenderer.on(WB_QUICK_SWITCH_HIGHLIGHT_NEXT, this.ipcHandleNext)
    ipcRenderer.on(WB_QUICK_SWITCH_HIGHLIGHT_PREV, this.ipcHandlePrev)
    ipcRenderer.on(WB_QUICK_SWITCH_SELECT, this.ipcHandleSelect)

    settingsStore.listen(this.settingsChanged)
  }

  componentWillUnmount () {
    window.removeEventListener('blur', this.handleClose)
    window.removeEventListener('keydown', this.handleKeypress)
    ipcRenderer.removeListener(WB_QUICK_SWITCH_HIGHLIGHT_NEXT, this.ipcHandleNext)
    ipcRenderer.removeListener(WB_QUICK_SWITCH_HIGHLIGHT_PREV, this.ipcHandlePrev)
    ipcRenderer.removeListener(WB_QUICK_SWITCH_SELECT, this.ipcHandleSelect)

    settingsStore.unlisten(this.settingsChanged)
  }

  /* **************************************************************************/
  // Data lifecycle
  /* **************************************************************************/

  state = (() => {
    const accountState = accountStore.getState()
    const settingsState = settingsStore.getState()
    const serviceIds = accountState.lastAccessedServiceIds(true).slice(0, 8)
    const hasServices = serviceIds.length > 0

    // Some really basic protection against a broken UI. We should never really
    // get here anyway because the primary menu runs a check that there are
    // services
    if (!hasServices) {
      setTimeout(() => { this.handleClose() }, 100)
    }

    return {
      open: hasServices,
      nextAccelerator: settingsState.accelerators.quickSwitchNext,
      prevAccelerator: settingsState.accelerators.quickSwitchPrev,
      serviceIds: serviceIds, // Don't update over component lifecycle
      selectedServiceId: this._getMode() === 'next' // Don't update over component lifecycle
        ? this._getNextServiceId(accountState.activeServiceId(), serviceIds)
        : this._getPrevServiceId(accountState.activeServiceId(), serviceIds)
    }
  })()

  settingsChanged = (settingsState) => {
    this.setState({
      nextAccelerator: settingsState.accelerators.quickSwitchNext,
      prevAccelerator: settingsState.accelerators.quickSwitchPrev
    })
  }

  /* **************************************************************************/
  // Data Utils
  /* **************************************************************************/

  /**
  * @return the mode from the props
  */
  _getMode () {
    return (((this.props.match || {}).params || {}).mode || 'next')
  }

  /**
  * Gets the next service id
  * @param serviceId: the current service id
  * @param serviceIds: the array of service ids to cycle over
  * @return the next service id
  */
  _getNextServiceId (serviceId, serviceIds) {
    const serviceIndex = serviceIds.findIndex((s) => s === serviceId)
    return serviceIndex !== -1
      ? serviceIds[serviceIndex + 1] || serviceIds[0]
      : serviceIds[0]
  }

  /**
  * Gets the prev service id
  * @param serviceId: the current service id
  * @param serviceIds: the array of service ids to cycle over
  * @return the prev service id
  */
  _getPrevServiceId (serviceId, serviceIds) {
    const serviceIndex = serviceIds.findIndex((s) => s === serviceId)
    return serviceIndex !== -1
      ? serviceIds[serviceIndex - 1] || serviceIds[serviceIds.length - 1]
      : serviceIds[0]
  }

  /* **************************************************************************/
  // IPC Events
  /* **************************************************************************/

  /**
  * Handles the ipc channel indicating to select the next service
  */
  ipcHandleNext = () => {
    this.setState((prevState) => {
      const { selectedServiceId, serviceIds } = prevState
      return { selectedServiceId: this._getNextServiceId(selectedServiceId, serviceIds) }
    })
  }

  ipcHandlePrev = () => {
    this.setState((prevState) => {
      const { selectedServiceId, serviceIds } = prevState
      return { selectedServiceId: this._getPrevServiceId(selectedServiceId, serviceIds) }
    })
  }

  /**
  * Handles the ipc channel indicating to switch to the service
  */
  ipcHandleSelect = () => {
    const { selectedServiceId } = this.state
    accountActions.changeActiveService(selectedServiceId)
    this.handleClose()
  }

  /* **************************************************************************/
  // User Interaction
  /* **************************************************************************/

  /**
  * Handles an incoming keypress
  * @param evt: the event that fired
  */
  handleKeypress = (evt) => {
    if (evt.keyCode === 37) { // Left
      evt.preventDefault()
      evt.stopPropagation()
      this.setState((prevState) => {
        const { selectedServiceId, serviceIds } = prevState
        return { selectedServiceId: this._getPrevServiceId(selectedServiceId, serviceIds) }
      })
    } else if (evt.keyCode === 39) { // Right
      evt.preventDefault()
      evt.stopPropagation()
      this.setState((prevState) => {
        const { selectedServiceId, serviceIds } = prevState
        return { selectedServiceId: this._getNextServiceId(selectedServiceId, serviceIds) }
      })
    } else if (evt.keyCode === 13) { // Enter
      evt.preventDefault()
      evt.stopPropagation()
      accountActions.changeActiveService(this.state.selectedServiceId)
      this.handleClose()
    }
  }

  /**
  * Closes the modal
  */
  handleClose = () => {
    this.setState((prevState) => {
      if (prevState.open) {
        setTimeout(() => {
          window.location.hash = '/'
        }, TRANSITION_DURATION + 50)
        return { open: false }
      } else {
        return undefined
      }
    })
  }

  /* **************************************************************************/
  // DOM Events
  /* **************************************************************************/

  /**
  * Handles the scrollers ref changing
  * @param node: the new dom node
  */
  handleScrollerRefChange = (node) => {
    if (!this.scrollerRef) {
      // Freshly mounted element
      if (this._getMode() === 'prev') {
        node.scrollLeft = node.scrollWidth
      }
    }

    this.scrollerRef = node
  }

  /* **************************************************************************/
  // Rendering
  /* **************************************************************************/

  shouldComponentUpdate (nextProps, nextState) {
    return shallowCompare(this, nextProps, nextState)
  }

  render () {
    const {
      classes
    } = this.props
    const {
      open,
      serviceIds,
      selectedServiceId,
      nextAccelerator,
      prevAccelerator
    } = this.state
    const nextAcceleratorValid = ElectronAccelerator.isValid(nextAccelerator)
    const prevAcceleratorValid = ElectronAccelerator.isValid(prevAccelerator)

    return (
      <Dialog
        disableEnforceFocus
        open={open}
        transitionDuration={TRANSITION_DURATION}
        TransitionComponent={Zoom}
        onClose={this.handleClose}
        classes={{ paper: classes.dialog }}>
        <DialogContent className={classes.dialogContent}>
          <div
            ref={this.handleScrollerRefChange}
            className={classes.serviceScroller}>
            {serviceIds.map((serviceId) => {
              return (
                <SwitcherServiceCell
                  key={serviceId}
                  onMouseMove={(evt) => {
                    this.setState({ selectedServiceId: serviceId })
                  }}
                  onMouseDown={(evt) => {
                    accountActions.changeActiveService(serviceId)
                    this.handleClose()
                  }}
                  serviceId={serviceId}
                  isSelected={serviceId === selectedServiceId} />
              )
            })}
          </div>
          {nextAcceleratorValid && prevAcceleratorValid ? (
            <div className={classes.acceleratorContainer}>
              Use
              <ElectronAccelerator
                className={classes.accelerator}
                keyClassName={classes.kbd}
                accelerator={nextAccelerator} />
              and
              <ElectronAccelerator
                className={classes.accelerator}
                keyClassName={classes.kbd}
                accelerator={prevAccelerator} />
              to switch
            </div>
          ) : undefined}
        </DialogContent>
      </Dialog>
    )
  }
}

export default SwitcherScene
