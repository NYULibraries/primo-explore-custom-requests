prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestsStateService'];
export default function prmLocationItemAfterController($window, $scope, $injector, stateService) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`Link ${label} has not been assigned either an 'action' or 'href' property`);
  };

  ctrl.refreshAvailability = () => {
    $scope.$applyAsync(() => {
      const { user, userFailure, buttons, loggedIn } = stateService.getState();
      Object.assign(ctrl, { user, userFailure, buttons, loggedIn });
    });
  };

  ctrl.$doCheck = () => {
    if (ctrl.serviceState !== stateService.getState()) {
      ctrl.refreshAvailability();
      ctrl.serviceState = stateService.getState();
    }
  };
}