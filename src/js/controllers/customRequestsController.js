prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customRequestsConfigService'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, config) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`Link ${label} has not been assigned either an 'action' or 'href' property`);
  };

  ctrl.hideRequest = idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el ? $el.children().eq(2).css({ display: 'none' }) : null;
  };

  ctrl.revealCustomRequest = (id, idx) => {
    const $el = angular.element($window.document).queryAll(`.custom-request-${id}`)[idx];
    $el && $el.parent().css({ display: 'flex' });
  };

  ctrl.revealDivider = (id, idx) => {
    const $el = angular.element($window.document).queryAll(`.custom-request-${id}`)[idx];
    $el && $el.parent().query('.skewed-divider').css({ display: 'block' });
  };

  ctrl.setButtonsInState = () => {
    let loggedIn, promise;
    if (ctrl.customLoginService) {
      loggedIn = ctrl.customLoginService.isLoggedIn;
      promise = loggedIn ? ctrl.customLoginService.fetchPDSUser() : Promise.resolve(undefined);
    } else {
      loggedIn = false;
      promise = Promise.resolve(undefined);
    }

    return promise
      .then(user => {
        const item = ctrl.parentCtrl.item;
        const { buttonIds, buttonGenerators } = config;

        const buttons = buttonIds.reduce((arr, id) => {
          const buttonGenerator = buttonGenerators[id];
          return [ ...arr, { id, ...buttonGenerator({ item, config }) } ];
        }, []);

        stateService.setState({ buttons, user, loggedIn });
      })
      .catch(err => {
        console.error(err);
        stateService.setState({ userFailure: true, buttons: undefined, user: null, loggedIn });
      });
  };

  ctrl.refreshControllerValues = () => {
    $scope.$applyAsync(() => {
      const { user, userFailure, buttons, loggedIn, item, items } = stateService.getState();
      Object.assign(ctrl, { user, userFailure, buttons, loggedIn });

      const revealCustomRequestsMap = config.showCustomRequests({ item, items, user, config });
      Object.keys(revealCustomRequestsMap).forEach((buttonKey, buttonIdx, keys) => {
        const revealArray = revealCustomRequestsMap[buttonKey];
        revealArray.forEach((bool, idx) => {
          const isLast = buttonIdx === keys.length - 1;
          bool ? ctrl.revealCustomRequest(buttonKey, idx) : null;
          !isLast ? ctrl.revealDivider(buttonKey, idx) : null;
        });
      });
    });
  };

  ctrl.$onInit = () => {
    ctrl.customLoginService = $injector.has('primoExploreCustomLoginService') && $injector.get('primoExploreCustomLoginService');
    const { currLoc, item } = ctrl.parentCtrl;

    const stateItems = stateService.getState().items;
    if (stateItems !== currLoc.items) {
      stateService.setState({ items: currLoc.items, item });

      ctrl.setButtonsInState().then(() => {
        const { items, user } = stateService.getState();
        const props = { config, items, user, item };
        config.hideDefaultRequests(props).forEach((toHide, idx) => toHide ? ctrl.hideRequest(idx) : null);
      });
    }
  };

  ctrl.$doCheck = () => {
    const serviceState = stateService.getState();
    if (ctrl.state !== serviceState) {
      ctrl.state = stateService.getState();
      ctrl.refreshControllerValues();
    }
  };
}