prmLocationItemAfterController.$inject = ['$window', '$scope', '$injector', 'customRequestService', ]
export default function prmLocationItemAfterController($window, $scope, $injector, customRequestService) {
  const ctrl = this;

  ctrl.handleClick = (event, { action, href, label }) => {
    event.stopPropagation();
    href && $window.open(href);
    action && action($injector);
    !(href || action) && console.warn(`Link ${label} has not been assigned either an 'action' or 'href' property`);
  }

  ctrl.refreshAvailability = () => {
    $scope.$applyAsync(() => {
      const { user, userFailure, links, loggedIn } = customRequestService.getState();
      Object.assign(ctrl, { user, userFailure, links, loggedIn });
    });
  }

  ctrl.$doCheck = () => {
    if (ctrl.serviceState !== customRequestService.getState()) {
      ctrl.refreshAvailability();
      ctrl.serviceState = customRequestService.getState();
    }
  }
}