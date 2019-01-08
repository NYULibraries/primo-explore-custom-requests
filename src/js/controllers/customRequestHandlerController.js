prmLocationItemsAfterController.$inject = ['customRequestsConfigService', '$element', 'customLoginService', 'customRequestsStateService'];
export default function prmLocationItemsAfterController(config, $element, customLoginService, stateService) {
  const ctrl = this;

  ctrl.cssCustomRequest = css => idx => {
    const $el = $element.parent().parent().queryAll('prm-location-item-after')[idx];
    $el ? $el.css(css) : null;
  };

  ctrl.cssRequest = css => idx => {
    const $el = $element.parent().parent().queryAll('.md-list-item-text')[idx];
    $el ? $el.children().eq(2).css(css) : null;
  };

  ctrl.hideRequest = ctrl.cssRequest({ display: 'none' });
  ctrl.hideCustomRequest = ctrl.cssCustomRequest({ display: 'none' });
  ctrl.revealRequest = ctrl.cssRequest({ display: 'flex' });
  ctrl.revealCustomRequest = ctrl.cssCustomRequest({ display: 'flex' });

  ctrl.runAvailabilityCheck = () => {
    const { loggedIn } = stateService.getState();

    return (!loggedIn ? Promise.resolve(undefined) : customLoginService.fetchPDSUser())
      .then(user => {
        const item = ctrl.parentCtrl.item;
        const { buttonIds, showButtons, buttonGenerators } = config;
        const buttons = buttonIds.reduce((arr, id) => {
          const [showButton, buttonGenerator] = [showButtons, buttonGenerators].map(fxn => fxn[id]);
          const show = showButton({ config, user, item, loggedIn });
          return arr.concat(show ? [ buttonGenerator({ item, config }) ] : []);
        }, []);

        stateService.setState({ buttons, user });
      })
      .catch(err => {
        console.error(err);
        stateService.setState({ userFailure: true });
      });
  };

  ctrl.$doCheck = () => {
    if (ctrl.parentCtrl.currLoc === undefined) return;
    // manual check to see if items have changed
    if (ctrl.parentCtrl.currLoc.items !== ctrl.trackedItems) {
      ctrl.trackedItems = ctrl.parentCtrl.currLoc.items;
      ctrl.runAvailabilityCheck().then(() => {
        const { hideCustomRequest, hideDefaultRequest } = config;
        const { loggedIn, user } = stateService.getState();

        const props = { items: ctrl.trackedItems, config, loggedIn, user };
        hideDefaultRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideRequest(idx) : null);
        hideCustomRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideCustomRequest(idx) : null);
        // double-action required because of wonkiness when moving among locations
        hideDefaultRequest(props).forEach((toHide, idx) => !toHide ? ctrl.revealRequest(idx) : null);
        hideCustomRequest(props).forEach((toHide, idx) => !toHide ? ctrl.revealCustomRequest(idx) : null);
        ctrl.hasCheckedReveal = false;
      });
    }
  };

  ctrl.$onInit = () => {
    ctrl.noButtonsText = config.noButtonsText;
    const loggedIn = customLoginService.isLoggedIn();
    stateService.setState({ loggedIn });
  };
}