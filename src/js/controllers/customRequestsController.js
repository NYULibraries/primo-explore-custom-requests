// const store = {};
prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customRequestsConfigService', '$timeout'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, config, $timeout) {
  const ctrl = this;
  $window.count = $window.count === undefined ? 0 : $window.count;

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
      // promise = loggedIn ? (store.user && Promise.resolve(store.user)) || delay(3000, {['bor-status']: '50' }).then((user) => { store.user = user; return user; }) : Promise.resolve(undefined);
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

    let { revealsMap, revealsLists } = ctrl.revealTracking;
    // construct { key: [true, false], key2: [true, true], etc. }
    revealsMap = revealsMap || config.buttonIds.reduce((res, buttonKey) => ({
      ...res,
      [buttonKey]: config.showCustomRequests[buttonKey]({ item, items, user, config })
    }), {});

    // uses map to create: [['ill', 'login'], ['ezborrow'] ] etc.
    revealsLists = revealsLists || config.buttonIds.reduce((res, buttonKey) => {
      revealsMap[buttonKey].forEach((reveal, holdingIdx) => {
        reveal ? res[holdingIdx].push(buttonKey) : null;
      });
      return res;
    }, items.map(() => []));

    // go through revealsList and reveal based on key (buttonId) and position (holdingIdx)
    revealsLists.forEach((list, holdingIdx) => {
      list.forEach((buttonKey, buttonIdx) => {
        if (ctrl.revealTracking[`${buttonKey}-${holdingIdx}`]) { return; }

        $window.count++;
        ctrl.revealCustomRequest(buttonKey, holdingIdx);
        if (buttonIdx !== list.length - 1) {
          ctrl.revealDivider(buttonKey, holdingIdx);
        }

        // uses Object.assign because I don't want to track changes, which triggers another DOM refresh
        Object.assign(ctrl.revealTracking, { [`${buttonKey}-${holdingIdx}`]: true });
      });

      if (list.length === 0 && config.hideDefaultRequests({ item, items, user, config })[holdingIdx]) {
        ctrl.revealNoButtonText(holdingIdx);
      }
    });

    // uses Object.assign because I don't want to track changes, which triggers another DOM refresh
    Object.assign(ctrl.revealTracking, { revealsMap, revealsLists });
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

  ctrl.$postLink = () => {
    ctrl.hideAllRequests();
  };

  ctrl.$onInit = () => {
    // initializesrevealTracking, which references central state.
    ctrl.revealTracking = stateService.getState().revealTracking || stateService.setState({ revealTracking: { id: 1 } }).revealTracking;
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
  };

  ctrl.checkRevealTracking = () => {
    const { items, revealTracking } = stateService.getState();

    // if the items change
    ctrl.localItems = ctrl.localItems || JSON.stringify(items);
    if (JSON.stringify(ctrl.localItems) !== JSON.stringify(items)) {
      // if revealTracking hasn't been reset yet
      if (ctrl.revealTracking.id === revealTracking.id) {
        // reset revealTracking contents
        ctrl.revealTracking = stateService.setState({ revealTracking: { ...Object.keys(revealTracking).reduce((res, key) => ({ ...res, [key]: undefined }), {}), id: revealTracking.id + 1 } }).revealTracking;
      // otherwise, just use current serviceState
      } else {
        ctrl.revealTracking = revealTracking;
      }
    }
  };

  ctrl.$doCheck = () => {
    const serviceState = stateService.getState();

    if (ctrl.state === undefined) {
      ctrl.state = serviceState;
      ctrl.refreshControllerValues();
    }

    if (ctrl.state !== serviceState) {
      ctrl.checkRevealTracking();
      ctrl.state = stateService.getState();
      ctrl.DOMRefresh();
    }
  };
}