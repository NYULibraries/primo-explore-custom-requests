prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customLoginService', 'customRequestsConfigService'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, customLoginService, config) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`Link ${label} has not been assigned either an 'action' or 'href' property`);
  };

  ctrl.cssCustomRequest = css => idx => {
    const $el = angular.element($window.document).queryAll('prm-location-item-after')[idx];
    $el ? $el.css(css) : null;
  };

  ctrl.cssRequest = css => idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el ? $el.children().eq(2).css(css) : null;
  };

  ctrl.hideRequest = ctrl.cssRequest({ display: 'none' });
  ctrl.hideCustomRequest = ctrl.cssCustomRequest({ display: 'none' });

  ctrl.setButtonsInState = () => {
    const { loggedIn } = stateService.getState();

    return (!loggedIn ? Promise.resolve(undefined) : customLoginService.fetchPDSUser())
      .then(user => {
        const item = ctrl.parentCtrl.item;
        const { buttonIds, showButtons, buttonGenerators } = config;
        const buttons = buttonIds.reduce((arr, id) => {
          const [showButton, buttonGenerator] = [showButtons, buttonGenerators].map(fxn => fxn[id]);
          const show = showButton({ config, user, item });
          return arr.concat(show ? [ buttonGenerator({ item, config }) ] : []);
        }, []);

        stateService.setState({ buttons, user });
      })
      .catch(err => {
        console.error(err);
        stateService.setState({ userFailure: true, buttons: undefined, user: null, });
      });
  };

  ctrl.applyRequests = () => {
    $scope.$applyAsync(() => {
      const { user, userFailure, buttons, loggedIn } = stateService.getState();
      Object.assign(ctrl, { user, userFailure, buttons, loggedIn });
    });
  };

  ctrl.$onInit = () => {
    // update login if not yet done
    if (stateService.getState().loggedIn === undefined) {
      stateService.setState({ loggedIn: customLoginService.isLoggedIn() });
    }

    const stateItems = stateService.getState().items;
    if (stateItems !== ctrl.parentCtrl.currLoc.items) {
      stateService.setState({ items: ctrl.parentCtrl.currLoc.items });

      ctrl.setButtonsInState().then(() => {
        const { hideCustomRequest, hideDefaultRequest } = config;
        const { items, user } = stateService.getState();
        const props = { config, items, user };
        hideDefaultRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideRequest(idx) : null);
        hideCustomRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideCustomRequest(idx) : null);

        ctrl.applyRequests();
      });
    } else {
      ctrl.applyRequests();
    }
  };

  ctrl.$doCheck = () => {
    const serviceState = stateService.getState();
    if (ctrl.state !== serviceState) {
      ctrl.state = stateService.getState();
      ctrl.applyRequests();
    }
  };
}