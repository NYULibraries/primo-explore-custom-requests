primoExploreCustomRequestsConfigService.$inject = ['primoExploreCustomRequestsConfig', '$filter'];
export default function primoExploreCustomRequestsConfigService(config, $filter) {
  if (!config) {
    console.warn('the constant primoExploreCustomRequestsConfig is not defined');
    return;
  }

  const merge = angular.merge(
    {
      showCustomRequests: config.buttonIds.reduce((res, id) => ({ ...res, [id]: ({ items }) => items.map(() => true) }), {}),
      hideDefaultRequests: ({ items }) => items.map(() => false),
    },
    config,
    {
      buttonIds: config.buttonIds,
      noButtonsText: config.noButtonsText || 'Request not available',
      userFailureText: config.userFailureText || 'Unable to retrieve request options',
      userLoadingText: config.userLoadingText || 'Retrieving request options...',
    }
  );

  return merge;
}