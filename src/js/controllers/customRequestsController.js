prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customRequestsConfigService'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, config) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`primo-explore-custom-requests: Button "${label}" has not been assigned either an 'action' or 'href' property`);
  };

  ctrl.hideRequest = idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el && $el.children().eq(2).css({ display: 'none' });
  };

  ctrl.revealCustomRequest = (id, idx) => {
    const $el = angular.element($window.document).queryAll(`.custom-request-${id}`)[idx];
    $el && $el.parent().css({ display: 'flex' });
  };

  ctrl.revealDivider = (id, idx) => {
    const $el = angular.element($window.document).queryAll(`.custom-request-${id}`)[idx];
    $el && $el.parent().query('.skewed-divider').css({ display: 'block' });
  };

  ctrl.revealNoButtonText = idx => {
    const $el = angular.element($window.document).queryAll(`.custom-requests-empty`)[idx];
    $el && $el.css({ display: 'block' });
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

      // construct { key: [true, false], key2: [true, true], etc. }
      const revealsMap = config.buttonIds.reduce((res, buttonKey) => ({
        ...res,
        [buttonKey]: config.showCustomRequests[buttonKey]({ item, items, user, config })
      }), {});

      // try to turn config into: [['ill', 'login'], ['ezborrow'] ] etc.
      const revealsLists = config.buttonIds.reduce((res, buttonKey) => {
        revealsMap[buttonKey].forEach((reveal, holdingIdx) => {
          reveal ? res[holdingIdx].push(buttonKey) : null;
        });
        return res;
      }, items.map(() => []));

      // go through revealsList and reveal based on key (buttonId) and position (holdingIdx)
      revealsLists.forEach((list, holdingIdx) => {
        list.forEach((buttonKey, buttonIdx) => {
          ctrl.revealCustomRequest(buttonKey, holdingIdx);
          if (buttonIdx !== list.length - 1) {
            ctrl.revealDivider(buttonKey, holdingIdx);
          }
        });

        if (list.length === 0) {
          ctrl.revealNoButtonText(holdingIdx);
        }
      });

      Object.assign(ctrl, {
        user, userFailure, buttons, loggedIn,
        userLoadingText: config.userLoadingText,
        userFailureText: config.userFailureText,
        noButtonsText: config.noButtonsText,
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
        const props = { user, item, items, config };
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