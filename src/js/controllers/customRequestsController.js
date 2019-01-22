// const store = {};
prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService', 'customRequestsConfigService', '$timeout'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService, config, $timeout) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`Link ${label} has not been assigned either an 'action' or 'href' property`);
  };

<<<<<<< HEAD
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
=======
  ctrl.cssCustomRequest = css => idx => {
    const $el = angular.element($window.document).queryAll('prm-location-item-after')[idx];
    $el ? $el.css(css) : null;
  };

  ctrl.cssRequest = css => idx => {
    const $el = angular.element($window.document).queryAll('prm-location-items .md-list-item-text')[idx];
    $el ? $el.children().eq(2).css(css) : null;
>>>>>>> master
  };

  ctrl.hideRequest = ctrl.cssRequest({ display: 'none' });
  ctrl.hideCustomRequest = ctrl.cssCustomRequest({ display: 'none' });

  ctrl.revealNoButtonText = idx => {
    const $el = angular.element($window.document).queryAll(`.custom-requests-empty`)[idx];
    $el && $el.css({ display: 'block' });
  };

  ctrl.setButtonsInState = () => {
<<<<<<< HEAD
    let loggedIn, promise;
    if (ctrl.customLoginService) {
      loggedIn = ctrl.customLoginService.isLoggedIn;
      promise = loggedIn ? ctrl.customLoginService.fetchPDSUser() : Promise.resolve(undefined);
      // For delayed PDS testing: (first place store = {} outside scope)
      // const delay = (t, v) => new Promise((res) => setTimeout(res.bind(null, v), t));
      // promise = loggedIn ? (store.user && Promise.resolve(store.user)) || delay(3000, {['bor-status']: '50' }).then((user) => { store.user = user; return user; }) : Promise.resolve(undefined);
=======
    const loggedIn = ctrl.customLoginService ? ctrl.customLoginService.isLoggedIn : undefined;

    let promise;
    if (loggedIn) {
      promise = ctrl.customLoginService.fetchPDSUser();
>>>>>>> master
    } else {
      promise = Promise.resolve(undefined);
    }

    stateService.setState({ loggedIn });
    const { item } = stateService.getState();
    return promise
      .then(user => {
<<<<<<< HEAD
        const { buttonIds, buttonGenerators } = config;

=======
        const item = ctrl.parentCtrl.item;
        const { buttonIds, showButtons, buttonGenerators } = config;
>>>>>>> master
        const buttons = buttonIds.reduce((arr, id) => {
          const [showButton, buttonGenerator] = [showButtons, buttonGenerators].map(fxn => fxn[id]);
          const show = showButton({ config, user, item });
          return arr.concat(show ? [ buttonGenerator({ item, config }) ] : []);
        }, []);

        stateService.setState({ buttons, user });
      })
      .catch(err => {
        console.error(err);
        stateService.setState({ userFailure: true, buttons: undefined, user: null });
      });
  };

  ctrl.refreshControllerValues = () => {
<<<<<<< HEAD
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
=======
    $scope.$applyAsync(() => {
      const { user, userFailure, buttons, loggedIn } = stateService.getState();
      Object.assign(ctrl, { user, userFailure, buttons, loggedIn });
>>>>>>> master
    });
  };

  ctrl.DOMRefresh = () => {
    $scope.$applyAsync(() => {
      ctrl.refreshControllerValues();
    });

    $timeout(() => {
      // wrapped in $timeout because DOM must update with above $applyAsync before manual reveal process.
      // Because digest cycle is ~10ms, this will more likely ensure the DOM manipulations happen
      // after refreshControllerValues + DOM updates are complete.
      ctrl.refreshReveals();
    }, 100);
  };

  ctrl.$postLink = () => {
    ctrl.hideAllRequests();
  };

  ctrl.$onInit = () => {
    ctrl.customLoginService = $injector.has('primoExploreCustomLoginService') && $injector.get('primoExploreCustomLoginService');
<<<<<<< HEAD
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
=======

    const stateItems = stateService.getState().items;
    if (stateItems !== ctrl.parentCtrl.currLoc.items) {
      stateService.setState({ items: ctrl.parentCtrl.currLoc.items });

      ctrl.setButtonsInState().then(() => {
        const { hideCustomRequest, hideDefaultRequest } = config;
        const { items, user } = stateService.getState();
        const props = { config, items, user };
        hideDefaultRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideRequest(idx) : null);
        hideCustomRequest(props).forEach((toHide, idx) => toHide ? ctrl.hideCustomRequest(idx) : null);
>>>>>>> master
      });
    }
  };

  ctrl.$doCheck = () => {
    const serviceState = stateService.getState();
    ctrl.state = ctrl.state || serviceState;
    if (ctrl.state !== serviceState) {
      ctrl.state = stateService.getState();
      ctrl.DOMRefresh();
    }
  };
}