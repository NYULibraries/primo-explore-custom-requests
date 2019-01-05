import customRequestsController from './controllers/customRequestsController'
import customRequestsHandlerController from './controllers/customRequestHandlerController'
import './customLogin';

angular
  .module('primoExploreCustomRequests', [
    'customLogin',
  ])
  .config(['$httpProvider', function ($httpProvider) {
    //Enable cross domain calls
    $httpProvider.defaults.useXDomain = true;
    //Enable passing of cookies for CORS calls
    //Note: CORS will absolutely not work without this
    $httpProvider.defaults.withCredentials = true;
    //Remove the header containing XMLHttpRequest used to identify ajax call
    //that would prevent CORS from working
    delete $httpProvider.defaults.headers.common['X-Requested-With'];
  }])
  .service('customRequestsConfigService', ['primoExploreCustomRequestsConfig', '$filter', function (config, $filter) {
    const svc = this;

    if (!config) {
      console.warn('the constant primoExploreCustomRequestsConfig is not defined');
      return;
    }

    // utility function that transforms object values with a provided function
    const transformValues = (obj, fxn) => Object.keys(obj).reduce((acc, key) => Object.assign(acc, { [key]: fxn(obj[key]) }), {});

    // original translate function
    svc.translate = original => original.replace(/\{(.+?)\}/g, (match, p1) => $filter('translate')(p1));
    // translate all the values in an object
    svc.translateObject = obj => transformValues(obj, svc.translate);

    // translate the result of a function
    svc.translateFunction = fxn => (...args) => svc.translate(fxn(...args));
    // not in use yet, but perhaps in future iterations
    svc.translateObjectWithFunctions = obj => transformValues(obj, svc.translateFunction);

    Object.freeze(config);
    return Object.freeze({
      links: config.links.map(svc.translate),
      linkText: svc.translateObject(config.linkText),
      linkGenerators: config.linkGenerators,
      showLinks: config.showLinks,
      hideDefault: config.hideDefault,
      hideCustom: config.hideCustom,
      values: config.values,
      noLinksText: svc.translate(config.noLinksText),
    });
  }])
  .component('primoExploreCustomRequests', {
    controller: customRequestsController,
    require: {
      parentCtrl: '^prmLocationItemAfter'
    },
    template: `
      <div layout="row" layout-align="center center">
        <div layout="row" layout-align="center center" ng-repeat="link in $ctrl.links">
          <button class="button-as-link md-button md-primoExplore-theme md-ink-ripple" type="button" ng-click="$ctrl.open(link.href)"
            aria-label="Type"><span>{{ link.label }}</span>
          </button>
          <div class="skewed-divider" ng-if="!$last"></div>
        </div>
        <div layout="row" layout-align="center center" ng-if="!$ctrl.loggedIn">
          <div>
            <button class="button-as-link md-button md-primoExplore-theme md-ink-ripple" type="button" ng-click="$ctrl.handleLogin($event)"
              aria-label="Type"><span>Login for request options</span>
            </button>
          </div>
        </div>

        <span ng-if="$ctrl.loggedIn && !$ctrl.user && !$ctrl.userFailure">Retrieving request options...</span>
        <span ng-if="$ctrl.userFailure">Unable to retrieve request options</span>
        <span ng-if="$ctrl.user && $ctrl.links && $ctrl.links.length === 0">{{ $ctrl.noLinksText || 'Request not available' }}</span>
      </div>
    `
  })
  .component('primoExploreCustomRequestsHandler', {
    controller: customRequestsHandlerController,
    require: {
      parentCtrl: '^prmLocationItems'
    }
  })
  .service('customRequestService', function () {
    const svc = this;
    svc.state = {}
    return ({
      setState: newState => {
        svc.state = angular.merge({}, svc.state, newState);
        return svc.state;
      },
      getState: () => svc.state,
    });
  });