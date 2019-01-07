prmLocationItemsAfterController.$inject = ['customRequestsConfigService', '$element', 'customLoginService', 'customRequestService'];
export default function prmLocationItemsAfterController(config, $element, customLoginService, customRequestService) {
  const ctrl = this;

  ctrl.cssCustomRequest = css => idx => {
    const $el = $element.parent().parent().queryAll('prm-location-item-after')[idx]
    $el ? $el.css(css) : null;
  }

  ctrl.cssRequest = css => idx => {
    const $el = $element.parent().parent().queryAll('.md-list-item-text')[idx];
    $el ? $el.children().eq(2).css(css) : null;
  }

  ctrl.hideRequest = ctrl.cssRequest({ display: 'none' });
  ctrl.hideCustomRequest = ctrl.cssCustomRequest({ display: 'none' });
  ctrl.revealRequest = ctrl.cssRequest({ display: 'flex' });
  ctrl.revealCustomRequest = ctrl.cssCustomRequest({ display: 'flex' });

  ctrl.runAvailabilityCheck = () => {
    const loggedIn = !ctrl.parentCtrl.userSessionManagerService.isGuest();
    customRequestService.setState({ loggedIn });

    return customLoginService.fetchPDSUser()
      .then(user => {
        const item = ctrl.parentCtrl.item;
        const { links: linkKeys, showButtons, buttonGenerators } = config;
        const links = linkKeys.reduce((arr, key) => {
          const [showButton, buttonGenerator] = [showButtons, buttonGenerators].map(fxn => fxn[key]);
          const show = showButton({ config, user, item, loggedIn  });
          return arr.concat(show ? [ buttonGenerator({ item, config }) ] : [])
        }, []);

        customRequestService.setState({ links, user });
      })
      .catch(err => {
        console.error(err);
        customRequestService.setState({ userFailure: true })
      });
  }

  ctrl.$doCheck = () => {
    if (ctrl.parentCtrl.currLoc === undefined) return;
    // manual check to see if items have changed
    if (ctrl.parentCtrl.currLoc.items !== ctrl.trackedItems) {
      ctrl.trackedItems = ctrl.parentCtrl.currLoc.items;
      ctrl.runAvailabilityCheck().then(() => {
        const { hideCustom, hideDefault } = config;

        const props = { items: ctrl.trackedItems, config, loggedIn: customRequestService.getState().loggedIn }
        hideDefault(props).forEach((toHide, idx) => toHide ? ctrl.hideRequest(idx) : null);
        hideCustom(props).forEach((toHide, idx) => toHide ? ctrl.hideCustomRequest(idx) : null)
        // double-action required because of wonkiness when moving among locations
        hideDefault(props).forEach((toHide, idx) => !toHide ? ctrl.revealRequest(idx) : null);
        hideCustom(props).forEach((toHide, idx) => !toHide ? ctrl.revealCustomRequest(idx) : null)
        ctrl.hasCheckedReveal = false;
      });
    }
  };

  ctrl.$onInit = () => {
    ctrl.noButtonsText = config.noButtonsText;
  };
}