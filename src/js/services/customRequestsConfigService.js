primoExploreCustomRequestsConfigService.$inject = ['primoExploreCustomRequestsConfig', '$filter'];
export default function primoExploreCustomRequestsConfigService(config, $filter) {
  const svc = this;

  if (!config) {
    console.warn('the constant primoExploreCustomRequestsConfig is not defined');
    return;
  }

  // original translate function
  svc.translate = original => original.replace(/\{(.+?)\}/g, (match, p1) => $filter('translate')(p1));

  const merge = angular.merge({
      hideCustom: ({
        items
      }) => Array.apply(null, Array(items.length)),
      hideDefault: ({
        items
      }) => Array.apply(null, Array(items.length)),
    },
    config, {
      buttonIds: config.buttonIds.map(svc.translate),
      noButtonsText: config.noButtonsText ? svc.translate(config.noButtonsText) : 'Request not available',
    }
  );

  return merge;
};