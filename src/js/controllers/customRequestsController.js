// const store = {};
prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customRequestsConfigService', '$timeout'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, config, $timeout) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`primo-explore-custom-requests: Button "${label}" has not been assigned either an 'action' or 'href' property`);
  };

  ctrl.hideAllRequests = () => {
    const $els = angular.element($window.document).queryAll('prm-location-items .md-list-item-text');

    Array.from($els).forEach(($el) => {
      $el.children().eq(2).css({display: 'none' });
    });
  };

  ctrl.revealRequest = idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el && $el.children().eq(2).css({ display: 'flex' });
  };

  ctrl.hideRequest = idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el && $el.children().eq(2).css({ display: 'none' });
  };

  ctrl.revealCustomRequest = (id, idx) => {
    const $el = angular.element($window.document).queryAll(`.custom-request-${id}`)[idx];
    $el && $el.parent().css({ display: 'block' });
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
      // For delayed PDS testing: (first place store = {} outside scope)
      // const delay = (t, v) => new Promise((res) => setTimeout(res.bind(null, v), t));
      // promise = loggedIn ? (store.user && Promise.resolve(store.user)) || delay(3000, {['bor-status']: '20' }).then((user) => { store.user = user; return user; }) : Promise.resolve(undefined);
    } else {
      loggedIn = false;
      promise = Promise.resolve(undefined);
    }

    stateService.setState({ loggedIn });
    const { item } = stateService.getState();
    return promise
      .then(user => {
        const { buttonIds, buttonGenerators } = config;

        const buttons = buttonIds.reduce((arr, id) => {
          const buttonGenerator = buttonGenerators[id];
          return [ ...arr, { id, ...buttonGenerator({ item, config }) } ];
        }, []);

        stateService.setState({ buttons, user });
      })
      .catch(err => {
        console.error(err);
        stateService.setState({ userFailure: true, buttons: undefined, user: null });
      });
  };

  ctrl.refreshControllerValues = () => {
    const { user, userFailure, buttons, loggedIn } = stateService.getState();
    Object.assign(ctrl, {
      user, userFailure, buttons, loggedIn,
      userLoadingText: config.userLoadingText,
      userFailureText: config.userFailureText,
      noButtonsText: config.noButtonsText,
    });
  };

  ctrl.refreshReveals = () => {
    const { user, item, items } = stateService.getState();
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

      if (list.length === 0 && config.hideDefaultRequests({ item, items, user, config })[holdingIdx]) {
        ctrl.revealNoButtonText(holdingIdx);
      }
    });
  };

  ctrl.DOMRefresh = () => {
    $scope.$applyAsync(() => {
      ctrl.refreshControllerValues();
      // wrapped in $timeout because DOM updates after $digest completes.
      // $timeout ensures that this occurs after DOM update, during the subsequent $digest cycle.
      $timeout(() => {
        ctrl.refreshReveals();
      });
    });
  };

  ctrl.getCurrLocId = () => `${ctrl.parentCtrl.loc.location.mainLocation}${ctrl.parentCtrl.loc.location.subLocationCode}`;

  ctrl.$postLink = () => {
    ctrl.hideAllRequests();
  };

  ctrl.$onInit = () => {
    ctrl.customLoginService = $injector.has('primoExploreCustomLoginService') && $injector.get('primoExploreCustomLoginService');
    const { currLoc, item } = ctrl.parentCtrl;
    const { items } = currLoc;

    const { items: stateItems, item: stateItem } = stateService.getState();
    if (stateItems !== items || stateItem !== item) {
      stateService.setState({ items, item });

      ctrl.setButtonsInState().then(() => {
        const { item, items, user } = stateService.getState();
        const props = { user, item, items, config };

        config.hideDefaultRequests(props).forEach((toHide, idx) => !toHide ? ctrl.revealRequest(idx) : null);
        ctrl.DOMRefresh();
      });

    }

    ctrl.initCurrLocId = ctrl.getCurrLocId();
    stateService.setState({ initialized: { [ctrl.initCurrLocId]: true } });
  };

  ctrl.$doCheck = () => {
    const serviceState = stateService.getState();

    if (ctrl.state === undefined) {
      ctrl.state = serviceState;
      ctrl.refreshControllerValues();
    }

    if (ctrl.state !== serviceState) {
      ctrl.state = stateService.getState();
      ctrl.DOMRefresh();
    }

    if (serviceState.initialized && !serviceState.initialized[ctrl.getCurrLocId()]) {
      ctrl.$onInit();
      ctrl.$postLink();
    }
  };

  ctrl.$onDestroy = () =>{
    stateService.setState({ initialized: { [ctrl.initCurrLocId]: false } });
  };
}